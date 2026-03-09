"use client";

import React, { memo, useCallback, useRef, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { ImageNodeData } from "@/types/workflow";
import { useWorkflowStore } from "@/store/workflowStore";

const TRANSLOADIT_ASSEMBLY_URL = "https://api2.transloadit.com/assemblies";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 120;

async function pollAssemblyUntilComplete(assemblyUrl: string): Promise<string> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    const res = await fetch(assemblyUrl);
    const data = (await res.json()) as {
      ok?: string;
      results?: { image?: Array<{ ssl_url?: string; url?: string }> };
    };
    if (data.ok === "ASSEMBLY_COMPLETED") {
      const first = data.results?.image?.[0];
      const url = first?.ssl_url ?? first?.url;
      if (url && typeof url === "string") return url;
      throw new Error("Assembly completed but no image URL in results");
    }
    if (data.ok === "ASSEMBLY_CANCELED" || data.ok === "ASSEMBLY_ERROR") {
      const msg = (data as { message?: string }).message ?? "Assembly failed";
      throw new Error(msg);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error("Upload timed out");
}

const ImageNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ImageNodeData;
  const { updateNodeData, deleteNode } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    async (file: File) => {
      setUploadError(null);
      setIsUploading(true);
      try {
        const signRes = await fetch("/api/upload/sign?type=image", {
          method: "POST",
        });
        if (!signRes.ok) {
          const err = await signRes.json().catch(() => ({}));
          throw new Error(err?.error ?? "Failed to get upload signature");
        }
        const { params, signature } = await signRes.json();

        const formData = new FormData();
        formData.append("params", params);
        formData.append("signature", signature);
        formData.append("file1", file);

        const uploadRes = await fetch(TRANSLOADIT_ASSEMBLY_URL, {
          method: "POST",
          body: formData,
        });
        const uploadData = (await uploadRes.json()) as {
          ok?: string;
          assembly_ssl_url?: string;
          message?: string;
        };

        if (!uploadRes.ok || !uploadData.assembly_ssl_url) {
          throw new Error(
            uploadData.message ?? "Upload to Transloadit failed"
          );
        }

        const imageUrl = await pollAssemblyUntilComplete(
          uploadData.assembly_ssl_url
        );
        updateNodeData(id, { imageUrl, imageBase64: undefined });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Upload failed.";
        setUploadError(message);
      } finally {
        setIsUploading(false);
      }
    },
    [id, updateNodeData]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadImage(file);
    },
    [uploadImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
      if (file && allowed.includes(file.type)) {
        uploadImage(file);
      }
    },
    [uploadImage]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const clearImage = useCallback(() => {
    setUploadError(null);
    updateNodeData(id, { imageUrl: null, imageBase64: null });
  }, [id, updateNodeData]);

  const displayImageSrc = nodeData.imageUrl || nodeData.imageBase64;

  return (
    <div
      className={`min-w-[360px] max-w-[480px] rounded-lg border bg-neutral-800 shadow-lg transition-all duration-200 ${
        selected
          ? "border-2 border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          : "border-neutral-700 hover:border-neutral-600"
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

      <div className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <div className="flex h-40 w-full min-w-0 flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-700">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
            <span className="text-xs text-neutral-500">Uploading...</span>
          </div>
        ) : displayImageSrc ? (
          <div className="relative">
            <img
              src={displayImageSrc}
              alt="Uploaded"
              className="h-40 w-full min-w-0 rounded border border-neutral-700 object-cover"
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
          <div className="flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex h-40 w-full min-w-0 cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-neutral-700 hover:border-neutral-600 hover:bg-neutral-900"
            >
              <Upload className="h-6 w-6 text-neutral-500" />
              <span className="text-xs text-neutral-500">Upload</span>
            </div>
            {uploadError && (
              <p className="text-xs text-red-400" title={uploadError}>
                {uploadError}
              </p>
            )}
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
