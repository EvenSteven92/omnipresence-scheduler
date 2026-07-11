# Studio shell UX research — dummy AI, layers panel, main nav collapse

**Date:** 2026-07-11  
**Scope:** Flow-testing without live AI; Layers panel geometry; app sidebar collapse overflow  
**Standards base:** Figma / Photoshop panel chrome, Linear / VS Code icon rail, WCAG 2.1 AA, TORCC OmniPresence design system

---

## 1. Problem statements (current product)

| Pain | Observed behavior | Root cause (code) |
|------|-------------------|-------------------|
| **Can't test AI flow reliably** | AI all / Script / Caption hang or fail when gateway/key missing; mock only runs after `catch` | `studio-ai.ts` + `ai-client.ts` always `fetch` first |
| **Layers overflows main nav** | Layers rail is `fixed` to the **viewport** (`left-0 top-14`), so it sits under/over app chrome instead of inside the whiteboard | `StudioLayersPanel` uses viewport fixed positioning |
| **Main nav collapse feels broken** | Collapsed rail clips labels mid-transition; logo + toggle fight for space; padding/width mismatch; content “bleeds” during width animation | Sidebar animates width while labels/text remain layout-sensitive; `overflow-y-auto` without strict `overflow-x-hidden` + icon-rail layout |

---

## 2. Dummy AI for development flow testing

### Why real AI blocks the flow
Studio’s happy path is: **media → AI prepare / script / CTA / caption → schedule shelf**.  
If generation depends on `/api/ai/generate`, local and staging testing stall on:

- Missing `AI_GATEWAY` / API keys  
- Cold starts / timeouts  
- Rate limits  

Fallback text already exists in `generateTranscript` / `generateCallToAction` **after** failure. That is too late for UX testing (spinners, error toasts, multi-card batch).

### Industry patterns
| Pattern | Used by | Guidance |
|---------|---------|----------|
| **Feature flag mock LLM** | Many SaaS “demo mode” / Storybook | One switch: never hit network; return deterministic strings after short delay |
| **Deterministic fixtures** | Playwright / Cypress | Same input → same caption/hashtags so asserts stay stable |
| **Artificial latency** | Design tools (100–400ms) | Preserve loading UI without real wait |
| **Visible “mock” affordance** | Optional toast or subtle badge | Honesty: user knows copy is placeholder |

### Recommendation for OmniPresence
1. **Default mock on** in non-production (or always when `VITE_STUDIO_MOCK_AI=1` / missing env).  
2. Centralize in `ai-client.ts` **or** `studio-ai.ts` so all Studio tools + batch “AI all” share one path.  
3. Return rich but obvious dummy copy (title-based) with `// MOCK` markers optional in transcript.  
4. Keep real path behind `VITE_STUDIO_MOCK_AI=0` + successful API for production later.  
5. Optional short `await delay(200–350)` so busy spinners remain testable.

**Acceptance:** Click AI all on N cards → all fill transcript/CTA/caption/hashtags without network, under ~1s/card including delay.

---

## 3. Layers panel — belong inside the whiteboard

### Why fixed-to-viewport fails
Photoshop / Figma / Miro put **document panels inside the document chrome**, not over the app’s global nav.

Current:

```text
viewport
├── App Sidebar (main nav)     ← global
├── main
│   └── Studio page
│       └── Canvas + HUD
└── Layers (fixed left-0)      ← competes with App Sidebar
```

Desired:

```text
viewport
├── App Sidebar
└── main / Studio page (relative)
    ├── Layers (absolute left of studio content)
    ├── Canvas
    └── Bottom HUD
```

### Best-practice patterns
| Source | Pattern |
|--------|---------|
| **Photoshop Layers** | Docked to document frame; does not cover menu bar / app chrome |
| **Figma** | Left/right panels are children of the editor shell; canvas resizes between them |
| **Miro / FigJam** | Tool panels float **over the board**, inset from shell edges |
| **Canva** | Side panels occupy editor column; main product nav stays separate |

### Spec for us
| Rule | Spec |
|------|------|
| Positioning | `absolute` (or sticky) **within Studio page / canvas wrapper**, not `fixed` to viewport |
| Inset | Top = under Studio header (or flush under page header); bottom = 0 or above bottom HUD padding |
| Width | ~14–15.5rem; shadow soft; z-index above canvas, below modals |
| Canvas shift | When open, optionally pad canvas content or shift HUD (already partially via `layersOpen` hudShift) — prefer **inset panel + canvas remains full width underneath with dim optional**, or compress canvas `padding-left` |
| Main nav | Never overlap app Sidebar; never steal space from `md` main nav collapse |
| Motion | Slide 200ms ease-out; `overflow-hidden` on host so slide doesn’t paint outside Studio |

---

## 4. Main navigation collapse — icon rail done right

### What “good” looks like (Linear, VS Code, Notion, Slack)
1. **Two discrete modes**, not a mushy mid-state: Expanded (labels) vs Icon rail (icons only).  
2. **Collapsed width** fits icon + horizontal padding only (`~3.5–4rem`); **no truncated words**.  
3. **`overflow-x: hidden`** on the rail; never show half a label.  
4. **Hide labels with opacity/display**, don’t rely on width alone to “squeeze” text.  
5. **Tooltips** (`title` or proper tooltip) on every icon when collapsed.  
6. **Header layout**: collapsed = centered logo mark OR expand control; avoid logo + chevron fighting in one row without grid.  
7. **Footer CTA**: collapsed = square icon button (`+` only), same hit target height as expanded.  
8. **Width transition** on container only; content switches at toggle (or opacity-fade labels before width).  
9. **`min-w-0` + flex** so children cannot force rail wider than `--sidebar-width-collapsed`.  
10. **Badges**: collapsed mode uses a small corner dot or hides counts to avoid horizontal overflow.

### Likely bugs in current Sidebar
| Issue | Fix |
|-------|-----|
| `px-4` padding on 4rem rail leaves ~2rem content area; logo row has mark + collapse button | Reduce collapsed padding to `px-2`; stack or center controls |
| Labels unmount but width animates 200ms — flash of layout thrash | `overflow-x-hidden`; optional delay label mount until expanded settles |
| Nav links still `gap-3` / padding that assumes labels | Collapsed: square-ish hit targets, `justify-center`, fixed icon size |
| Sync footer long mono string | Already `sr-only` when collapsed — good; keep title tooltip on icon area if needed |
| Workspace switcher | Collapsed icon-only + flyout to the right (already) — ensure no horizontal overflow of trigger |

### Accessibility
- Collapse control: clear `aria-label` Expand/Collapse sidebar  
- Active route: visible focus + active styles on icon even when label hidden  
- Don’t remove badge meaning entirely if count is critical — prefer tooltip “Queue: 12”

---

## 5. Cross-cutting motion & hierarchy

| Element | Motion | Hierarchy |
|---------|--------|-----------|
| Layers open/close | transform + opacity 200ms | Secondary tool panel |
| Sidebar width | 200ms width only; content mode switch clean | Primary app chrome |
| Group menu / card tools | Already horizontal; keep above canvas | Contextual, ephemeral |
| AI mock latency | 200–350ms | Loading affordance, not empty freeze |

Avoid: stacking fixed layers + fixed mobile nav + absolute group menu without a single z-index scale.

Suggested z-index scale (Studio):

| Layer | z |
|-------|---|
| Canvas content | 0–10 |
| Marquee / connections | 10–20 |
| Layers (in-studio) | 25 |
| Bottom HUD | 30 |
| Group menu | 40 |
| Schedule shelf | 40–45 |
| Toast | 50 |
| App mobile bottom nav | 40 (global) |

---

## 6. Implementation priorities

1. **P0 — Mock AI** — unblock end-to-end Studio testing  
2. **P0 — Layers in-board** — stop overlapping main nav  
3. **P1 — Sidebar collapse rail** — fix overflow and flow  

---

## 7. Success metrics (manual QA)

- [ ] AI all / Script / Caption work offline with dummy text  
- [ ] Layers open: panel sits fully inside Studio column; app Sidebar fully usable  
- [ ] Collapse main nav: no text overflow, no horizontal scroll, icons centered, tooltips work  
- [ ] Expand main nav: labels + badges restore cleanly  
- [ ] Layers + collapsed nav + schedule shelf can coexist without clipping primary chrome  

---

## 8. References (patterns, not copy)

- Figma UI: editor shell vs app chrome separation  
- Photoshop: Layers panel docks to document  
- Linear / VS Code: icon-rail navigation  
- Nielsen: recognition over recall (tooltips when labels hidden)  
- WCAG: 24–44px targets; focus visible when collapsed  
