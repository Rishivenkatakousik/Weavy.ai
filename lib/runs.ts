import { prisma } from "@/lib/prisma";
import { tasks } from "@trigger.dev/sdk";
import type { llmTask } from "@/trigger/llm";
import type { orchestratorTask } from "@/trigger/orchestrator";
import { getExecutionPlan } from "@/lib/execution";
import type { Node, Edge } from "@xyflow/react";

export type RunScope = "full" | "single" | "selected";

/**
 * Create a workflow run and trigger the orchestrator task (full / single / selected).
 * Loads workflow nodes/edges, validates plan, creates WorkflowRun, triggers orchestrator.
 */
export async function createRunAndTriggerOrchestrator(params: {
  workflowId: string;
  userId: string;
  scope: RunScope;
  nodeId?: string;
  selectedNodeIds?: string[];
}) {
  const workflow = await prisma.workflow.findFirst({
    where: { id: params.workflowId, userId: params.userId },
  });
  if (!workflow) throw new Error("Workflow not found");

  const nodes = (workflow.nodes as unknown) as Node[];
  const edges = (workflow.edges as unknown) as Edge[];
  const plan = getExecutionPlan(nodes, edges, params.scope, {
    nodeId: params.nodeId,
    selectedNodeIds: params.selectedNodeIds,
  });
  if (!plan.valid) throw new Error(plan.error);

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: params.workflowId,
      userId: params.userId,
      status: "RUNNING",
      scope: params.scope,
    },
  });

  const handle = await tasks.trigger<typeof orchestratorTask>("workflow-orchestrator", {
    workflowRunId: run.id,
    workflowId: params.workflowId,
    userId: params.userId,
    nodes,
    edges,
    scope: params.scope,
    nodeId: params.nodeId,
    selectedNodeIds: params.selectedNodeIds,
  });

  return { run, triggerHandle: handle };
}

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
