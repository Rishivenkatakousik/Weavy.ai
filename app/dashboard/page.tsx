"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import Loading from "@/components/Loading";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const createInProgressRef = useRef(false);

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
    if (createInProgressRef.current) return;
    createInProgressRef.current = true;
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
      createInProgressRef.current = false;
      setIsCreating(false);
    }
  };

  const deleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkflows((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete workflow:", error);
    } finally {
      setDeletingId(null);
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-neutral-950">
        <DashboardSidebar />
        <main className="flex flex-1 flex-col overflow-auto">
          <Loading className="min-h-0 flex-1" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <DashboardSidebar />
      <main className="flex-1 overflow-auto">
        <div className="flex flex-col">
          <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
            <h1 className="text-lg font-semibold text-neutral-100">
              {displayName}&apos;s Workspace
            </h1>
            <button
              type="button"
              onClick={createNewWorkflow}
              disabled={isCreating}
              className="flex items-center gap-2 rounded-lg bg-[#FAFFC7] px-4 py-2 text-sm font-medium cursor-pointer text-black transition-colors disabled:opacity-50"
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
            {workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-xl font-bold text-white">Nothing here yet!</p>
                <p className="mt-2 text-sm text-neutral-400">
                  Start weaving to bring your ideas to life.
                </p>
                <button
                  type="button"
                  onClick={createNewWorkflow}
                  disabled={isCreating}
                  className="mt-6 rounded-md border border-white/40 bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 cursor-pointer"
                >
                  Create New File
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {workflows.map((workflow) => (
                  <Link
                    key={workflow.id}
                    href={`/dashboard/workflow/${workflow.id}`}
                    className="group relative flex w-56 flex-col items-center justify-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 p-6 shadow-sm transition-colors hover:border-neutral-600 hover:shadow"
                  >
                    <button
                      type="button"
                      onClick={(e) => deleteWorkflow(workflow.id, e)}
                      disabled={deletingId === workflow.id}
                      className="absolute right-2 top-2 rounded-lg p-2 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-800 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50 cursor-pointer"
                      aria-label="Delete workflow"
                    >
                      {deletingId === workflow.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
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
      </main>
    </div>
  );
}
