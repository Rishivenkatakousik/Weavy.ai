"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import WorkflowBuilder from "@/src/components/WorkflowBuilder";
import { useWorkflowStore } from "@/src/store/workflowStore";

function LoaderIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function WorkflowEditorPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);
  const loadedWorkflowIdRef = useRef<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);

  const {
    workflowName,
    nodes,
    edges,
    setWorkflowId,
    setWorkflowName,
    setNodes,
    setEdges,
  } = useWorkflowStore();

  const loadWorkflow = useCallback(async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await res.json();
      if (data.workflow) {
        if (data.workflow.id !== workflowId) return;

        const loadedNodes = (data.workflow.nodes ?? []) as typeof nodes;
        const loadedEdges = (data.workflow.edges ?? []) as typeof edges;

        setWorkflowId(data.workflow.id);
        setWorkflowName(data.workflow.name ?? "Untitled Workflow");
        setNodes(loadedNodes);
        setEdges(loadedEdges);

        hasLoadedRef.current = true;
        loadedWorkflowIdRef.current = data.workflow.id;
        lastLoadTimeRef.current = Date.now();
      }
    } catch (error) {
      console.error("Failed to load workflow:", error);
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, router, setWorkflowId, setWorkflowName, setNodes, setEdges]);

  useEffect(() => {
    if (workflowId) {
      hasLoadedRef.current = false;
      loadedWorkflowIdRef.current = null;
      setIsLoading(true);
      loadWorkflow();
    }
    return () => {
      hasLoadedRef.current = false;
      loadedWorkflowIdRef.current = null;
    };
  }, [workflowId, loadWorkflow]);

  const [isSaving, setIsSaving] = useState(false);

  const saveWorkflow = useCallback(async () => {
    if (
      !workflowId ||
      isSaving ||
      !hasLoadedRef.current ||
      loadedWorkflowIdRef.current !== workflowId
    )
      return;

    const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
    if (timeSinceLoad < 3000) return;

    const isAnyNodeLoading = nodes.some(
      (node) =>
        node.type === "llm" &&
        (node.data as { isLoading?: boolean }).isLoading
    );
    if (isAnyNodeLoading) return;

    const sanitizedNodes = nodes.map((node) => {
      if (node.type === "llm") {
        const { isLoading, ...restData } = node.data as Record<string, unknown>;
        return { ...node, data: { ...restData, isLoading: false } };
      }
      if (node.type === "image") {
        const imageData = node.data as {
          imageUrl?: string;
          imageBase64?: string;
          label?: string;
        };
        if (imageData.imageUrl?.startsWith("http")) {
          return {
            ...node,
            data: {
              label: imageData.label,
              imageUrl: imageData.imageUrl,
              imageBase64: null,
            },
          };
        }
        if (imageData.imageBase64) {
          return {
            ...node,
            data: {
              label: imageData.label,
              imageUrl: imageData.imageBase64,
              imageBase64: imageData.imageBase64,
            },
          };
        }
      }
      return node;
    });

    setIsSaving(true);
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          nodes: sanitizedNodes,
          edges,
        }),
      });
    } catch (error) {
      console.error("Failed to save workflow:", error);
    } finally {
      setIsSaving(false);
    }
  }, [workflowId, workflowName, nodes, edges, isSaving]);

  useEffect(() => {
    if (!isLoading && workflowId) {
      const timer = setTimeout(saveWorkflow, 2000);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, workflowName, isLoading, workflowId, saveWorkflow]);

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-neutral-950">
        <LoaderIcon className="h-8 w-8 animate-spin text-amber-400" />
        <p className="mt-4 text-sm text-neutral-400">Loading workflow...</p>
      </div>
    );
  }

  return <WorkflowBuilder />;
}
