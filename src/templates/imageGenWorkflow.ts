/**
 * Sample workflow: two image nodes + one text node → LLM node (generates image from inputs).
 * Matches the "two images and one text connected to LLM that generates image" pattern.
 */

import type { WorkflowNode } from "@/src/types/workflow";
import type { Edge } from "@xyflow/react";

export const IMAGE_GEN_TEMPLATE_NAME = "Image from inputs";

export function getImageGenTemplate(): {
  name: string;
  nodes: WorkflowNode[];
  edges: Edge[];
} {
  const nodes: WorkflowNode[] = [
    {
      id: "img_1",
      type: "image",
      position: { x: 80, y: 60 },
      data: {
        label: "Image 1",
        imageUrl: null,
        imageBase64: null,
      },
    },
    {
      id: "img_2",
      type: "image",
      position: { x: 80, y: 320 },
      data: {
        label: "Image 2",
        imageUrl: null,
        imageBase64: null,
      },
    },
    {
      id: "text_prompt",
      type: "text",
      position: { x: 80, y: 580 },
      data: {
        label: "Prompt",
        content:
          "Describe how to combine or transform these images, or the style and content for the output.",
      },
    },
    {
      id: "llm_image",
      type: "llm",
      position: { x: 500, y: 180 },
      data: {
        label: "Image generator",
        model: "gemini-2.5-flash",
        systemPrompt:
          "You receive two images and a text prompt. Use the prompt and images to produce a single, coherent output. When asked to generate or describe an image, respond with the requested content.",
        userPrompt: "",
        response: null,
        generatedImage: null,
        isLoading: false,
        error: null,
        imageInputCount: 2,
      },
    },
  ];

  const edges: Edge[] = [
    {
      id: "e_img1_llm",
      source: "img_1",
      target: "llm_image",
      targetHandle: "image-0",
      animated: true,
      style: { stroke: "#34d399", strokeWidth: 2 },
    },
    {
      id: "e_img2_llm",
      source: "img_2",
      target: "llm_image",
      targetHandle: "image-1",
      animated: true,
      style: { stroke: "#34d399", strokeWidth: 2 },
    },
    {
      id: "e_text_llm",
      source: "text_prompt",
      target: "llm_image",
      targetHandle: "prompt",
      animated: true,
      style: { stroke: "#c084fc", strokeWidth: 2 },
    },
  ];

  return {
    name: IMAGE_GEN_TEMPLATE_NAME,
    nodes,
    edges,
  };
}
