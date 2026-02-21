"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="12" r="2.5" />
      <circle cx="15" cy="12" r="2.5" />
      <path d="M11.5 12h1M13.5 12h1" />
    </svg>
  );
}

interface WorkflowItem {
  id: string;
  name: string;
  updatedAt: string;
  nodes: unknown[];
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "My";

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch("/api/workflows");
        const data = await res.json();
        if (data.workflows) setWorkflows(data.workflows);
      } catch (error) {
        console.error("Failed to fetch workflows:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkflows();
  }, []);

  const createNewWorkflow = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Untitled Workflow" }),
      });
      const data = await res.json();
      if (data.workflow?.id) {
        router.push(`/dashboard/workflow/${data.workflow.id}`);
        return;
      }
    } catch (error) {
      console.error("Failed to create workflow:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
        <h1 className="text-lg font-semibold text-neutral-100">
          {displayName}&apos;s Workspace
        </h1>
        <button
          type="button"
          onClick={createNewWorkflow}
          disabled={isCreating}
          className="flex items-center gap-2 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-600 disabled:opacity-50"
        >
          {isCreating ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          Create New File
        </button>
      </header>

      <div className="flex-1 p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-400">My files</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
            Loading…
          </div>
        ) : workflows.length === 0 ? (
          <div className="rounded-xl border border-neutral-700 bg-neutral-900/50 p-8 text-center">
            <WorkflowIcon className="mx-auto h-12 w-12 text-neutral-600" />
            <p className="mt-3 text-neutral-400">No workflows yet</p>
            <button
              type="button"
              onClick={createNewWorkflow}
              disabled={isCreating}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-amber-500 disabled:opacity-50"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/dashboard/workflow/${workflow.id}`}
                className="flex w-56 flex-col items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-sm transition-colors hover:border-neutral-600 hover:shadow"
              >
                <WorkflowIcon className="h-12 w-12 text-neutral-500" />
                <div className="text-center">
                  <p className="font-medium text-neutral-100 truncate w-full">
                    {workflow.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    Last edited {formatDate(workflow.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
