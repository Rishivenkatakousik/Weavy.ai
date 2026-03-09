/**
 * Brand Strategist AI sample workflow.
 * Flow: Product image + text → Brand Strategist AI → Social, Ads, Email, Video specialists.
 */

import type { WorkflowNode } from "@/src/types/workflow";
import type { Edge } from "@xyflow/react";

export const brandStrategistNodes: WorkflowNode[] = [
  {
    id: "node_1772907951875_8b8y12mai",
    type: "image",
    position: { x: 540, y: 30 },
    data: {
      label: "Product Photo",
      imageUrl: null,
      imageBase64: null,
    },
  },
  {
    id: "node_1772907953709_xr0e8tz8x",
    type: "text",
    position: { x: 525, y: 510 },
    data: {
      label: "Product Name & Description",
      content: "A premium home fragrance scented candle in a minimalist ceramic jar, designed to create a warm and relaxing ambiance. Crafted with clean-burning natural wax and a cotton wick for a long-lasting, even burn. Subtle soothing fragrance ideal for relaxation, self-care, meditation, and home décor. Elegant neutral-toned aesthetic suitable for modern interiors and gifting.",
    },
  },
  {
    id: "node_1772907965729_80xp6xci8",
    type: "llm",
    position: { x: 1125, y: 150 },
    data: {
      label: "Brand Strategist AI",
      model: "gemini-2.5-flash",
      systemPrompt: "You are a brand strategist. Analyze the product (image and description) and output a structured brand foundation. Include: 1) Brand name ideas, 2) Target audience, 3) Unique selling proposition, 4) Brand personality, 5) Tone of voice, 6) Key benefits, 7) Marketing angles. Be concise and structured so other specialists can use this brief.",
      userPrompt: "",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 1,
    },
  },
  {
    id: "node_1772907967625_qsm4ix8wi",
    type: "llm",
    position: { x: 1725, y: 150 },
    data: {
      label: "Performance Ads Copywriter",
      model: "gemini-2.5-flash",
      systemPrompt: "You are a performance ads copywriter. Given the brand strategy brief, produce paid ad copy.",
      userPrompt: "",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 1,
    },
  },
  {
    id: "node_1772907969299_cbysa8bm8",
    type: "llm",
    position: { x: 1740, y: -360 },
    data: {
      label: "Social Media Manager",
      model: "gemini-2.5-flash",
      systemPrompt: "You are a social media manager. Given the brand strategy brief, produce on-brand social content.",
      userPrompt: "",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 1,
    },
  },
  {
    id: "node_1772907971151_m98t33pdz",
    type: "llm",
    position: { x: 2295, y: 165 },
    data: {
      label: "Content Synthesizer",
      model: "gemini-2.5-flash",
      systemPrompt: "You are a marketing lead.\n\nYou will receive:\n1. Social media content\n2. Performance advertising copy\n\nCombine and organize them into a final marketing package.\n\nOutput:\n1. Social Media Posts\n2. Paid Ads Copy\n3. Key Messaging",
      userPrompt: "",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 1,
    },
  },
  {
    id: "node_1772908180317_hnrwlku8w",
    type: "llm",
    position: { x: 1755, y: 630 },
    data: {
      label: "LLM",
      model: "gemini-2.5-flash",
      systemPrompt: "You are a professional email writer.write an email for marketing using the stategy brief",
      userPrompt: "",
      response: null,
      generatedImage: null,
      isLoading: false,
      error: null,
      imageInputCount: 1,
    },
  }
];

export const brandStrategistEdges: Edge[] = [
  {
    id: "edge_1772908010425_luwgq100t",
    type: "glow",
    source: "node_1772907951875_8b8y12mai",
    target: "node_1772907965729_80xp6xci8",
    sourceHandle: "output",
    targetHandle: "image-0",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  },
  {
    id: "edge_1772908014390_vzjfnfaa1",
    type: "glow",
    source: "node_1772907953709_xr0e8tz8x",
    target: "node_1772907965729_80xp6xci8",
    sourceHandle: "output",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  },
  {
    id: "edge_1772908019879_vciix2d3s",
    type: "glow",
    source: "node_1772907965729_80xp6xci8",
    target: "node_1772907969299_cbysa8bm8",
    sourceHandle: "output",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  },
  {
    id: "edge_1772908024997_17sosol2e",
    type: "glow",
    source: "node_1772907965729_80xp6xci8",
    target: "node_1772907967625_qsm4ix8wi",
    sourceHandle: "output",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  },
  {
    id: "edge_1772908036263_ns4rmnoaa",
    type: "glow",
    source: "node_1772907969299_cbysa8bm8",
    target: "node_1772907971151_m98t33pdz",
    sourceHandle: "output",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  },
  {
    id: "edge_1772908043352_d2lenk42g",
    type: "glow",
    source: "node_1772907967625_qsm4ix8wi",
    target: "node_1772907971151_m98t33pdz",
    sourceHandle: "output",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  },
  {
    id: "edge_1772908195043_b7yfn6410",
    type: "glow",
    source: "node_1772907965729_80xp6xci8",
    target: "node_1772908180317_hnrwlku8w",
    sourceHandle: "output",
    targetHandle: "prompt",
    animated: true,
    style: { stroke: "#444", strokeWidth: 2 },
  }
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
