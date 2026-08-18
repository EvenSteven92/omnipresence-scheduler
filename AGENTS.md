# AGENTS.md — TORCC OmniPresence

Guidance for AI coding agents working in this repository.

## Project locations

| What | Where |
|------|--------|
| **Local clone** | `/Users/stephen/glance-schedule-go` |
| **GitHub** | https://github.com/EvenSteven92/omnipresence-scheduler |

## What this is

**OmniPresence** is a **personal** multi-client social ops console (not a multi-user team product).

**Clients:** TORCC · First Love · Open Eyes · KEKA (`WorkspaceId` in code — treat as client ids).

**Direction (approved plan):** Mac-local always-on worker + UI for armed auto-post, engage (comments/messages), and Overview attention — YouTube, Meta, TikTok, X, Rumble (phased; Rumble best-effort).

**Today:** Scheduling UI + Overview/Engage shells; **Phase 1 worker** on `:8787` with SQLite, YouTube/Meta OAuth + metrics sync. Armed publish + inbox reply still Phase 2–3.

## Stack

- **UI:** TanStack Start (React 19) in `frontend/` + native `OmniPresence.app`
- **Persistence (UI):** `localStorage` for schedules/boards
- **Ops backbone:** `worker/` (Hono + better-sqlite3) — OAuth tokens, metrics; UI proxies `/api/accounts|youtube|meta|ops`
- **Optional:** FastAPI news ticker in `backend/`

## Nav (target IA)

| Route | Role |
|-------|------|
| `/` | Overview (attention, armed controls, next 24h) |
| `/engage` | Inbox / comments / messages (shell until sync) |
| `/studio` | Boards |
| `/queue` | Agenda |
| `/calendar`, `/events`, `/analytics` | Planning / performance |
| `/clients` | Connections, kill switch, client switch (legacy `/workspaces` redirects) |

## Do not reintroduce without ask

- Multi-user team auth / invites / approval queues
- Vercel/Neon as the default daily path (Mac-local first)

## Git

Commit with clear messages; push when work is finished.
