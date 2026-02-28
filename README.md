# Weavy

A visual workflow builder for product marketing. Design workflows on a canvas with nodes (text, images, video, LLM, crop, extract frame), run them locally or in the cloud, and use Google Gemini and Transloadit for AI and media processing.

## Features

- **Visual workflow editor** – Drag-and-drop canvas (React Flow) with nodes: Text, Image, Video, LLM (Gemini), Crop Image, Extract Frame
- **Run workflows** – Execute full workflows or single/selected nodes; runs are orchestrated by [Trigger.dev](https://trigger.dev) in the cloud
- **AI (Gemini)** – LLM nodes call Google Gemini with optional image inputs
- **Media** – Video and image uploads go directly to [Transloadit](https://transloadit.com) (no size limit on Vercel); crop and frame extraction use FFmpeg on Trigger.dev
- **Auth** – [Clerk](https://clerk.com) for sign-in; users and workflows stored in PostgreSQL via [Prisma](https://prisma.io)

## Tech stack

- **Next.js 16** (App Router), React 19, TypeScript, Tailwind CSS
- **Clerk** – authentication
- **Prisma** – PostgreSQL (Neon or any Postgres)
- **Trigger.dev** – background tasks (orchestrator, LLM, crop, extract frame)
- **Transloadit** – video/image upload and encoding
- **Google Gemini** – LLM responses
- **Zustand** – workflow state; **@xyflow/react** – canvas

## Prerequisites

- Node.js 18+
- PostgreSQL (e.g. [Neon](https://neon.tech))
- Accounts: [Clerk](https://clerk.com), [Trigger.dev](https://cloud.trigger.dev), [Transloadit](https://transloadit.com), [Google AI Studio](https://aistudio.google.com) (Gemini API key)

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd galaxy
npm install
```

### 2. Environment variables

Create `.env` (or `.env.local`) with:

```env
# Database (required)
DATABASE_URL="postgresql://..."

# Clerk (required)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Trigger.dev (required for workflow runs)
TRIGGER_SECRET_KEY=tr_dev_...    # or tr_prod_... for production
TRIGGER_PROJECT_REF=proj_...    # optional if in trigger.config.ts

# Transloadit (required for video/image upload)
TRANSLOADIT_AUTH_KEY=...
TRANSLOADIT_AUTH_SECRET=...

# Google Gemini (required for LLM nodes)
GEMINI_API_KEY=...
```

### 3. Database

```bash
npx prisma migrate deploy
```

### 4. Run the app

**Terminal 1 – Next.js:**

```bash
npm run dev
```

**Terminal 2 – Trigger.dev** (so workflow tasks run):

```bash
npx trigger.dev@latest dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in, create a workflow from the dashboard, add nodes, connect them, and run.

## Project structure

- `app/` – Next.js App Router (pages, API routes, dashboard, auth)
- `src/components/` – React components (workflow canvas, node types)
- `src/store/` – Zustand store (workflow state)
- `src/types/` – TypeScript types for workflows
- `lib/` – Prisma client, auth, execution, Gemini, Transloadit, validation
- `trigger/` – Trigger.dev tasks (orchestrator, LLM, crop, extract frame)
- `prisma/` – Schema and migrations

## Deployment

### Vercel (Next.js app)

1. In Vercel, set environment variables (same as above; use **production** Clerk and Trigger.dev keys).
2. Deploy; the app will trigger tasks on Trigger.dev via the SDK.

### Trigger.dev (tasks)

Deploy tasks so they run in the cloud:

```bash
npx trigger.dev@latest deploy
```

In the Trigger.dev dashboard, set **DATABASE_URL**, **GEMINI_API_KEY**, and optionally **TRANSLOADIT_*** for tasks that upload results.

### Upload limits

Video and image uploads use **direct client → Transloadit** with a signed params endpoint (`POST /api/upload/sign?type=video|image`). Large files are supported; the legacy proxy routes are limited by Vercel’s body size.

## Further reading

- [TRIGGER_SETUP.md](./TRIGGER_SETUP.md) – Trigger.dev setup, env vars, and run/LLM API usage
