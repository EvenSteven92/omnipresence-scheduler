# Spec — Match Queue UI, file-card detail page, and hover behavior to Claude Design

> **For Grok.** Match the build to the Claude Design "OmniSocial — Cards" source. The palette, fonts
> (Hanken Grotesk / Bricolage Grotesque / JetBrains Mono), 1.5px ink borders, and the `ui/*` card
> primitives (`ContentCard`, `StreamContentCard`, `CardThumbnail`, `CardPublishChip`,
> `CardStatusBadge`, `lib/card-display.ts`) already exist and are correct — **reuse them, don't
> rebuild the design system.** Three things, all grounded in owner-provided screenshots: (1) hover
> behavior, (2) the Queue screen, (3) the file-card detail page.

## 1. Hover behavior — hover-only lift (NOT a persistent shadow, NOT a press-down)

The build currently shows a **persistent** offset shadow and presses **down** on hover. The design
wants the opposite: **no resting shadow**; on hover the card **lifts up** (up-left) and the offset
shadow appears bottom-right.

In `frontend/src/styles.css`:
- `.card-pop` → keep only `transition: transform 120ms ease, box-shadow 120ms ease;` (remove any
  resting `box-shadow`).
- `.card-pop-interactive:hover` → `transform: translate(-2px, -2px); box-shadow: 4px 4px 0
  var(--color-foreground);`
- Remove the resting `box-shadow` from `.panel` and `.kpi-card`.
- Grep `ui/*` + card components for stray persistent `shadow-[...]` at rest or press-down
  `hover:translate-x-[2px]/y-[2px]` and normalize to the lift above. `ContentCard` (stream/md) and
  `DayPostCountChip` already use `.card-pop` / `.card-pop-interactive`, so they inherit the fix.

## 2. Queue screen (`routes/index.tsx` + `components/dashboard/*`)

The Queue is the home screen ("Up next"). Match the screenshot exactly:

- **Header:** kicker `CONTENT QUEUE` (orange mono) → `Up next` (`page-title`, Bricolage). Right side:
  a `QUEUE | CALENDAR` segmented toggle (Queue active = black fill; Calendar routes to `/calendar`)
  and a `+ New card` orange button. Thin rule under the header. **Remove the "Cross-platform growth"
  panel from the top of the Queue.**
- **Main column:** date groups — header `Jun 25` (display) + `THURSDAY` (mono) on the left,
  `4 cards · 9 publishes` (mono muted) right-aligned — each followed by `StreamContentCard`s. The
  stream card already matches: gradient square thumbnail + media badge (`VIDEO` / `IMAGE` /
  `CAROUSEL`) + play, orange album eyebrow, display title, publish chips (`CardPublishChip`: colored
  platform dot + `IG 9:30A`), and trailing `SCHEDULED` (orange) / `DRAFT` (outlined) badge + big `3`
  + `PUB`. Verify chips show **platform + short time** and the count uses `PUB`.
- **Rail (~300px), in this order — replace the current KPI / Top-performers rail:**
  1. `THIS WEEK` panel: a **2×2 stat grid** with 1.5px internal grid lines — `Scheduled`, `Drafts`,
     `Gap days` (this cell has an **orange** background), `Publishes`. Each cell: big display number +
     mono label.
  2. `GAPS IN QUEUE` **black panel** (`bg-foreground`, light text): label + a display sentence
     ("Wed, Sun, Mon & Tue have nothing scheduled.") + a full-width orange `Fill the gaps →` button
     (links to the composer "plan my week").
  3. `CHANNELS · N LIVE` panel: one row per connected platform — colored platform dot + name + a
     `LIVE` (or `SAMPLE`) badge on the right. Reuse `usePlatformConnections`.
  - **Do not** show KPI tiles (followers/views/engagement) or Top performers on the Queue — those
    live on Analytics now.
- Compute stats from the active workspace's `scheduledPosts` (counts by status, gap days in the next
  7-day window, total publishes = sum of `platforms.length`). Reuse helpers in
  `lib/scheduled-post-display.ts` where possible.

## 3. File-card detail PAGE — new route `routes/card.$cardId.tsx`

Clicking any **file card** opens this full page (not the old `PostDetailModal`). Match the
purple-gradient screenshots:
- Look up the post by `cardId` across the active workspace's `scheduledPosts` + `publishedPosts`
  (`useWorkspace`); 404-style fallback if missing.
- **Header:** `← Queue` back link; eyebrow `ALBUM LABEL · STATUS`; display title; actions `Edit card`
  (orange, → composer via `draftFromPostDetail` + `stashRepublishDraft` in `lib/republish.ts`),
  duplicate, delete (icon buttons).
- **Main column:** large media hero (`CardThumbnail`, gradient + `VIDEO` / `IMAGE` badge + centered
  play circle, portrait for reels); `CAPTION` panel (caption text + hashtag chips); `SOURCE FILE`
  panel (table rows: `DIMENSIONS`, `DURATION`, `SIZE`, `CREATED`).
- **Rail (~400px):** `CARD PERFORMANCE` **dark panel** (2×2: Views / Engagement / Likes / Shares; show
  values for published posts, else `NOT PUBLISHED YET` with em-dashes); `Publishes` panel (`N TOTAL`;
  one row per platform: dot + name + `Thu, Jun 25 · 9:30 AM` + `SCHEDULED` badge; dashed
  `+ ADD PUBLISH`); `PART OF ALBUM` panel (layers icon + album title + `→`, links to
  `/events/$eventId`).
- **Reuse:** `CardThumbnail`, `card-display.ts` (`resolveAlbumLabel`, `publishEntriesForPost`,
  `cardStatusFromPost`, `inferCardMediaType`), `CardPublishChip`, `CardStatusBadge`, event helpers
  (`getEventById`, `eventAlbumCover` in `lib/events/display.ts`), platform metadata
  (`PLATFORMS_BY_SHORT`).
- **Data gap:** add optional `caption?`, `hashtags?`, `dimensions?`, `durationSec?`, `sizeMB?`,
  `createdAt?` to `ScheduledPost` / `PublishedPost` in `lib/mock-data.ts`; populate some in
  `lib/workspaces/data.ts`; derive sensible fallbacks (dimensions/size by media type) so panels are
  never blank.

### Wire all FILE-card clicks → the page
Replace `onOpen={() => setDetailPost(p)}` + the `PostDetailModal` render with
`navigate({ to: '/card/$cardId', params: { cardId: p.id } })` in `routes/index.tsx`,
`routes/analytics.tsx`, `routes/calendar.tsx` (+ `components/post/CalendarPostModals.tsx`),
`components/dashboard/DashboardUpNextQueue.tsx`, `components/events/EventMediaMatrix.tsx`,
`components/calendar/CalendarQueueView.tsx`. Retire `PostDetailModal` for file cards. **Album-card
clicks are unchanged** (stay on `/events/$eventId`); the album popup is a separate follow-up.

## Constraints & verification
- Reuse the existing tokens/fonts/primitives; no new design system. Don't touch `server/`,
  `vite.config.ts`, `vercel.json`, or `routeTree.gen.ts`.
- `cd frontend && npm run build` (gated on `tsc --noEmit`) must pass after each part — fix any type
  errors rather than committing around them.
- Smoke: Queue matches the screenshot (header, date groups, stream cards, This-week / Gaps / Channels
  rail); hovering any card lifts it with the shadow appearing (no resting shadow, no press-down);
  clicking a file card from Queue / Calendar / Analytics lands on `/card/$cardId` matching the
  purple-gradient design. Push to `main`; confirm on Vercel.
