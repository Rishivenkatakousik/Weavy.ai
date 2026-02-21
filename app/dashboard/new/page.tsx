"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loading from "@/components/Loading";
import { getImageGenTemplate } from "@/src/templates/imageGenWorkflow";

export default function NewFilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCreatedRef = useRef(false);

  useEffect(() => {
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;

    async function createAndRedirect() {
      try {
        const template = searchParams.get("template");
        const body =
          template === "image-gen"
            ? getImageGenTemplate()
            : { name: "Untitled Workflow", nodes: [], edges: [] };

        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: body.name,
            nodes: body.nodes ?? [],
            edges: body.edges ?? [],
          }),
        });
        const data = await res.json();
        if (data.workflow?.id) {
          router.replace(`/dashboard/workflow/${data.workflow.id}`);
          return;
        }
      } catch (error) {
        console.error("Failed to create workflow:", error);
      }
      router.replace("/dashboard");
    }

    createAndRedirect();
  }, [router, searchParams]);

  return <Loading message="Creating new workflow…" />;
}
