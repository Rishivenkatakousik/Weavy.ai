"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  reconnectEdge,
  Edge,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Lock,
  Unlock,
  Undo2,
  Redo2,
} from "lucide-react";

import { useWorkflowStore } from "@/src/store/workflowStore";
import TextNode from "./nodes/TextNode";
import ImageNode from "./nodes/ImageNode";
import LLMNode from "./nodes/LLMNode";
import VideoNode from "./nodes/VideoNode";
import CropImageNode from "./nodes/CropImageNode";
import ExtractFrameNode from "./nodes/ExtractFrameNode";

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  llm: LLMNode,
  video: VideoNode,
  cropImage: CropImageNode,
  extractFrame: ExtractFrameNode,
};

interface CanvasProps {
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
}

const CanvasInner: React.FC<CanvasProps> = ({ onDragOver, onDrop }) => {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setEdges,
    deleteNode,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [isLocked, setIsLocked] = useState(false);
  const edgeReconnectSuccessful = useRef(true);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges(reconnectEdge(oldEdge, newConnection, edges));
    },
    [edges, setEdges]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges(edges.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    [edges, setEdges]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable;
        if (isInputField) return;

        const selectedNodes = nodes.filter((node) => node.selected);
        selectedNodes.forEach((node) => deleteNode(node.id));
      }
    },
    [nodes, deleteNode]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="h-full flex-1"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        snapToGrid
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#525252", strokeWidth: 2 },
        }}
        nodesDraggable={!isLocked}
        nodesConnectable={!isLocked}
        elementsSelectable={!isLocked}
        panOnDrag={!isLocked}
        zoomOnScroll={!isLocked}
        className="bg-neutral-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={0.8}
          color="#525252"
        />

        <Panel position="bottom-center" className="mb-6">
          <div className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 shadow-lg">
            <button
              type="button"
              onClick={() => zoomIn()}
              className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => zoomOut()}
              className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => fitView({ padding: 0.2 })}
              className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white"
              title="Fit View"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
                isLocked
                  ? "bg-neutral-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-700 hover:text-white"
              }`}
              title={isLocked ? "Unlock" : "Lock"}
            >
              {isLocked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4" />
              )}
            </button>

            <div className="mx-1 h-5 w-px bg-neutral-700" />

            <button
              type="button"
              onClick={() => undo()}
              disabled={!canUndo()}
              className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              title="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => redo()}
              disabled={!canRedo()}
              className="flex h-8 w-8 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              title="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        </Panel>

        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case "text":
                return "#525252";
              case "image":
                return "#737373";
              case "llm":
                return "#a3a3a3";
              case "video":
                return "#6366f1";
              case "cropImage":
                return "#22c55e";
              case "extractFrame":
                return "#eab308";
              default:
                return "#404040";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!rounded-lg !border-neutral-700 !bg-neutral-900"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
};

const Canvas: React.FC<CanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default Canvas;
