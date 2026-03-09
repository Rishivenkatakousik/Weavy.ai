import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createRunAndTriggerOrchestrator, getWorkflowRuns } from "@/lib/runs";

export const dynamic = "force-dynamic";


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

    const body = await request.json().catch(() => ({}));
    const scope = (body.scope as "full" | "single" | "selected") ?? "full";
    const nodeId = body.nodeId as string | undefined;
    const selectedNodeIds = body.selectedNodeIds as string[] | undefined;

    if (scope === "single" && !nodeId) {
      return NextResponse.json(
        { error: "nodeId is required when scope is single" },
        { status: 400 }
      );
    }
    if (scope === "selected" && (!selectedNodeIds || !Array.isArray(selectedNodeIds) || selectedNodeIds.length === 0)) {
      return NextResponse.json(
        { error: "selectedNodeIds (non-empty array) is required when scope is selected" },
        { status: 400 }
      );
    }

    const { run, triggerHandle } = await createRunAndTriggerOrchestrator({
      workflowId,
      userId,
      scope,
      nodeId,
      selectedNodeIds,
    });

    return NextResponse.json({
      run,
      triggerRunId: triggerHandle.id,
    });
  } catch (error) {
    console.error("Create run error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
