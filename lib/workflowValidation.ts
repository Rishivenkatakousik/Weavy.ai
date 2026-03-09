import type { Connection, Node, Edge } from "@xyflow/react";

export type DataType = "text" | "image" | "video";

export function getSourceDataType(
  nodeType: string | undefined,
  sourceHandle: string | null
): DataType | null {
  if (!nodeType || !sourceHandle) return null;
  if (nodeType === "text" && sourceHandle === "output") return "text";
  if (nodeType === "image" && sourceHandle === "output") return "image";
  if (nodeType === "video" && sourceHandle === "output") return "video";
  if (nodeType === "llm" && sourceHandle === "output") return "text";
  if (nodeType === "llm" && sourceHandle === "image-output") return "image";
  if (nodeType === "cropImage" && sourceHandle === "output") return "image";
  if (nodeType === "extractFrame" && sourceHandle === "output") return "image";
  return null;
}

export function getTargetDataType(targetHandle: string | null): DataType | null {
  if (!targetHandle) return null;
  if (targetHandle === "prompt") return "text";
  if (targetHandle.startsWith("image-") || targetHandle === "image") return "image";
  if (targetHandle === "video") return "video";
  return null;
}

export function isConnectionTypeValid(
  connection: Connection,
  nodes: Node[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  const sourceType = getSourceDataType(sourceNode.type, connection.sourceHandle);
  const targetType = getTargetDataType(connection.targetHandle);
  if (sourceType == null || targetType == null) return false;

  return sourceType === targetType;
}

function buildAdjacency(edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.source) ?? [];
    list.push(e.target);
    adj.set(e.source, list);
  }
  return adj;
}

export function wouldCreateCycle(
  nodes: Node[],
  edges: Edge[],
  newConnection: Connection
): boolean {
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (!nodeIds.has(newConnection.source) || !nodeIds.has(newConnection.target))
    return false;

  const adj = buildAdjacency(edges);
  const fromSource = adj.get(newConnection.source) ?? [];
  adj.set(newConnection.source, [...fromSource, newConnection.target]);

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(id: string): boolean {
    visited.add(id);
    stack.add(id);
    for (const next of adj.get(id) ?? []) {
      if (!visited.has(next)) {
        if (dfs(next)) return true;
      } else if (stack.has(next)) {
        return true; 
      }
    }
    stack.delete(id);
    return false;
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && dfs(id)) return true;
  }
  return false;
}

export function validateDAG(
  nodes: Node[],
  edges: Edge[]
): { valid: true } | { valid: false; error: string } {
  const adj = buildAdjacency(edges);
  const nodeIds = new Set(nodes.map((n) => n.id));
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(id: string): boolean {
    visited.add(id);
    stack.add(id);
    for (const next of adj.get(id) ?? []) {
      if (!nodeIds.has(next)) continue;
      if (!visited.has(next)) {
        if (dfs(next)) return true;
      } else if (stack.has(next)) {
        return true; 
      }
    }
    stack.delete(id);
    return false;
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && dfs(id)) {
      return { valid: false, error: "Workflow contains a cycle. Remove cycles before running." };
    }
  }
  return { valid: true };
}

export function isValidNewConnection(
  connection: Connection,
  nodes: Node[],
  edges: Edge[]
): boolean {
  if (!isConnectionTypeValid(connection, nodes)) return false;
  if (wouldCreateCycle(nodes, edges, connection)) return false;
  return true;
}
