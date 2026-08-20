# OmniPresence — product goals

Canonical intent for this repo. Implementation details live in `README.md` and `AGENTS.md`.

## Who it is for

A **single operator** running social for four brands on this Mac:

- **TORCC**
- **First Love**
- **Open Eyes**
- **KEKA**

Not a multi-user team product. No invites, roles, or approval queues.

## What the product must do

1. **Stay local.** UI, worker, SQLite, and media vault run on this machine. No Lovable, Emergent, Neon, or other hosted app databases. Optional API keys only for LLMs and social networks.
2. **Honor each brand.** Captions, hashtags, and CTAs follow that client’s voice and posting windows.
3. **AI from the reel.** For each video/image: **transcript → brand-aligned caption + hashtags → schedule → publish** without a per-post approval step (armed auto-post, kill switch per client).
4. **Multi-platform.** Facebook and Instagram publish today; YouTube, X, TikTok, and Rumble follow as APIs allow.
5. **Command center.** Overview (attention, unread, next publishes), Engage (comments/replies), Boards, Queue, Calendar.

## Intended loop

```
Local Mac file
  → media vault
  → transcript (speech-to-text when wired; notes/outline until then)
  → AI caption + hashtags using transcript + brand voice
  → per-platform times (peak windows, no collisions)
  → armed schedule
  → local worker publishes when due
```

## Honest status (2026-08)

| Goal | Now |
|------|-----|
| Local-only store | Worker SQLite + browser localStorage. No Neon in app dependencies. |
| Brand voice | Per-client `voice` on workspace profiles; AI prepare must pass it. |
| Transcript from the actual file | Not yet (outline/mock via `/api/ai/generate`). **Next: Whisper / local STT.** |
| Captions from transcript | Partial — prepare uses transcript if present, else caption/filename. Mock AI unless `VITE_STUDIO_MOCK_AI=0`. |
| Auto-schedule | Studio shelf + `schedule-engine`. |
| Auto-publish | Armed **Facebook / Instagram** from **local Mac media**. YouTube upload not built. |
| Engage | Comment sync + reply for YT / FB / IG. |

## Non-goals

- Cloud app hosting as the daily path (Vercel/Neon)
- Team auth, members, invite codes
- Requiring Dropbox for publish (optional only)
