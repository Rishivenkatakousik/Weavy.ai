"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Trash2, Film, ChevronUp, ChevronDown } from "lucide-react";
import { ExtractFrameNodeData } from "@/src/types/workflow";
import { useWorkflowStore } from "@/src/store/workflowStore";

const DEFAULT_MAX_SECONDS = 86400; // 24h fallback when video duration unknown

const ExtractFrameNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as ExtractFrameNodeData;
  const { updateNodeData, deleteNode, edges, nodes } = useWorkflowStore();

  const videoEdge = edges.find((e) => e.target === id && e.targetHandle === "video");
  const videoSourceNode = videoEdge ? nodes.find((n) => n.id === videoEdge.source) : null;
  const connectedVideoUrl =
    videoSourceNode?.type === "video"
      ? (videoSourceNode.data as { videoUrl?: string | null }).videoUrl ?? null
      : null;
  const hasVideoInput = !!connectedVideoUrl;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const maxSeconds = nodeData.videoDurationSeconds ?? DEFAULT_MAX_SECONDS;
  const numericValue = Number(nodeData.timestampSeconds) || 0;
  const clampedValue = Math.max(0, Math.min(maxSeconds, numericValue));

  const [inputStr, setInputStr] = useState(String(clampedValue));

  // Resolve video duration from connected video so we can restrict timestamp to 0–duration
  useEffect(() => {
    if (!connectedVideoUrl) {
      updateNodeData(id, { videoDurationSeconds: undefined });
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const onLoaded = () => {
      const duration = video.duration;
      if (Number.isFinite(duration) && duration >= 0) {
        const secs = Math.floor(duration);
        const node = useWorkflowStore.getState().nodes.find((n) => n.id === id);
        const currentTs = (node?.data?.timestampSeconds as number) ?? 0;
        const payload: Partial<ExtractFrameNodeData> = { videoDurationSeconds: secs };
        if (currentTs > secs) payload.timestampSeconds = secs;
        updateNodeData(id, payload);
      }
      video.remove();
      video.src = "";
    };
    const onError = () => {
      video.remove();
      video.src = "";
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.src = connectedVideoUrl;
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
      video.src = "";
      video.remove();
    };
  }, [id, connectedVideoUrl, updateNodeData]);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setInputStr(String(clampedValue));
    }
  }, [clampedValue]);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);

  const commitTimestamp = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(maxSeconds, v));
      updateNodeData(id, { timestampSeconds: clamped });
      setInputStr(String(clamped));
    },
    [id, maxSeconds, updateNodeData]
  );

  const handleTimestampBlur = useCallback(() => {
    const parsed = Number.parseFloat(inputStr);
    if (!Number.isFinite(parsed)) {
      setInputStr(String(clampedValue));
      return;
    }
    commitTimestamp(Math.round(parsed));
  }, [inputStr, clampedValue, commitTimestamp]);

  const handleTimestampChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputStr(e.target.value);
  }, []);

  const handleStepUp = useCallback(() => {
    commitTimestamp(clampedValue + 1);
  }, [clampedValue, commitTimestamp]);

  const handleStepDown = useCallback(() => {
    if (clampedValue <= 0) return;
    commitTimestamp(clampedValue - 1);
  }, [clampedValue, commitTimestamp]);

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
          <div className="flex items-stretch gap-0 rounded border border-neutral-700 bg-neutral-950 overflow-hidden">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={inputStr}
              onChange={handleTimestampChange}
              onBlur={handleTimestampBlur}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.blur()}
              className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-inset focus:ring-neutral-500"
              aria-label="Timestamp in seconds"
            />
            <div className="flex flex-col border-l border-neutral-700">
              <button
                type="button"
                onClick={handleStepUp}
                disabled={clampedValue >= maxSeconds}
                className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Increase by 1 second"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleStepDown}
                disabled={clampedValue <= 0}
                className="flex flex-1 items-center justify-center px-1.5 py-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none"
                aria-label="Decrease by 1 second"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {nodeData.videoDurationSeconds != null && (
            <p className="text-[10px] text-neutral-500">
              Max {nodeData.videoDurationSeconds}s (video length)
            </p>
          )}
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
