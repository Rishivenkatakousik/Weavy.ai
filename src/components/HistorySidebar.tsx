"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  History,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useWorkflowStore } from "@/src/store/workflowStore";

const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 600;
const DEFAULT_PANEL_WIDTH = 280;

type RunStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "PARTIAL";
type NodeStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";

interface NodeExecution {
  id: string;
  nodeId: string;
  status: NodeStatus;
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

interface WorkflowRunListItem {
  id: string;
  workflowId: string;
  userId: string;
  status: RunStatus;
  scope: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  nodeExecutions?: NodeExecution[];
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusDot({ status }: { status: RunStatus | NodeStatus }) {
  const running = status === "RUNNING" || status === "PENDING";
  const success = status === "SUCCESS";
  const failed = status === "FAILED" || status === "PARTIAL";
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${
        running
          ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)]"
          : success
            ? "bg-emerald-500"
            : failed
              ? "bg-red-500"
              : "bg-neutral-500"
      }`}
      title={status}
    />
  );
}

function RunListItem({
  run,
  expandedRunId,
  onToggle,
  onFetchDetails,
}: {
  run: WorkflowRunListItem;
  expandedRunId: string | null;
  onToggle: (id: string) => void;
  onFetchDetails: (runId: string) => void;
}) {
  const isExpanded = expandedRunId === run.id;
  const hasDetails = run.nodeExecutions && run.nodeExecutions.length > 0;

  const handleClick = useCallback(() => {
    onToggle(run.id);
    if (!hasDetails && isExpanded === false) {
      onFetchDetails(run.id);
    }
  }, [run.id, hasDetails, isExpanded, onToggle, onFetchDetails]);

  return (
    <div className="border-b border-neutral-700/80 last:border-b-0">
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-neutral-800/80"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        )}
        <StatusDot status={run.status as RunStatus} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-white">
            {formatTime(run.startedAt)}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-neutral-400">
            <span title="Duration">{formatDuration(run.durationMs)}</span>
            {run.scope && (
              <>
                <span>·</span>
                <span className="capitalize" title="Execution scope">
                  {run.scope}
                </span>
              </>
            )}
          </div>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-neutral-700/80 bg-neutral-950/50 px-3 pb-3 pt-1">
          {run.nodeExecutions && run.nodeExecutions.length > 0 ? (
            <ul className="space-y-2">
              {run.nodeExecutions.map((ne) => (
                <li
                  key={ne.id}
                  className="rounded-md border border-neutral-700 bg-neutral-800/80 p-2"
                >
                  <div className="flex items-center gap-2 border-b border-neutral-700 pb-1.5">
                    <StatusDot status={ne.status as NodeStatus} />
                    <span className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
                      Node {ne.nodeId}
                    </span>
                    <span
                      className="text-[10px] text-neutral-500"
                      title="Execution time"
                    >
                      {formatDuration(ne.durationMs)}
                    </span>
                  </div>
                  {ne.inputs && Object.keys(ne.inputs).length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-medium text-neutral-500">
                        Inputs
                      </div>
                      <pre className="mt-0.5 max-h-24 overflow-auto rounded bg-neutral-900 p-1.5 text-[10px] text-neutral-300">
                        {JSON.stringify(ne.inputs, null, 2)}
                      </pre>
                    </div>
                  )}
                  {ne.outputs && Object.keys(ne.outputs).length > 0 && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-medium text-neutral-500">
                        Outputs
                      </div>
                      <pre className="mt-0.5 max-h-32 overflow-auto rounded bg-neutral-900 p-1.5 text-[10px] text-neutral-300">
                        {typeof ne.outputs.content === "string"
                          ? ne.outputs.content
                          : JSON.stringify(ne.outputs, null, 2)}
                      </pre>
                    </div>
                  )}
                  {ne.errorMessage && (
                    <div className="mt-1.5">
                      <div className="text-[10px] font-medium text-red-400">
                        Error
                      </div>
                      <p className="mt-0.5 text-[10px] text-red-300">
                        {ne.errorMessage}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-neutral-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading details…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistorySidebar() {
  const { workflowId, historyRefreshTrigger } = useWorkflowStore();
  const [runs, setRuns] = useState<WorkflowRunListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetailsCache, setRunDetailsCache] = useState<
    Record<string, WorkflowRunListItem>
  >({});

  const fetchRuns = useCallback(async (silent = false) => {
    if (!workflowId) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/runs`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch runs:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [workflowId]);

  const fetchRunDetails = useCallback(
    async (runId: string) => {
      if (!workflowId) return;
      if (runDetailsCache[runId]) {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId ? runDetailsCache[runId] : r
          )
        );
        return;
      }
      try {
        const res = await fetch(
          `/api/workflows/${workflowId}/runs/${runId}`
        );
        if (res.ok) {
          const data = await res.json();
          const run = data.run as WorkflowRunListItem;
          setRunDetailsCache((c) => ({ ...c, [runId]: run }));
          setRuns((prev) =>
            prev.map((r) => (r.id === runId ? run : r))
          );
        }
      } catch (err) {
        console.error("Failed to fetch run details:", err);
      }
    },
    [workflowId, runDetailsCache]
  );

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Refetch when a run is started from elsewhere (e.g. Run workflow button)
  useEffect(() => {
    if (historyRefreshTrigger > 0 && workflowId) fetchRuns(true);
  }, [historyRefreshTrigger, workflowId, fetchRuns]);

  // Poll when there are RUNNING or PENDING runs so status indicators update (Phase 10.3)
  const hasActiveRuns = runs.some(
    (r) => r.status === "RUNNING" || r.status === "PENDING"
  );
  useEffect(() => {
    if (!workflowId || !hasActiveRuns) return;
    const interval = setInterval(() => fetchRuns(true), 3000);
    return () => clearInterval(interval);
  }, [workflowId, hasActiveRuns, fetchRuns]);

  const handleToggle = useCallback((id: string) => {
    setExpandedRunId((current) => (current === id ? null : id));
  }, []);

  const [isExpanded, setIsExpanded] = useState(true);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = { x: e.clientX, width: panelWidth };
  }, [panelWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const { x, width } = resizeStartRef.current;
      const delta = x - e.clientX;
      const next = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, width + delta)
      );
      setPanelWidth(next);
      resizeStartRef.current = { x: e.clientX, width: next };
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  if (!workflowId) {
    return (
      <div className="flex h-full shrink-0 flex-col border-l border-neutral-700 bg-neutral-900">
        <div
          className="flex flex-col border-neutral-700"
          style={{ width: isExpanded ? panelWidth : 48 }}
        >
          <div className="flex h-12 items-center border-b border-neutral-700 px-2">
            <button
              type="button"
              onClick={() => setIsExpanded((e) => !e)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
              title={isExpanded ? "Collapse history" : "Expand history"}
            >
              {isExpanded ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <History className="h-4 w-4" />
              )}
            </button>
            {isExpanded && (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                Run history
              </span>
            )}
          </div>
          {isExpanded && (
            <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-neutral-500">
              Save the workflow to see run history.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full shrink-0 flex-col border-l border-neutral-700 bg-neutral-900">
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        style={{
          width: isExpanded ? panelWidth : 48,
          transition: isResizing ? "none" : "width 0.2s ease-out",
        }}
      >
        {isExpanded && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={panelWidth}
            onMouseDown={handleResizeStart}
            className="absolute left-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none border-l border-transparent hover:border-neutral-600 hover:bg-neutral-700/30 active:bg-neutral-600/50"
            title="Drag to resize"
          />
        )}
        <div className="flex h-12 min-h-12 shrink-0 items-center justify-between border-b border-neutral-700 px-2">
          <button
            type="button"
            onClick={() => setIsExpanded((e) => !e)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white"
            title={isExpanded ? "Collapse history" : "Expand history"}
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <History className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <>
              <h3 className="flex flex-1 items-center gap-2 truncate pl-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                Run history
              </h3>
              <button
                type="button"
                onClick={() => fetchRuns()}
                disabled={loading}
                className="rounded p-1 text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </>
          )}
        </div>
        {isExpanded && (
          <div className="flex-1 overflow-y-auto">
            {loading && runs.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : runs.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-4 text-center text-xs text-neutral-500">
                No runs yet. Run the workflow to see history here.
              </div>
            ) : (
              runs.map((run) => (
                <RunListItem
                  key={run.id}
                  run={run}
                  expandedRunId={expandedRunId}
                  onToggle={handleToggle}
                  onFetchDetails={fetchRunDetails}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
