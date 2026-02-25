import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadVideo } from "@/lib/transloadit";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const video = body?.video;

    if (!video || typeof video !== "string") {
      return NextResponse.json(
        { error: "No video provided" },
        { status: 400 }
      );
    }

    const url = await uploadVideo(video);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Video upload error:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof (error as { message?: string })?.message === "string"
          ? (error as { message: string }).message
          : "Failed to upload video";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
