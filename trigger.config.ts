import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg, additionalPackages } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_pytgxjenhutmugooxcgg",
  dirs: ["./trigger"],
  build: {
    extensions: [
      ffmpeg(),
      additionalPackages({ packages: ["ffmpeg-static"] }),
    ],
  },
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 300,
});
