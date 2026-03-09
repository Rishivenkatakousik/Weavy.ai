import { create } from "zustand";
import {
  Edge,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from "@xyflow/react";
import {
  WorkflowNode,
  TextNodeData,
  ImageNodeData,
  LLMNodeData,
  VideoNodeData,
  CropImageNodeData,
  ExtractFrameNodeData,
  Workflow,
} from "@/src/types/workflow";
import { getBrandStrategistTemplate } from "@/src/templates/brandStrategistWorkflow";
import { getProductMarketingKitTemplate } from "@/src/templates/productMarketingKitWorkflow";
import { isValidNewConnection } from "@/lib/workflowValidation";

interface HistoryState {
  nodes: WorkflowNode[];
  edges: Edge[];
}

interface WorkflowState {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  edges: Edge[];

  history: HistoryState[];
  historyIndex: number;

  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  addNode: (
    type: "text" | "image" | "llm" | "video" | "cropImage" | "extractFrame",
    position: { x: number; y: number }
  ) => void;
  updateNodeData: (
    nodeId: string,
    data: Partial<
      | TextNodeData
      | ImageNodeData
      | LLMNodeData
      | VideoNodeData
      | CropImageNodeData
      | ExtractFrameNodeData
    >
  ) => void;
  deleteNode: (nodeId: string) => void;
  deleteEdgeByHandle: (
    nodeId: string,
    handleId: string,
    handleType: "source" | "target"
  ) => void;

  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  setWorkflowId: (id: string) => void;
  setWorkflowName: (name: string) => void;
  resetWorkflow: () => void;

  // Triggers editor page to save; persistence is done by the editor page via API
  requestSaveTrigger: number;
  requestSave: () => void;

  // Save feedback for UI (Sidebar shows "Workflow saved" when "saved")
  saveStatus: "idle" | "saving" | "saved" | "error";
  setSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;

  // Triggers history sidebar to refetch runs (e.g. after starting a workflow run)
  historyRefreshTrigger: number;
  requestHistoryRefresh: () => void;

  // When set, a full workflow run is in progress; individual LLM "Run Model" should be disabled
  activeWorkflowRunId: string | null;
  setActiveWorkflowRunId: (id: string | null) => void;
  // Node execution status for the active run (nodeId -> status); used for glowing edges when RUNNING
  activeRunNodeStatuses: Record<string, "PENDING" | "RUNNING" | "SUCCESS" | "FAILED"> | null;
  setActiveRunNodeStatuses: (statuses: Record<string, string> | null) => void;
  saveWorkflow: () => void;
  loadWorkflow: (_id: string) => void;
  getWorkflowList: () => Workflow[];

  loadSampleWorkflow: () => void;
  loadSampleWorkflow2: () => void;
  exportWorkflow: () => string;
  importWorkflow: (json: string) => void;
  createNewWorkflow: () => void;
}

const generateId = () =>
  `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createTextNodeData = (): TextNodeData => ({
  label: "Text Input",
  content: "",
});

const createImageNodeData = (): ImageNodeData => ({
  label: "Image",
  imageUrl: null,
  imageBase64: null,
});

const createLLMNodeData = (): LLMNodeData => ({
  label: "LLM",
  model: "gemini-2.5-flash",
  systemPrompt: "",
  userPrompt: "",
  response: null,
  generatedImage: null,
  isLoading: false,
  error: null,
  imageInputCount: 1,
});

const createVideoNodeData = (): VideoNodeData => ({
  label: "Video",
  videoUrl: null,
});

const createCropImageNodeData = (): CropImageNodeData => ({
  label: "Crop Image",
  imageUrl: null,
  xPercent: 0,
  yPercent: 0,
  widthPercent: 100,
  heightPercent: 100,
  outputUrl: null,
});

const createExtractFrameNodeData = (): ExtractFrameNodeData => ({
  label: "Extract Frame",
  videoUrl: null,
  timestampPercentage: 50,
  outputUrl: null,
});

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflowId: "workflow_default",
  workflowName: "Untitled Workflow",
  nodes: [],
  edges: [],
  history: [],
  historyIndex: -1,

  setWorkflowId: (id) => set({ workflowId: id }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as WorkflowNode[],
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const { nodes, edges } = get();

    if (!isValidNewConnection(connection, nodes, edges)) return;

    const newEdge = {
      ...connection,
      id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "glow",
      animated: true,
      style: { stroke: "#444", strokeWidth: 2 },
    };

    get().saveHistory();
    set({ edges: [...edges, newEdge] });
  },

  addNode: (type, position) => {
    get().saveHistory();
    const id = generateId();
    let data:
      | TextNodeData
      | ImageNodeData
      | LLMNodeData
      | VideoNodeData
      | CropImageNodeData
      | ExtractFrameNodeData;

    switch (type) {
      case "text":
        data = createTextNodeData();
        break;
      case "image":
        data = createImageNodeData();
        break;
      case "llm":
        data = createLLMNodeData();
        break;
      case "video":
        data = createVideoNodeData();
        break;
      case "cropImage":
        data = createCropImageNodeData();
        break;
      case "extractFrame":
        data = createExtractFrameNodeData();
        break;
    }

    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data,
    } as WorkflowNode;

    set({ nodes: [...get().nodes, newNode] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ) as WorkflowNode[],
    });
  },

  deleteNode: (nodeId) => {
    get().saveHistory();
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    });
  },

  deleteEdgeByHandle: (nodeId, handleId, handleType) => {
    const { edges } = get();
    const edgeToDelete = edges.find((edge) => {
      if (handleType === "target") {
        return edge.target === nodeId && edge.targetHandle === handleId;
      }
      return edge.source === nodeId && edge.sourceHandle === handleId;
    });

    if (edgeToDelete) {
      get().saveHistory();
      set({
        edges: edges.filter((edge) => edge.id !== edgeToDelete.id),
      });
    }
  },

  saveHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (newHistory.length > 50) newHistory.shift();
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  requestSaveTrigger: 0,
  requestSave: () =>
    set((s) => ({ requestSaveTrigger: s.requestSaveTrigger + 1 })),
  saveStatus: "idle",
  setSaveStatus: (status) => set({ saveStatus: status }),
  historyRefreshTrigger: 0,
  requestHistoryRefresh: () =>
    set((s) => ({ historyRefreshTrigger: s.historyRefreshTrigger + 1 })),
  activeWorkflowRunId: null,
  setActiveWorkflowRunId: (id) =>
    set({
      activeWorkflowRunId: id,
      ...(id == null && { activeRunNodeStatuses: null }),
    }),
  activeRunNodeStatuses: null,
  setActiveRunNodeStatuses: (statuses) =>
    set({
      activeRunNodeStatuses:
        statuses == null
          ? null
          : (statuses as Record<string, "PENDING" | "RUNNING" | "SUCCESS" | "FAILED">),
    }),
  saveWorkflow: () => {
    // No-op: editor page performs PUT when requestSaveTrigger changes or on debounce
  },

  loadWorkflow: () => {
    // No-op: workflow is loaded by the editor page via API
  },

  getWorkflowList: () => {
    return [];
  },

  loadSampleWorkflow: () => {
    const { nodes, edges } = getBrandStrategistTemplate();
    set({
      workflowId: "sample_brand_strategist",
      workflowName: "Brand Strategist AI",
      nodes,
      edges,
      history: [],
      historyIndex: -1,
    });
  },

  loadSampleWorkflow2: () => {
    const { nodes, edges } = getProductMarketingKitTemplate();
    set({
      workflowId: "sample_product_marketing_kit",
      workflowName: "Product Marketing Kit",
      nodes,
      edges,
      history: [],
      historyIndex: -1,
    });
  },

  exportWorkflow: () => {
    const { workflowId, workflowName, nodes, edges } = get();
    const workflow: Workflow = {
      id: workflowId,
      name: workflowName,
      nodes,
      edges,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return JSON.stringify(workflow, null, 2);
  },

  importWorkflow: (json) => {
    try {
      const workflow = JSON.parse(json) as Workflow;
      const edgesWithType = workflow.edges.map((e) => ({
        ...e,
        type: e.type ?? "glow",
      }));
      set({
        workflowId: workflow.id,
        workflowName: workflow.name,
        nodes: workflow.nodes,
        edges: edgesWithType,
        history: [],
        historyIndex: -1,
      });
    } catch (error) {
      console.error("Failed to import workflow:", error);
    }
  },

  setWorkflowName: (name) => set({ workflowName: name }),

  createNewWorkflow: () => {
    set({
      workflowId: `workflow_${Date.now()}`,
      workflowName: "Untitled Workflow",
      nodes: [],
      edges: [],
      history: [],
      historyIndex: -1,
    });
  },

  resetWorkflow: () => {
    set({
      workflowId: "",
      workflowName: "",
      nodes: [],
      edges: [],
      history: [],
      historyIndex: -1,
    });
  },
}));
