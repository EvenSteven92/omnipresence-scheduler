# TORCC OmniPresence Scheduler

Local-first multi-platform social scheduling app (TanStack Start + React).

## Local-only (recommended for day-to-day)

**No Vercel, Neon, Lovable, or Emergent required.**

### Prerequisites

- Node.js **22+**
- Optional: Python 3.11+ (news ticker only)

### Run the app on port 3000

```bash
cd frontend

# Pure local: do NOT set DATABASE_URL
# (posts → sessionStorage, boards → localStorage)

rm -rf node_modules .tanstack .output dist
npm install
npm run dev
```

Open **http://localhost:3000**

| Feature | Local storage |
|---------|----------------|
| Queue / scheduled posts | `sessionStorage` |
| Studio boards | `localStorage` |
| Custom events | `localStorage` |
| Seed demo content | In-code workspace data |

### Optional: news backend (port 8001)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --host 127.0.0.1 --port 8001
```

Vite proxies `/api/news` and `/api/health` to that process. The app UI works without it.

### Optional: AI copy

Frontend route `POST /api/ai/generate` uses the Vercel AI SDK. Without API keys, Studio AI falls back to deterministic/mock helpers. No Emergent package.

### Optional: Postgres without Neon

Point `DATABASE_URL` at any Postgres (e.g. Docker), then run `frontend/scripts/migrate-posts-events.sql`. Omit it for browser-only mode.

### Dropbox media

Paste public Dropbox share links on cards; resolved via `POST /api/dropbox/resolve` (no Dropbox app key).

## Scripts

```bash
cd frontend
npm run dev        # http://localhost:3000
npm run build      # production bundle (node-server Nitro preset by default)
npm run preview    # preview build on :3000
npm run typecheck
```

## Production (optional cloud)

Production may still deploy via Vercel + Neon (`DATABASE_URL`). That is **optional** and separate from the local-first workflow above.

| | |
|---|---|
| Cloud deploy | Vercel project `torcc/omnipresence` |
| Root directory | `frontend` |
| DB | Neon when `DATABASE_URL` is set |

## Project layout

```
glance-schedule-go/
├── frontend/          # TanStack Start app (UI + API routes)
│   ├── src/routes/    # pages + /api/*
│   ├── src/server/    # server-side db/oauth helpers
│   └── vite.config.ts # clean Vite config (no Lovable)
└── backend/           # optional FastAPI news ticker only
```
