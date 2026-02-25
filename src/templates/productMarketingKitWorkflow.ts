/**
 * Product Marketing Kit sample workflow (Plan Phase 11).
 * Branch A: Upload Image → Crop Image; Text (system) + Text (product) → LLM #1.
 * Branch B: Upload Video → Extract Frame.
 * Convergence: LLM #2 with LLM #1 output + cropped image + extracted frame → marketing tweet.
 */

import type { WorkflowNode } from "@/src/types/workflow";
import type { Edge } from "@xyflow/react";

export const productMarketingKitNodes: WorkflowNode[] = [
  // Branch A: Image → Crop
  {
    id: "pmk_img",
    type: "image",
    position: { x: 40, y: 40 },
    data: {
      label: "Product Image",
      imageUrl: null,
      imageBase64: null,
    },
  },
  {
    id: "pmk_crop",
    type: "cropImage",
    position: { x: 280, y: 40 },
    data: {
      label: "Crop for Hero",
      imageUrl: null,
      xPercent: 0,
      yPercent: 0,
      widthPercent: 100,
      heightPercent: 100,
      outputUrl: null,
    },
  },
  // Branch A: Text (system) + Text (product) → LLM #1
  {
    id: "pmk_text_system",
    type: "text",
    position: { x: 40, y: 220 },
    data: {
      label: "System Prompt",
      content:
        "You are a product analyst. Given the product description, output a short brand summary in 2–3 sentences: key benefits, tone, and target audience.",
    },
  },
  {
    id: "pmk_text_product",
    type: "text",
    position: { x: 40, y: 380 },
    data: {
      label: "Product Details",
      content:
        "Premium scented candle in a ceramic jar. Notes: lavender and eucalyptus. For relaxation and home décor. Minimalist design.",
    },
  },
  {
    id: "pmk_llm1",
    type: "llm",
    position: { x: 320, y: 280 },
    data: {
      label: "Brand Summary",
      model: "gemini-2.0-flash",
      systemPrompt: "",
      userPrompt: "Summarize the product and brand.",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 1,
    },
  },
  // Branch B: Video → Extract Frame
  {
    id: "pmk_video",
    type: "video",
    position: { x: 40, y: 540 },
    data: {
      label: "Product Video",
      videoUrl: null,
    },
  },
  {
    id: "pmk_extract",
    type: "extractFrame",
    position: { x: 280, y: 540 },
    data: {
      label: "Key Frame",
      videoUrl: null,
      timestampSeconds: 0,
      outputUrl: null,
    },
  },
  // Convergence: LLM #2
  {
    id: "pmk_llm2",
    type: "llm",
    position: { x: 620, y: 280 },
    data: {
      label: "Marketing Tweet",
      model: "gemini-2.0-flash",
      systemPrompt:
        "You are a social media copywriter. Write a single engaging marketing tweet (under 280 chars) for this product. Use the brand summary and reference the visuals (cropped hero image and key frame from video).",
      userPrompt:
        "Generate the marketing tweet from the brand summary and visual context above.",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 2,
    },
  },
];

export const productMarketingKitEdges: Edge[] = [
  { id: "e_pmk_img_crop", source: "pmk_img", target: "pmk_crop", targetHandle: "image", animated: true, style: { stroke: "#525252", strokeWidth: 2 } },
  { id: "e_pmk_sys_llm1", source: "pmk_text_system", target: "pmk_llm1", targetHandle: "prompt", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e_pmk_prod_llm1", source: "pmk_text_product", target: "pmk_llm1", targetHandle: "prompt", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e_pmk_video_extract", source: "pmk_video", target: "pmk_extract", targetHandle: "video", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
  { id: "e_pmk_llm1_llm2", source: "pmk_llm1", sourceHandle: "output", target: "pmk_llm2", targetHandle: "prompt", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e_pmk_crop_llm2", source: "pmk_crop", target: "pmk_llm2", targetHandle: "image-0", animated: true, style: { stroke: "#22c55e", strokeWidth: 2 } },
  { id: "e_pmk_extract_llm2", source: "pmk_extract", target: "pmk_llm2", targetHandle: "image-1", animated: true, style: { stroke: "#eab308", strokeWidth: 2 } },
];

export function getProductMarketingKitTemplate(): {
  nodes: WorkflowNode[];
  edges: Edge[];
} {
  return {
    nodes: productMarketingKitNodes,
    edges: productMarketingKitEdges,
  };
}
