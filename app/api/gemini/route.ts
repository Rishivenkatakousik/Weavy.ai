import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { generateContentGemini } from "@/lib/gemini";
import { generateContentOpenRouter, generateImageOpenRouter } from "@/lib/openrouter";

const llmRequestSchema = z.object({
  model: z.string().min(1, "Model is required"),
  systemPrompt: z.string().optional(),
  userPrompt: z.string().min(1, "User prompt is required"),
  images: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = llmRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues.map((e) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { model, systemPrompt, userPrompt, images } = parsed.data;

    const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const useGemini =
      !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;

    if (!useOpenRouter && !useGemini) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Configure OPENROUTER_API_KEY (openrouter.ai) or GEMINI_API_KEY (Google AI Studio) in .env.local.",
        },
        { status: 500 }
      );
    }

    const content = useOpenRouter
      ? await generateContentOpenRouter(model, systemPrompt, userPrompt, images)
      : await generateContentGemini(model, systemPrompt, userPrompt, images);

    let image: string | null = null;
    if (useOpenRouter && userPrompt?.trim()) {
      try {
        image = await generateImageOpenRouter(userPrompt, systemPrompt, images);
      } catch (imgErr) {
        console.error("OpenRouter image generation failed (text still returned):", imgErr);
      }
    }

    return NextResponse.json({
      success: true,
      content: content || null,
      image,
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
