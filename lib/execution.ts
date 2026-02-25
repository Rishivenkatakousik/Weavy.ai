import type { Node, Edge } from "@xyflow/react";
import { validateDAG } from "./workflowValidation";

export type RunScope = "full" | "single" | "selected";

const EXECUTABLE_TYPES = ["llm", "cropImage", "extractFrame"] as const;

/**
 * Build adjacency list: for each node, list of node IDs that must run before it (incoming).
 */
function getIncomingByNode(edges: Edge[]): Map<string, string[]> {
  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const list = incoming.get(e.target) ?? [];
    list.push(e.source);
    incoming.set(e.target, list);
  }
  return incoming;
}

/**
 * Topological sort: returns nodes in execution order (roots first).
 * Only includes nodes that are in the given set and are executable.
 */
export function topologicalOrder(
  nodes: Node[],
  edges: Edge[],
  nodeIdSet: Set<string>
): string[] {
  const incoming = getIncomingByNode(edges);
  const result: string[] = [];
  const remaining = new Set(nodeIdSet);
  const nodeIds = new Set(nodes.map((n) => n.id));

  while (remaining.size > 0) {
    const ready = [...remaining].filter((id) => {
      const deps = incoming.get(id) ?? [];
      return deps.every((d) => !remaining.has(d));
    });
    if (ready.length === 0) break; // cycle guard
    for (const id of ready) {
      result.push(id);
      remaining.delete(id);
    }
  }

  return result;
}

/**
 * Get the set of node IDs to run based on scope.
 * - full: all executable nodes (llm, cropImage, extractFrame)
 * - single: nodeId + all its ancestors
 * - selected: selectedNodeIds + all their ancestors
 */
export function getNodesToRun(
  nodes: Node[],
  edges: Edge[],
  scope: RunScope,
  options: { nodeId?: string; selectedNodeIds?: string[] }
): Set<string> {
  const executableIds = new Set(
    nodes
      .filter((n) => EXECUTABLE_TYPES.includes(n.type as (typeof EXECUTABLE_TYPES)[number]))
      .map((n) => n.id)
  );
  if (executableIds.size === 0) return new Set();

  const incoming = getIncomingByNode(edges);

  function collectWithAncestors(ids: Set<string>): Set<string> {
    const result = new Set(ids);
    let added = true;
    while (added) {
      added = false;
      for (const id of result) {
        const deps = incoming.get(id) ?? [];
        for (const d of deps) {
          if (executableIds.has(d) && !result.has(d)) {
            result.add(d);
            added = true;
          }
        }
      }
    }
    return result;
  }

  if (scope === "full") {
    return new Set(executableIds);
  }
  if (scope === "single" && options.nodeId) {
    if (!executableIds.has(options.nodeId)) return new Set();
    return collectWithAncestors(new Set([options.nodeId]));
  }
  if (scope === "selected" && options.selectedNodeIds?.length) {
    const selected = new Set(
      options.selectedNodeIds.filter((id) => executableIds.has(id))
    );
    if (selected.size === 0) return new Set();
    return collectWithAncestors(selected);
  }

  return new Set();
}

/**
 * Resolve inputs for a node from the graph and execution outputs.
 * Returns a record suitable for passing to Trigger tasks.
 */
export function resolveInputsForNode(
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  executionOutputs: Map<string, { outputs: Record<string, unknown> | null }>
): Record<string, unknown> {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return {};

  const incomingEdges = edges.filter((e) => e.target === nodeId);
  const data = node.data as Record<string, unknown>;

  if (node.type === "llm") {
    const promptParts: string[] = [];
    const images: string[] = [];

    for (const edge of incomingEdges) {
      const source = nodes.find((n) => n.id === edge.source);
      if (!source) continue;
      const targetHandle = edge.targetHandle;
      const sourceHandle = edge.sourceHandle;

      if (targetHandle === "prompt") {
        if (source.type === "text") {
          const content = (source.data as { content?: string }).content;
          if (content) promptParts.push(content);
        } else if (source.type === "llm") {
          const out = executionOutputs.get(source.id)?.outputs;
          const content = out && typeof out.content === "string" ? out.content : null;
          if (content) promptParts.push(content);
        }
      }
      if (targetHandle?.startsWith("image-") || targetHandle === "image") {
        if (source.type === "image") {
          const url = (source.data as { imageUrl?: string }).imageUrl;
          if (url) images.push(url);
        } else if (source.type === "llm" && sourceHandle === "image-output") {
          const out = executionOutputs.get(source.id)?.outputs;
          const img = out?.generatedImage ?? out?.image;
          if (typeof img === "string") images.push(img);
        } else if (source.type === "cropImage" || source.type === "extractFrame") {
          const out = executionOutputs.get(source.id)?.outputs;
          const url = out && typeof (out as { outputUrl?: string }).outputUrl === "string"
            ? (out as { outputUrl: string }).outputUrl
            : null;
          if (url) images.push(url);
        }
      }
    }

    const systemPrompt = (data.systemPrompt as string) ?? "";
    const userPrompt = promptParts.join("\n\n") || (data.userPrompt as string) || "";
    const model = (data.model as string) ?? "gemini-2.0-flash";

    return {
      model,
      systemPrompt,
      userPrompt,
      images,
    };
  }

  if (node.type === "cropImage") {
    let imageUrl: string | null = (data.imageUrl as string) ?? null;
    for (const edge of incomingEdges) {
      if (edge.targetHandle === "image") {
        const source = nodes.find((n) => n.id === edge.source);
        if (!source) continue;
        if (source.type === "image") {
          imageUrl = (source.data as { imageUrl?: string }).imageUrl ?? null;
        } else if (source.type === "cropImage" || source.type === "extractFrame") {
          const out = executionOutputs.get(source.id)?.outputs;
          const url = out && typeof (out as { outputUrl?: string }).outputUrl === "string"
            ? (out as { outputUrl: string }).outputUrl
            : null;
          imageUrl = url;
        }
        break;
      }
    }
    return {
      imageUrl,
      xPercent: (data.xPercent as number) ?? 0,
      yPercent: (data.yPercent as number) ?? 0,
      widthPercent: (data.widthPercent as number) ?? 100,
      heightPercent: (data.heightPercent as number) ?? 100,
    };
  }

  if (node.type === "extractFrame") {
    let videoUrl: string | null = (data.videoUrl as string) ?? null;
    for (const edge of incomingEdges) {
      if (edge.targetHandle === "video") {
        const source = nodes.find((n) => n.id === edge.source);
        if (source?.type === "video") {
          videoUrl = (source.data as { videoUrl?: string }).videoUrl ?? null;
        }
        break;
      }
    }
    return {
      videoUrl,
      timestampSeconds: (data.timestampSeconds as number) ?? 0,
    };
  }

  return {};
}

/**
 * Validate workflow and return execution order for the given scope.
 */
export function getExecutionPlan(
  nodes: Node[],
  edges: Edge[],
  scope: RunScope,
  options: { nodeId?: string; selectedNodeIds?: string[] }
): { valid: true; order: string[] } | { valid: false; error: string } {
  const dag = validateDAG(nodes, edges);
  if (!dag.valid) return dag;

  const toRun = getNodesToRun(nodes, edges, scope, options);
  if (toRun.size === 0) {
    return {
      valid: false,
      error:
        scope === "full"
          ? "No executable nodes (LLM, Crop Image, Extract Frame) in workflow."
          : "No executable nodes selected or specified.",
    };
  }

  const order = topologicalOrder(nodes, edges, toRun);
  return { valid: true, order };
}

/**
 * Group topo order into levels. Level 0 = nodes with no deps in set;
 * level i = nodes whose all deps in set are in levels 0..i-1.
 * Nodes in the same level can run in parallel.
 */
export function getExecutionLevels(
  order: string[],
  edges: Edge[],
  nodeIdSet: Set<string>
): string[][] {
  const incoming = getIncomingByNode(edges);
  const levels: string[][] = [];
  const nodeToLevel = new Map<string, number>();
  for (const id of order) {
    const deps = (incoming.get(id) ?? []).filter((d) => nodeIdSet.has(d));
    const level =
      deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => nodeToLevel.get(d)!));
    nodeToLevel.set(id, level);
    if (!levels[level]) levels[level] = [];
    levels[level].push(id);
  }
  return levels;
}
