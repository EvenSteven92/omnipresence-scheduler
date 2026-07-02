# Fix spec — Queue rail, brand palette override, card-detail hero

> **For Grok.** Follow-up fixes to the Queue / card-detail work (`docs/QUEUE_CARD_DETAIL_SPEC.md`).
> Verified against HEAD (`064eae8`): the dark CARD PERFORMANCE panel, calendar month-grid default,
> and live-only Channels rows are already fixed — do not rework them. Three real bugs remain.

## 1. Mount the Queue rail (it was built but never rendered)

`components/dashboard/DashboardQueueRail.tsx` exists (THIS WEEK 2×2 grid, GAPS IN QUEUE black
panel, CHANNELS · N LIVE) but **nothing imports it** — the Queue renders a single full-width
column. In `routes/index.tsx`, wrap the content in the design's two-column layout:

```tsx
<div className="page-content mx-auto max-w-[1320px]">
  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_296px] items-start">
    <DashboardUpNextQueue />
    <DashboardQueueRail />
  </div>
</div>
```

Rail is ~296px (design uses `minmax(0,1fr) 296px`), sticky is optional. On <lg it stacks below the
list. Verify the GAP DAYS cell reads ink-on-orange and the GAPS panel is black with cream text
(the classes are already correct in the component).

## 2. Fix the runtime brand-palette override (root cause of washed-out orange text)

`components/BrandTheme.tsx` still injects the **old light-theme** values at runtime, fighting the
neobrutalist stylesheet: it sets `--accent`/`--primary` to oklch pastels and, critically,
`--accent-foreground`/`--primary-foreground` to `oklch(0.99 0 0)` (white). The design wants **ink
text on orange** (`--primary-foreground: #17130f`).

- In `BrandTheme.tsx`: default `accentForeground` to `#17130f` (not white).
- In `lib/workspaces/data.ts`: replace the four `accent:` oklch values with design-space hexes that
  keep ink text legible — TORCC `#ff6a3d` (the design's accent), Open Eyes `#3d7bff` (bold blue),
  KEKA `#a04dff` (bold purple), First Love `#ff3d6e` (bold rose). Keep the per-brand tinting
  behavior itself.
- `.btn-action-primary` in `styles.css` should use `color: var(--color-primary-foreground)` — if a
  previous commit hardcoded it to `--color-foreground` as a workaround, revert to the variable once
  BrandTheme is fixed (same rendered result, correct token).

## 3. Card-detail hero renders `<video src=".jpg">` → blank box

`components/ui/CardThumbnail.tsx` (~line 112) picks the element by `mediaKind`:
`imageSrc && mediaKind === "video"` → `<video src={imageSrc}>`. Demo previews are **JPGs**, so the
card-detail hero shows an empty box (the blank beige hero in the owner's screenshot). Queue cards
only dodge this via the gradient path.

Fix: choose `<video>` by the **source**, not the media kind:

```ts
const isVideoSrc =
  !!imageSrc &&
  (imageSrc.startsWith("blob:") ||
    imageSrc.startsWith("data:video") ||
    /\.(mp4|mov|webm|m4v|avi|mkv)(\?|#|$)/i.test(imageSrc));
```

Render `<video>` only when `isVideoSrc`; otherwise `<img>`. Keep the play-circle overlay and the
`VIDEO` badge driven by `mediaKind`/`mediaType` as today. (This exact bug was fixed once before the
rebrand — don't reintroduce it.)

## Verification
- `cd frontend && npm run build` (tsc-gated) passes.
- Queue: rail visible right of the card list (THIS WEEK grid with orange GAP DAYS cell + ink text,
  black GAPS panel, live-only CHANNELS); cards lift on hover.
- `/card/torcc-1`: hero shows the poster image with play overlay (no blank box); `Edit card` and all
  orange buttons read ink-on-orange; runtime `--accent` is `#ff6a3d` on TORCC.
- Switch brands in the sidebar: accent re-tints per brand, text stays ink.
- `/calendar`: month grid renders directly (no list view) — confirm no regression.
- Push to `main`; confirm on the **latest** Vercel deployment.
