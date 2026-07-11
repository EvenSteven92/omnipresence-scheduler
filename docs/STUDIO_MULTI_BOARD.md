# Studio multi-board system — research & design

**Date:** 2026-07-11  
**Product:** TORCC OmniPresence Studio  
**Problem:** One whiteboard per workspace cannot support weekly/daily batch work. Users need many boards over time, each frozen as a batch history — including reels after they are scheduled or go live.

---

## 1. Current state (audit)

| Concern | Today | Gap |
|---------|-------|-----|
| Draft reels | `localStorage` `omni.drafts.drafting/ready.{workspaceId}` | Single flat shelf per workspace |
| Board events | `omni.studio.boardEvents.{workspaceId}` | One working set |
| Event positions | `omni.studio.eventLayout.{workspaceId}` | One layout map |
| Entry | Always load that one set | No “new week” / no history |
| **After Schedule** | Cards **removed** from board (`setDrafts` filter) | Batch history destroyed; cannot revisit “what we posted this week” |
| Lifecycle on board | Drafts always grey “idle” | No yellow/green border when scheduled/live |

Scheduling still correctly writes to workspace `scheduledPosts` (Queue/Calendar). The bug is treating the board as a temporary staging tray instead of a **batch document**.

---

## 2. Industry patterns

| Product | Pattern | Fit for us |
|---------|---------|------------|
| **Figma** | File browser → open file; auto-save; rename; recent | Boards as named files |
| **Miro** | Board list + create; last opened | Strong |
| **Cursor / Claude** | Session list: continue or new | User mental model |
| **Notion databases** | Rows stay after status change; status property | **Cards stay; status updates** |
| **Linear cycles** | Completed issues remain in cycle view | Archive batch without deleting |
| **Buffer** | Queue history / sent | Post-send still findable |

### Design principles
1. **Board = batch document** — name, timestamps, full canvas snapshot.  
2. **Cards stay after schedule** — commit adds to Queue; board marks them scheduled (and later live), does not unmount.  
3. **Traffic light + solid border** on every reel reflects lifecycle (idle / scheduled / live / failed).  
4. **Workspace schedule is shared truth** for status; board holds card identity + layout + prepare content.  
5. **Archive** shelves finished boards without deleting the batch record.  
6. **New board** never silently wipes work; auto-save before switch/create.  
7. **Migration** promotes legacy single board once.

---

## 3. Keep cards after schedule (critical UX)

### Today (wrong for batch recall)
```
Commit → addScheduledPosts → remove drafts from board
```

### Target
```
Commit → addScheduledPosts (status: scheduled)
      → mark board cards as linked to that post id (same id)
      → KEEP cards on canvas
      → border + traffic light → yellow (scheduled)
      → when post.status becomes published → green (live)
```

### Status resolution on board
```ts
// Prefer live workspace scheduledPosts by card id
function boardCardStatus(draftId, scheduledPosts): CardLifecycleStatus {
  const post = scheduledPosts.find(p => p.id === draftId);
  if (!post) return "IDLE";
  return cardStatusFromPost(post); // LIVE | SCHEDULED | FAILED | IDLE
}
```

Optional flag on draft for clarity:
```ts
// DraftPost
boardLifecycle?: "canvas" | "committed"; // committed = already pushed to schedule
```
Not strictly required if id match is stable (`draftToScheduledPost` uses `draft.id`).

### Visual: solid border traffic system
| Status | Border | Dot |
|--------|--------|-----|
| Idle (not scheduled) | default `border-line` / selection brand | grey |
| Scheduled | **solid yellow** (`border-warning`, 2px) | yellow |
| Live | **solid green** (`border-success`, 2px) | green |
| Failed | **solid red** (`border-destructive`, 2px) | red |

Selection ring may sit outside the status border (offset) so both remain readable.

### Editing committed cards
v1: allow view + soft lock of schedule tools (“Already scheduled — open Queue to reschedule”) OR still allow caption edits that don’t unschedule. Prefer: **keep prepare fields editable**, Schedule tool shows “Scheduled” / opens shelf in view mode. Do not remove from board on remove-from-queue elsewhere unless user deletes card.

### Explicit remove
User can still **Remove** a card from the board (does not delete scheduled post from workspace).

---

## 4. Multi-board data model

```ts
type StudioBoardId = string; // brd_…

interface StudioBoardMeta {
  id: StudioBoardId;
  name: string;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  summary?: {
    reelCount: number;
    eventCount: number;
    scheduledCount: number;
    liveCount: number;
  };
}

interface StudioBoardSnapshot {
  drafts: DraftPost[];          // includes committed cards still on canvas
  boardEventIds: string[];
  eventLayout: EventLayoutMap;
  hiddenIds?: string[];
}
```

**Storage keys**
- `omni.studio.boards.index.{workspaceId}`
- `omni.studio.boards.active.{workspaceId}`
- `omni.studio.boards.data.{workspaceId}.{boardId}`

**Legacy migration:** one board from current drafting/ready + boardEvents + eventLayout.

---

## 5. Archive feature

| Action | Behavior |
|--------|----------|
| **Archive board** | `archived: true`; leave list of “Active boards”; appear under “Archived” section |
| **Restore** | `archived: false`; back to main list |
| **Delete** | Confirm; remove meta + snapshot (irreversible client-side) |
| **New board while current full** | Auto-save current; create empty; optionally offer “Archive current” |

Archived boards retain **all cards** including scheduled/live so user can jump back to “that Sunday batch.”

Picker sections:
1. Resume / Active  
2. Recent (non-archived)  
3. Archived (collapsed by default)

---

## 6. UX flows

### Landing
- New board  
- Resume last  
- List: name · N reels · scheduled/live counts · relative time  
- Archive / Restore / Delete  

### In-board header
- Board name (rename)  
- **Boards** → picker  
- **New board**  
- **Archive** (current)

### After scheduling a batch
- Cards remain, yellow borders  
- Toast: “Scheduled N reels — still on this board”  
- User later opens same board → still sees batch; greens update if posts went live  

---

## 7. Implementation modules

| Module | Role |
|--------|------|
| `lib/studio-boards.ts` | CRUD, migrate, active, archive |
| `StudioBoardPicker.tsx` | Session chooser + archive section |
| `studio.tsx` | Picker vs canvas; keep-on-commit; status from scheduledPosts |
| `StudioCard.tsx` | Status border + TrafficLight from lifecycle |
| `card-display` / tokens | Reuse traffic colors for borders |

---

## 8. Success criteria

- [ ] Multiple boards; new empty board; resume restores snapshot  
- [ ] Schedule does **not** remove cards  
- [ ] Yellow/green/red solid borders + traffic light by real post status  
- [ ] Archive / restore / delete boards  
- [ ] Open old board → see full batch that was scheduled  
- [ ] Legacy single board migrates once  

---

## 9. Out of scope

- Cloud sync  
- Auto-archive when all live  
- Multi-user collab  
