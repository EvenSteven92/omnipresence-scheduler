# TORCC Brand Design System for OmniPresence

**Date:** 2026-07-10  
**Status:** Approved · Phase B implemented (Satoshi + Instrument Serif free stack)  
**Primary brand site:** [torcc.org](https://www.torcc.org/)  
**Product:** OmniPresence (scheduling app for TORCC media teams)

---

## 0. Goal

Make OmniPresence feel like a **natural TORCC tool** — the same house, voice, and visual DNA as [torcc.org](https://www.torcc.org/), without turning a dense scheduling product into a marketing microsite.

**Phases (this plan = Phase A only):**
1. **A — Design system** (this document): research, tokens, type, components rules  
2. **B — Implementation** (after your approval): apply tokens/fonts/components in `frontend/`

---

## 1. Domain map (what we audited)

| Surface | URL | Role | Design system |
|---------|-----|------|----------------|
| **Main church** | [torcc.org](https://www.torcc.org/) | Brand home, events, messages, give, leadership | **Canonical** — Webflow + Adobe Fonts (Typekit `vyo6euw`) |
| Store | [store.torcc.org](https://store.torcc.org/) | Merch / books / art | Shopify — product-first, looser brand fidelity |
| Dipping Night | [dippingnight.torcc.org](https://dippingnight.torcc.org/) | Prophetic outreach registration | Modern dark marketing; polished sections, countdowns |
| Season Casting | [seasoncasting.torcc.org](https://seasoncasting.torcc.org/) | Annual conference | Cinematic dark, purple/gold energy, Hebrew-year narrative |
| Online / Open Eyes | [online.torcc.org](https://online.torcc.org/) | Streaming / investigative content | **Different system** (Proxima Nova) — not primary for app |
| Campaign landings | b2b, table, etc. | One-off events | Inconsistent (WP-style) — ignore for product tokens |
| Streams / TV | torcctv.org (linked) | On-demand video | Companion media product |

**UX insight:** TORCC’s *public* brand lives on **torcc.org** (Owners + IvyPresto, black/white cinema). Event microsites amplify drama (full-bleed, countdown, purple). OmniPresence should track **torcc.org first**, with optional “event mode” purple accents for campaigns — not the Proxima Nova online player skin.

---

## 2. UX/UI patterns on torcc.org

### 2.1 Information architecture & flow
- **Hero first:** full-bleed photo + bold promise (*“God wants to speak to you today”*)
- **Horizontal event carousel** — image-forward cards (F4, Dipping Night, Season Casting, Res Sunday…)
- **Numbered quicklinks** `01–04` (Groups, Events, Ministries, Streams) — serif numbers + bold sans titles + circular arrow affordance
- **This Week’s Message** — large thumbnail + italic date + uppercase speaker + solid CTA
- **Prophecies Fulfilled** — dark band, slider, green check “Fulfilled · date”
- **Locations** — NYC / Online / Sydney cards with service times
- **Leadership** — dual bios, photography-heavy
- **Sticky LIVE banner** pattern when streaming
- **Nav:** logo · Give (filled CTA) · Menu

### 2.2 Visual language
| Pattern | Observation |
|---------|-------------|
| **Contrast** | Extreme black / white; dark sections alternate with light |
| **Photography** | Ministry photography is the hero medium — full bleed, warm stage light, faces, Times Square energy |
| **Motion** | Subtle fade-ins, scale-on-hover for rounded CTAs (`scale(1.1)`), carousels (Splide) |
| **Density** | Marketing pages are spacious; **not** dashboard-dense |
| **Chrome** | Minimal UI chrome; content and images carry the brand |
| **Icons** | Light outlined Material-style icons on dark cards (grey `#E3E3E3`) |
| **Radius** | Mixed: sharp default buttons; **~16px** on pill “Watch Now” alternate CTAs; cards often ~12px (`.6875rem`–`.75rem`) |
| **Borders** | 1px black or white strokes on buttons; left accent bars on quotes |

### 2.3 Voice & content tone
From About + homepage:
- **Tagline DNA:** Real · Relevant · Relational  
- **House language:** prophetic, apostolic, intimacy, maturity, “not building events — building people”  
- **CTAs:** short, confident — *Learn More*, *Watch Now*, *Give*, *View details*  
- **Sentence case** mixed with **ALL CAPS** section titles and wide Owners Wide event labels  

### 2.4 UX strengths to borrow (for the app)
1. **Clear primary action** (one strong filled button)  
2. **Image-led cards** for media (our content cards already do this)  
3. **Numbered steps / sequential clarity** (compose → ready → schedule maps well to 01 / 02 / 03)  
4. **Status with color restraint** (green = fulfilled/success; don’t rainbow the UI)  
5. **Dark bands for focus moments** (optional full-bleed “commit schedule” or empty hero states)

### 2.5 UX pitfalls *not* to copy into a scheduler
1. **Marketing whitespace** — app must stay dense for multi-card weeks  
2. **Giant H1s (5rem)** — too large for tool chrome  
3. **Hover scale on every CTA** — distracting in data UIs  
4. **Microsite inconsistency** — store/online/campaigns diverge; app should not  
5. **Purple as default fill for everything** — brand uses purple as accent/token; marketing black/white carries most of the UI  

---

## 3. Type system — brand vs alternatives

### 3.1 What TORCC actually loads

| Role | Font | Source | Usage on site |
|------|------|--------|----------------|
| **UI / body / most headings** | **Owners** (`owners`) | Adobe Fonts / MCKL (Jeremy Mickel) | Body ~1.3rem/300; H1–H6 bold; buttons |
| **Wide labels** | **Owners Wide** (`owners-wide`) | Same family | All-caps event titles, some labels |
| **Display accent** | **IvyPresto Display** (`ivypresto-display`) | Ivy Foundry via Typekit | Italic serif moments: “Fulfilled”, numbered serif labels, editorial flourish |

**Owners character:** expressive geometric sans inspired by LA handmade International-Style signage — tight headlines, logo-like presence, warm grotesk (not cold Swiss Inter).  
**IvyPresto Display character:** high-contrast old-style (Garalde) display serif — large x-height, hairline serifs, narrow proportions; used **italic** for poetry/emphasis.

### 3.2 Licensing reality for OmniPresence
Owners + IvyPresto are **commercial**. Shipping them in the app requires TORCC’s Adobe Fonts / foundry licenses for web app use.  

Until licenses are confirmed, use **open alternatives that rhyme** with brand (below). Prefer licensing the real faces if TORCC already pays for them on Typekit kit `vyo6euw`.

### 3.3 Your suggestion: Arial Black + Instrument Serif

| Face | Verdict for this product |
|------|---------------------------|
| **Arial Black** | ❌ Too blunt for UI body/labels. Matches “heavy display” only. Reads default-OS, not TORCC Owners. OK only as last-resort system fallback for ultra-bold titles. |
| **Instrument Serif** | ✅ Strong free stand-in for **IvyPresto Display** — modern high-contrast display serif, elegant italic, OFL/Google Fonts. Use for **accent display only**, not dense table text. |

### 3.4 Recommended type stack (app)

#### Preferred (if licensed)
| Token | Font | Role |
|-------|------|------|
| `--font-sans` | **Owners** (Regular–Bold) | Body, UI, nav, buttons, most page titles |
| `--font-display-wide` | **Owners Wide** | Rare all-caps section labels (“SCHEDULE”, “READY SHELF”) |
| `--font-serif` | **IvyPresto Display** Italic | Editorial flourishes only (empty states, “Prophetic” marketing moments inside product, feature callouts) |
| `--font-mono` | **JetBrains Mono** or **IBM Plex Mono** | Times, IDs, platform codes, KPIs |

#### Open / free default (implement first)

| Token | Font | Why |
|-------|------|-----|
| `--font-sans` | **Satoshi** (Fontshare, free) *or* **Instrument Sans** (Google) | Geometric, contemporary, tighter than Inter; closer to Owners’ warmth than pure Inter |
| `--font-display` | Same sans, **weight 700–900**, slightly tighter tracking | Page titles without a second family |
| `--font-serif` | **Instrument Serif** (Google, OFL) | IvyPresto-like editorial accent |
| `--font-mono` | **JetBrains Mono** (keep) | Technical rhythm already in app |

**Secondary free options if Satoshi unavailable:**  
- Sans: **General Sans** (Fontshare), **Outfit**, **Plus Jakarta Sans**  
- Avoid as primary: Inter (current) alone — fine tool font, weak TORCC identity  
- Avoid: pure Arial / Helvetica as brand statement  

**Pairing rule:**
```
Sans carries 95% of the product.
Serif appears in ≤5% of surfaces: empty-state headlines, marketing interstitial, “brand moment” pull-quotes.
Never use serif for calendar cells, form labels, or table headers.
```

### 3.5 Type scale (product-tuned; not marketing 5rem)

| Token | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| `display` | 1.75–2rem | 700 | -0.02em | Page H1 (“When & where”) |
| `title` | 1.125–1.25rem | 600–700 | -0.01em | Card titles, section heads |
| `body` | 0.875–0.9375rem | 400–500 | 0 | Default UI |
| `caption` | 0.6875–0.75rem | 500–600 | 0.06–0.1em | Eyebrows, all-caps labels |
| `serif-accent` | 1.5–2rem | 400–500 italic | 0 | Empty states only |
| `mono-meta` | 0.6875–0.75rem | 500 | 0 | Times, counts |

**Case rules:** Sentence case for buttons and most titles (matches product quality bar). ALL CAPS + wide tracking only for **eyebrows** (`text-caption` style), never for primary CTAs.

---

## 4. Color system (from torcc.org CSS tokens)

### 4.1 Brand tokens extracted

| Name | Hex | Role on site |
|------|-----|----------------|
| Black | `#000000` / `#111` | Primary text, primary buttons, dark sections |
| White | `#FFFFFF` | Primary surfaces, reverse text |
| Neutral lightest | `#EEEEEE` / `#F8F8F8` | Secondary surfaces |
| Neutral mid | `#666` / `#7D797A` | Muted text |
| **Brand purple** | `#812BF5` | Primary brand accent (CSS `--base-brand--brand-01`) |
| Purple deep | `#5321D0` / `#3D0081` / `#221355` | Dark purple gradients |
| Cyan | `#6DEFF0` / `#06D7EB` | Energy accent / gradients |
| Gold | `#F0E14C` / `#F2E208` | Rare festival accent in gradients |
| Success | `#027A48` (+ check `#48752C` in icons) | Fulfilled / success |
| Error | `#B42318` | Errors |
| Focus ring (a11y) | `#4D65FF` | Keyboard focus on main site |

**Gradient (marketing only):**  
`radial-gradient(circle, #06d7eb, #9000ff 50%, #f2e208)` — **do not** use as default app background.

### 4.2 OmniPresence product palette (recommended)

**Base (90% of UI) — stays monochrome like TORCC marketing chrome:**

| Token | Light | Notes |
|-------|-------|-------|
| `--background` | `#FFFFFF` | App canvas |
| `--foreground` | `#0A0A0A` | Primary text (slightly softer than pure #000 for long sessions) |
| `--paper-2` | `#F6F6F6` | Sidebars, shelves, secondary panels |
| `--card` | `#FFFFFF` | Elevated cards |
| `--line` / `--border` | `#E5E5E5` or `#00000014` | Hairlines; use **true black 1px** only for emphasis (selected chips, primary outlines) |
| `--muted-foreground` | `#6B6B6B` | Secondary copy |

**Brand accent (use sparingly):**

| Token | Value | Use |
|-------|-------|-----|
| `--brand` | `#812BF5` | Focus rings, active nav accent, progress, “live/brand” moments |
| `--brand-soft` | `#812BF514` | Selected row wash, soft chips |
| `--brand-deep` | `#5321D0` | Hover on brand CTAs (if used) |
| `--cyan` | `#6DEFF0` | Optional highlight for “live” or streaming status only |

**Semantic (keep platform colors for networks):**

| Token | Value | Use |
|-------|-------|-----|
| `--success` | `#027A48` | Scheduled OK, published |
| `--warning` | warm amber (existing) | Conflicts / needs times |
| `--destructive` | `#B42318` | Delete / failed |

**Platform brand colors** (IG pink, YT red, etc.) stay in `platforms.ts` — they are *network* identity, not TORCC brand.

### 4.3 Accent policy (critical)

| Do | Don’t |
|----|-------|
| Black primary CTAs (TORCC default `.button`) | Purple fill on every button |
| Purple for **selected state**, **focus**, **progress**, rare brand CTAs | Purple calendar cells |
| Cyan only for “Live” / streaming metaphor | Rainbow gradients in chrome |
| Green for fulfilled/success | Green as decoration |

This keeps the app feeling like **torcc.org’s black/white house** with TORCC purple as signature, not a purple SaaS theme.

---

## 5. Shape, space, elevation

| Token | Value | Notes |
|-------|-------|-------|
| `--radius-sm` | `4px` | Inputs, small chips |
| `--radius-md` | `8px` | Cards, panels (matches TORCC app token `--_apps---sizes--radius: 8px`) |
| `--radius-lg` | `12px` | Modals, large cards |
| `--radius-pill` | `16px` / `999px` | Marketing-style primary on dark empty states only |
| Shadow | Soft black `0 1px 2px #0000000a, 0 8px 24px #0000000d` | Replace hard neobrutal offsets if any remain |
| Density | 8px base grid | Compact lists (ready shelf) stay tight |
| Sidebar | Light grey `#F6F6F6` or pure white + hairline | TORCC apps token uses light sidebar |

---

## 6. Components (product mapping)

Map TORCC patterns → OmniPresence surfaces:

| TORCC pattern | OmniPresence application |
|---------------|---------------------------|
| Logo wordmark on black | Sidebar brand: **OmniPresence** + small TORCC lockup optional |
| Give = filled black CTA | Primary: **Schedule**, **Mark ready**, **New post** → black fill, white text |
| Secondary outline button | Cancel, Edit in Compose, secondary filters |
| White pill on dark | Empty states / dark hero bands only |
| Numbered 01–04 quicklinks | Compose wizard steps or onboarding (People-first copy) |
| Event image cards | Content cards / event albums (already strong) |
| Prophecy “Fulfilled” green check | Status: published / complete |
| LIVE banner | Sync / “Live metrics” bar — restrained red or cyan dot + Owners caption |
| Serif “Fulfilled” flourish | Empty state: *“Nothing on the ready shelf”* with Instrument Serif once |
| Carousel density | Calendar week strip — horizontal time, not marketing carousel chrome |

### 6.1 Buttons

```
Primary:   bg black, text white, border black, radius 8px, font-weight 600
Secondary: bg transparent, border 1px black/line, text black
Ghost:     no border, muted text
Danger:    outline or soft red wash
Brand:     rare — bg #812BF5 text white (e.g. “Connect TORCC accounts”)
```

### 6.2 Cards
- White surface, 1px subtle border OR soft shadow (not thick black neobrutal box unless selected)
- Selected: black border 1.5–2px **or** brand-soft wash + brand left bar
- Thumbnail-led (media first) — aligns with event cards

### 6.3 Forms
- Inputs: light border, 8px radius, focus ring `--brand` or black
- Labels: caption uppercase tracking optional
- Errors: `--destructive` text + soft red bg

### 6.4 Calendar (Schedule / Queue)
- Keep Editorial Mono clarity
- Today: black disc + white number (already TORCC-like)
- Proposed chips: solid black/secondary
- Committed chips: muted dashed (already planned)
- Multi-card overflow: day panel — product pattern, not marketing modal

---

## 7. Motion & interaction

| Context | Motion |
|---------|--------|
| Marketing (torcc.org) | Scale hover, large fades OK |
| **App** | 150–200ms color/opacity; **no** scale(1.1) on dense controls |
| Modals | Fade + slight rise |
| Toasts | Slide from edge |
| Reduce motion | Honor `prefers-reduced-motion` |

---

## 8. Voice & copy system

| Principle | Example |
|-----------|---------|
| Real | “3 reels ready — set times to schedule” |
| Relevant | “Best times stagger posts so they don’t collide” |
| Relational | “Editing: Sunday highlight reel” not `focus_id` |
| Sentence case | Buttons and titles |
| Short CTAs | Schedule · Mark ready · Open Compose |
| Avoid | Churchy jargon in tool chrome; keep prophetic language for **event titles/content**, not UI labels |

---

## 9. Logo & brand marks

- TORCC logo (white wordmark + symbol on black) — use in **Admin / About / login chrome** if desired  
- Product mark: **OmniPresence** wordmark in sans bold  
- Favicon: can stay product mark; optional TORCC dual-brand for internal staff login  
- Do not stretch Owners-like letterspacing on the logo; use official assets from church brand kit when available  

---

## 10. Accessibility

- Maintain WCAG AA contrast (black on white is strong; purple on white needs weight care — use `#812BF5` on white only for large text/icons; for small text prefer black)  
- Focus visible: 2px brand or black ring (torcc uses `#4d65ff` — we can use brand purple)  
- Don’t rely on purple alone for state — pair with weight/border  
- Serif accents never carry critical UI-only information  

---

## 11. Gap: current OmniPresence vs TORCC

| Aspect | Current app (Editorial Mono) | TORCC brand | Target |
|--------|------------------------------|-------------|--------|
| Sans | Inter | Owners | Satoshi / Instrument Sans → Owners if licensed |
| Display serif | None | IvyPresto italic | Instrument Serif accents |
| Accent | Pure black | Black + purple `#812BF5` | Black CTAs + purple selection/focus |
| Radius | Soft modern | 8–16px mix | 8px default, 12px cards |
| Shadows | Soft card | Minimal | Soft, no hard offset |
| Tone | Neutral tool | Prophetic + cinematic | Tool density + TORCC tokens |
| Name | OmniPresence ✅ | — | Keep |

---

## 12. Deliverable structure (Phase A → B)

### Phase A — this plan (approval)
1. Research summary (domains, UX, tokens) ✅  
2. Type alternatives + recommendation ✅  
3. Full token/component rules ✅  

### Phase B — implementation (after you approve)
1. Add fonts (Google/Fontshare or Typekit) in `frontend`  
2. Rewrite CSS variables in `styles.css` (TORCC tokens)  
3. Update button/card/sidebar primitives  
4. Apply serif only on empty states / brand moments  
5. Purple selection/focus — not full purple reskin  
6. Optional: TORCC mark in sidebar footer  
7. Visual QA against torcc.org side-by-side  
8. Commit + push  

**Out of scope for first UI pass:** rebuilding layout IA, new features, publishing worker.

---

## 13. Recommendation summary (decisions to approve)

| Decision | Recommendation |
|----------|----------------|
| **Primary sans** | **Satoshi** (free) or **Instrument Sans**; upgrade to **Owners** if TORCC licenses allow |
| **Display serif** | **Instrument Serif** italic accents (not Arial Black) |
| **Arial Black** | Reject as UI face; optional system fallback only |
| **Color** | Black/white base + **`#812BF5` brand accent** sparingly |
| **Primary CTA** | Black fill (torcc.org default), not purple |
| **Density** | Keep app dense; borrow marketing drama only for empty/hero states |
| **Source of truth** | torcc.org Webflow tokens; ignore online.torcc.org Proxima skin |

---

## 14. Next step after approval

You approve this design system → we implement Phase B (token + type + component pass) across OmniPresence without redesigning product flows.

If you want one fork before implement:
- **A.** Free stack only (Satoshi + Instrument Serif) — ship immediately  
- **B.** Licensed Owners + IvyPresto via existing Typekit — closest to public site  
- **C.** Hybrid: Owners if available, Instrument Serif free for serif  

**Suggested default:** **A now**, path to **B** when church design team confirms font licenses for the app.
