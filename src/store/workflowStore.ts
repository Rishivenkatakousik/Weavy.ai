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

  // Triggers history sidebar to refetch runs (e.g. after starting a workflow run)
  historyRefreshTrigger: number;
  requestHistoryRefresh: () => void;

  // When set, a full workflow run is in progress; individual LLM "Run Model" should be disabled
  activeWorkflowRunId: string | null;
  setActiveWorkflowRunId: (id: string | null) => void;
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
  timestampSeconds: 0,
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
  historyRefreshTrigger: 0,
  requestHistoryRefresh: () =>
    set((s) => ({ historyRefreshTrigger: s.historyRefreshTrigger + 1 })),
  activeWorkflowRunId: null,
  setActiveWorkflowRunId: (id) => set({ activeWorkflowRunId: id }),
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
    const sampleNodes: WorkflowNode[] = [
      {
        id: "img_product",
        type: "image",
        position: { x: 50, y: 60 },
        data: {
          label: "Product Photo",
          imageUrl:
            "https://res.cloudinary.com/dibvsl8ic/image/upload/v1771746701/galaxy-workflows/cncq1ecpqufdqx9xyu6e.jpg",
          imageBase64: null,
        },
      },
      {
        id: "text_product",
        type: "text",
        position: { x: 80, y: 300 },
        data: {
          label: "Product Name & Description",
          content:
            "A premium home fragrance scented candle in a minimalist ceramic jar, designed to create a warm and relaxing ambiance. Crafted with clean-burning natural wax and a cotton wick for a long-lasting, even burn. Subtle soothing fragrance ideal for relaxation, self-care, meditation, and home décor. Elegant neutral-toned aesthetic suitable for modern interiors and gifting.",
        },
      },
      {
        id: "llm_strategist",
        type: "llm",
        position: { x: 380, y: 80 },
        data: {
          label: "Brand Strategist AI",
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a brand strategist. Analyze the product (image and description) and output a structured brand foundation. Include: 1) Brand name ideas, 2) Target audience, 3) Unique selling proposition, 4) Brand personality, 5) Tone of voice, 6) Key benefits, 7) Marketing angles. Be concise and structured so other specialists can use this brief.",
          userPrompt: "Analyze this product and output the structured brand foundation above.",
          response: null,
          generatedImage: null,
          isLoading: false,
          error: null,
          imageInputCount: 1,
        },
      },
      {
        id: "llm_social",
        type: "llm",
        position: { x: 880, y: 50 },
        data: {
          label: "Social Media Manager",
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a social media manager. Given the brand strategy brief, produce on-brand social content.",
          userPrompt:
            "Using the brand strategy above, write: 1) Instagram caption, 2) TikTok caption, 3) Hashtags.",
          response: null,
          generatedImage: null,
          isLoading: false,
          error: null,
        },
      },
      {
        id: "llm_ads",
        type: "llm",
        position: { x: 960, y: 360 },
        data: {
          label: "Performance Ads Copywriter",
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a performance ads copywriter. Given the brand strategy brief, produce paid ad copy.",
          userPrompt:
            "Using the brand strategy above, write: 1) Facebook ad primary text, 2) Google ad headlines, 3) Google ad descriptions.",
          response: null,
          generatedImage: null,
          isLoading: false,
          error: null,
        },
      },
      {
        id: "llm_landing",
        type: "llm",
        position: { x: 940, y: 970 },
        data: {
          label: "Landing Page Copywriter",
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a landing page and conversion copywriter. Given the brand strategy brief, produce conversion-focused landing page copy.",
          userPrompt:
            "Using the brand strategy above, write: hero headline, subheadline, features section, call-to-action, short product description.",
          response: null,
          generatedImage: null,
          isLoading: false,
          error: null,
        },
      },
      {
        id: "llm_email",
        type: "llm",
        position: { x: 1000, y: 1280 },
        data: {
          label: "Email Marketing",
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are an email and lifecycle marketer. Given the brand strategy brief, produce launch and promo email copy.",
          userPrompt:
            "Using the brand strategy above, write: launch email subject line, launch email body, promo email version.",
          response: null,
          generatedImage: null,
          isLoading: false,
          error: null,
        },
      },
      {
        id: "llm_video",
        type: "llm",
        position: { x: 840, y: 670 },
        data: {
          label: "Video Script Generator",
          model: "gemini-2.5-flash",
          systemPrompt:
            "You are a video ad scriptwriter. Given the brand strategy brief, produce a 30-second ad script with Hook, Problem, Solution, CTA.",
          userPrompt:
            "Using the brand strategy above, write a 30-second ad script: Hook, Problem, Solution, CTA.",
          response: null,
          generatedImage: null,
          isLoading: false,
          error: null,
        },
      },
    ];

    const sampleEdges: Edge[] = [
      {
        id: "e1",
        source: "img_product",
        target: "llm_strategist",
        targetHandle: "image-0",
        animated: true,
        style: { stroke: "#34d399", strokeWidth: 2 },
      },
      {
        id: "e2",
        source: "text_product",
        target: "llm_strategist",
        targetHandle: "prompt",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2 },
      },
      {
        id: "e3",
        source: "llm_strategist",
        sourceHandle: "output",
        target: "llm_social",
        targetHandle: "prompt",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2 },
      },
      {
        id: "e4",
        source: "llm_strategist",
        sourceHandle: "output",
        target: "llm_ads",
        targetHandle: "prompt",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2 },
      },
      {
        id: "e5",
        source: "llm_strategist",
        sourceHandle: "output",
        target: "llm_landing",
        targetHandle: "prompt",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2 },
      },
      {
        id: "e6",
        source: "llm_strategist",
        sourceHandle: "output",
        target: "llm_email",
        targetHandle: "prompt",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2 },
      },
      {
        id: "e7",
        source: "llm_strategist",
        sourceHandle: "output",
        target: "llm_video",
        targetHandle: "prompt",
        animated: true,
        style: { stroke: "#c084fc", strokeWidth: 2 },
      },
    ];

    set({
      workflowId: "sample_brand_strategist",
      workflowName: "Brand Strategist AI",
      nodes: sampleNodes,
      edges: sampleEdges,
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
      set({
        workflowId: workflow.id,
        workflowName: workflow.name,
        nodes: workflow.nodes,
        edges: workflow.edges,
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
