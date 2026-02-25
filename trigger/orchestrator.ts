import { task, tasks, logger } from "@trigger.dev/sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Node, Edge } from "@xyflow/react";
import { validateDAG } from "../lib/workflowValidation";
import {
  getExecutionPlan,
  getNodesToRun,
  getExecutionLevels,
  resolveInputsForNode,
  type RunScope,
} from "../lib/execution";
import type { llmTask } from "./llm";
import type { cropImageTask } from "./crop";
import type { extractFrameTask } from "./extractFrame";

function getPrisma() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

const POLL_INTERVAL_MS = 2000;

export const orchestratorTask = task({
  id: "workflow-orchestrator",
  run: async (payload: {
    workflowRunId: string;
    workflowId: string;
    userId: string;
    nodes: Node[];
    edges: Edge[];
    scope: RunScope;
    nodeId?: string;
    selectedNodeIds?: string[];
  }) => {
    const {
      workflowRunId,
      workflowId,
      userId,
      nodes,
      edges,
      scope,
      nodeId,
      selectedNodeIds,
    } = payload;
    const prisma = getPrisma();

    const dag = validateDAG(nodes, edges);
    if (!dag.valid) {
      throw new Error(dag.error);
    }

    const plan = getExecutionPlan(nodes, edges, scope, { nodeId, selectedNodeIds });
    if (!plan.valid) {
      throw new Error(plan.error);
    }

    const { order } = plan;
    const toRun = getNodesToRun(nodes, edges, scope, { nodeId, selectedNodeIds });
    const levels = getExecutionLevels(order, edges, toRun);

    const nodeIdToExecutionId = new Map<string, string>();

    for (const nid of order) {
      const exec = await prisma.nodeExecution.create({
        data: {
          workflowRunId,
          nodeId: nid,
          status: "PENDING",
        },
      });
      nodeIdToExecutionId.set(nid, exec.id);
    }

    const executionOutputs = new Map<string, { outputs: Record<string, unknown> | null }>();

    for (const levelNodeIds of levels) {
      for (const nid of levelNodeIds) {
        const node = nodes.find((n) => n.id === nid);
        if (!node) continue;
        const nodeExecutionId = nodeIdToExecutionId.get(nid)!;
        const inputs = resolveInputsForNode(nid, nodes, edges, executionOutputs);

        if (node.type === "llm") {
          const model = (inputs.model as string) ?? "gemini-2.0-flash";
          const systemPrompt = inputs.systemPrompt as string | undefined;
          const userPrompt = (inputs.userPrompt as string) ?? "";
          const images = inputs.images as string[] | undefined;
          await prisma.nodeExecution.update({
            where: { id: nodeExecutionId },
            data: { inputs: { model, systemPrompt, userPrompt, imageCount: images?.length ?? 0 } },
          });
          await tasks.trigger<typeof llmTask>("workflow-llm", {
            workflowRunId,
            nodeExecutionId,
            model,
            systemPrompt,
            userPrompt,
            images: images ?? [],
          });
        } else if (node.type === "cropImage") {
          const imageUrl = inputs.imageUrl as string | undefined;
          await prisma.nodeExecution.update({
            where: { id: nodeExecutionId },
            data: { inputs },
          });
          await tasks.trigger<typeof cropImageTask>("workflow-crop-image", {
            workflowRunId,
            nodeExecutionId,
            imageUrl: imageUrl ?? "",
            xPercent: (inputs.xPercent as number) ?? 0,
            yPercent: (inputs.yPercent as number) ?? 0,
            widthPercent: (inputs.widthPercent as number) ?? 100,
            heightPercent: (inputs.heightPercent as number) ?? 100,
          });
        } else if (node.type === "extractFrame") {
          const videoUrl = inputs.videoUrl as string | undefined;
          await prisma.nodeExecution.update({
            where: { id: nodeExecutionId },
            data: { inputs },
          });
          await tasks.trigger<typeof extractFrameTask>("workflow-extract-frame", {
            workflowRunId,
            nodeExecutionId,
            videoUrl: videoUrl ?? "",
            timestampSeconds: (inputs.timestampSeconds as number) ?? 0,
          });
        }
      }

      const executionIds = levelNodeIds.map((id) => nodeIdToExecutionId.get(id)!);
      let done = false;
      while (!done) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const execs = await prisma.nodeExecution.findMany({
          where: { id: { in: executionIds } },
          select: { id, status, outputs, nodeId: true },
        });
        done = execs.every(
          (e) => e.status === "SUCCESS" || e.status === "FAILED"
        );
        if (done) {
          for (const e of execs) {
            executionOutputs.set(e.nodeId, {
              outputs: (e.outputs as Record<string, unknown>) ?? null,
            });
          }
        }
      }
    }

    const run = await prisma.workflowRun.findUnique({
      where: { id: workflowRunId },
      include: { nodeExecutions: true },
    });
    const allDone =
      run?.nodeExecutions.every(
        (e) => e.status === "SUCCESS" || e.status === "FAILED"
      ) ?? false;
    const anyFailed = run?.nodeExecutions.some((e) => e.status === "FAILED") ?? false;
    if (run && allDone && run.status === "RUNNING") {
      await prisma.workflowRun.update({
        where: { id: workflowRunId },
        data: {
          status: anyFailed ? "FAILED" : "SUCCESS",
          finishedAt: new Date(),
          durationMs: Date.now() - run.startedAt.getTime(),
        },
      });
    }

    logger.log("Orchestrator completed", { workflowRunId, levelCount: levels.length });
    return { workflowRunId, levelCount: levels.length };
  },
});
