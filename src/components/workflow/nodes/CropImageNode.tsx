"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Crop, ChevronUp, ChevronDown } from "lucide-react";
import { CropImageNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

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

  const x = Math.max(0, Math.min(100, Number(nodeData.xPercent) || 0));
  const y = Math.max(0, Math.min(100, Number(nodeData.yPercent) || 0));
  const w = Math.max(1, Math.min(100, Number(nodeData.widthPercent) || 100));
  const h = Math.max(1, Math.min(100, Number(nodeData.heightPercent) || 100));

  const step = 1;
  const stepX = (delta: number) => setX(Math.max(0, Math.min(100, x + delta)));
  const stepY = (delta: number) => setY(Math.max(0, Math.min(100, y + delta)));
  const stepW = (delta: number) => setWidth(Math.max(1, Math.min(100, w + delta)));
  const stepH = (delta: number) => setHeight(Math.max(1, Math.min(100, h + delta)));

  return (
    <div
      className={`min-w-[320px] max-w-[400px] rounded-lg border bg-neutral-800 shadow-lg transition-all duration-200 ${
        selected
          ? "border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          : "border-neutral-700 hover:border-neutral-600"
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
            <div className="flex items-stretch gap-0 rounded border border-neutral-700 bg-neutral-950 overflow-hidden">
              <input
                type="number"
                min={0}
                max={100}
                value={nodeData.xPercent}
                onChange={(e) => setX(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="X percent"
              />
              <div className="flex flex-col border-l border-neutral-700">
                <button
                  type="button"
                  onClick={() => stepX(step)}
                  disabled={x >= 100}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Increase X"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepX(-step)}
                  disabled={x <= 0}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Decrease X"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">Y %</span>
            <div className="flex items-stretch gap-0 rounded border border-neutral-700 bg-neutral-950 overflow-hidden">
              <input
                type="number"
                min={0}
                max={100}
                value={nodeData.yPercent}
                onChange={(e) => setY(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Y percent"
              />
              <div className="flex flex-col border-l border-neutral-700">
                <button
                  type="button"
                  onClick={() => stepY(step)}
                  disabled={y >= 100}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Increase Y"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepY(-step)}
                  disabled={y <= 0}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Decrease Y"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">Width %</span>
            <div className="flex items-stretch gap-0 rounded border border-neutral-700 bg-neutral-950 overflow-hidden">
              <input
                type="number"
                min={1}
                max={100}
                value={nodeData.widthPercent}
                onChange={(e) => setWidth(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Width percent"
              />
              <div className="flex flex-col border-l border-neutral-700">
                <button
                  type="button"
                  onClick={() => stepW(step)}
                  disabled={w >= 100}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Increase width"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepW(-step)}
                  disabled={w <= 1}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Decrease width"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-neutral-500">Height %</span>
            <div className="flex items-stretch gap-0 rounded border border-neutral-700 bg-neutral-950 overflow-hidden">
              <input
                type="number"
                min={1}
                max={100}
                value={nodeData.heightPercent}
                onChange={(e) => setHeight(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-neutral-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Height percent"
              />
              <div className="flex flex-col border-l border-neutral-700">
                <button
                  type="button"
                  onClick={() => stepH(step)}
                  disabled={h >= 100}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Increase height"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => stepH(-step)}
                  disabled={h <= 1}
                  className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                  aria-label="Decrease height"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
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
