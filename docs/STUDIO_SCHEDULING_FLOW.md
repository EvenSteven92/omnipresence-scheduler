# Studio scheduling flow — research & design

**Date:** 2026-07-11  
**Product:** TORCC OmniPresence  
**Principle:** Everything is a card. Studio whiteboard is primary; Queue / Calendar / Events are linear readouts of the same truth.

---

## 1. Studio as primary view

### Idea
Whiteboard is where work happens; other nav items display the same data more linearly.

### Research / existing assets
- Nav today: Queue → Calendar → Events → **Studio** → Analytics → Admin  
- Studio already owns draft reels, multi-select, marquee, prepare pipeline  
- Queue/Calendar read `scheduledPosts`; Events read workspace events  

### Design
| Change | Detail |
|--------|--------|
| Sidebar order | **Studio first**, then Queue, Calendar, Events, Analytics, Admin |
| Mobile | Studio remains primary create target (`+` → Studio) |
| Mental model | Create & place on board → Schedule shelf → appears on Queue/Calendar |

---

## 2. Bottom toolbar: Schedule + New event

### Idea
Beside Select / Hand / zoom: **Schedule** and **New event** icons so schedule/event actions are always one click away.

### Research
- Miro/Figma: mode tools left/bottom; contextual actions adjacent  
- Our HUD already has Select (V) / Hand (H) / zoom / fit  
- `CREATE.event` = “New event”; schedule = calendar-clock icon  

### Design
| Control | Behavior |
|---------|----------|
| **Schedule** | Opens right **Schedule shelf** for current selection (1+ caption-ready cards). Disabled/toast if selection empty or not caption-ready. |
| **New event** | Creates an **event card** on the board (and/or opens quick create); ties to existing event model. |

Toolbar shifts left when shelf is open so controls stay visible (see §4).

---

## 3. Opening Schedule from three places

### Idea
Same shelf, multiple entry points:

1. Contextual menu on **single** card (existing gated Schedule tool)  
2. **Multi-select batch bar** — Schedule N  
3. **Bottom toolbar** Schedule button  

### Design
- Shared state: `scheduleShelfOpen: boolean`, `scheduleTargetIds: string[]`  
- Opening from any entry sets targets = selected (or focused) IDs and opens shelf  
- Shelf operates only on `scheduleTargetIds` (subset of board drafts)

---

## 4. Resizable right schedule shelf (sliding panel)

### Idea
Panel slides from the right with light shadow; bottom HUD animates left so it isn’t covered.

### Research
- `CalendarDayDrawer` pattern exists (right fixed drawer)  
- CSS: `transform: translateX`, `transition`, `box-shadow`  
- Resize: drag handle on left edge of panel (pointer capture); clamp width ~320–720px; persist `localStorage` key `omni.studio.scheduleShelfWidth`  

### Design
| Property | Spec |
|----------|------|
| Width default | `min(420px, 40vw)` |
| Min / max | 320px / min(720px, 70vw) |
| Shadow | `box-shadow: -8px 0 24px rgba(0,0,0,0.06)` (subtle TORCC, not heavy) |
| Backdrop | Optional 0–4% black scrim; clicks outside can close or not (prefer **no full block** so board stays usable) |
| Animation | 200–250ms ease; `prefers-reduced-motion` → instant |
| HUD offset | Bottom toolbar `transform: translateX(calc(-1 * shelfWidth / 2))` or `right: shelfWidth + 16` when open |

### Shelf content (top → bottom)
1. Header: “Schedule N reels” + Close  
2. Selected thumbnails strip  
3. **Week / Month calendar** (`ProposedScheduleCalendar` adapted)  
4. Show existing schedule toggle (committed muted layer)  
5. Day overflow panel (already in ProposedScheduleCalendar)  
6. Destinations + per-platform times for **focus** target (or shared cadence for multi)  
7. Best times / Cadence for selection  
8. Primary **Schedule** commit CTA  

---

## 5. Week / month calendar + existing posts popup

### Idea
Bring back proposed week/month UI and multi-card day overflow when days already have scheduled posts.

### Research / reuse
- `ProposedScheduleCalendar` — week/month, `+N more` day panel, committed layer, sort by time  
- `proposed-schedule-calendar.ts` — `draftsOnDay`, `committedOnDay`, etc.  
- `workspace.scheduledPosts` for committed context  

### Design
- Embed calendar inside shelf (not full page)  
- Proposed layer = `scheduleTargetIds` drafts with `proposedTimes`  
- Committed layer = workspace scheduled posts (default ON)  
- Day panel lists proposed + already scheduled  
- Clicking a day can seed times for selection (optional v1: display only; v1.1: “Place selection on this day”)

---

## 6. Everything is a card — events on the whiteboard

### Idea
Events are first-class **board cards**, not only a separate Events page. Reels attach to events (“stringing”) so source logic (event albums, analytics, calendar) stays coherent.

### Research
- `ContentEvent` in workspaces; `DraftPost.eventId`  
- `EventAssociateModal`, `useEventAssociations`, `ScheduleEventModal`  
- Events page is linear list of albums  

### Design — Event card on board
| Field | Storage |
|-------|---------|
| id, title, date, kind | Workspace events / custom events |
| canvasX, canvasY | Extend event model or parallel map `omni.studio.eventLayout` in localStorage |
| Visual | Distinct card chrome (eyebrow “Event”, date, title); brand-soft border option |

### Design — Stringing (association)
| Phase | Behavior |
|-------|----------|
| **v1** | Select reel(s) + open Assign event in shelf or event card action → set `eventId` on drafts |
| **v1 visual** | When reel has `eventId`, show small event chip on reel card; optional SVG line from event card → reel cards when both on board |
| **v2** | Drag connector handle event → reel (true string UI) |

### New event button flow
1. Click **New event** on bottom toolbar  
2. Lightweight create (title + date) — reuse pieces of `ScheduleEventModal` / `useCustomEvents`  
3. Event card appears on board at cascade position  
4. User multi-selects reels + uses “Attach to event” or selects event as assignment target  

---

## 7. Linear views remain secondary

| View | Role after Studio-primary |
|------|---------------------------|
| Queue | Linear upcoming scheduled |
| Calendar | Month/day of committed posts |
| Events | Album grid of events + cards |
| Analytics | Metrics |
| Admin | Connections / workspaces |

No removal of these routes; copy/nav only elevates Studio.

---

## 8. Implementation phases

### Phase A (this implementation)
1. Sidebar: Studio first  
2. Bottom toolbar: Schedule + New event  
3. Resizable right Schedule shelf with animation + HUD shift  
4. Open shelf from card tool, batch bar, bottom Schedule  
5. Embed ProposedScheduleCalendar + destinations/times + commit for selection  
6. New event → custom event + place event card on board (layout map)  
7. Assign `eventId` from shelf (picker) for selected reels  
8. Event chip on reel cards when linked  

### Phase B (follow-up)
- Drag-to-string connectors  
- Place selection on calendar day by click  
- Bulk schedule multi with different days  
- Persist event canvas positions server-side  

---

## 9. TORCC visual constraints

- Black primary CTAs; brand purple for selection/focus only  
- Soft grey shadow on shelf (not purple neon)  
- Satoshi UI; no framer-motion required (CSS transitions)  

---

## 10. Success criteria (Phase A)

- [ ] Studio is first sidebar item  
- [ ] Schedule opens resizable right shelf from card / multi / bottom bar  
- [ ] Week/month + existing schedule + day overflow in shelf  
- [ ] Can set times and commit selected reels  
- [ ] New event creates event card on board  
- [ ] Can assign reels to an event (eventId)  
- [ ] Bottom tools remain usable when shelf open  
- [ ] Typecheck, build, push  
