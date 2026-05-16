# PRD — TORCC OmniSocial Scheduler (glance-schedule-go)

## Problem Statement
User asked to build/run the repo `glance-schedule-go-main.zip` (originally https://github.com/EvenSteven92/glance-schedule-go) — a TanStack Start + React 19 + Vite + Tailwind CSS v4 + shadcn-style UI app from Lovable. Goal: install dependencies and run.

## Architecture
- **Frontend** (`/app/frontend`): TanStack Start (Vite dev server) — TypeScript, React 19, TanStack Router, TanStack Query, Tailwind v4, Radix UI, lucide-react. Runs on port 3000 via `yarn start` → `vite dev --host 0.0.0.0 --port 3000`.
- **Backend** (`/app/backend`): Minimal FastAPI stub on port 8001 (the project is frontend-only with mock data; backend exists only to satisfy supervisor).
- **Data**: All data is mocked in `src/lib/mock-data.ts`.

## Pages / Routes
- `/` Dashboard — Core performance metrics, growth matrix, scheduled queue, draft queue, media grid
- `/scheduler` — New post creation with target platforms, format spec, AI auto-schedule, calendar picker
- `/calendar` — Calendar view
- `/ai-studio` — AI tools
- `/analytics` — Analytics view

## Setup Done (May 16, 2026)
- Moved repo into `/app/frontend`, created stub `/app/backend` (FastAPI + requirements + .env)
- Added `start` script in `package.json`: `vite dev --host 0.0.0.0 --port 3000`
- Patched `vite.config.ts` to set `host: 0.0.0.0`, `port: 3000`, `allowedHosts: true`, and HMR over wss
- `yarn install --ignore-engines` (project requests Node 22, env has Node 20; `--ignore-engines` works for miniflare which is build-only)
- Supervisor: backend + frontend both RUNNING

## Verified
- HTTP 200 on `/`, `/scheduler`, `/calendar`, `/ai-studio`, `/analytics`
- UI renders with proper dark theme, sidebar nav, JetBrains Mono typography, metric cards, scheduled posts

## Backlog / Future
- P2: Build production version (`vite build`) and serve via wrangler/Cloudflare for deployment
- P2: Replace mock data with real backend if user wants persistence
- P2: Implement actual social platform connectors (X, FB, IG, YT, TikTok)
- P2: Wire up AI Studio + Analytics pages with real charts (recharts already installed)
