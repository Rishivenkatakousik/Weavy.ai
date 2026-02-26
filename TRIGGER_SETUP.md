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
- **FFMPEG_PATH** (optional for extract-frame task) – full path to the `ffmpeg` executable. Only needed if you want to override the bundled binary; the extract-frame task uses **ffmpeg-static** by default, so a local ffmpeg install is not required.

## 4. Extract-frame task (ffmpeg-static)

The **Extract frame** node uses the **ffmpeg-static** npm package, which ships a bundled ffmpeg binary. You do not need to install ffmpeg on your system or set `FFMPEG_PATH` for normal use. If you need to use a different ffmpeg build, set `FFMPEG_PATH` in `.env` to the full path to your executable.

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
