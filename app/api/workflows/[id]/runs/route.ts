import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createRunAndTriggerLLM, getWorkflowRuns } from "@/lib/runs";

export const dynamic = "force-dynamic";

// GET - List runs for this workflow (history)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const runs = await getWorkflowRuns(workflowId, userId);
    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Get runs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 }
    );
  }
}

// POST - Start a run (create WorkflowRun + NodeExecutions and trigger LLM task for one node)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workflowId } = await params;
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, userId },
    });
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    const body = await request.json();
    const scope = (body.scope as "full" | "single" | "selected") ?? "single";
    const nodeId = body.nodeId as string;
    const model = body.model as string;
    const systemPrompt = body.systemPrompt as string | undefined;
    const userPrompt = body.userPrompt as string;
    const images = body.images as string[] | undefined;

    if (!nodeId || !model || typeof userPrompt !== "string") {
      return NextResponse.json(
        { error: "nodeId, model, and userPrompt are required" },
        { status: 400 }
      );
    }

    const { run, nodeExecution, triggerHandle } = await createRunAndTriggerLLM({
      workflowId,
      userId,
      scope,
      nodeId,
      model,
      systemPrompt,
      userPrompt,
      images,
    });

    return NextResponse.json({
      run,
      nodeExecution,
      triggerRunId: triggerHandle.id,
    });
  } catch (error) {
    console.error("Create run error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
