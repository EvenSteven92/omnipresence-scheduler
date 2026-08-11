# TORCC OmniPresence Scheduler

Browser-local multi-platform social scheduling app (TanStack Start + React).

**No Vercel, Neon, Lovable, Emergent, or cloud database required.**

## Prerequisites

- Node.js **22+**
- Optional: Python 3.11+ (news ticker only)

## Run on port 3000

```bash
cd frontend

rm -rf node_modules .tanstack .output dist
npm install
npm run dev
```

Open **http://localhost:3000**

| Feature | Storage |
|---------|---------|
| Queue / scheduled posts | `sessionStorage` |
| Studio boards | `localStorage` |
| Custom events | `localStorage` |
| Seed demo content | In-code workspace data |

## Optional: news backend (port 8001)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001
```

Vite proxies `/api/news` and `/api/health` to that process. The UI works without it.

## Optional: AI copy

`POST /api/ai/generate` uses the Vercel AI SDK. Without API keys, Studio AI falls back to deterministic helpers.

```bash
# frontend/.env (optional)
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL=xai/grok-4.1-fast-non-reasoning
```

## Dropbox media

Paste public Dropbox share links on cards; resolved via `POST /api/dropbox/resolve` (no Dropbox app key).

## Scripts

```bash
cd frontend
npm run dev        # http://localhost:3000
npm run build      # production bundle (node-server Nitro preset)
npm run preview    # preview build on :3000
npm run typecheck
```

## Project layout

```
glance-schedule-go/
├── frontend/          # TanStack Start app (UI + light API routes)
│   ├── src/routes/    # pages + /api/* (AI, Dropbox, local stubs)
│   ├── src/server/ai/ # optional LLM generate
│   └── vite.config.ts # Vite + TanStack Start (no Lovable)
└── backend/           # optional FastAPI news ticker only
```

Cloud OAuth (YouTube/Meta), Postgres, and Vercel deploy paths were removed for a pure local ship.
