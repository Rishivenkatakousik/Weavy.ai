"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Crop } from "lucide-react";
import { CropImageNodeData } from "@/src/types/workflow";
import { useWorkflowStore } from "@/src/store/workflowStore";

const CropImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as CropImageNodeData;
  const { updateNodeData, deleteNode, edges } = useWorkflowStore();
  const hasImageInput = edges.some((e) => e.target === id && e.targetHandle === "image");

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);

  const setX = useCallback(
    (v: number) => updateNodeData(id, { xPercent: v }),
    [id, updateNodeData]
  );
  const setY = useCallback(
    (v: number) => updateNodeData(id, { yPercent: v }),
    [id, updateNodeData]
  );
  const setWidth = useCallback(
    (v: number) => updateNodeData(id, { widthPercent: v }),
    [id, updateNodeData]
  );
  const setHeight = useCallback(
    (v: number) => updateNodeData(id, { heightPercent: v }),
    [id, updateNodeData]
  );

  return (
    <div
      className={`min-w-[320px] max-w-[400px] rounded-lg border bg-neutral-800 shadow-lg transition-all duration-200 ${
        selected ? "border-neutral-500 shadow-white/5" : "border-neutral-700 hover:border-neutral-600"
      }`}
    >
      <div className="flex items-center justify-between rounded-t-lg border-b border-neutral-700 bg-neutral-900 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="rounded bg-neutral-700 p-1">
            <Crop className="h-3 w-3 text-neutral-400" />
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
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">X %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={nodeData.xPercent}
              onChange={(e) => setX(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">Y %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={nodeData.yPercent}
              onChange={(e) => setY(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">Width %</span>
            <input
              type="number"
              min={1}
              max={100}
              value={nodeData.widthPercent}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white"
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">Height %</span>
            <input
              type="number"
              min={1}
              max={100}
              value={nodeData.heightPercent}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1 text-white"
            />
          </label>
        </div>
        {nodeData.outputUrl && (
          <div className="rounded border border-neutral-700 overflow-hidden">
            <img
              src={nodeData.outputUrl}
              alt="Cropped"
              className="h-24 w-full object-cover"
            />
          </div>
        )}
        {hasImageInput ? (
          <p className="text-[10px] text-neutral-500">Image input connected</p>
        ) : (
          <p className="text-[10px] text-neutral-500">Connect an image source to crop.</p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image"
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

CropImageNode.displayName = "CropImageNode";

export default CropImageNode;
