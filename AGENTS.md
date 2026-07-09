# AGENTS.md — TORCC OmniSocial

Guidance for AI coding agents working in this repository.

## Project locations

| What | Where |
|------|--------|
| **Local clone** | `/Users/stephen/glance-schedule-go` |
| **GitHub** | https://github.com/EvenSteven92/omnipresence-scheduler |
| **Production** | https://omnipresence-three.vercel.app/ |
| **Vercel root** | `frontend` (not repo root) |

The folder name (`glance-schedule-go`) and GitHub repo name (`omnipresence-scheduler`) differ — both refer to the same project.

## What this is

**TORCC OmniSocial** is a multi-platform social scheduling and analytics app for ministry/content teams. Users compose content cards, schedule per-platform publish times, group media into event albums, and view cross-platform performance.

**Stack (active path):**

- **Frontend + API:** TanStack Start (React 19, file-based routes) in `frontend/`
- **Deploy:** Vercel (Nitro preset, `framework: tanstack-start`)
- **DB:** Neon Postgres via Drizzle (`frontend/src/server/db/`)
- **Live integrations:** YouTube OAuth + Meta (Facebook Login for Business) with daily cron sync
- **Charts:** Recharts; **styling:** Tailwind CSS v4

**Legacy / optional:** `backend/` is a FastAPI app (port 8001) used locally for RSS news (`/api/news`) and health checks. Most product APIs live in TanStack server routes under `frontend/src/routes/api/`.

## Repository layout

```
glance-schedule-go/
├── AGENTS.md                 ← this file
├── README.md                 ← local dev quick start
├── docs/PROJECT_LAYOUT.md    ← historical blueprint (partially outdated)
├── memory/PRD.md             ← product notes
├── frontend/                 ← **primary codebase — work here**
│   ├── src/
│   │   ├── routes/           ← pages + API routes (TanStack file routing)
│   │   ├── components/       ← UI components
│   │   ├── hooks/            ← React hooks
│   │   ├── lib/              ← client utilities, mock data, live-metrics merge
│   │   └── server/           ← server-only: OAuth, DB, sync, AI
│   ├── scripts/              ← SQL migrations (init-db.sql, etc.)
│   ├── vercel.json           ← Vercel cron (YouTube + Meta sync)
│   └── vite.config.ts        ← Nitro/Vercel preset; dev proxy for news/health
└── backend/                  ← optional FastAPI (Python)
```

## Commands

Run from `frontend/` unless noted.

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run build        # production build (run before claiming success)
npm run lint
npm run format
```

Optional backend (separate terminal):

```bash
cd backend
source .venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8001
```

## Architecture notes

### Routing

- **Pages:** `frontend/src/routes/*.tsx` — e.g. `/`, `/calendar`, `/scheduler`, `/analytics`, `/events`, `/workspaces`
- **API:** `frontend/src/routes/api/**/*.ts` — OAuth callbacks, metrics, sync, team session, AI generate
- **Shell:** `frontend/src/routes/__root.tsx` — sidebar, sync status bar, workspace provider

### Data sources (hybrid)

| Concern | Source |
|---------|--------|
| Workspaces, scheduled/published posts, events | `frontend/src/lib/workspaces/` + `mock-data.ts` (client state) |
| Live YouTube / Meta KPIs | Neon DB + `/api/youtube/metrics`, `/api/meta/metrics` |
| Merged dashboard/analytics | `frontend/src/lib/live-metrics.ts` overlays live data on mock base |
| OAuth tokens | Encrypted in Postgres (`frontend/src/server/crypto/tokens.ts`) |

When changing KPIs or growth matrix, check **both** mock workspace data and `live-metrics.ts` merge logic.

### Key modules

| Area | Files |
|------|--------|
| Platforms (icons, colors, peak times) | `frontend/src/lib/platforms.ts` |
| Time ranges (dashboard + analytics) | `frontend/src/lib/timeframe.ts` |
| Event albums | `frontend/src/lib/events/` |
| Scheduler / compose | `frontend/src/routes/scheduler.tsx`, `ComposerCard.tsx` |
| Calendar interactions | `frontend/src/routes/calendar.tsx`, `calendar-day-click.ts` |
| OAuth YouTube | `frontend/src/server/youtube/` |
| OAuth Meta | `frontend/src/server/meta/` |
| Admin / workspaces | `frontend/src/routes/workspaces.tsx`, `ConnectPlatformSection.tsx` |

### Vercel cron (Hobby-safe: daily)

Defined in `frontend/vercel.json`:

- `0 6 * * *` → `/api/youtube/sync`
- `30 6 * * *` → `/api/meta/sync`

Do not add sub-hourly crons without checking Vercel plan limits.

## Environment variables

Set in Vercel project settings (and locally in `frontend/.env` if needed). Never commit secrets.

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres (required for OAuth + live metrics) |
| `SESSION_SECRET` | OAuth state signing (optional; has dev fallback) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | YouTube OAuth |
| `GOOGLE_REDIRECT_URI` | Optional override; defaults from `VERCEL_URL` |
| `META_APP_ID`, `META_APP_SECRET` | Meta OAuth |
| `META_LOGIN_CONFIG_ID` | Facebook Login for Business config |
| `META_OAUTH_SCOPES` | Optional scope override |
| `META_REDIRECT_URI` | Optional override |
| `APP_BASE_URL` | Canonical app URL for OAuth redirects |
| `DEFAULT_WORKSPACE_ID` | Default workspace slug (default: `torcc`) |
| `AI_GATEWAY_MODEL` | AI copy generation model |
| `EMERGENT_LLM_KEY` | Legacy AI key (if used) |

## UI / UX conventions

Follow these when editing UI copy or layout:

1. **Use sentence case** for labels, section titles, buttons, and empty states — not `snake_case` or `SCREAMING_UNDERSCORES`.
2. **Dashboard vs Analytics:** Dashboard is action-first (upcoming schedule, gaps, 3 KPIs, growth matrix). Analytics holds the full 7-KPI grid, timeframe picker, and deep charts.
3. **CTA hierarchy:** “New Post” is primary; “New Event” is secondary (text link in header, dashed icon in sidebar).
4. **Nav:** Sidebar items should show a clear active state (`Sidebar.tsx`).
5. **Platform identity:** Use brand colors from `platforms.ts` (left borders on growth matrix cards, analytics table rows).
6. **Sync status:** Top bar is `SyncStatusBar.tsx` (meaningful sync info), not the old opaque news ticker.

### Preserve unless explicitly asked to change

- Collapsible growth matrix UX (`GrowthMatrixChart.tsx` + `CollapsibleSection`)
- Event performer / top performer rail card layout (`TopPerformerCard`, flex-wrap album grids)
- Narrow icon-only sidebar with hover tooltips
- Nitro/Vercel output paths in `vite.config.ts` — do not duplicate TanStack/Cloudflare plugins from `@lovable.dev/vite-tanstack-config`
- Live YouTube/Meta wiring in dashboard and analytics KPI paths

## Making changes

### Scope

- **Default edit location:** `frontend/src/`
- **Avoid drive-by refactors** in unrelated files
- **Do not edit** `frontend/src/routeTree.gen.ts` (generated)
- **SQL migrations:** `frontend/scripts/` — run manually against Neon when schema changes

### Verification

Before marking work complete:

```bash
cd frontend && npm run build
```

Fix TypeScript and build errors. There is no dedicated test suite in `frontend/` today; rely on build + manual smoke of affected routes.

### Git

- Default branch: `main`
- Commit with clear messages; push when the user expects deploy (Vercel auto-deploys from `main`)
- Run `git status` / `git diff` before committing

## Common tasks

| Task | Where to start |
|------|----------------|
| New page | `frontend/src/routes/<name>.tsx` |
| New API route | `frontend/src/routes/api/<path>.ts` |
| Platform rules | `frontend/src/lib/platforms.ts` |
| Dashboard layout | `frontend/src/routes/index.tsx` |
| Analytics charts | `frontend/src/routes/analytics.tsx` |
| OAuth / sync bug | `frontend/src/server/youtube/` or `server/meta/` |
| Connect UI | `frontend/src/components/ConnectPlatformSection.tsx`, `workspaces.tsx` |
| Design / label pass | Grep for `label-mono` with underscore strings |

## Out of scope unless requested

- Rewriting `docs/PROJECT_LAYOUT.md` or `memory/PRD.md`
- Migrating off mock scheduled posts to full Postgres CRUD (planned, not complete)
- X/TikTok publish workers
- Replacing Vercel with another host

## References

- `README.md` — local dev
- `docs/PROJECT_LAYOUT.md` — long-term product/schema vision (some sections predate YouTube/Meta live metrics)
- Design critique implementation: natural-language labels, dashboard/analytics split, scheduler workflow steps (see recent commits on `main`)