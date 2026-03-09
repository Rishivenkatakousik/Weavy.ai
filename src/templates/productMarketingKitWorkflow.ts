/**
 * Product Marketing Kit sample workflow (Plan Phase 11).
 * Branch A: Upload Image → Crop Image; Text (system) + Text (product) → LLM #1.
 * Branch B: Upload Video → Extract Frame.
 * Convergence: LLM #2 with LLM #1 output + cropped image + extracted frame → marketing tweet.
 */

import type { WorkflowNode } from "@/src/types/workflow";
import type { Edge } from "@xyflow/react";

// Positions from product.json layout
export const productMarketingKitNodes: WorkflowNode[] = [
  // Branch A: Image → Crop
  {
    id: "pmk_img",
    type: "image",
    position: { x: 420, y: -75 },
    data: {
      label: "Product Image",
      imageUrl: "https://pub-e8fef8c0e03b44acb340577811800829.r2.dev/b6e9c3d3d2c241ccafdb83f9928274c7/5298c901b3b8449ebd3b2472c192d62a/7664928808cf427cbbd794aa65e5db0c.mp4",
      imageBase64: null,
    },
  },
  {
    id: "pmk_crop",
    type: "cropImage",
    position: { x: 1065, y: -30 },
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
    position: { x: 385, y: 216 },
    data: {
      label: "System Prompt",
      content:
        "You are a product analyst. Given the product description, output a short brand summary in 2–3 sentences: key benefits, tone, and target audience.",
    },
  },
  {
    id: "pmk_text_product",
    type: "text",
    position: { x: 390, y: 570 },
    data: {
      label: "Product Details",
      content:
        "Premium scented candle in a ceramic jar. Notes: lavender and eucalyptus. For relaxation and home décor. Minimalist design.",
    },
  },
  {
    id: "pmk_llm1",
    type: "llm",
    position: { x: 1050, y: 300 },
    data: {
      label: "Brand Summary",
      model: "gemini-2.5-flash",
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
    position: { x: 495, y: 930 },
    data: {
      label: "Product Video",
      videoUrl: "https://pub-e8fef8c0e03b44acb340577811800829.r2.dev/b6e9c3d3d2c241ccafdb83f9928274c7/5298c901b3b8449ebd3b2472c192d62a/7664928808cf427cbbd794aa65e5db0c.mp4",
    },
  },
  {
    id: "pmk_extract",
    type: "extractFrame",
    position: { x: 1110, y: 855 },
    data: {
      label: "Key Frame",
      videoUrl: null,
      timestampPercentage: 50,
      outputUrl: null,
    },
  },
  // Convergence: LLM #2
  {
    id: "pmk_llm2",
    type: "llm",
    position: { x: 1605, y: 270 },
    data: {
      label: "Marketing Tweet",
      model: "gemini-2.5-flash",
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
  { id: "e_pmk_img_crop", type: "glow", source: "pmk_img", target: "pmk_crop", targetHandle: "image", animated: true, style: { stroke: "#525252", strokeWidth: 2 } },
  { id: "e_pmk_sys_llm1", type: "glow", source: "pmk_text_system", target: "pmk_llm1", targetHandle: "prompt", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e_pmk_prod_llm1", type: "glow", source: "pmk_text_product", target: "pmk_llm1", targetHandle: "prompt", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e_pmk_video_extract", type: "glow", source: "pmk_video", target: "pmk_extract", targetHandle: "video", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 } },
  { id: "e_pmk_llm1_llm2", type: "glow", source: "pmk_llm1", sourceHandle: "output", target: "pmk_llm2", targetHandle: "prompt", animated: true, style: { stroke: "#a78bfa", strokeWidth: 2 } },
  { id: "e_pmk_crop_llm2", type: "glow", source: "pmk_crop", target: "pmk_llm2", targetHandle: "image-0", animated: true, style: { stroke: "#22c55e", strokeWidth: 2 } },
  { id: "e_pmk_extract_llm2", type: "glow", source: "pmk_extract", target: "pmk_llm2", targetHandle: "image-1", animated: true, style: { stroke: "#eab308", strokeWidth: 2 } },
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
