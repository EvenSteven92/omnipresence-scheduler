# TORCC OmniSocial Scheduler (glance-schedule-go)

TanStack Start frontend + FastAPI backend for scheduling and composing social posts.

## Local development

### Prerequisites

- Node.js 22+ (22.13 works)
- Python 3.11+

### 1. Backend (port 8001)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn python-dotenv pydantic feedparser
# Optional: pip install emergentintegrations  # for /api/ai/generate
uvicorn server:app --host 127.0.0.1 --port 8001
```

Optional `.env` in `backend/`:

```env
EMERGENT_LLM_KEY=your-key-here
```

### 2. Frontend (port 3000)

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. Vite proxies `/api/*` to the backend.

### What works locally without extra keys

- Dashboard, scheduler, calendar, analytics (mock data in `frontend/src/lib/mock-data.ts`)
- News ticker (`GET /api/news/headlines`)

### What needs extra setup

- **AI copy** (`POST /api/ai/generate`): `emergentintegrations` package + `EMERGENT_LLM_KEY`
- **Real scheduling / X publish**: not implemented yet (see `memory/PRD.md`)

## Production

| | |
|---|---|
| **Live app (this project)** | https://omnipresence-torcc.vercel.app |
| **Vercel project** | `torcc/omnipresence` (GitHub: `EvenSteven92/omnipresence-scheduler`) |
| **Root directory** | `frontend` |

### Database-backed posts (shared schedule)

When `DATABASE_URL` (Neon / Vercel Postgres) is set on the Vercel project:

1. Run `frontend/scripts/migrate-posts-events.sql` in the Neon SQL editor (once).
2. Redeploy (or wait for next push).
3. Compose → **Schedule** writes to Postgres via `POST /api/posts`.
4. Calendar / queue load from `GET /api/posts?workspace=…`.

Without `DATABASE_URL`, the app keeps working in **local demo mode** (seed data + sessionStorage).

### Dropbox media links

On **Compose**, each card can store a **public Dropbox share link** (`dropbox.com/s/…` or `/scl/fi/…`). The app normalizes it to a direct `dl=1` URL via `POST /api/dropbox/resolve` (no Dropbox app key). Share + direct URL persist with the post when scheduling (Postgres or sessionStorage). Card detail shows the link under Source file.

**Team tip:** use “anyone with the link” shares so a future publish worker can fetch media.

> **Domain note:** `omnipresence.vercel.app` is a *different* product (not this repo).  
> Use **omnipresence-torcc.vercel.app**, or in Vercel → Project → Settings → Domains assign a custom domain / rename the production alias to this project.

### Deploy to Vercel (frontend demo)

The UI runs on Vercel with mock workspace data. The FastAPI backend (news ticker, AI) is optional and not included in the Vercel deploy.

1. Push this repo to GitHub (production deploys from `main`).
2. In [Vercel → New Project](https://vercel.com/new), import the repository (or use the existing `torcc/omnipresence` project).
3. Set **Root Directory** to `frontend`.
4. Framework should auto-detect **TanStack Start** (Nitro + `vercel` preset in `vite.config.ts`).
5. Deploy — no env vars required for the mock-data demo.

To attach `your-domain.com` or reclaim a `*.vercel.app` name for **this** project:

1. Open [Vercel Dashboard](https://vercel.com/torcc/omnipresence/settings/domains) for **omnipresence**.
2. **Add** the domain (or remove it from the other project first if it’s already assigned).
3. Confirm DNS if using a custom domain.

Local Vercel-shaped build:

```bash
cd frontend
npm install
npm run build
```