"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";

export default function NewFilePage() {
  const router = useRouter();
  const hasCreatedRef = useRef(false);

  useEffect(() => {
    if (hasCreatedRef.current) return;
    hasCreatedRef.current = true;

    async function createAndRedirect() {
      try {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Untitled Workflow",
            nodes: [],
            edges: [],
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
  }, [router]);

  return <Loading message="Creating new workflow…" />;
}
