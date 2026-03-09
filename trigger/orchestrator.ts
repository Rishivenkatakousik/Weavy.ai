import { task, tasks, logger } from "@trigger.dev/sdk";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Node, Edge } from "@xyflow/react";
import { validateDAG } from "../lib/workflowValidation";
import {
  getExecutionPlan,
  getNodesToRun,
  getIncomingByNode,
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
    const incoming = getIncomingByNode(edges);

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
    const completedNodeIds = new Set<string>();
    const triggeredNodeIds = new Set<string>();

    while (completedNodeIds.size < toRun.size) {
      const depsInToRun = (nid: string) =>
        (incoming.get(nid) ?? []).filter((d) => toRun.has(d));
      const ready = [...toRun].filter(
        (nid) =>
          !triggeredNodeIds.has(nid) &&
          depsInToRun(nid).every((d) => completedNodeIds.has(d))
      );

      for (const nid of ready) {
        const node = nodes.find((n) => n.id === nid);
        if (!node) continue;
        const nodeExecutionId = nodeIdToExecutionId.get(nid)!;
        const inputs = resolveInputsForNode(nid, nodes, edges, executionOutputs);

        if (node.type === "llm") {
          const model = (inputs.model as string) ?? "gemini-2.5-flash";
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
            data: { inputs: inputs as Prisma.InputJsonValue },
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
            data: { inputs: inputs as Prisma.InputJsonValue },
          });
          await tasks.trigger<typeof extractFrameTask>("workflow-extract-frame", {
            workflowRunId,
            nodeExecutionId,
            videoUrl: videoUrl ?? "",
            timestampPercentage: (inputs.timestampPercentage as number) ?? 50,
          });
        }
        triggeredNodeIds.add(nid);
      }

      if (completedNodeIds.size === toRun.size) break;

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const executionIds = [...triggeredNodeIds].map((id) => nodeIdToExecutionId.get(id)!);
      const execs = await prisma.nodeExecution.findMany({
        where: { id: { in: executionIds } },
        select: { id: true, status: true, outputs: true, nodeId: true },
      });
      for (const e of execs) {
        if (e.status === "SUCCESS" || e.status === "FAILED") {
          completedNodeIds.add(e.nodeId);
          executionOutputs.set(e.nodeId, {
            outputs: (e.outputs as Record<string, unknown>) ?? null,
          });
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

    logger.log("Orchestrator completed", { workflowRunId, nodeCount: toRun.size });
    return { workflowRunId, nodeCount: toRun.size };
  },
});
