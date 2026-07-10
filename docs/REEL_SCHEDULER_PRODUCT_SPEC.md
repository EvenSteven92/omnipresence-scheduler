# OmniSocial — Reel Scheduler Product Spec

**Goal:** Make scheduling ministry reels the easiest thing in the world.  
**Status:** Implementation target for compose / queue / cadence / AI.  
**Last updated:** 2026-07-09  
**Visual system:** Editorial Mono (black/white/grey) — not orange neobrutal.

---

## 1. Competitive research (what the best tools do)

### 1.1 Later
| Strength | UX pattern | Steal for OmniSocial |
|----------|------------|----------------------|
| Visual-first | Drag-drop **calendar + grid** feel | Reel **filmstrip** of cards; calendar is secondary planning |
| Instagram/TikTok native | Aspect-aware previews | Big **portrait preview** default for reels |
| Link-in-bio + visual plan | One place to see the feed | Event-grouped queue (ministry moments) |
| Stories hide/show | Reduce calendar noise | Platform filters on calendar |

**Later is weak for:** multi-platform times per card, sermon/event albums, Dropbox-as-source.

### 1.2 Buffer
| Strength | UX pattern | Steal |
|----------|------------|-------|
| Dead-simple | **List + Calendar** toggle | Keep Queue ↔ Calendar; compose is not a third mental model |
| Queue slots | “Next free slot” / cadence | **Cadence modes**: Peak times · Daily · 3/day · Custom week |
| AI assistant | Caption help without bloat | One primary **AI prepare** control, not buried |
| Low learning curve | Few steps to schedule | **3-step funnel**: Media → Story → When |

**Buffer is weak for:** video-first workflows, bulk sermon reels, ministry event grouping.

### 1.3 Hootsuite
| Strength | UX pattern | Steal |
|----------|------------|-------|
| Bulk + team | Streams, approvals | Optional later; keep multi-card batch now |
| Analytics depth | Unified reporting | Analytics stays secondary; schedule is primary |
| Multi-account | Many profiles | Workspace switcher already covers multi-brand |

**Hootsuite is weak for:** speed — too many features for a volunteer media team.

### 1.4 Opus Pro / OpusClip
| Strength | UX pattern | Steal |
|----------|------------|-------|
| Long → shorts | Upload once, many clips | Batch drop 14 reels; each card independent |
| AI titles/hashtags | Generate per clip | **AI prepare this card** + **AI prepare all** |
| Month in 10 minutes | Calendar fill from clips | **Auto-fill week** cadence on batch |
| Publish multi-platform | One-click post | Wire later; UI pretends schedule = done |

**Opus is weak for:** live church events as first-class albums; Dropbox library.

### 1.5 Adobe Express Content Scheduler
| Strength | UX pattern | Steal |
|----------|------------|-------|
| Create → plan → preview → schedule | Linear, visual | Compose right rail = **live previews** |
| Design-native | Preview before commit | Platform frame previews always visible |
| Planner calendar | Content on a board | Queue list + calendar twin |

**Adobe is weak for:** heavy video ops, multi-platform staggered times.

---

## 2. OmniSocial today vs target

| Area | Today | Target (this build) |
|------|--------|---------------------|
| Compose layout | Long form sections 01–04, 3-pane dense | **Media-led studio**: filmstrip + hero + sticky when/AI |
| First action | Find upload in form | Full-bleed **drop zone** “Drop reels to schedule” |
| Batch | Works but feels secondary | Batch is **default**; filmstrip of cards |
| AI | Prepare exists | **One-click prepare**, progress, then auto-times |
| Cadence | Peak suggest only | Presets: **Peak · Daily · 3×/day · Spread week** |
| Captions | Textarea | Caption + hashtags + **Generate** inline |
| Platforms | Chip toggles | Selected = black/white; **Recommended for format** |
| Dropbox | Field exists | Inline under media, status “Linked” |
| Events | Section 04 | Optional **Link event** chip row |
| Schedule CTA | Schedule this / all | Sticky **Schedule N reels** primary |
| Queue home | Up next list | Same language: reels/cards ready to go |

---

## 3. North-star user journey (10 minutes for 14 reels)

```
1. Compose: drop 14 sermon reels OR paste Dropbox links
2. Compose: AI prepare all → captions + hashtags (no clocks)
3. Compose: pick platforms + optional event
4. Compose: Mark all ready → ready shelf
5. Schedule: open ready shelf, cadence “Spread 7 days”
6. Schedule: Schedule 14 reels
7. Queue / Calendar — done
```

**Compose never asks when. Schedule never asks for captions.**

---

## 4. Information architecture

### Primary nav
| Route | Role |
|-------|------|
| **Queue** | What’s next (already scheduled) |
| **Calendar** | Month plan, drag reschedule |
| **Events** | Ministry moments that group cards |
| **Compose** | Prepare cards only (`/scheduler`) |
| **Schedule** | When & where for ready cards (`/schedule`) |
| **Analytics** | Performance (secondary) |
| **Admin** | Connect accounts |

### Ready shelf
- localStorage `omni.drafts.ready.{workspaceId}`
- Compose moves drafting → ready via **Mark ready**
- Schedule commits ready → scheduled posts, clears ready

### Compose IA (no when/where rail)

```
┌──────────────────────────────────────────────┐
│ Header: Prepare · [AI all] [Mark ready]      │
│         [Schedule ready (N) →]               │
├──────────┬───────────────────────────────────┤
│ Filmstrip│ Media + Dropbox                   │
│ drafting │ Caption + AI                      │
│          │ Platforms (targets only)          │
│          │ Event (optional)                  │
└──────────┴───────────────────────────────────┘
```

### Schedule IA (when/where only)

```
┌──────────────────────────────────────────────────────────┐
│ Header: When & where · [Best times] [Schedule N]         │
├────────────────┬─────────────────────────────────────────┤
│ Ready inbox    │ Cadence + per-platform times            │
│                │ [Schedule this] · Edit in Compose       │
└────────────────┴─────────────────────────────────────────┘
```

---

## 5. Feature specs

### 5.1 Atomic card (reel unit)
- One media unit = one card (upload **or** Dropbox).
- Fields: title, caption, hashtags, transcript, platforms[], platformTimes{}, eventId?, dropboxUrl?, previewUrl?
- Status: draft (composer) → scheduled → published

### 5.2 Cadence scheduling
Presets applied to **selected card** or **all draft cards**:

| ID | Behavior |
|----|----------|
| `peak` | Existing peak-time engine per platform |
| `daily` | One publish/day at workspace best time (first platform primary) |
| `triple` | Up to 3 cards/day staggered morning/afternoon/evening |
| `spread7` | Evenly distribute all drafts across next 7 days |
| `manual` | User edits times only |

Logic lives in `lib/schedule-engine.ts` + thin UI on compose.

### 5.3 AI scheduling + captions
| Action | Input | Output |
|--------|-------|--------|
| Prepare card | transcript / caption / title | caption, hashtags, proposedTimes |
| Prepare all | each draft in queue | same per card, sequential with progress |
| Generate caption only | brief | caption text |
| Generate hashtags only | brief | hashtag string |

UI: primary **AI prepare** on hero; secondary generate under caption field.

### 5.4 Caption generating
- Large caption textarea with char hints for primary platform
- Hashtag field with count
- Buttons: Generate caption · Generate hashtags · Use AI prepare (all)

### 5.5 Dropbox
- Already implemented; keep visible under hero media
- Empty state: drop files **or** paste Dropbox first

### 5.6 Events
- Compact chip picker “Link to event”
- Create event modal unchanged

---

## 6. UI / UX principles (non-negotiable)

1. **Media is the hero** — never bury the reel under labels.
2. **Progressive disclosure** — transcript advanced; event optional.
3. **One primary CTA** — Schedule (this or all).
4. **Batch is first-class** — filmstrip always visible when queue non-empty.
5. **Cadence before micromanaging times** — presets first, fine-tune second.
6. **Editorial Mono** — black primary CTAs, white text, grey captions, 1px borders.
7. **No black text on black** — selected chips use `text-white`.
8. **Motion** — color only; no slide page transitions.
9. **Ministry language** — events, cards/reels, not “campaigns” or “content hubs.”
10. **Empty state sells the product** — “Drop Sunday’s reels. We’ll caption and time them.”

---

## 7. Implementation phases

### Phase A — Spec doc (this file) ✅
### Phase B — Compose studio rebuild (layout + cadence UI + AI prominence)
### Phase C — Cadence engine helpers in schedule-engine
### Phase D — Queue empty/header polish to match
### Phase E — Typecheck, build, push (Vercel ready; publish wiring still future)

**Out of scope this pass:** real Meta/X/TikTok publish APIs, Dropbox OAuth picker, team approvals.

---

## 8. Success criteria (ready for “actual wiring”)

- [x] Compose feels like a **reel factory**, not a settings form
- [x] User can batch-drop → AI all → cadence → schedule without scrolling a novel
- [x] Cadence presets change times visibly
- [x] AI prepare all shows progress
- [x] Dropbox + events still work
- [x] No black-on-black selected UI (selected = black bg + white text)
- [x] `npm run typecheck` + production build green
- [x] Spec + implementation pushed to `main` for Vercel

### Still needs real wiring (not this build)
- Platform publish APIs (Meta / X / TikTok / YouTube upload)
- Dropbox OAuth folder picker
- Worker that fetches Dropbox direct URL at scheduled time

---

## 9. Competitive positioning (one line)

> **Opus speed for clipping teams + Buffer simplicity + Later visual planning — built for church reels, events, and Dropbox.**
