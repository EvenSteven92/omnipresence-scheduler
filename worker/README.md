# OmniPresence local worker (Phase 1 scaffold)

Mac always-on process for:

- Armed auto-post (publish due targets without approval)
- Metrics / comment / message sync
- Health reported to the UI via `GET /api/ops/health` (later: worker port)

## Status

**Scaffold only.** Schema + stub entrypoint live here. OAuth + publishers land in Phase 1–2.

## Planned layout

```
worker/
  README.md          ← this file
  schema.sql         ← SQLite tables
  package.json       ← later
  src/
    index.ts         ← poll loop + HTTP health
    publish/         ← Meta / YouTube / …
    sync/            ← comments, metrics
```

## Run (future)

```bash
cd worker
npm install
npm start   # or launchd agent installed by OmniPresence.app
```

Until then, the TanStack app’s `/api/ops/health` returns `online: false` so Overview shows an honest Attention item.
