"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Film } from "lucide-react";
import { ExtractFrameNodeData } from "@/src/types/workflow";
import { useWorkflowStore } from "@/src/store/workflowStore";

const ExtractFrameNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ExtractFrameNodeData;
  const { updateNodeData, deleteNode, edges } = useWorkflowStore();
  const hasVideoInput = edges.some((e) => e.target === id && e.targetHandle === "video");

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);

  const setTimestamp = useCallback(
    (v: number) => updateNodeData(id, { timestampSeconds: v }),
    [id, updateNodeData]
  );

  return (
    <div
      className={`min-w-[300px] max-w-[380px] rounded-lg border bg-neutral-800 shadow-lg transition-all duration-200 ${
        selected ? "border-neutral-500 shadow-white/5" : "border-neutral-700 hover:border-neutral-600"
      }`}
    >
      <div className="flex items-center justify-between rounded-t-lg border-b border-neutral-700 bg-neutral-900 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="rounded bg-neutral-700 p-1">
            <Film className="h-3 w-3 text-neutral-400" />
          </div>
          <input
            type="text"
            value={nodeData.label}
            onChange={handleLabelChange}
            className="min-w-[5rem] max-w-[12rem] flex-1 rounded bg-transparent px-1 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded p-1 hover:bg-neutral-700 group"
        >
          <Trash2 className="h-3 w-3 text-neutral-500 group-hover:text-white" />
        </button>
      </div>

      <div className="p-3 space-y-3">
        <label className="flex flex-col gap-0.5 text-xs">
          <span className="text-neutral-500">Timestamp (seconds)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={nodeData.timestampSeconds}
            onChange={(e) => setTimestamp(Number(e.target.value))}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white"
          />
        </label>
        {nodeData.outputUrl && (
          <div className="rounded border border-neutral-700 overflow-hidden">
            <img
              src={nodeData.outputUrl}
              alt="Frame"
              className="h-24 w-full object-cover"
            />
          </div>
        )}
        {hasVideoInput ? (
          <p className="text-[10px] text-neutral-500">Video input connected</p>
        ) : (
          <p className="text-[10px] text-neutral-500">Connect a video source to extract a frame.</p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="video"
        style={{ top: "50%" }}
        className="!h-3 !w-3 !-translate-x-0 !border-2 !border-neutral-400 !bg-neutral-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: "50%" }}
        className="!h-3 !w-3 !-translate-x-0 !border-2 !border-neutral-400 !bg-neutral-500"
      />
    </div>
  );
});

ExtractFrameNode.displayName = "ExtractFrameNode";

export default ExtractFrameNode;
