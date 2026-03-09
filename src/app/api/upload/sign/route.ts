import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createHmac } from "crypto";
import { randomUUID } from "crypto";

const TRANSLOADIT_ASSEMBLY_URL = "https://api2.transloadit.com/assemblies";

const VIDEO_STEPS = {
  video: {
    use: ":original",
    robot: "/video/encode",
    result: true,
    preset: "web/mp4/720p",
    ffmpeg_stack: "v7.0.0",
  },
};

const IMAGE_STEPS = {
  image: {
    use: ":original",
    robot: "/image/resize",
    result: true,
    width: 4096,
    height: 4096,
    resize_strategy: "fit",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authKey =
      process.env.TRANSLOADIT_AUTH_KEY ?? process.env.TRANSLOADIT_KEY;
    const authSecret =
      process.env.TRANSLOADIT_AUTH_SECRET ??
      process.env.TRANSLOADIT_SECRET;

    if (!authKey || !authSecret) {
      return NextResponse.json(
        {
          error:
            "Transloadit credentials missing. Set TRANSLOADIT_AUTH_KEY and TRANSLOADIT_AUTH_SECRET.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "image";
    const steps = type === "video" ? VIDEO_STEPS : IMAGE_STEPS;

    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const paramsObj = {
      auth: {
        key: authKey,
        expires,
        nonce: randomUUID(),
      },
      steps,
    };

    const paramsString = JSON.stringify(paramsObj);
    const rawSignature = createHmac("sha384", authSecret)
      .update(paramsString)
      .digest("hex");
    const signature = `sha384:${rawSignature}`;

    return NextResponse.json({
      params: paramsString,
      signature,
      assembly_url: TRANSLOADIT_ASSEMBLY_URL,
    });
  } catch (error) {
    console.error("Upload sign error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload signature" },
      { status: 500 }
    );
  }
}
