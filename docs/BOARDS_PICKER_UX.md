# Boards picker UX — DaVinci Resolve–inspired

**Date:** 2026-07-11  
**Product:** TORCC OmniPresence  
**Basis:** Blackmagic DaVinci Resolve Project Manager / home project grid  
**Related:** `docs/STUDIO_MULTI_BOARD.md`

---

## 1. Goals (this wave)

| Ask | Direction |
|-----|-----------|
| Human language | **Save board** (not “Archive”); warm confirmations |
| New board flow | Dialog: **“Save this board first?”** → Save & continue / Don’t save / Cancel |
| Nav label | **Boards** (route stays `/studio` for stability) |
| Picker density | **Full-width card grid**, not a narrow 25% column |
| Board as card | **16:9 snapshot** + title + meta **below** (like reels, shorter copy) |
| Meta | Created · Last edited · reel/event counts · collapsible referenced events |
| Future | Same board-card UI reusable filtered by “boards containing file X” (card detail) |

---

## 2. DaVinci Resolve Project Manager — research

### Observed patterns
1. **Project home is a gallery**, not a list form.  
2. **Landscape thumbnails** (timeline/frame) dominate each cell — recognition before reading.  
3. **Name under the thumb**, not overlaid (or lightly overlaid).  
4. **Grid uses available width** — multi-column responsive.  
5. **New Project** is primary; open is click-on-card.  
6. **Thumbnails represent content** of that project (still / first clip / graded frame).  
7. Secondary actions (rename, delete, databases) stay out of the main visual flow.  
8. Closing / switching projects is an **explicit session boundary** — user expects a chance to save.

### Mapping to OmniPresence

| DaVinci | OmniPresence Boards |
|---------|---------------------|
| Project | Board (weekly/daily batch) |
| Thumbnail | 16:9 canvas snapshot (media collage or cover) |
| Project name | Board name under card |
| Last modified | Last edited |
| New Project | New board (+ save-first if dirty) |
| Project Manager home | Boards picker page |
| Load project | Open board → canvas |

### Why full-width grid
Current picker `max-w-xl` (~36rem) wastes horizontal space and fights “everything is a card.” DaVinci (and Figma file browser, Premiere project panel) use **responsive multi-column grids** so the library feels like a media tool, not a settings form.

---

## 3. Language map (human)

| Old | New |
|-----|-----|
| Archive | **Save board** (shelve for later; still openable under Saved) |
| Archived | **Saved boards** |
| Restore | **Open saved** / **Move to recent** |
| Studio (nav) | **Boards** |
| Continue | Keep as **Continue** or **Open last board** |

**Save** here means *preserve this batch in the library*, not “commit schedule.”  
Schedule remains a separate action on the canvas.

### New board confirm (when current board has content)
```
Save this board first?

You’re starting a new board. Save “Week of Jul 7” so you can open it later?

[ Save & start new ]  [ Start without saving ]  [ Cancel ]
```

- **Save & start new** → mark current as saved (was archive) + create empty + enter  
- **Start without saving** → create empty (current remains in Recent if still active; or leave unsaved edits risk — prefer still auto-saving snapshot, just not “Saved” shelf)  
- **Cancel** → stay  

If current board is empty: skip dialog, create immediately.

---

## 4. Board card anatomy (picker)

```
┌─────────────────────────────┐
│                             │
│     16:9 snapshot           │  ← collage of up to 4 reel thumbs / event cover
│                             │
└─────────────────────────────┘
  Board name
  Created · Jul 7, 2026
  Last edited · 2h ago
  4 reels · 2 scheduled · 1 live
  ▸ Events on this board (2)     ← collapsible
      · Sunday Service
      · Youth Night
```

### Snapshot generation (v1)
- Prefer first reel `previewUrl` / demo preview as hero fill  
- Collage 2×2 if 2–4 media cards  
- Empty board: paper + subtle grid + “Empty board”  
- Optional later: true canvas screenshot  

### Width
- Page: full main width, padding `px-6 md:px-8`  
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5`  
- Card: aspect-video preview + body padding (not reel 9:16 tall)

---

## 5. Page chrome

```
Boards
Pick up a batch or start fresh.

[ New board ]

[ Continue last — large hero card optional ]

Recent
[ card ] [ card ] [ card ] …

Saved boards (collapsible)
[ card ] …
```

Primary CTA: **New board** (top right or under title).  
Card click: open.  
Overflow menu on card: Rename · Save board · Delete.

---

## 6. Future: “Boards that use this file”

From card detail (later):
```tsx
<BoardPickerGrid
  boards={boardsContainingDraftId(fileId)}
  title="Boards that include this reel"
/>
```
Same `StudioBoardCard` component — filter only. Design for `filterBoardIds` / `filterContainingDraftId` prop now.

---

## 7. Implementation notes

- Rename `archived` → keep storage key `archived` internally OR migrate to `saved: true` with alias for compat (`archived` as synonym). Prefer **`saved` flag** with migration `archived → saved`.  
- Nav: Sidebar label **Boards**, keep `to: "/studio"`.  
- Extract `StudioBoardCard` + `StudioBoardGrid` for reuse.  
- Snapshot helper in `studio-boards.ts`: `boardSnapshotPreview(snapshot)`.

---

## 8. Success criteria

- [ ] Nav says Boards  
- [ ] Picker is full-width multi-column 16:9 cards  
- [ ] Title + created/edited under thumb  
- [ ] Collapsible events list when board has events  
- [ ] “Save board” not Archive; Saved section  
- [ ] New board → save-first dialog when current has content  
- [ ] Component ready for filtered “boards for this file” later  
