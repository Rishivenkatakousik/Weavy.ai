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

export const cropImageTask = task({
  id: "workflow-crop-image",
  run: async (payload: {
    workflowRunId: string;
    nodeExecutionId: string;
    imageUrl: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }) => {
    const startedAt = Date.now();
    const {
      workflowRunId,
      nodeExecutionId,
      imageUrl,
      xPercent,
      yPercent,
      widthPercent,
      heightPercent,
    } = payload;
    const prisma = getPrisma();
    const ffmpegPath = getFfmpegPath();
    const ffprobePath = getFfprobePath();
    const inputPath = join(tmpdir(), `galaxy-crop-input-${randomUUID()}`);
    const outputPath = join(tmpdir(), `galaxy-crop-output-${randomUUID()}.png`);

    try {
      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: { status: "RUNNING" },
      });

      const res = await fetch(imageUrl);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(inputPath, buf);

      
      const probe = spawnSync(
        ffprobePath,
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=width,height",
          "-of",
          "json",
          inputPath,
        ],
        { encoding: "utf8" }
      );
      if (probe.status !== 0) {
        throw new Error(probe.stderr || "ffprobe failed to get image dimensions");
      }
      let probeJson: { streams?: Array<{ width?: number; height?: number }> };
      try {
        probeJson = JSON.parse(probe.stdout) as { streams?: Array<{ width?: number; height?: number }> };
      } catch {
        throw new Error("ffprobe did not return valid JSON");
      }
      const stream = probeJson.streams?.[0];
      const w = stream?.width ?? 1;
      const h = stream?.height ?? 1;

      const left = Math.round((xPercent / 100) * w);
      const top = Math.round((yPercent / 100) * h);
      const width = Math.round((widthPercent / 100) * w);
      const height = Math.round((heightPercent / 100) * h);

      const cropW = Math.min(width, w - left);
      const cropH = Math.min(height, h - top);
      const cropX = Math.max(0, left);
      const cropY = Math.max(0, top);

      const cropResult = spawnSync(
        ffmpegPath,
        [
          "-y",
          "-i",
          inputPath,
          "-vf",
          `crop=${cropW}:${cropH}:${cropX}:${cropY}`,
          "-frames:v",
          "1",
          "-q:v",
          "2",
          outputPath,
        ],
        { stdio: "pipe", encoding: "utf8" }
      );

      const spawnErr = cropResult.error as NodeJS.ErrnoException | undefined;
      if (spawnErr?.code === "ENOENT") {
        throw new Error(
          "ffmpeg not found. Install ffmpeg and add it to PATH, or set FFMPEG_PATH in .env to the full path (e.g. on Windows: C:\\ffmpeg\\bin\\ffmpeg.exe)."
        );
      }
      if (cropResult.status !== 0) {
        throw new Error(cropResult.stderr || cropResult.error?.message || "FFmpeg crop failed");
      }

      const croppedBuffer = await readFile(outputPath);
      const base64 = `data:image/png;base64,${croppedBuffer.toString("base64")}`;
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

      logger.log("Crop task completed", { nodeExecutionId, durationMs });
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

      logger.error("Crop task failed", { nodeExecutionId, error: message });
      throw error;
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  },
});
