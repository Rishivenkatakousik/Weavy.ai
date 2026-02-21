import { GoogleGenAI } from "@google/genai";

/**
 * Normalize base64 image from frontend (may be data URL or raw base64) to { data, mimeType }.
 */
function parseImageInput(imageBase64: string): { data: string; mimeType: string } {
  const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return { data: dataUrlMatch[2], mimeType: dataUrlMatch[1] || "image/png" };
  }
  return { data: imageBase64, mimeType: "image/png" };
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
      const { data, mimeType } = parseImageInput(img);
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
