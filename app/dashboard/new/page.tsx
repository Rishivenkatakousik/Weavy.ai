"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
          body: JSON.stringify({ name: "Untitled Workflow" }),
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

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-12">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      <p className="text-neutral-400">Creating new workflow…</p>
    </div>
  );
}
