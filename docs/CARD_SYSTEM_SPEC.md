# OmniPresence — Unified Card System + Media-Led Composer Card (build spec)

> **Goal:** Make every "piece of content" in the app render through ONE card primitive, so
> top performers, event albums, scheduled posts, drafts, and calendar chips stop drifting into
> separate one-off layouts. Then rebuild the composer card (one card per uploaded media file) on
> the same foundation, media-first. **Preserve all behavior and data** — this is presentation
> consolidation, not a feature change.

## Why

Today each card is hand-built and subtly different: `TopPerformerCard`, `EventAlbumCard`,
`ContentCardChip`, `PostCard`, the `CalendarQueueView` row, and `DayPostCountChip` each pick their
own aspect ratio, width (`w-fit` vs full), hover (`border-accent/40` vs `/50`), and badge style.
Five+ sources of truth → an inconsistent feel. We want one frame, with only a swappable trailing
slot per context.

## Locked design tokens (define once, never per-card)

- **Frame:** `rounded-md`, `border border-border`, `bg-surface-elevated`, `overflow-hidden`.
- **Hover (interactive cards):** `hover:border-accent/40` (one value everywhere).
- **Thumbnail:** consistent radius/border, aspect chosen by a fixed map (see `CardThumbnail`).
- Keep the dark theme + signal-orange accent. Body text is Inter; numbers/eyebrows are
  `font-data` (JetBrains Mono). Sentence case — no `snake_case` labels.

---

## New primitives — add under `frontend/src/components/ui/`

### `CardThumbnail`
Single source of truth for content imagery. Wraps the existing media helpers so every thumbnail
looks identical.

```tsx
<CardThumbnail
  src={previewUrl}            // real media (composer) …
  post={post}                 // …or derive via demoPreviewForPost(post) (lists)
  kind="video" | "image"
  aspect="auto" | "video" | "square" | "portrait"   // default "auto" → from post.format
  badge={<Badge .../>}        // optional corner overlay (Top / Draft / kind / Live)
/>
```
- Reuse `demoPreviewForPost` (`lib/demo-media.ts`) and `MediaPreview` (`components/post/MediaPreview.tsx`).
- Renders a real `<img>` / `<video poster>`; falls back to a media icon if no src.
- One radius, one border, `object-cover`, `loading="lazy"`.

### `CardStats`
The 3-up metric footer extracted verbatim from `TopPerformerCard` (views / likes / engagement),
using `fmtCompact` from `PerformanceMetricCounters`.

### `ContentCard`
The frame everything composes. **Fixed anatomy, one swappable trailing slot.**

```tsx
<ContentCard
  size="chip" | "row" | "sm" | "md"        // density only — never changes the style
  thumbnail={<CardThumbnail .../>}
  badge={…}                                 // corner overlay (passed to thumbnail)
  title="Easter recap"
  meta="Top performer"                      // one line: date/time, kind, or status
  platforms={["IG","TikTok"]}               // optional → renders PlatformChips
  trailing={<CardStats .../>}               // the ONLY part that varies per context
  onOpen={() => …}                          // click + Enter/Space (a11y)
  href={…}                                   // optional link variant (events)
/>
```
- Render order is invariant: **thumbnail → title → meta → platform chips → trailing**.
- `size` only changes paddings/thumbnail aspect/title size: `chip` (dense calendar cell),
  `row` (horizontal list item, thumbnail left), `sm`, `md` (grid).
- Reuse the existing `PlatformChip` for the chips slot (already a good shared primitive).

---

## Migration map (re-point existing cards; data unchanged)

| Surface | File today | Becomes |
|---|---|---|
| Top performer | `components/post/TopPerformerCard.tsx` | `ContentCard size="sm"` + `trailing={<CardStats/>}`, badge "Top" |
| Top **event** performer | `components/events/TopEventPerformersSection.tsx` (inner card) | `ContentCard` + `CardStats`, kind badge |
| **Event album** card | `components/events/EventAlbumCard.tsx` | `ContentCard size="md"` + counts trailing (media · views), kind badge |
| Scheduled / draft post | `components/post/ContentCardChip.tsx`, `PostCard.tsx` | `ContentCard` + `platforms` slot, status badge |
| Calendar day chip | `ContentCardChip` (dense) | `ContentCard size="chip"` |
| Calendar list row | `components/calendar/CalendarQueueView.tsx` | `ContentCard size="row"` |
| Event detail media grid | `components/events/EventMediaMatrix.tsx`, `routes/events.$eventId.tsx` | grid of `ContentCard` grouped by status |

`ContentCardChip` is already close to the target — promote/refactor it into `ContentCard` rather
than starting from zero, then delete the now-thin wrappers. Each migrated component keeps the same
props it receives today and the same `onOpen`/navigation.

### Events specifically (the "cards of cards" model)
- **Events index** (`routes/events.index.tsx`): grid of album `ContentCard`s (kind badge, "N media · views" trailing).
- **Event detail** (`routes/events.$eventId.tsx`): an album header (cover via `CardThumbnail`, title, kind, 3 perf stats) followed by sections **Published / Scheduled / Draft**, each a grid of the same post `ContentCard`s.
- **Top event performers** (dashboard rail + analytics): album `ContentCard` + `CardStats`.

---

## Media-led composer card (`components/post/ComposerCard.tsx`)

Keep "one uploaded file = one card." Replace the six stacked accordions with a **two-zone, media-first** layout.

**Header:** `Content N · filename`, linked-event tag, remove (✕).

**Body — responsive grid `lg:grid-cols-[200px_1fr]` (stacks on narrow):**
- **Left — the media (hero):** `CardThumbnail` showing the REAL upload (see `previewUrl` below), aspect from `post.format`; the 3-way **format toggle** beneath it; a compact **"Live preview · {platform} ▾"** strip that swaps the inline `PlatformPreview`.
- **Right — two groups (not six accordions):**
  1. **"Where it goes":** platform chips (`PlatformSelectChip`, format-constrained) + their per-platform publish times (`ContentPublishSchedule`) together.
  2. **"What it says":** AI buttons (caption / hashtags / YT desc) + per-network caption tabs + caption textarea + `CharCounters`.
  - **"Advanced" (collapsed `CollapsibleSection`):** transcript / AI context, and Dropbox (hide entirely until it ships — don't show a disabled "coming soon" button in prime space).

**Logic — barely changes (presentation only):**
- `DraftPost` keeps `caption`, `platformCaptions`, `hashtags`, `transcript`, `proposedTimes`,
  `platforms`, `format`, `eventId`. **Add one field: `previewUrl?: string`.**
- In `scheduler.tsx` `addFiles`, set `previewUrl: URL.createObjectURL(file)` so the card shows real
  media (revoke on remove to avoid leaks). `defaultDraftFromFile` currently only gets `{name,size}`
  — pass the `File` through so the object URL can be created.
- Keep `toggleFormat` (auto-drops incompatible platforms), conflict detection (`detectConflicts`),
  per-platform caption logic, and inline event create (`useCreateEventFlow`) exactly as-is.
- Move `PlatformPreview` INTO the card (the scheduler's separate preview pane can be removed or kept
  in sync — the inline preview is the goal).

---

## Constraints

- **Remove nothing.** Every card keeps its data, click target, badges, and metrics. The composer
  keeps every control (just regrouped). Verify against the existing behavior before deleting any
  wrapper component.
- Historical note: `vercel.json` and Neon/Lovable paths are gone. See `GOALS.md`.
- Don't edit `routeTree.gen.ts`.

## Build order (incremental — build + smoke after each)

1. `CardThumbnail`, `CardStats`, `ContentCard` primitives (+ refactor `ContentCardChip` into `ContentCard`).
2. Migrate **Top performer + Top event performer** (dashboard rail) — most visible side-by-side proof.
3. Migrate **event album** card + **event detail** grid + **Events index**.
4. Migrate **calendar** chips (`size="chip"`) and **list row** (`size="row"`); delete dead wrappers.
5. **Composer card** media-led rebuild (+ `previewUrl`).

## Verify

- `cd frontend && npm run build` must pass after each step.
- Smoke each surface: dashboard rail (performers), Events index + an event detail, calendar month +
  list view, and the composer (upload a file → real thumbnail shows; format/platforms/caption/times
  all still work; refresh keeps the draft).
- Confirm no `snake_case` labels remain in migrated cards.
