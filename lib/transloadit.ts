import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { Transloadit } from "@transloadit/node";

const transloadit = new Transloadit({
  authKey: process.env.TRANSLOADIT_AUTH_KEY ?? process.env.TRANSLOADIT_KEY ?? "",
  authSecret:
    process.env.TRANSLOADIT_AUTH_SECRET ?? process.env.TRANSLOADIT_SECRET ?? "",
});


export async function uploadImage(base64Data: string): Promise<string> {
  const base64Match = base64Data.match(/^data:[^;]+;base64,(.+)$/);
  const rawBase64 = base64Match ? base64Match[1] : base64Data;
  const buffer = Buffer.from(rawBase64, "base64");

  const tmpPath = join(tmpdir(), `galaxy-upload-${randomUUID()}`);
  try {
    await writeFile(tmpPath, buffer);

    const status = await transloadit.createAssembly({
      files: { file1: tmpPath },
      params: {
        steps: {
          image: {
            use: ":original",
            robot: "/image/resize",
            result: true,
            width: 4096,
            height: 4096,
            resize_strategy: "fit",
          },
        },
      },
      waitForCompletion: true,
    });

    const first = status.results?.image?.[0];
    const url = first?.ssl_url ?? first?.url;
    if (!url || typeof url !== "string") {
      throw new Error("Transloadit assembly did not return an image URL");
    }
    return url;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

/** Accept base64 video (data URL or raw), upload via Transloadit, return video URL */
export async function uploadVideo(base64Data: string): Promise<string> {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY ?? process.env.TRANSLOADIT_KEY;
  const authSecret =
    process.env.TRANSLOADIT_AUTH_SECRET ?? process.env.TRANSLOADIT_SECRET;
  if (!authKey || !authSecret) {
    throw new Error(
      "Transloadit credentials missing. Set TRANSLOADIT_AUTH_KEY and TRANSLOADIT_AUTH_SECRET (or TRANSLOADIT_KEY and TRANSLOADIT_SECRET) in .env"
    );
  }
  const base64Match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  const mime = base64Match ? base64Match[1] : "video/mp4";
  const rawBase64 = base64Match ? base64Match[2] : base64Data;
  const buffer = Buffer.from(rawBase64, "base64");

  const ext = mime.includes("webm") ? "webm" : mime.includes("mov") ? "mov" : "mp4";
  const tmpPath = join(tmpdir(), `galaxy-video-${randomUUID()}.${ext}`);
  try {
    await writeFile(tmpPath, buffer);

    const status = await transloadit.createAssembly({
      files: { file1: tmpPath },
      params: {
        steps: {
          video: {
            use: ":original",
            robot: "/video/encode",
            result: true,
            preset: "web/mp4/720p",
            ffmpeg_stack: "v7.0.0",
          },
        },
      },
      waitForCompletion: true,
    });

    const first = status.results?.video?.[0];
    const url = first?.ssl_url ?? (first as { url?: string })?.url;
    if (!url || typeof url !== "string") {
      throw new Error("Transloadit assembly did not return a video URL");
    }
    return url;
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
