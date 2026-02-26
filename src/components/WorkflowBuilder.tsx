"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import Sidebar from "@/src/components/Sidebar";
import Canvas from "@/src/components/Canvas";
import HistorySidebar from "@/src/components/HistorySidebar";
import { useWorkflowStore } from "@/src/store/workflowStore";

const POLL_INTERVAL_MS = 2000;

function WorkflowBuilderInner() {
  const canvasWrapper = useRef<HTMLDivElement>(null);
  const {
    addNode,
    workflowName,
    setWorkflowName,
    workflowId,
    activeWorkflowRunId,
    setActiveWorkflowRunId,
    nodes,
    updateNodeData,
    requestHistoryRefresh,
  } = useWorkflowStore();

  // Clear active run when switching workflow
  useEffect(() => {
    return () => {
      setActiveWorkflowRunId(null);
    };
  }, [workflowId, setActiveWorkflowRunId]);

  // When a full workflow run is in progress, poll until done and apply outputs to nodes
  useEffect(() => {
    if (!activeWorkflowRunId || !workflowId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/workflows/${workflowId}/runs/${activeWorkflowRunId}`
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const run = data.run as {
          status: string;
          nodeExecutions?: Array<{
            nodeId: string;
            status: string;
            outputs: Record<string, unknown> | null;
            errorMessage: string | null;
          }>;
        };
        if (run.status !== "SUCCESS" && run.status !== "FAILED") return;

        if (cancelled) return;
        setActiveWorkflowRunId(null);
        requestHistoryRefresh();

        const executions = run.nodeExecutions ?? [];
        for (const ne of executions) {
          const node = nodes.find((n) => n.id === ne.nodeId);
          if (!node) continue;
          if (node.type === "llm") {
            const outputs = (ne.outputs ?? {}) as {
              content?: string;
              generatedImage?: string;
            };
            updateNodeData(ne.nodeId, {
              response: ne.status === "SUCCESS" ? (outputs.content ?? null) : null,
              generatedImage: ne.status === "SUCCESS" ? (outputs.generatedImage ?? null) : null,
              error: ne.status === "SUCCESS" ? null : (ne.errorMessage ?? "Run failed"),
            });
          } else if (node.type === "cropImage" || node.type === "extractFrame") {
            const outputs = (ne.outputs ?? {}) as { outputUrl?: string };
            updateNodeData(ne.nodeId, {
              outputUrl: ne.status === "SUCCESS" ? (outputs.outputUrl ?? null) : null,
            });
          }
        }
      } catch {
        if (!cancelled) setActiveWorkflowRunId(null);
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    activeWorkflowRunId,
    workflowId,
    nodes,
    updateNodeData,
    setActiveWorkflowRunId,
    requestHistoryRefresh,
  ]);
  const { screenToFlowPosition } = useReactFlow();

  const onDragStart = useCallback(
    (
      event: React.DragEvent,
      nodeType: "text" | "image" | "llm" | "video" | "cropImage" | "extractFrame"
    ) => {
      event.dataTransfer.setData("application/reactflow", nodeType);
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow"
      ) as "text" | "image" | "llm" | "video" | "cropImage" | "extractFrame";
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950">
      <div className="h-full shrink-0 pointer-events-auto">
        <Sidebar onDragStart={onDragStart} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="absolute left-4 top-4 z-10">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="min-w-[180px] rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm font-medium text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
            placeholder="untitled"
          />
        </div>
        <div ref={canvasWrapper} className="relative flex-1 min-h-0">
          <Canvas onDragOver={onDragOver} onDrop={onDrop} />
        </div>
      </div>

      <HistorySidebar />
    </div>
  );
}

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
}
