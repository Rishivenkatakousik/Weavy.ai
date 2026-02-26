"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import WorkflowBuilder from "@/src/components/WorkflowBuilder";
import { useWorkflowStore } from "@/src/store/workflowStore";
import Loading from "@/components/Loading";

export default function WorkflowEditorPage() {
  const router = useRouter();
  const params = useParams();
  const workflowId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);

  const hasLoadedRef = useRef(false);
  const loadedWorkflowIdRef = useRef<string | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const saveInProgressRef = useRef(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const {
    workflowName,
    nodes,
    edges,
    requestSaveTrigger,
    setWorkflowId,
    setWorkflowName,
    setNodes,
    setEdges,
  } = useWorkflowStore();

  const loadWorkflow = useCallback(async () => {
    if (!workflowId) return;
    const idToLoad = workflowId;
    try {
      const res = await fetch(`/api/workflows/${idToLoad}`);
      if (!res.ok) {
        router.push("/dashboard");
        return;
      }

      const data = await res.json();
      if (data.workflow) {
        if (data.workflow.id !== idToLoad) return;
        if (loadedWorkflowIdRef.current === idToLoad) return;

        const loadedNodes = (data.workflow.nodes ?? []) as typeof nodes;
        const loadedEdges = (data.workflow.edges ?? []) as typeof edges;

        setWorkflowId(data.workflow.id);
        setWorkflowName(data.workflow.name ?? "Untitled Workflow");
        setNodes(loadedNodes);
        setEdges(loadedEdges);

        hasLoadedRef.current = true;
        loadedWorkflowIdRef.current = data.workflow.id;
        lastLoadTimeRef.current = Date.now();
        setHasLoadedOnce(true);
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
      setHasLoadedOnce(false);
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
    if (!workflowId || isSaving || saveInProgressRef.current) return;
    saveInProgressRef.current = true;

    const isAnyNodeLoading = nodes.some(
      (node) =>
        node.type === "llm" &&
        (node.data as { isLoading?: boolean }).isLoading
    );
    if (isAnyNodeLoading) {
      saveInProgressRef.current = false;
      return;
    }

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

    const payload = {
      name: workflowName,
      nodes: sanitizedNodes,
      edges,
    };

    const isVirtualId =
      workflowId.startsWith("sample_") || workflowId.startsWith("workflow_");
    const isLoadedMatch =
      hasLoadedRef.current && loadedWorkflowIdRef.current === workflowId;

    if (isVirtualId || !isLoadedMatch) {
      setIsSaving(true);
      try {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create workflow");
        const data = await res.json();
        const newId = data.workflow?.id;
        if (newId) {
          setWorkflowId(newId);
          hasLoadedRef.current = true;
          loadedWorkflowIdRef.current = newId;
          lastLoadTimeRef.current = Date.now();
          router.replace(`/dashboard/workflow/${newId}`);
        }
      } catch (error) {
        console.error("Failed to save workflow:", error);
      } finally {
        saveInProgressRef.current = false;
        setIsSaving(false);
      }
      return;
    }

    const timeSinceLoad = Date.now() - lastLoadTimeRef.current;
    if (timeSinceLoad < 3000) {
      saveInProgressRef.current = false;
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 404) {
        const createRes = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (createRes.ok) {
          const data = await createRes.json();
          const newId = data.workflow?.id;
          if (newId) {
            setWorkflowId(newId);
            loadedWorkflowIdRef.current = newId;
            lastLoadTimeRef.current = Date.now();
            router.replace(`/dashboard/workflow/${newId}`);
          }
        }
      }
    } catch (error) {
      console.error("Failed to save workflow:", error);
    } finally {
      saveInProgressRef.current = false;
      setIsSaving(false);
    }
  }, [workflowId, workflowName, nodes, edges, isSaving, router, setWorkflowId]);

  // Only schedule auto-save after we've loaded this workflow once (avoids POST on open)
  useEffect(() => {
    if (!isLoading && workflowId && hasLoadedOnce) {
      const timer = setTimeout(saveWorkflow, 2000);
      return () => clearTimeout(timer);
    }
  }, [nodes, edges, workflowName, isLoading, workflowId, hasLoadedOnce, saveWorkflow]);

  // When user clicks Save in Sidebar, trigger a save now (only after we've loaded to avoid creating duplicates)
  useEffect(() => {
    if (requestSaveTrigger > 0 && hasLoadedOnce) saveWorkflow();
  }, [requestSaveTrigger, hasLoadedOnce, saveWorkflow]);

  if (isLoading) {
    return <Loading message="Loading workflow..." />;
  }

  return <WorkflowBuilder />;
}
