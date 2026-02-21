"use client";

import React, { useCallback, useRef } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import Sidebar from "@/src/components/Sidebar";
import Canvas from "@/src/components/Canvas";
import { useWorkflowStore } from "@/src/store/workflowStore";

function WorkflowBuilderInner() {
  const canvasWrapper = useRef<HTMLDivElement>(null);
  const { addNode } = useWorkflowStore();
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
    <div className="relative h-screen w-screen overflow-hidden bg-neutral-950">
      <div ref={canvasWrapper} className="absolute inset-0">
        <Canvas onDragOver={onDragOver} onDrop={onDrop} />
      </div>

      <div className="absolute left-0 top-0 z-50 h-full pointer-events-none">
        <div className="h-full pointer-events-auto">
          <Sidebar onDragStart={onDragStart} />
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
