# OmniSocial — Layout Redesign Spec (for implementation)

> **Purpose:** Restructure the app's layout so it's easy to use, **without removing any
> functionality**. This is a re-layout, not a feature cut. Every existing feature must keep a
> home — see the Feature-Preservation Map at the bottom. If a feature has no obvious place in a
> new screen, surface it; do not drop it.

## Direction (locked with the owner)

- **Hybrid identity.** Keep the dark theme + signal-orange accent + JetBrains Mono **for data,
  numbers, and small eyebrow labels**. Body text and UI labels are **Inter, sentence case**.
  (Already done in `styles.css` — Inter is wired, type scale exists. Reuse those tokens.)
- **Kill the endless vertical stack.** Today every page is a column of full-width sections, so
  important things (posts) get pushed to the bottom. Every screen becomes a **main column +
  context rail** so the page works at a glance.
- **Plain language everywhere.** No `snake_case` / machine jargon in visible labels.

## Global layout system

Use one consistent shell and grid rhythm across all pages.

### Shell (`__root.tsx`, `Sidebar.tsx`)
- **Sidebar nav (5 destinations, labeled, in this order):** Dashboard · Calendar · Events ·
  Analytics · Workspaces. Collapsible (already implemented, keep). **Do not drop Events.**
- **Create is a primary action, not a nav destination** — the orange "Create" button opens a small
  menu: **New post** / **New event**. (Keeps `CreateMenu`.)
- **Workspace switcher** stays at the top of the sidebar (shows active workspace name + status).
- **Sync status bar** stays (plain-language; visible even when nothing is connected → prompts
  connect).
- **Mobile:** bottom nav (already implemented, keep).

### Page grid
- Every content page: `main` column (≈1.5fr) + `rail` column (≈1fr) on desktop; rail drops below
  main on narrow screens.
- `PageHeader` = eyebrow (workspace) + title + right-aligned actions. Keep on every page.
- Reuse the new `ui/` primitives (`Button`, `Card`, `Badge`, `EmptyState`, `Eyebrow`). Every page
  with no data shows an `EmptyState` with a clear CTA.

---

## Screen-by-screen layout

### 1. Dashboard (`routes/index.tsx`)
**Problem fixed:** posts/upcoming were at the bottom and ineffective.

- **Main column (top → bottom):**
  1. **"Up next" queue — the hero.** Chronological list of the next scheduled posts (thumb, title,
     date/time, platform chips). Inline **gap warning** ("Thu is empty") with a one-click "Fill the
     gap" → composer. *(Replaces the old buried Upcoming + carries the gap-detection.)*
  2. **Top performers** strip (compact, max 4) — keep, but secondary.
- **Rail (right):**
  - 3 compact **KPI cards** (followers, views, engagement) with deltas. *(Was the prominent 3-up
    grid; now reference, not the main event.)*
  - **Channel health** card (connected platforms + "add").
- **Below, full width (collapsible):** **Growth matrix** chart (keep the collapsible UX) + **Top
  event performers**.

### 2. Create / composer (`routes/scheduler.tsx`, `post/ComposerCard.tsx`)
**Problem fixed:** one long card of stacked sections; no live preview.

- **3-pane layout:**
  1. **Left — Queue** (narrow): potential posts + saved drafts (two zones, drag between, drag
     reorder), upload dropzone, "add demo set", select-all, bulk-schedule trigger.
  2. **Center — Editor:** media & format toggle · platform chips (format-constrained) · **caption
     with per-network override tabs** · AI buttons (caption / hashtags / YT description) · hashtags
     · transcript/AI context · char counters · **event album link + inline quick-create** ·
     per-platform **publish times** + "suggest times" · inline conflict warnings.
  3. **Right — Live preview** per selected network (real thumbnail), switchable by platform.
- **Footer actions:** Save draft · Schedule (apply to calendar). Keep draft persistence
  (`draft-storage.ts`), republish flow, bulk-schedule modal (smart distribute / fixed cadence /
  skip weekends / constraints).

### 3. Calendar (`routes/calendar.tsx`)
**Problem fixed:** calendar-only + nested modal maze on day click.

- **View toggle:** **Calendar | List**. *List/queue is the primary way most teams work the
  pipeline.*
- **Main:** month grid (post + event markers, counts, today/selected) — **drag a card onto a day to
  reschedule.**
- **Rail:** "Up next" list (mirrors agenda) + collapsible agenda range.
- **Day interaction:** collapse the chain of modals (intent → picker → detail) into **one day
  drawer/panel with tabs (Posts / Events)**. Keep post detail (preview, caption, platforms/times,
  linked event, conflicts, republish, associate event).

### 4. Events (`routes/events.index.tsx`, `events.$eventId.tsx`)
**Keep all event + categorisation features. This is the screen the owner was worried about.**

- **Index:** album card **grid**, each card showing cover, **category/kind label**, date, title,
  description, performance metrics, media count. Empty state with "New event".
- **Add a category filter / grouping control** at the top (All · Sunday sermon · Worship night ·
  Youth · Campaign · Conference · Other) — makes categorisation **more** visible than today. (Pure
  layout addition; reuse existing `ContentEventKind`.)
- **Detail page:** header (title, date, kind, description) · media grid by status
  (published/scheduled/draft) · performance summary · unassigned-media picker.
- **Create-event flow keeps the "Event type" dropdown** (sermon, worship night, youth, campaign,
  conference, other) — `ScheduleEventModal`. Do not remove or simplify the category list.

### 5. Analytics (`routes/analytics.tsx`)
Strongest area already — mostly conform to the grid + type system.

- **Top:** Timeframe selector (presets / custom / all-time) + the **7-KPI strip**.
- **Main grid (2-up):** engagement trend (area) · audience growth (line) · per-platform views
  (bar) · share of engagement (donut).
- **Below:** posting-cadence heatmap (enlarge tiny labels) · per-platform performance table
  (sortable) · top performers (+ "schedule similar") · top event performers.
- **Label every KPI/chart live vs sample** (data honesty). Empty state when no data.

### 6. Workspaces / onboarding (`routes/workspaces.tsx`)
**Problem fixed:** awkward stack of panels; mystery team code; hidden sync.

- **First-run: one centered, focused stepper** — Connect → Create → Analyze — with live progress
  from `onboardingStatus`.
- **Connect a channel** card: YouTube, Facebook & Instagram = **Connect** (live OAuth);
  X / TikTok / Rumble = **"Coming soon"** (clearly separated, not clickable-looking).
- **Auto-sync after OAuth** (keep `useOAuthAutoSync`); manual **Refresh** is secondary.
- **Explain the team access code inline** (where to get it).
- Below: workspace cards (switch, status, live connection strip). Keep "How it works".

---

## Feature-Preservation Map (the contract — nothing is removed)

Every current feature → where it lives in the new layout. Status: **keep** (same), **move**
(relocated), **add** (new affordance, no removal).

| Feature | Today | New home | Status |
|---|---|---|---|
| Sidebar destinations (Dashboard/Calendar/Events/Analytics/Workspaces) | icon-only rail | labeled, collapsible sidebar | move |
| Create new post / new event | sidebar buttons | orange **Create** menu | move |
| Workspace switcher + status badges | sidebar top | sidebar top (name shown) | keep |
| Sync status bar | top strip | top strip, plain language | keep |
| Mobile nav | — | bottom nav | add |
| **Dashboard:** upcoming 7-day + gap warnings | mid/low page | **hero, top of main** | move |
| Dashboard 3 KPIs + deltas | prominent grid | compact right rail | move |
| Growth matrix (collapsible) | low | full-width collapsible | keep |
| Top performers / top event performers | bottom | compact strip + below | keep |
| Channel/connection health | strip | rail card | move |
| **Composer:** upload (drag/picker/demo set) | left zone | left queue pane | keep |
| Format auto-detect + manual toggle | card | editor pane | keep |
| Platform select (format-constrained) | card | editor pane | keep |
| Caption + AI caption/hashtags/YT description | card | editor pane | keep |
| **Per-network caption overrides** | shared only | editor pane (tabs) | keep/expand |
| Hashtags · transcript/AI context · char counters | card | editor pane | keep |
| Publish times per platform + "suggest times" | scattered | editor schedule block | move |
| Conflict detection | on apply | **inline, live** | keep/improve |
| Event album association + **inline quick-create** | card (link out) | editor pane (inline) | keep |
| Queue + saved drafts, drag between, reorder | left sidebar | left queue pane | keep |
| Bulk schedule (smart / cadence / skip weekends / limits) | modal | modal | keep |
| Save draft · apply to calendar · republish | actions | footer actions | keep |
| Draft persistence | localStorage | localStorage | keep |
| Live platform preview | placeholder | **right preview pane (real thumb)** | keep/improve |
| **Calendar:** month grid + markers/counts | main | main | keep |
| Agenda sidebar (range, hover highlight) | sidebar | rail | keep |
| **List / queue view** | — | view toggle | add |
| **Drag to reschedule** | — | calendar grid | add |
| Day-click intent / pickers / detail modals | many modals | **one day drawer w/ tabs** | move |
| Post detail (preview/caption/times/event/conflicts/republish/associate) | modal | day drawer | keep |
| **Events:** album grid + cards (cover/kind/date/metrics/count) | index | index grid | keep |
| **Category filter / grouping** | — | index top control | add |
| Event detail (media by status, performance, unassigned picker) | detail page | detail page | keep |
| **Create-event "Event type" categorisation** (6 kinds) | modal dropdown | modal dropdown | **keep** |
| Event association picker / modal · media matrix | various | events + composer | keep |
| **Analytics:** timeframe (presets/custom/all-time) | top | top | keep |
| 7-KPI grid | grid | top strip | keep |
| Trend / audience / per-platform / share charts | grid | 2-up grid | keep |
| Posting heatmap (7×24) | low | below (larger labels) | keep/improve |
| Per-platform table (sortable) + view-share bars | low | below | keep |
| **Live vs sample data labels** | partial | every KPI/chart | add |
| **Workspaces:** switcher + cards + live strip | page | below stepper | keep |
| Onboarding checklist + status | new | **centered stepper** | keep/improve |
| Team access gate | unexplained | **explained inline** | keep/improve |
| Connect YouTube / Meta (FB+IG) OAuth | grid | connect card | keep |
| Auto-sync after OAuth · manual refresh | recent | connect card | keep |
| "Coming soon" platforms (X/TikTok/Rumble) | blended | clearly separated | keep/clarify |

**Removed:** nothing. **Disabled dead controls** (e.g. old "Sign out" placeholder) may be hidden
until their backend ships — not a feature loss.

## Build notes
- Reuse: `ui/*` primitives, `styles.css` tokens/type-scale, `schedule-engine.ts`,
  `live-metrics.ts`, `lib/workspaces/`, `ContentEventKind`, `useOAuthAutoSync`, `draft-storage.ts`.
- Keep functional/infra untouched: `server/youtube`, `server/meta`, `vite.config.ts` Nitro/Vercel
  output, `vercel.json` crons, data models.
- Verify per screen: `cd frontend && npm run build` must pass; smoke the affected route.
