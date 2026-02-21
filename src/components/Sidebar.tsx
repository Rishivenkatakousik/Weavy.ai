"use client";

import React, { useCallback, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import {
  Type,
  ImageIcon,
  Sparkles,
  Save,
  FileDown,
  FileUp,
  Package,
  Plus,
  Search,
  Grid3X3,
  ArrowLeft,
} from "lucide-react";
import { useWorkflowStore } from "@/src/store/workflowStore";

interface SidebarProps {
  onDragStart: (
    event: React.DragEvent,
    nodeType: "text" | "image" | "llm"
  ) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onDragStart }) => {
  const { user } = useUser();
  const {
    workflowName,
    setWorkflowName,
    requestSave,
    loadSampleWorkflow,
    exportWorkflow,
    importWorkflow,
    createNewWorkflow,
  } = useWorkflowStore();

  const initial =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.username ||
    "";
  const letter = initial.charAt(0).toUpperCase() || "U";

  const [isExpanded, setIsExpanded] = useState(false);
  const [focusSearch, setFocusSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allNodes = [
    { type: "text" as const, label: "Text", icon: Type, colSpan: false },
    { type: "image" as const, label: "Image", icon: ImageIcon, colSpan: false },
    { type: "llm" as const, label: "Run Any LLM", icon: Sparkles, colSpan: true },
  ];

  const filteredNodes =
    searchQuery.trim() === ""
      ? allNodes
      : allNodes.filter(
          (node) =>
            node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            node.type.toLowerCase().includes(searchQuery.toLowerCase())
        );

  useEffect(() => {
    if (focusSearch && isExpanded && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 300);
      setFocusSearch(false);
    }
  }, [focusSearch, isExpanded]);

  const handleExport = useCallback(() => {
    const json = exportWorkflow();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportWorkflow, workflowName]);

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          importWorkflow(json);
        };
        reader.readAsText(file);
      }
    },
    [importWorkflow]
  );

  const handleSearchClick = useCallback(() => {
    if (!isExpanded) {
      setIsExpanded(true);
      setFocusSearch(true);
    } else {
      setIsExpanded(false);
    }
  }, [isExpanded]);

  const handleQuickAccessClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex h-full w-12 shrink-0 flex-col border-r border-neutral-700 bg-neutral-900">
        <Link
          href="/dashboard"
          className="flex h-12 items-center justify-center border-b border-neutral-700 transition-colors hover:bg-neutral-800"
          title="Back to Dashboard"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAFFC7] text-lg font-semibold text-neutral-900">{letter}</span>
        </Link>

        <div className="flex flex-col items-center gap-3 pt-4">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/80 transition-all hover:bg-neutral-700 hover:text-white"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>

          <button
            type="button"
            onClick={handleSearchClick}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-all ${
              isExpanded
                ? "bg-neutral-600 text-white"
                : "text-white/80 hover:bg-neutral-700 hover:text-white"
            }`}
            title="Search"
          >
            <Search className="h-4 w-4" strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={handleQuickAccessClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-neutral-700 hover:text-white"
            title="Quick Access"
          >
            <Grid3X3 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div
        className="flex h-full flex-col overflow-hidden border-r border-neutral-700 bg-neutral-900"
        style={{
          width: isExpanded ? "240px" : "0px",
          transition: "width 0.25s ease-out",
        }}
      >
        <div className="flex h-full w-[240px] shrink-0 flex-col">
          <div className="shrink-0 border-b border-neutral-700 p-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-600 bg-neutral-800 py-1.5 pl-8 pr-3 text-xs text-white placeholder-neutral-500 focus:border-neutral-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wide text-white/70">
              Quick access
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {filteredNodes.length > 0 ? (
                filteredNodes.map((node) => (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    className={`group flex cursor-grab flex-col items-center justify-center rounded-lg border border-neutral-600 bg-transparent p-3 transition-all active:cursor-grabbing hover:bg-neutral-800 ${
                      node.colSpan ? "col-span-2" : ""
                    }`}
                  >
                    <node.icon className="mb-1 h-5 w-5 text-white transition-colors" />
                    <span className="text-center text-[10px] text-white transition-colors">
                      {node.label}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-2 py-4 text-center text-xs text-neutral-500">
                  No nodes found for &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            <h3 className="mb-3 mt-5 text-[10px] font-medium uppercase tracking-wide text-white/70">
              Tools
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="group flex flex-col items-center justify-center rounded-lg border border-neutral-600 bg-transparent p-3 transition-all hover:bg-neutral-800"
              >
                <FileDown className="mb-1 h-5 w-5 text-white transition-colors" />
                <span className="text-[10px] text-white transition-colors">
                  Export
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center rounded-lg border border-neutral-600 bg-transparent p-3 transition-all hover:bg-neutral-800"
              >
                <FileUp className="mb-1 h-5 w-5 text-white transition-colors" />
                <span className="text-[10px] text-white transition-colors">
                  Import
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />

              <button
                type="button"
                onClick={loadSampleWorkflow}
                className="col-span-2 flex flex-col items-center justify-center rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 transition-all hover:bg-amber-500/20 group"
              >
                <Package className="mb-1 h-5 w-5 text-amber-400 transition-colors" />
                <span className="text-center text-[10px] text-amber-200 transition-colors">
                  Sample Workflow
                </span>
              </button>
            </div>

            <h3 className="mb-3 mt-5 text-[10px] font-medium uppercase tracking-wide text-white/70">
              Actions
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createNewWorkflow}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-600 bg-transparent px-2 py-2 text-[10px] text-white transition-all hover:bg-neutral-800"
              >
                <Plus className="h-3 w-3" />
                <span>New</span>
              </button>
              <button
                type="button"
                onClick={requestSave}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-600 bg-transparent px-2 py-2 text-[10px] text-white transition-all hover:bg-neutral-800"
              >
                <Save className="h-3 w-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
