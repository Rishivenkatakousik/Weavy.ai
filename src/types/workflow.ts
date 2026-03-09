

import { Node, Edge } from "@xyflow/react";


export interface TextNodeData {
  label: string;
  content: string;
  [key: string]: unknown;
}

export interface ImageNodeData {
  label: string;
  imageUrl: string | null;
  imageBase64: string | null;
  [key: string]: unknown;
}

export interface LLMNodeData {
  label: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  response: string | null;
  generatedImage: string | null; 
  isLoading: boolean;
  error: string | null;
  imageInputCount?: number; 
  [key: string]: unknown;
}

export interface VideoNodeData {
  label: string;
  videoUrl: string | null;
  [key: string]: unknown;
}

export interface CropImageNodeData {
  label: string;
  imageUrl: string | null; 
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  outputUrl: string | null; 
  [key: string]: unknown;
}

export interface ExtractFrameNodeData {
  label: string;
  videoUrl: string | null; 
  timestampPercentage: number;
  outputUrl: string | null; 
  [key: string]: unknown;
}


export type WorkflowNodeData =
  | TextNodeData
  | ImageNodeData
  | LLMNodeData
  | VideoNodeData
  | CropImageNodeData
  | ExtractFrameNodeData;


export type TextNode = Node<TextNodeData, "text">;
export type ImageNode = Node<ImageNodeData, "image">;
export type LLMNode = Node<LLMNodeData, "llm">;
export type VideoNode = Node<VideoNodeData, "video">;
export type CropImageNode = Node<CropImageNodeData, "cropImage">;
export type ExtractFrameNode = Node<ExtractFrameNodeData, "extractFrame">;

export type WorkflowNode =
  | TextNode
  | ImageNode
  | LLMNode
  | VideoNode
  | CropImageNode
  | ExtractFrameNode;


export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: Edge[];
  createdAt: string;
  updatedAt: string;
}


export interface LLMRequest {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  images?: string[]; 
}

export interface LLMResponse {
  success: boolean;
  content?: string;
  image?: string; 
  error?: string;
}


export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash (Image)" },
] as const;

export type GeminiModel = (typeof GEMINI_MODELS)[number]["id"];
