import { task, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateContentGemini } from "@/lib/gemini";

function getPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const llmTask = task({
  id: "workflow-llm",
  run: async (payload: {
    workflowRunId: string;
    nodeExecutionId: string;
    model: string;
    systemPrompt?: string;
    userPrompt: string;
    images?: string[];
  }) => {
    const startedAt = Date.now();
    const { workflowRunId, nodeExecutionId, model, systemPrompt, userPrompt, images } = payload;
    const prisma = getPrisma();

    try {
      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: { status: "RUNNING" },
      });

      const content = await generateContentGemini(
        model,
        systemPrompt ?? undefined,
        userPrompt,
        images
      );

      const finishedAt = Date.now();
      const durationMs = finishedAt - startedAt;

      await prisma.nodeExecution.update({
        where: { id: nodeExecutionId },
        data: {
          status: "SUCCESS",
          outputs: { content: content ?? null },
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

      logger.log("LLM task completed", { nodeExecutionId, durationMs });
      return { content: content ?? null, durationMs };
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

      logger.error("LLM task failed", { nodeExecutionId, error: message });
      throw error;
    }
  },
});
