import { GoogleGenAI } from "@google/genai";

/**
 * Fetch image from URL and return as base64 data URL.
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  const buf = Buffer.from(await blob.arrayBuffer());
  const mime = blob.type || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * Normalize image input (URL or base64/data URL) to { data, mimeType }.
 */
async function parseImageInput(img: string): Promise<{ data: string; mimeType: string }> {
  if (img.startsWith("http://") || img.startsWith("https://")) {
    const dataUrl = await fetchImageAsBase64(img);
    const dataUrlMatch = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUrlMatch) {
      return { data: dataUrlMatch[2], mimeType: dataUrlMatch[1] || "image/png" };
    }
  }
  const dataUrlMatch = img.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { data: dataUrlMatch[2], mimeType: dataUrlMatch[1] || "image/png" };
  }
  return { data: img, mimeType: "image/png" };
}

export async function generateContentGemini(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  images?: string[]
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY (or GOOGLE_API_KEY) is not configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<{ inlineData?: { data: string; mimeType: string }; text?: string }> = [];

  if (images && images.length > 0) {
    for (const img of images) {
      const { data, mimeType } = await parseImageInput(img);
      parts.push({ inlineData: { data, mimeType } });
    }
  }
  parts.push({ text: userPrompt });

  const config: { systemInstruction?: string } = {};
  if (systemPrompt) {
    config.systemInstruction = systemPrompt;
  }

  const response = await ai.models.generateContent({
    model,
    contents: parts,
    config,
  });

  return response.text ?? "";
}
