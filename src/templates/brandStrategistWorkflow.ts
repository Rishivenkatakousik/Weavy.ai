/**
 * Brand Strategist AI sample workflow.
 * Flow: Product image + text → Brand Strategist AI → Social, Ads, Email, Video specialists.
 */

import type { WorkflowNode } from "@/src/types/workflow";
import type { Edge } from "@xyflow/react";

export const brandStrategistNodes: WorkflowNode[] = [
  {
    id: "img_product",
    type: "image",
    position: { x: -495, y: -75 },
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
    position: { x: -495, y: 345 },
    data: {
      label: "Product Name & Description",
      content:
        "A premium home fragrance scented candle in a minimalist ceramic jar, designed to create a warm and relaxing ambiance. Crafted with clean-burning natural wax and a cotton wick for a long-lasting, even burn. Subtle soothing fragrance ideal for relaxation, self-care, meditation, and home décor. Elegant neutral-toned aesthetic suitable for modern interiors and gifting.",
    },
  },
  {
    id: "llm_strategist",
    type: "llm",
    position: { x: 45, y: 15 },
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
    position: { x: 600, y: -330 },
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
    position: { x: 1245, y: -300 },
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
    id: "llm_email",
    type: "llm",
    position: { x: 1260, y: 285 },
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
    position: { x: 630, y: 240 },
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

export const brandStrategistEdges: Edge[] = [
  {
    id: "e1",
    type: "glow",
    source: "img_product",
    target: "llm_strategist",
    targetHandle: "image-0",
    animated: true,
    style: { stroke: "#34d399", strokeWidth: 2 },
  },
  {
    id: "e2",
    type: "glow",
    source: "text_product",
    target: "llm_strategist",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#c084fc", strokeWidth: 2 },
  },
  {
    id: "e3",
    type: "glow",
    source: "llm_strategist",
    sourceHandle: "output",
    target: "llm_social",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#c084fc", strokeWidth: 2 },
  },
  {
    id: "e4",
    type: "glow",
    source: "llm_strategist",
    sourceHandle: "output",
    target: "llm_ads",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#c084fc", strokeWidth: 2 },
  },
  {
    id: "e6",
    type: "glow",
    source: "llm_strategist",
    sourceHandle: "output",
    target: "llm_email",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#c084fc", strokeWidth: 2 },
  },
  {
    id: "e7",
    type: "glow",
    source: "llm_strategist",
    sourceHandle: "output",
    target: "llm_video",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#c084fc", strokeWidth: 2 },
  },
];

export function getBrandStrategistTemplate(): {
  nodes: WorkflowNode[];
  edges: Edge[];
} {
  return {
    nodes: brandStrategistNodes,
    edges: brandStrategistEdges,
  };
}
