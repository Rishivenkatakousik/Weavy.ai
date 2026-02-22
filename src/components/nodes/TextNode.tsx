"use client";

import React, { memo, useCallback } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Type } from "lucide-react";
import { TextNodeData } from "@/src/types/workflow";
import { useWorkflowStore } from "@/src/store/workflowStore";

const TextNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as TextNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { content: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  return (
    <div
      className={`min-w-[420px] max-w-[560px] rounded-lg border bg-neutral-800 shadow-lg transition-all duration-200 ${
        selected ? "border-neutral-500 shadow-white/5" : "border-neutral-700 hover:border-neutral-600"
      }`}
    >
      <div className="flex items-center justify-between rounded-t-lg border-b border-neutral-700 bg-neutral-900 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="rounded bg-neutral-700 p-1">
            <Type className="h-3 w-3 text-neutral-400" />
          </div>
          <input
            type="text"
            value={nodeData.label}
            onChange={handleLabelChange}
            className="min-w-[6rem] max-w-[14rem] flex-1 rounded bg-transparent px-1 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-neutral-500"
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

      <div className="p-3">
        <textarea
          value={nodeData.content}
          onChange={handleContentChange}
          placeholder="Enter text content..."
          className="h-44 w-full min-w-0 resize-none rounded border border-neutral-700 bg-neutral-950 p-2.5 text-sm font-normal text-neutral-300 placeholder-neutral-500 focus:border-neutral-600 focus:outline-none"
        />
      </div>

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

TextNode.displayName = "TextNode";

export default TextNode;
