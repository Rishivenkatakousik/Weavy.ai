/**
 * OpenRouter API client (OpenAI-compatible).
 * Use OPENROUTER_API_KEY to avoid Gemini quota limits; same models via OpenRouter.
 */

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/** Map our app model ids to OpenRouter model ids (Google Gemini on OpenRouter). */
const MODEL_MAP: Record<string, string> = {
  "gemini-2.0-flash": "google/gemini-2.0-flash-001",
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "gemini-1.5-flash": "google/gemini-flash-1.5",
  "gemini-1.5-pro": "google/gemini-pro-1.5",
};

function toDataUrl(imageBase64: string): string {
  const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) return imageBase64;
  return `data:image/png;base64,${imageBase64}`;
}

export async function generateContentOpenRouter(
  model: string,
  systemPrompt: string | undefined,
  userPrompt: string,
  images?: string[]
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const openRouterModel = MODEL_MAP[model] ?? `google/${model}`;

  const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];

  // OpenRouter recommends text first, then images
  userContent.push({ type: "text", text: userPrompt });
  if (images?.length) {
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: toDataUrl(img) },
      });
    }
  }

  const messages: Array<{ role: string; content: string | typeof userContent }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userContent });

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message ?? err?.message ?? res.statusText;
    throw new Error(`OpenRouter: ${msg}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const text = data.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : "";
}

/** OpenRouter model that supports image generation (output_modalities include "image"). */
const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";

/**
 * Generate an image via OpenRouter using an image-capable model.
 * Returns the first image as a data URL, or null if none.
 */
export async function generateImageOpenRouter(
  userPrompt: string,
  systemPrompt?: string,
  images?: string[]
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const userContent: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  userContent.push({ type: "text", text: userPrompt });
  if (images?.length) {
    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: { url: toDataUrl(img) },
      });
    }
  }

  const messages: Array<{ role: string; content: string | typeof userContent }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userContent });

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages,
      modalities: ["image", "text"],
      image_config: { aspect_ratio: "1:1" },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message ?? err?.message ?? res.statusText;
    throw new Error(`OpenRouter image: ${msg}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
        images?: Array<{ type?: string; image_url?: { url: string } }>;
      };
    }>;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
  }

  const firstImage = data.choices?.[0]?.message?.images?.[0];
  const url = firstImage?.image_url?.url;
  return typeof url === "string" ? url : null;
}
