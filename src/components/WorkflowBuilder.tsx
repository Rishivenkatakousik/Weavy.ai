"use client";

import React, { useCallback, useRef } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import Sidebar from "@/src/components/Sidebar";
import Canvas from "@/src/components/Canvas";
import { useWorkflowStore } from "@/src/store/workflowStore";

function WorkflowBuilderInner() {
  const canvasWrapper = useRef<HTMLDivElement>(null);
  const { addNode, workflowName, setWorkflowName } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  const onDragStart = useCallback(
    (event: React.DragEvent, nodeType: "text" | "image" | "llm") => {
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
      ) as "text" | "image" | "llm";
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

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center border-b border-neutral-800 bg-neutral-950 px-4">
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="w-full max-w-2xs rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-sm font-medium text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
            placeholder="untitled"
          />
        </div>
        <div ref={canvasWrapper} className="relative flex-1 min-h-0">
          <Canvas onDragOver={onDragOver} onDrop={onDrop} />
        </div>
      </div>
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
