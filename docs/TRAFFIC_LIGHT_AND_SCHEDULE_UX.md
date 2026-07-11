# Schedule workflow, bulk UX, readiness cues & traffic-light system

**Date:** 2026-07-11  
**Product:** TORCC OmniPresence  
**Status:** Research + design spec (implementation plan follows in session plan)  
**References:** `STUDIO_SCHEDULING_FLOW.md`, `TORCC_OMNIPRESENCE_DESIGN_SYSTEM.md`, `UI_UX_AUDIT.md`, `STUDIO_SHELL_UX_RESEARCH.md`

---

## 0. Goals (user intent)

1. **Schedule shelf** works great for **one** card; **two+ cards** need a different layout under the calendar.  
2. **Proposed schedule (week/month)** is always **first** (single and multi).  
3. **Remove “String to event”** from the shelf (broken / not talking to the whiteboard). Event linking stays on the board.  
4. **Destinations & times** revisited for clarity; multi-card gets a list of per-reel editors.  
5. **Platform gating:** warn + recommend, **hard-block only** when a platform cannot accept the media (e.g. YT Shorts ≠ 16:9). Instagram may accept 16:9 with a soft notice.  
6. **Event cards on the whiteboard:** editable fields (title, date, kind, description) like reel cards.  
7. **Prepare readiness chips** on reel cards (transcript, CTA, title, caption, hashtags).  
8. **Site-wide traffic light** on every card: failed / scheduled / live / not scheduled.  
9. **Subtle motion** site-wide (soft, quick fade / slide-ins) consistent with TORCC calm product UI.

---

## 1. Audit — current schedule workflow

### 1.1 Happy path today
```
Board select caption-ready reel(s)
  → Schedule tool / group menu / HUD
  → StudioScheduleShelf (right)
      1. Selection strip (thumbs)
      2. String to event (dropdown)     ← REMOVE
      3. ProposedScheduleCalendar
      4. Destinations & times (focus card only)
      5. Footer: Best times | Schedule N
  → commit → scheduledPosts → leave board
```

### 1.2 What works (single card)
- Calendar shows proposed chip on day cells.  
- Destination picker + per-platform date/time for **focus** draft.  
- Best times + commit.  
- Visual hierarchy is readable for one reel.

### 1.3 Pain points (multi / system)
| Pain | Evidence |
|------|----------|
| Multi-card destinations only edit **focus** | `focus` drives `PlatformDestinationPicker`; other reels invisible in times section |
| No bulk layout under calendar | Same stack for 1 and N; user must click each thumb |
| String to event out of place | Shelf lists **all** workspace events, not board working set; whiteboard already owns stringing |
| Hard aspect gate | `isPlatformCompatible` **disables** IG on 16:9 even though IG accepts landscape |
| No “scheduled” cue on board | Drafts vanish after commit; remaining board drafts have no lifecycle light |
| Lifecycle incomplete | `CardLifecycleStatus = SCHEDULED \| LIVE \| DRAFT` only — no **FAILED**; badge styling not traffic-light |
| Event cards display-only | `StudioEventCard` has no inline edit for title/date/kind/description |
| Prepare progress opaque | Stage text only (“Caption ready”); no per-field chips |

---

## 2. Bulk scheduling UX research

### 2.1 Industry patterns
| Product | Pattern | Takeaway |
|---------|---------|----------|
| **Buffer** | Queue list + per-item time; calendar secondary | Multi = list of items with independent clocks |
| **Later** | Calendar first for overview; click day → slot list | Calendar = truth map; detail below |
| **Hootsuite / Sprout** | Multi-select → calendar with stacked posts; side panel per post | Stack on day cell + detail list |
| **Figma multi-edit** | Selection strip + “editing N objects” | Focus one, or “apply to all” for shared props |

### 2.2 Recommended OmniPresence multi-card layout

```
┌─ Schedule shelf ─────────────────────────┐
│ Header: N reels · close                  │
│ Selection strip (thumbs, focus)          │
│                                          │
│ ┌─ PROPOSED SCHEDULE (always #1) ──────┐ │
│ │ Week | Month · nav · Show existing   │ │
│ │ [calendar grid — chips per draft]    │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ ┌─ DESTINATIONS & TIMES ───────────────┐ │
│ │ SINGLE: picker + times for that reel │ │
│ │ MULTI: stacked cards (one per reel)  │ │
│ │   [thumb] Title · readiness          │ │
│ │   destinations (soft/hard rules)     │ │
│ │   date/time rows                     │ │
│ │ Optional: “Copy platforms to all”    │ │
│ └──────────────────────────────────────┘ │
│ Footer: Best times · Schedule N reels    │
└──────────────────────────────────────────┘
```

**Visual cues when proposed times exist**
- Calendar chip: brand border (already).  
- Selection strip: small **yellow** (scheduled draft times filled) vs grey (missing times).  
- Multi list row: green check when platforms + times complete for that reel.

**Commit readiness**
- Enable Schedule when **every** target has ≥1 platform and a time for each platform (or primary date).  
- Partial multi: toast which reels still need times.

---

## 3. Platform compatibility — soft vs hard

### 3.1 Principle
> **Recommend and warn. Block only when the platform will refuse the asset.**

### 3.2 Matrix (2025–26 practical)

| Platform | Hard refuse | Soft prefer / notice |
|----------|-------------|----------------------|
| **YT Shorts** | Non-vertical (not ~9:16) | — |
| **TikTok** | Non-vertical | — |
| **IG Story / FB Story** | Non-vertical | — |
| **IG feed** | Almost never for common ratios | Prefer 4:5 / 1:1 / 9:16; **16:9 allowed with notice** |
| **FB feed** | Rare | Prefer square/portrait; landscape OK |
| **X** | Rare | Landscape fine |
| **YT long / Rumble** | Very rare for landscape | Prefer 16:9 |

### 3.3 Implementation model
```ts
type GateLevel = "allowed" | "warn" | "block";

function platformGate(platform, bucket): {
  level: GateLevel;
  message?: string; // shown under chip when warn/block
}
```

- **allowed** — selectable, no warning.  
- **warn** — selectable; amber caption “Preferred: 4:5 · 16:9 may crop in feed”.  
- **block** — not selectable; “YouTube Shorts requires 9:16 vertical”.

Migrate `ALLOWED` hard map → split **BLOCKED** vs **WARN** lists.  
`PlatformDestinationPicker`: never `disabled` for warn; only for block. Style warn with dashed border or amber sublabel when active.

---

## 4. Whiteboard event cards (edit parity)

### 4.1 Problem
Reel cards expand with tools + accordion fields. Event cards are static summary + “Attach selection”.

### 4.2 Spec
When **selected**, event card body shows:

| Field | Control |
|-------|---------|
| Title | text input |
| Date | date input |
| Kind | select (`ContentEventKind`) |
| Description | textarea (optional) |

- Persist via existing `useCustomEvents` / workspace event update path (extend if only `addEvent` exists).  
- **Attach selection** remains when reels selected.  
- Removing from board stays in Layers (not delete event).  
- New events created from HUD get empty editable card immediately.

---

## 5. Prepare readiness chips (reel)

### 5.1 Fields
`transcript` · `cta` · `title` · `caption` · `hashtags`

### 5.2 Visual
Compact chip row under media or under title (always visible, not only when selected):

| State | Look |
|-------|------|
| Empty | grey muted pill, 30% opacity |
| Filled | dark/foreground pill or brand-soft with check |

Labels short: `Script` `CTA` `Title` `Cap` `Tags`  
Tooltip full name.  
**Schedule-ready** = caption + hashtags (existing `isCaptionReady`); optional outer ring / “Ready” chip when true.

---

## 6. Traffic light system (site-wide)

### 6.1 States (user language → code)

| User | Token | Color (TORCC tokens) | Meaning |
|------|-------|----------------------|---------|
| Not scheduled / draft / board prep | `idle` | **Grey** (`muted` / secondary) | Not in schedule queue yet |
| Scheduled | `scheduled` | **Yellow** (`--warning` #e19005) | Queued for future publish |
| Live / posted | `live` | **Green** (`--success` #027a48) | Published |
| Failed to post | `failed` | **Red** (`--destructive` #b42318) | Publish error |

### 6.2 Data model
Extend:

```ts
// ScheduledPost.status
"draft" | "scheduled" | "published" | "failed"
```

Map:

| `status` | Traffic |
|----------|---------|
| draft / missing | idle |
| scheduled | scheduled |
| published | live |
| failed | failed |

**Studio board drafts** (not yet committed): always **idle** unless we keep a soft “has proposed times” as **scheduled-intent** (optional: amber outline only on shelf strip, not full traffic until committed).

**Events** (not posts): traffic can reflect aggregate of linked content:
- all idle → grey  
- any failed → red  
- else any scheduled → yellow  
- all live (and ≥1) → green  
- mixed scheduled+live → yellow (in progress)

### 6.3 UI component: `TrafficLight`
Single source of truth:

```tsx
<TrafficLight status="scheduled" size="sm" label /> // optional label
// OR left border accent on cards
// OR 8px dot top-right of thumb
```

**Placement (everywhere a card appears)**
- `StreamContentCard` / `ContentCard`  
- Queue list rows  
- Calendar day chips  
- Event album cards  
- Studio reel + event cards  
- Schedule shelf selection strip  
- Card detail page header  

Prefer **dot + optional text badge** so dense calendars stay clean; full badge on list/detail.

### 6.4 Badge text
Keep human labels: `DRAFT` · `SCHEDULED` · `LIVE` · `FAILED`  
Update `cardStatusClass` to traffic colors (not black pill for scheduled).

---

## 7. Motion system (site-wide, soft & quick)

### 7.1 Research
| Source | Guidance |
|--------|----------|
| Apple HIG | Prefer opacity + slight transform; 200–300ms |
| Material 3 | Emphasized decelerate; avoid bounce for productivity |
| Linear / Notion | 150–200ms fade; panels 200ms slide |
| TORCC product | Calm; no neon; no long choreography |

### 7.2 Tokens (CSS)
```css
--motion-fast: 150ms;
--motion-panel: 200ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);

.animate-fade-in { animation: fadeIn var(--motion-fast) var(--ease-out); }
.animate-slide-in-right { ... }
.animate-slide-in-up { ... }
```

### 7.3 Apply
| Surface | Motion |
|---------|--------|
| Shelf open/close | slide (existing) — keep 200ms |
| Layers panel | slide (existing) |
| Group menu appear | fade + 4px up |
| Card select | border/shadow 150ms (existing) |
| Traffic light change | color 150ms |
| Toast | fade |
| Route main content | optional fade-in once (subtle) |
| Accordion sections | height/opacity 150ms |

Respect `prefers-reduced-motion: reduce` → near-zero duration.

---

## 8. Consistency rules (for implementers)

1. **One traffic vocabulary** everywhere — never invent a fifth color.  
2. **Calendar always first** in schedule shelf.  
3. **No event stringing in shelf** — board only.  
4. **Block ≠ warn** — only hard blocks disable chips.  
5. **Multi = list of reel editors under calendar**, not a single focus form alone (focus may expand one accordion).  
6. **Readiness chips** are prepare progress; **traffic light** is publish lifecycle — do not conflate.  
7. Motion is **supporting**, never blocking interaction.

---

## 9. Success criteria (QA)

- [ ] 1 reel schedule shelf: calendar top, destinations below, no string-to-event  
- [ ] 2+ reels: calendar shows both; below calendar, each reel has destinations/times  
- [ ] IG selectable for 16:9 with soft notice; YT Shorts blocked for 16:9  
- [ ] Event card selected → editable title/date/kind/description  
- [ ] Reel shows 5 readiness chips updating as AI fills fields  
- [ ] Queue / calendar / studio cards show traffic light colors  
- [ ] Failed status renders red when `status === "failed"`  
- [ ] Animations soft/quick; reduced-motion disables  

---

## 10. Out of scope (this wave)

- Real publish worker that sets `failed` from API (can seed mock failed posts)  
- Auto-crop pipeline for ratio conversion  
- Drag-on-calendar to reschedule (nice later)  
- Full Framer Motion dependency (CSS only)
