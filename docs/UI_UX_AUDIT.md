# OmniSocial — UI/UX Audit System & Report

> Lightweight, reusable audit for continuous design quality.  
> Standards base: WCAG 2.1 AA, 2025–26 readability guidance, modern SaaS dashboard patterns.

## Audit dimensions (score 1–5)

| ID | Dimension | Pass criteria |
|----|-----------|---------------|
| **T** | Typography & readability | Body ≥16px; line-height ≥1.5; captions ≥12px; limited all-caps |
| **C** | Contrast | Text ≥4.5:1 on bg; UI chrome ≥3:1; muted still legible |
| **H** | Hierarchy | One primary action per region; section kickers + titles; KPI > detail |
| **S** | Spacing & density | Consistent page/section/control gaps; no cramped touch targets (<40px) |
| **V** | Visual system | One border language, radius, shadow; no mixed soft-glass + hard-ink |
| **L** | Language | Sentence case; no snake_case/machine jargon in UI strings |
| **A** | Affordance & a11y | Focus rings; disabled ≠ invisible; live vs sample honesty |
| **F** | Flow | Primary path clear (queue → create → calendar → analytics → admin) |

## Scoring rubric

- **5** — Meets standard consistently  
- **3** — Mostly OK, local exceptions  
- **1** — Systematic failure  

**Pass bar:** average ≥4.0 and no dimension ≤2.

## Method

1. Token scan (`styles.css`) — type scale, colors, spacing  
2. Pattern grep — `border-border`, tiny type (`0.45–0.55rem`), snake_case labels, soft shadows  
3. Route walk — `/`, `/scheduler`, `/calendar`, `/events`, `/analytics`, `/workspaces`  
4. Shell — sidebar, mobile nav, switcher, sync footer  

---

## Baseline audit (2026-07-09, pre-fix)

| Dim | Score | Notes |
|-----|-------|-------|
| T | 2 | Body 14px; many labels 7–9px mono; heavy all-caps |
| C | 3 | Muted `#9b917f` on cream is soft; accent OK |
| H | 4 | Queue/admin/analytics improved; composer dense |
| S | 3 | Touch targets uneven; calendar cells tight |
| V | 2 | Soft `border-border` + hard neobrutalist mixed widely |
| L | 2 | `live_wire`, `plan_this_day`, field labels like `name` |
| A | 3 | Focus partial; export disabled looks broken |
| F | 4 | Nav clear; create primary solid |

**Average: ~2.9 — fail**

### Priority backlog

1. **P0 Foundation** — body 16px, stronger muted, type floors  
2. **P0 Visual system** — hard borders on chrome/modals/switcher  
3. **P0 Language** — kill snake_case / machine labels  
4. **P1 Touch & focus** — min control height, focus-visible  
5. **P1 Density** — section rhythm, caption min size  

---

## Post-fix re-score (after foundation pass)

| Dim | Score | Notes |
|-----|-------|-------|
| T | 4 | Body 16px; caption floor 12px; titles clamp |
| C | 4 | Muted darkened to `#5c5549` |
| H | 4 | Unchanged structure; clearer CTAs |
| S | 4 | Buttons min-height 2.5rem; denser but touchable |
| V | 4 | Shell/modals/switcher/ticker on hard borders |
| L | 4 | Snake_case labels removed from high-traffic UI |
| A | 4 | Global `:focus-visible`; clearer links |
| F | 4 | Flows preserved |

**Average: ~4.0 — pass (maintain)**

### Remaining follow-ups (not blocking)

- Calendar cell micro-type still dense by design  
- Composer still high-density (acceptable for power tool)  
- CSV export remains disabled until backend ships
