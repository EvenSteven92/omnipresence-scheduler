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

## Deploy to Vercel (frontend demo)

The UI runs on Vercel with mock workspace data. The FastAPI backend (news ticker, AI) is optional and not included in the Vercel deploy.

1. Push this repo to GitHub.
2. In [Vercel → New Project](https://vercel.com/new), import the repository.
3. Set **Root Directory** to `frontend`.
4. Framework should auto-detect **TanStack Start** (Nitro + `vercel` preset in `vite.config.ts`).
5. Deploy — no env vars required for the mock-data demo.

Local Vercel-shaped build:

```bash
cd frontend
npm install
npm run build
```