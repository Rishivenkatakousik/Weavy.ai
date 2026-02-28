# Trigger.dev setup guide

This guide helps you set up [Trigger.dev](https://trigger.dev) so that workflow runs (including LLM, crop, and extract-frame steps) work in Galaxy.

---

## What is Trigger.dev and why do I need it?

When you click **Run** on a workflow, the app doesn’t run the heavy work (calling Gemini, cropping images, extracting video frames) on your Vercel or local server. Instead, it sends a job to **Trigger.dev**. Trigger.dev runs your code in their cloud, then writes the results back to your database.

- **Without Trigger.dev:** Running a workflow will fail or never finish, because those tasks never run.
- **With Trigger.dev:** You run a small dev server (or deploy tasks to their cloud), and workflow runs work as intended.

You need:

1. A Trigger.dev account and project  
2. API keys in your app  
3. Environment variables in the Trigger.dev dashboard  
4. The Trigger.dev dev server running (for local development) or a deployment (for production)

---

## Step 1: Create a Trigger.dev account and project

1. Go to **[cloud.trigger.dev](https://cloud.trigger.dev)** and sign up (or log in).
2. Create a **new project** (e.g. “Galaxy”).
3. Open your project, then go to **API Keys**.
4. Copy:
   - **Project ref** – looks like `proj_xxxxxxxx` (you may need it for `.env`).
   - **DEV** secret key – for local development, starts with `tr_dev_`.
   - **PROD** secret key – for production (Vercel, etc.), starts with `tr_prod_`.

Keep these safe; you’ll use the DEV key locally and the PROD key in Vercel.

---

## Step 2: Add keys to your app (local)

In your Galaxy project folder, create or edit `.env` or `.env.local` and add:

```env
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxx
```

Replace `tr_dev_xxxxxxxx` with your **DEV** secret key from Step 1.

- **TRIGGER_PROJECT_REF** – Optional. If your project ref is not already in `trigger.config.ts`, you can add:  
  `TRIGGER_PROJECT_REF=proj_xxxxxxxx`

---

## Step 3: Set environment variables in the Trigger.dev dashboard

Trigger.dev runs your tasks in their cloud. Those tasks need the same database and API keys your app uses.

1. In [cloud.trigger.dev](https://cloud.trigger.dev), open your project.
2. Go to **Environment Variables** (or **Settings** → **Environment Variables**).
3. Add these (for both **Development** and **Production** if you use both):

| Variable         | Description |
|------------------|-------------|
| **DATABASE_URL** | Your PostgreSQL connection string (same as in your app). Tasks use this to update workflow runs and node executions. |
| **GEMINI_API_KEY** | Your Google AI Studio (Gemini) API key. Required for LLM nodes. |
| **TRANSLOADIT_AUTH_KEY** | (Optional) Your Transloadit auth key, if crop/extract-frame tasks upload results via Transloadit. |
| **TRANSLOADIT_AUTH_SECRET** | (Optional) Your Transloadit auth secret. |
| **FFMPEG_PATH**  | (Optional) Leave unset for normal use. The project’s FFmpeg build extension sets this in deployment. Only set if you need a custom ffmpeg path. |

Save the variables. Without **DATABASE_URL** and **GEMINI_API_KEY**, workflow runs and LLM steps will fail.

---

## Step 4: Database migrations (first time only)

Your app uses Prisma and PostgreSQL. Ensure the schema used by workflow runs is applied.

- **Brand‑new database (no existing data):**

  ```bash
  npx prisma migrate deploy
  ```

- **Existing database** that already has `User` and `Workflow` but not `WorkflowRun` / `NodeExecution`:  
  If you have a baseline migration that was applied manually, mark it as applied, then deploy the rest:

  ```bash
  npx prisma migrate resolve --applied "0_baseline_existing_schema"
  npx prisma migrate deploy
  ```

Replace `0_baseline_existing_schema` with your actual baseline migration name if it’s different. After this, you don’t need to repeat Step 4 unless you add new migrations.

---

## Step 5: Run the Trigger.dev dev server (local development)

For workflow runs to work on your machine, Trigger.dev must be “listening” and running your task code.

1. Open a **second terminal** in your Galaxy project folder (keep the first one for `npm run dev`).
2. Run:

   ```bash
   npx trigger.dev@latest dev
   ```

3. Leave this running. You should see something like “Connected” or “Tasks registered”.
4. In the **first** terminal, start (or keep running) the Next.js app:

   ```bash
   npm run dev
   ```

Now when you run a workflow in the browser, the app sends jobs to Trigger.dev, and this dev server runs the tasks (orchestrator, LLM, crop, extract frame).

**Tip:** If you change code in the `trigger/` folder, restart `npx trigger.dev@latest dev` so it picks up the changes.

---

## Step 6: FFmpeg and the extract-frame task (no extra install needed)

- **Local dev:** The extract-frame task uses the **ffmpeg-static** npm package. You do **not** need to install FFmpeg on your computer.
- **Trigger.dev cloud (deployment):** The project’s `trigger.config.ts` uses the FFmpeg build extension, so FFmpeg is available in the task environment. You don’t need to set **FFMPEG_PATH** unless you want to override it.

---

## Deploying tasks for production (e.g. Vercel)

When your app is deployed (e.g. on Vercel), it will trigger tasks on Trigger.dev’s cloud. Those tasks must be deployed too.

1. Use your **PROD** secret key in Vercel (and any other production env), not the DEV key.
2. In your project folder, run once (and again whenever you change `trigger/` code):

   ```bash
   npx trigger.dev@latest deploy
   ```

3. In the Trigger.dev dashboard, ensure **Production** environment variables are set (same as in Step 3).

After this, production workflow runs will execute on Trigger.dev’s infrastructure.

---

## Quick checklist

- [ ] Trigger.dev account and project created  
- [ ] **DEV** key in `.env` / `.env.local` as `TRIGGER_SECRET_KEY`  
- [ ] **DATABASE_URL** and **GEMINI_API_KEY** (and optional Transloadit vars) set in Trigger.dev dashboard  
- [ ] Database migrations applied (`npx prisma migrate deploy`)  
- [ ] For local dev: `npx trigger.dev@latest dev` running in a second terminal  
- [ ] For production: **PROD** key in Vercel (etc.) and `npx trigger.dev@latest deploy` run after trigger code changes  

---

## API reference (for developers)

The app uses these endpoints when you run workflows:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/workflows/[id]/runs` | Start a workflow run (full, single node, or selected nodes). Creates a `WorkflowRun` and triggers the orchestrator task. |
| GET    | `/api/workflows/[id]/runs` | List run history for a workflow. |
| GET    | `/api/workflows/[id]/runs/[runId]` | Get one run and its node execution details. |
| POST   | `/api/workflows/[id]/runs/llm` | Start a single LLM node run. Body can include `nodeId`, `model`, `userPrompt`, `systemPrompt`, `images`. |

Tasks (orchestrator, LLM, crop, extract frame) run on Trigger.dev, update `NodeExecution` and `WorkflowRun` in your database, and the UI polls or refreshes to show results.
