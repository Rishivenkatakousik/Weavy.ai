"use client";

import React, { memo, useCallback, useState, useEffect } from "react";
import {
  Handle,
  Position,
  NodeProps,
  useUpdateNodeInternals,
} from "@xyflow/react";
import {
  MoreHorizontal,
  Plus,
  ArrowRight,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  LLMNodeData,
  TextNodeData,
  ImageNodeData,
  GEMINI_MODELS,
} from "@/src/types/workflow";
import { useWorkflowStore } from "@/src/store/workflowStore";

const urlToBase64 = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const LLMNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as LLMNodeData;
  const {
    updateNodeData,
    deleteNode,
    deleteEdgeByHandle,
    nodes,
    edges,
  } = useWorkflowStore();
  const imageInputCount = (nodeData.imageInputCount as number) || 1;
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageInputCount, updateNodeInternals]);

  const connectedHandles = edges
    .filter((e) => e.target === id)
    .map((e) => e.targetHandle);
  const connectedSourceHandles = edges
    .filter((e) => e.source === id)
    .map((e) => e.sourceHandle);

  const handleDelete = useCallback(() => deleteNode(id), [id, deleteNode]);

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { label: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleHandleDoubleClick = useCallback(
    (
      e: React.MouseEvent,
      handleId: string,
      handleType: "source" | "target"
    ) => {
      const isConnected =
        handleType === "target"
          ? connectedHandles.includes(handleId)
          : connectedSourceHandles.includes(handleId);
      if (isConnected) {
        e.stopPropagation();
        e.preventDefault();
        deleteEdgeByHandle(id, handleId, handleType);
      }
    },
    [id, connectedHandles, connectedSourceHandles, deleteEdgeByHandle]
  );

  const addImageInput = useCallback(() => {
    if (imageInputCount < 5) {
      updateNodeData(id, { imageInputCount: imageInputCount + 1 });
    }
  }, [imageInputCount, id, updateNodeData]);

  const collectInputs = useCallback(async () => {
    const incomingEdges = edges.filter((e) => e.target === id);
    const images: string[] = [];
    let promptText = "";

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;
      const sourceHandle = edge.sourceHandle;

      if (sourceNode.type === "text") {
        const textData = sourceNode.data as TextNodeData;
        if (textData.content && targetHandle === "prompt") {
          promptText = textData.content;
        }
      } else if (sourceNode.type === "image") {
        const imageData = sourceNode.data as ImageNodeData;
        if (imageData.imageBase64) {
          images.push(imageData.imageBase64);
        } else if (imageData.imageUrl?.startsWith("http")) {
          const base64 = await urlToBase64(imageData.imageUrl);
          if (base64) images.push(base64);
        }
      } else if (sourceNode.type === "llm") {
        const llmData = sourceNode.data as LLMNodeData;
        if (
          llmData.response &&
          targetHandle === "prompt" &&
          sourceHandle === "output"
        ) {
          promptText = llmData.response;
        }
        if (
          llmData.generatedImage &&
          targetHandle?.startsWith("image-") &&
          sourceHandle === "image-output"
        ) {
          images.push(llmData.generatedImage);
        }
      }
    }
    return { images, promptText };
  }, [id, nodes, edges]);

  const handleRun = useCallback(async () => {
    updateNodeData(id, {
      isLoading: true,
      error: null,
      response: null,
      generatedImage: null,
    });
    try {
      const { images, promptText } = await collectInputs();
      const fullUserPrompt =
        promptText || nodeData.userPrompt || nodeData.systemPrompt || "";

      if (!fullUserPrompt) {
        updateNodeData(id, {
          error: "Please connect a Prompt input or enter a system prompt",
          isLoading: false,
        });
        return;
      }

      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: nodeData.model || "gemini-2.0-flash",
          systemPrompt: nodeData.systemPrompt || undefined,
          userPrompt: fullUserPrompt,
          images: images.length > 0 ? images : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        updateNodeData(id, {
          response: result.content,
          generatedImage: result.image || null,
          isLoading: false,
        });
      } else {
        updateNodeData(id, {
          error: result.error,
          isLoading: false,
        });
      }
    } catch (error) {
      updateNodeData(id, {
        error: error instanceof Error ? error.message : "An error occurred",
        isLoading: false,
      });
    }
  }, [id, nodeData, updateNodeData, collectInputs]);

  const showLabels = isHovered;

  return (
    <div
      className={`w-[380px] rounded-xl border shadow-lg transition-all duration-200 ${
        selected
          ? "border-neutral-500 bg-neutral-800 shadow-white/10"
          : "border-neutral-600 bg-neutral-800/95 hover:border-neutral-500"
      } ${nodeData.isLoading ? "border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.25)]" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{
          top: "60px",
          cursor: connectedHandles.includes("prompt") ? "pointer" : "crosshair",
        }}
        className={`!h-3 !w-3 !border-2 !border-violet-400 ${
          connectedHandles.includes("prompt") ? "!bg-violet-400" : "!bg-transparent"
        }`}
        onDoubleClick={(e) => handleHandleDoubleClick(e, "prompt", "target")}
      />
      {(showLabels || !connectedHandles.includes("prompt")) && (
        <div
          className="absolute text-xs text-violet-400"
          style={{ left: "-60px", top: "55px" }}
        >
          Prompt*
        </div>
      )}

      {Array.from({ length: imageInputCount }).map((_, i) => {
        const handleId = `image-${i}`;
        const isConnected = connectedHandles.includes(handleId);
        return (
          <React.Fragment key={i}>
            <Handle
              type="target"
              position={Position.Left}
              id={handleId}
              style={{
                top: `${90 + i * 30}px`,
                cursor: isConnected ? "pointer" : "crosshair",
              }}
              className={`!h-3 !w-3 !border-2 !border-emerald-400 ${
                isConnected ? "!bg-emerald-400" : "!bg-transparent"
              }`}
              onDoubleClick={(e) =>
                handleHandleDoubleClick(e, handleId, "target")
              }
            />
            {(showLabels || !isConnected) && (
              <div
                className="absolute text-xs text-emerald-400"
                style={{ left: "-55px", top: `${85 + i * 30}px` }}
              >
                Image {i + 1}
              </div>
            )}
          </React.Fragment>
        );
      })}

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          top: "60px",
          cursor: connectedSourceHandles.includes("output")
            ? "pointer"
            : "crosshair",
        }}
        className={`!h-3 !w-3 !border-2 !border-violet-400 ${
          connectedSourceHandles.includes("output")
            ? "!bg-violet-400"
            : "!bg-transparent"
        }`}
        onDoubleClick={(e) => handleHandleDoubleClick(e, "output", "source")}
      />
      {showLabels && (
        <div
          className="absolute text-xs text-violet-400"
          style={{ right: "-35px", top: "55px" }}
        >
          Text
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="image-output"
        style={{
          top: "90px",
          cursor: connectedSourceHandles.includes("image-output")
            ? "pointer"
            : "crosshair",
        }}
        className={`!h-3 !w-3 !border-2 !border-emerald-400 ${
          connectedSourceHandles.includes("image-output")
            ? "!bg-emerald-400"
            : "!bg-transparent"
        }`}
        onDoubleClick={(e) =>
          handleHandleDoubleClick(e, "image-output", "source")
        }
      />
      {showLabels && (
        <div
          className="absolute text-xs text-emerald-400"
          style={{ right: "-40px", top: "85px" }}
        >
          Image
        </div>
      )}

      <div className="flex items-center justify-between border-b border-neutral-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={nodeData.label ?? "LLM"}
            onChange={handleLabelChange}
            className="min-w-[4rem] max-w-[10rem] rounded bg-transparent px-1 text-base font-medium text-white focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
          <div className="relative">
            <select
              value={nodeData.model || "gemini-2.0-flash"}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="cursor-pointer appearance-none rounded border border-neutral-600 bg-neutral-900 px-2 py-1 pr-6 text-xs text-neutral-300 focus:border-neutral-500 focus:outline-none hover:border-neutral-500"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 hover:bg-neutral-600"
          >
            <MoreHorizontal className="h-5 w-5 text-neutral-400" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-10 rounded-lg border border-neutral-600 bg-neutral-900 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  handleDelete();
                  setShowMenu(false);
                }}
                className="px-4 py-2 text-sm text-red-400 hover:bg-neutral-800"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        <textarea
          value={nodeData.systemPrompt || ""}
          onChange={(e) =>
            updateNodeData(id, { systemPrompt: e.target.value })
          }
          placeholder="Enter system prompt or instructions..."
          className="h-16 w-full resize-none rounded-lg border border-neutral-600 bg-neutral-900 p-3 text-sm font-normal text-neutral-300 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
        />
      </div>

      <div className="p-4">
        <div className="max-h-[300px] min-h-[140px] w-full overflow-y-auto rounded-lg border border-neutral-600 bg-neutral-800/50 p-4">
          {nodeData.isLoading ? (
            <div className="flex h-[110px] flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
              <span className="text-xs text-neutral-500">
                Analyzing intent & generating...
              </span>
            </div>
          ) : nodeData.error ? (
            <p className="text-sm text-red-400">{nodeData.error}</p>
          ) : nodeData.response || nodeData.generatedImage ? (
            <div className="space-y-3">
              {nodeData.generatedImage && (
                <div>
                  <div className="overflow-hidden rounded-lg border border-neutral-600">
                    <img
                      src={nodeData.generatedImage}
                      alt="Generated"
                      className="max-h-[200px] w-full object-contain bg-neutral-900"
                    />
                  </div>
                  <a
                    href={nodeData.generatedImage}
                    download="generated-image.png"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    ↓ Download Image
                  </a>
                </div>
              )}
              {nodeData.response && (
                <p className="whitespace-pre-wrap text-sm text-neutral-300">
                  {nodeData.response}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              Text or image will appear here
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-neutral-600 px-4 py-3">
        <button
          type="button"
          disabled={imageInputCount >= 5}
          onClick={addImageInput}
          className="flex items-center gap-2 text-xs text-neutral-400 hover:text-white disabled:opacity-50 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add another image input</span>
        </button>

        <button
          type="button"
          disabled={nodeData.isLoading}
          onClick={handleRun}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium cursor-pointer text-white disabled:opacity-50"
        >
          <ArrowRight className="h-4 w-4" />
          <span>Run Model</span>
        </button>
      </div>
    </div>
  );
});

LLMNode.displayName = "LLMNode";

export default LLMNode;
