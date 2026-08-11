# AGENTS.md — TORCC OmniPresence

Guidance for AI coding agents working in this repository.

## Project locations

| What | Where |
|------|--------|
| **Local clone** | `/Users/stephen/glance-schedule-go` |
| **GitHub** | https://github.com/EvenSteven92/omnipresence-scheduler |

The folder name (`glance-schedule-go`) and GitHub repo name (`omnipresence-scheduler`) differ — both refer to the same project.

## What this is

**TORCC OmniPresence** is a multi-platform social scheduling app for ministry/content teams. Users compose content cards, schedule per-platform publish times, and group media into event albums.

**Stack (local-only):**

- **Frontend + light API:** TanStack Start (React 19, file-based routes) in `frontend/`
- **Persistence:** browser `sessionStorage` / `localStorage` (no cloud DB)
- **Charts:** Recharts; **styling:** Tailwind CSS v4
- **Optional:** FastAPI news ticker in `backend/`; AI copy via `/api/ai/generate`

Cloud paths (Vercel, Neon/Drizzle, YouTube/Meta OAuth + sync) were **removed**. API stubs under `/api/accounts`, `/api/youtube`, `/api/meta`, `/api/posts`, `/api/events` return disconnected/503 shapes so the UI still loads.

## Repository layout

```
glance-schedule-go/
├── AGENTS.md
├── README.md
├── docs/                     ← product specs (some historical cloud notes)
├── frontend/                 ← **primary codebase — work here**
│   ├── src/
│   │   ├── routes/           ← pages + API routes
│   │   ├── components/
│   │   ├── hooks/            ← local persistence hooks
│   │   ├── lib/
│   │   └── server/ai/        ← optional LLM generate
│   └── vite.config.ts
└── backend/                  ← optional FastAPI (news)
```

## Commands

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build
npm run typecheck
npm run lint
```

Optional news backend:

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

## Architecture notes

### Routing

- **Pages:** `frontend/src/routes/*.tsx` — Studio (`/studio`) is primary
- **API:** AI generate, Dropbox resolve; cloud OAuth/metrics/posts stubs return empty/503
- **Shell:** `frontend/src/routes/__root.tsx`

### Data (browser-local)

| Data | Where |
|------|--------|
| Scheduled / queue posts | `localStorage` (`usePersistedPosts` / `scheduled-posts-storage`) |
| Deleted seed post ids | `localStorage` (so removals stick across restarts) |
| Studio boards | `localStorage` |
| Composer drafts | `localStorage` |
| Custom events | `localStorage` (`useCustomEvents`) |
| Active workspace id | `localStorage` |

### Do not reintroduce without explicit user ask

- `@neondatabase/serverless`, `drizzle-orm`, `DATABASE_URL`
- `vercel.json`, `.vercel/`, Vercel project linking
- Lovable / Emergent packages or configs
- Server-side posts repository or OAuth token storage

## Git

- Commit with clear messages; push when work is finished (user preference: always commit to GitHub)
