import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import { createRequire } from "module";
import { uploadImage } from "@/lib/transloadit";

function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  try {
    const require = createRequire(import.meta.url);
    const path = require("ffmpeg-static") as string | { default?: string | null } | null;
    const resolved = typeof path === "string" ? path : path?.default ?? null;
    if (resolved && resolved.length > 0) return resolved;
  } catch {
    
  }
  
  if (process.platform === "linux" && existsSync("/usr/bin/ffmpeg")) {
    return "/usr/bin/ffmpeg";
  }
  return "ffmpeg";
}

function getFfprobePath(): string {
  if (process.env.FFPROBE_PATH) return process.env.FFPROBE_PATH;
  const ffmpeg = getFfmpegPath();
  if (ffmpeg !== "ffmpeg" && ffmpeg.includes("/")) {
    const dir = ffmpeg.slice(0, ffmpeg.lastIndexOf("/") + 1);
    const exe = process.platform === "win32" ? "ffprobe.exe" : "ffprobe";
    const candidate = join(dir, exe);
    if (existsSync(candidate)) return candidate;
  }
  if (process.platform === "linux" && existsSync("/usr/bin/ffprobe")) {
    return "/usr/bin/ffprobe";
  }
  return "ffprobe";
}

function getPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const extractFrameTask = task({
  id: "workflow-extract-frame",
  run: async (payload: {
    workflowRunId: string;
    nodeExecutionId: string;
    videoUrl: string;
    timestampPercentage: number;
  }) => {
    const startedAt = Date.now();
    const { workflowRunId, nodeExecutionId, videoUrl, timestampPercentage } = payload;
    const prisma = getPrisma();

    const ffmpegPath = getFfmpegPath();
    const ffprobePath = getFfprobePath();
    const videoPath = join(tmpdir(), `galaxy-video-${randomUUID()}.mp4`);
    const framePath = join(tmpdir(), `galaxy-frame-${randomUUID()}.jpg`);

    try {
      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: { status: "RUNNING" },
      });

      const res = await fetch(videoUrl);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(videoPath, buf);

      
      const probe = spawnSync(
        ffprobePath,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          videoPath,
        ],
        { encoding: "utf8" }
      );
      
      let durationSeconds = 0;
      if (probe.status === 0 && probe.stdout) {
        durationSeconds = parseFloat(probe.stdout.trim()) || 0;
      }
      
      if (!durationSeconds) {
         logger.warn("Could not determine video duration, defaulting to 0s", { output: probe.stdout, error: probe.stderr });
      }

      const targetSeconds = (timestampPercentage / 100) * durationSeconds;

      const result = spawnSync(
        ffmpegPath,
        [
          "-y",
          "-ss",
          String(targetSeconds),
          "-i",
          videoPath,
          "-vframes",
          "1",
          "-q:v",
          "2",
          framePath,
        ],
        { stdio: "pipe", encoding: "utf8" }
      );

      const spawnErr = result.error as NodeJS.ErrnoException | undefined;
      if (spawnErr?.code === "ENOENT") {
        throw new Error(
          "ffmpeg not found. Install ffmpeg and add it to PATH, or set FFMPEG_PATH in .env to the full path (e.g. on Windows: C:\\ffmpeg\\bin\\ffmpeg.exe)."
        );
      }
      if (result.status !== 0) {
        throw new Error(result.stderr || result.error?.message || "FFmpeg failed");
      }

      const frameBuffer = await readFile(framePath);
      const base64 = `data:image/jpeg;base64,${frameBuffer.toString("base64")}`;
      const outputUrl = await uploadImage(base64);

      const finishedAt = Date.now();
      const durationMs = finishedAt - startedAt;

      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: {
          status: "SUCCESS",
          outputs: { outputUrl },
          finishedAt: new Date(finishedAt),
          durationMs,
        },
      });

      const run = await prisma.workflowRun.findUnique({
        where: { id: workflowRunId },
        include: { nodeExecutions: true },
      });
      const allDone = run?.nodeExecutions.every(
        (e) => e.status === "SUCCESS" || e.status === "FAILED"
      );
      const anyFailed = run?.nodeExecutions.some((e) => e.status === "FAILED");
      if (run && allDone) {
        await prisma.workflowRun.update({
          where: { id: workflowRunId },
          data: {
            status: anyFailed ? "FAILED" : "SUCCESS",
            finishedAt: new Date(),
            durationMs: Date.now() - run.startedAt.getTime(),
          },
        });
      }

      logger.log("Extract frame task completed", { nodeExecutionId, durationMs });
      return { outputUrl, durationMs };
    } catch (error) {
      const finishedAt = Date.now();
      const durationMs = finishedAt - startedAt;
      const message = error instanceof Error ? error.message : String(error);

      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: {
          status: "FAILED",
          errorMessage: message,
          finishedAt: new Date(finishedAt),
          durationMs,
        },
      });

      const run = await prisma.workflowRun.findUnique({
        where: { id: workflowRunId },
        include: { nodeExecutions: true },
      });
      const allDone = run?.nodeExecutions.every(
        (e) => e.status === "SUCCESS" || e.status === "FAILED"
      );
      if (run && allDone) {
        await prisma.workflowRun.update({
          where: { id: workflowRunId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            durationMs: Date.now() - run.startedAt.getTime(),
          },
        });
      }

      logger.error("Extract frame task failed", { nodeExecutionId, error: message });
      throw error;
    } finally {
      await unlink(videoPath).catch(() => {});
      await unlink(framePath).catch(() => {});
    }
  },
});
