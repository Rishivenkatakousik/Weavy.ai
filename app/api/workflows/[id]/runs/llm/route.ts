import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createRunAndTriggerLLM } from "@/lib/runs";

export const dynamic = "force-dynamic";

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
    const nodeId = body.nodeId as string | undefined;
    const model = (body.model as string) ?? "gemini-2.5-flash";
    const systemPrompt = body.systemPrompt as string | undefined;
    const userPrompt = body.userPrompt as string | undefined;
    const images = Array.isArray(body.images) ? (body.images as string[]) : undefined;

    if (!nodeId || typeof userPrompt !== "string") {
      return NextResponse.json(
        { error: "nodeId and userPrompt are required" },
        { status: 400 }
      );
    }

    const { run, nodeExecution, triggerHandle } = await createRunAndTriggerLLM({
      workflowId,
      userId,
      scope: "single",
      nodeId,
      model,
      systemPrompt,
      userPrompt,
      images,
    });

    return NextResponse.json({
      runId: run.id,
      nodeExecutionId: nodeExecution.id,
      triggerRunId: triggerHandle.id,
    });
  } catch (error) {
    console.error("Start LLM run error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to start LLM run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
