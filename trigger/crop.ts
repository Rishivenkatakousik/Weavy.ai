import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import sharp from "sharp";
import { uploadImage } from "../lib/transloadit";

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

    try {
      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: { status: "RUNNING" },
      });

      const res = await fetch(imageUrl);
      const arrayBuffer = await res.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuffer);
      const meta = await sharp(inputBuffer).metadata();
      const w = meta.width ?? 1;
      const h = meta.height ?? 1;

      const left = Math.round((xPercent / 100) * w);
      const top = Math.round((yPercent / 100) * h);
      const width = Math.round((widthPercent / 100) * w);
      const height = Math.round((heightPercent / 100) * h);

      const cropped = await sharp(inputBuffer)
        .extract({
          left: Math.max(0, left),
          top: Math.max(0, top),
          width: Math.min(width, w - left),
          height: Math.min(height, h - top),
        })
        .png()
        .toBuffer();

      const base64 = `data:image/png;base64,${cropped.toString("base64")}`;
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
    }
  },
});
