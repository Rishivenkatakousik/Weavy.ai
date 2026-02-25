import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import { uploadImage } from "../lib/transloadit";

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
    timestampSeconds: number;
  }) => {
    const startedAt = Date.now();
    const { workflowRunId, nodeExecutionId, videoUrl, timestampSeconds } = payload;
    const prisma = getPrisma();

    const ffmpegPath = process.env.FFMPEG_PATH ?? "ffmpeg";
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

      const result = spawnSync(
        ffmpegPath,
        [
          "-y",
          "-ss",
          String(timestampSeconds),
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
