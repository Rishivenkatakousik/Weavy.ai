# Trigger.dev setup

Workflow runs and the LLM task use [Trigger.dev](https://trigger.dev). Follow these steps to enable them.

## 1. Create a Trigger.dev account and project

1. Sign up at [cloud.trigger.dev](https://cloud.trigger.dev).
2. Create a new project and note the **project ref** (e.g. `proj_xxxxx`).
3. In the project, open **API Keys** and copy the **DEV** secret key (`tr_dev_...`).

## 2. Local environment

Add to `.env` or `.env.local`:

```env
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxx
TRIGGER_PROJECT_REF=proj_xxxxx   # optional if you set it in trigger.config.ts
```

## 3. Trigger.dev dashboard – environment variables

In your Trigger.dev project, go to **Environment Variables** and add:

- **DATABASE_URL** – same PostgreSQL URL as your app (e.g. Neon connection string), so tasks can write `WorkflowRun` and `NodeExecution` records.
- **GEMINI_API_KEY** – your Google AI Studio key for the LLM task.
- **FFMPEG_PATH** (optional) – Set automatically when using the FFmpeg build extension in deployment. Only set this if you want to override (e.g. a custom ffmpeg path).

## 4. Extract-frame task and FFmpeg

- **Deployment (Trigger.dev cloud):** `trigger.config.ts` includes the **FFmpeg build extension**, so the task image has ffmpeg installed and `FFMPEG_PATH` is set. No extra setup.
- **Local dev (`npx trigger.dev dev`):** The task uses the **ffmpeg-static** npm package as fallback when `FFMPEG_PATH` is not set, so you do not need to install ffmpeg on your machine.
- To use a different ffmpeg build, set **FFMPEG_PATH** in your environment (e.g. in Trigger.dev dashboard for cloud, or in `.env` for local) to the full path to the `ffmpeg` executable.

## 5. Run the Trigger.dev dev server

In a separate terminal (or use `concurrently` with Next.js):

```bash
npx trigger.dev@latest dev
```

Keep this running so tasks are registered and executed. Your Next.js app stays in another terminal with `npm run dev`.

## 6. Database migration

Your DB already has `User` and `Workflow` (schema not empty). Baseline first, then apply the new migration:

```bash
# 1. Mark the existing schema as applied (do not run the baseline SQL)
npx prisma migrate resolve --applied "0_baseline_existing_schema"

# 2. Apply the WorkflowRun + NodeExecution migration
npx prisma migrate deploy
```

For a brand‑new empty DB you would use `npx prisma migrate deploy` only.

## API usage

- **POST `/api/workflows/[id]/runs`** – Start a run for one LLM node. Body: `{ nodeId, model, userPrompt, systemPrompt?, images?, scope? }`. Creates a `WorkflowRun`, a `NodeExecution`, and triggers the `workflow-llm` task.
- **GET `/api/workflows/[id]/runs`** – List runs for the workflow (history).
- **GET `/api/workflows/[id]/runs/[runId]`** – Get one run with node execution details.

The LLM task runs on Trigger.dev, calls Gemini, then updates `NodeExecution` and (when all nodes for that run are done) `WorkflowRun` in your database.

---

## Config and setup checklist (Run workflow)

1. **Environment variables (Trigger.dev dashboard)**  
   Ensure **DATABASE_URL** and **GEMINI_API_KEY** are set. **FFMPEG_PATH** is optional (set by the FFmpeg extension in deployment).

2. **Local dev**  
   Run `npx trigger.dev dev` in a separate terminal. After any change to `trigger/*` code, restart this dev server so the updated tasks are used.

3. **Deployment**  
   Run `npx trigger.dev deploy` so the cloud uses the latest code and the image with FFmpeg. Use this when testing Run workflow in production or when the app triggers tasks on Trigger.dev cloud.

4. **Orchestrator / Extract frame**  
   The orchestrator uses a correct Prisma `select` (no `id is not defined`). The extract-frame task uses `FFMPEG_PATH` when set (deployment) or the ffmpeg-static binary (local). No local ffmpeg install required.
