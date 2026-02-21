"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { ImageNodeData } from "@/src/types/workflow";
import { useWorkflowStore } from "@/src/store/workflowStore";

const ImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ImageNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => {
    deleteNode(id);
  }, [id, deleteNode]);

  const uploadImage = useCallback(
    async (base64: string) => {
      setIsUploading(true);
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const result = await res.json();
        if (result.url) {
          updateNodeData(id, { imageUrl: result.url, imageBase64: base64 });
        } else {
          updateNodeData(id, { imageUrl: base64, imageBase64: base64 });
        }
      } catch {
        updateNodeData(id, { imageUrl: base64, imageBase64: base64 });
      } finally {
        setIsUploading(false);
      }
    },
    [id, updateNodeData]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          uploadImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [uploadImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          uploadImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    },
    [uploadImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearImage = useCallback(() => {
    updateNodeData(id, { imageUrl: null, imageBase64: null });
  }, [id, updateNodeData]);

  const displayImageSrc = nodeData.imageUrl || nodeData.imageBase64;

  return (
    <div
      className={`min-w-[312px] max-w-[416px] rounded-lg border bg-neutral-800 shadow-lg transition-all duration-200 ${
        selected ? "border-neutral-500 shadow-white/5" : "border-neutral-700 hover:border-neutral-600"
      }`}
    >
      <div className="flex items-center justify-between rounded-t-lg border-b border-neutral-700 bg-neutral-900 px-2 py-1.5">
        <div className="flex items-center gap-2">
          <div className="rounded bg-neutral-700 p-1">
            <ImageIcon className="h-3 w-3 text-neutral-400" />
          </div>
          <input
            type="text"
            value={nodeData.label}
            onChange={handleLabelChange}
            className="w-16 truncate rounded bg-transparent px-1 text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-neutral-500"
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-700">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            <span className="text-xs text-neutral-500">Uploading...</span>
          </div>
        ) : displayImageSrc ? (
          <div className="relative">
            <img
              src={displayImageSrc}
              alt="Uploaded"
              className="h-36 w-full rounded border border-neutral-700 object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute right-2 top-2 rounded bg-black/70 p-1.5 hover:bg-neutral-600"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="flex h-36 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900"
          >
            <Upload className="h-6 w-6 text-neutral-500" />
            <span className="text-xs text-neutral-500">Upload</span>
          </div>
        )}
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

ImageNode.displayName = "ImageNode";

export default ImageNode;
