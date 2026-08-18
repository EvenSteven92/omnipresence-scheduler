# OmniPresence local worker

Mac always-on process for OAuth tokens, SQLite metrics, and (soon) armed auto-post / inbox sync.

## Quick start

```bash
cd worker
cp .env.example .env   # add GOOGLE_* and/or META_* secrets
npm install
npm run init-db
npm start              # http://127.0.0.1:8787
```

Or: `./start.sh`

The Desktop **OmniPresence** app also starts this worker when you open it.

## Endpoints

| Path | Purpose |
|------|---------|
| `GET /api/ops/health` | Online heartbeat |
| `GET /api/accounts/status?workspace=` | Connection status |
| `GET /api/accounts/youtube/connect` | Start Google OAuth |
| `GET /api/accounts/youtube/callback` | OAuth callback |
| `GET /api/accounts/meta/connect` | Start Meta OAuth |
| `GET /api/accounts/meta/callback` | OAuth callback |
| `GET /api/youtube/metrics` | Cached YT metrics |
| `POST /api/youtube/sync` | Refresh YT from API |
| `GET /api/meta/metrics` | Cached Meta metrics |
| `POST /api/meta/sync` | Refresh Meta from API |

The UI on `:3000` proxies these paths via TanStack route handlers.

## OAuth redirect URIs

Register in Google / Meta consoles:

- `http://localhost:3000/api/accounts/youtube/callback`
- `http://localhost:3000/api/accounts/meta/callback`

## Data

- SQLite: `worker/data/omnipresence.sqlite` (gitignored)
- Tokens: AES-GCM encrypted in SQLite (`SESSION_SECRET` / `ENCRYPTION_KEY`)
