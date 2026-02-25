import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";
import type { llmTask } from "@/trigger/llm";

export type RunScope = "full" | "single" | "selected";

/**
 * Create a workflow run and a single LLM node execution, then trigger the LLM task.
 * Returns the created WorkflowRun and the Trigger.dev run handle.
 */
export async function createRunAndTriggerLLM(params: {
  workflowId: string;
  userId: string;
  scope: RunScope;
  nodeId: string;
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  images?: string[];
}) {
  const run = await prisma.workflowRun.create({
    data: {
      workflowId: params.workflowId,
      userId: params.userId,
      status: "RUNNING",
      scope: params.scope,
    },
  });

  const nodeExecution = await prisma.nodeExecution.create({
    data: {
      workflowRunId: run.id,
      nodeId: params.nodeId,
      status: "PENDING",
      inputs: {
        model: params.model,
        systemPrompt: params.systemPrompt ?? null,
        userPrompt: params.userPrompt,
        imageCount: params.images?.length ?? 0,
      },
    },
  });

  const handle = await tasks.trigger<typeof llmTask>("workflow-llm", {
    workflowRunId: run.id,
    nodeExecutionId: nodeExecution.id,
    model: params.model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    images: params.images,
  });

  return { run, nodeExecution, triggerHandle: handle };
}

/**
 * Get workflow runs for a workflow (for history panel).
 */
export async function getWorkflowRuns(workflowId: string, userId: string) {
  return prisma.workflowRun.findMany({
    where: { workflowId, userId },
    orderBy: { startedAt: "desc" },
    include: { nodeExecutions: true },
    take: 50,
  });
}

/**
 * Get a single run with node executions.
 */
export async function getWorkflowRun(runId: string, userId: string) {
  return prisma.workflowRun.findFirst({
    where: { id: runId, userId },
    include: { nodeExecutions: true },
  });
}
