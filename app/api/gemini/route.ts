import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { generateContentGemini } from "@/lib/gemini";

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

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GEMINI_API_KEY is not configured. Add it to .env.local (get one from Google AI Studio).",
        },
        { status: 500 }
      );
    }

    const content = await generateContentGemini(
      model,
      systemPrompt,
      userPrompt,
      images
    );

    return NextResponse.json({
      success: true,
      content: content || null,
      image: null,
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
