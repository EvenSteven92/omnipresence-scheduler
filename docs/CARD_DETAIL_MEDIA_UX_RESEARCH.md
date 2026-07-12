# Card detail UI/UX research — live vs queued · media hosts · per-platform copy

**Date:** 2026-07-11  
**Product:** TORCC OmniPresence  
**Scope:** Single-card detail for **Library / Calendar / Queue** only (not Studio board batch flow)

---

## 1. OmniPresence product map (current flow)

```
Boards (Studio)     → batch whiteboard · multi-select · schedule shelf
Queue               → up-next stream · click → card detail
Library             → archive of scheduled + live · click → card detail
Calendar            → day posts · click → card detail
Events              → album · click → card detail
Analytics           → performers · click → card detail
```

| Surface | Job | Card detail role |
|---------|-----|------------------|
| **Boards** | Prepare batch, string events, schedule many | Stay on canvas — **do not** deep-link board cards here as primary edit |
| **Queue / Calendar** | What’s going out / when | Open detail to inspect or refine **before** go-live |
| **Library** | History + reuse | Open detail to view, soft-edit live copy, or **duplicate & reuse** |

**Friction today:** Detail often exposes edit fields immediately (or mixes live/scheduled rules). Users don’t get a clear **view → decide to edit** moment, and live AI-all competes with “history of what went out.”

---

## 2. Media host patterns (Drive, Dropbox, iCloud, Vimeo, Playbook-like DAM)

Common patterns across file/video hosts:

| Pattern | Where | Relevance |
|---------|-------|-----------|
| **Hero media + side meta** | Vimeo video page, Drive preview | Keep large preview left/center; facts & actions right |
| **View by default** | All hosts open preview first | Fields not “hot” until Edit |
| **Explicit Edit / Manage** | Drive “Open with”, Vimeo “Edit”, Dropbox details | Affords intentional change; Save/Cancel on exit |
| **Metadata panels** | Title, description, tags, created, size | Our Title / Caption / Source file / Performance |
| **Version / history light** | Drive versions (heavy); Vimeo review | We can show status badge + “Last saved” later |
| **Related collections** | Drive folders, Dropbox shared links | Our **Appears on boards** + **Part of event** |
| **Share destinations** | Vimeo privacy / publish | Our **Publishes** list (platforms × times) |

**Pull for us:**
1. **View mode first** — media + read-only copy + rail.  
2. **Edit mode** — primary **Edit** control; chrome changes (banner, Save / Cancel).  
3. **Don’t put every control on at once** — progressive disclosure (expand platform rows).  
4. **Media is sacred after live** — no replace file in v1 (hosts separate “replace video”).  

Playbook / DAM tools emphasize **asset record** (what is this file?) vs **distribution record** (where did it go?). Our page must show both: source file + publishes.

---

## 3. Social networks — post-publish vs pre-publish capabilities

### After live (public post)

| Platform | Commonly editable | Usually not |
|----------|-------------------|-------------|
| YouTube / Rumble | Title, description, tags | Swap primary video casually |
| Facebook | Post text | Original media swap |
| Instagram feed | Caption (incl. hashtags) | Media; Reels policies vary |
| X | Short edit window (Premium) | Long-term free edit |
| TikTok | Caption sometimes | Media |
| Stories | Rarely | Ephemeral |

**OmniPresence v1 stance:** Persist copy edits in **our** system; label that re-sync to networks may be needed. Do **not** imply times can change after live.

### Before publish (scheduled / draft)

Industry (Buffer, Later, Hootsuite, Opus scheduler):

- Change caption, hashtags, title  
- Reschedule datetime per destination  
- Add/remove destinations  
- Optional per-platform caption variants before send  

**Our scheduled mode should unlock:** shared copy + times + platforms + per-platform overrides + AI helpers.

---

## 4. Per-platform captions (OpusPro-style) — effective?

**Opus / clip tools:** AI generates descriptions/hashtags when scheduling to multiple networks; users can tweak per platform before calendar commit.

| Pros | Cons |
|------|------|
| Matches platform tone (YT title vs IG hook) | Cognitive load if forced every time |
| Reduces failed posts (char limits later) | Empty overrides clutter UI |
| Fits ministry multi-destination cards | Board batch flow shouldn’t force it |

**Recommendation for OmniPresence:**
- **Yes for single-card detail & schedule shelf** — progressive: defaults first; expand platform for overrides.  
- **Not forced on Studio board prepare** — board stays fast; per-platform refinement lives on **card detail** after commit or before shelf for reuse.  
- Design: accordion under **Publishes**, TORCC tokens, not a third-party clone of Opus.

---

## 5. Logical interaction model (recommended)

### States

```
VIEW (default)
  → Edit          (scheduled | live with different permissions)
  → Duplicate & reuse  (always; creates new draft session)
  → Delete        (if not live / policy)
  → Event preview / boards

EDIT mode
  → Save changes | Cancel
  → dirty indicator
```

### Permission matrix

| Capability | Scheduled / draft | Live |
|------------|-------------------|------|
| Enter Edit mode | ✅ | ✅ (copy only) |
| Shared title / caption / hashtags | ✅ | ✅ (post-publish allowed) |
| Transcript / CTA (internal) | ✅ | ✅ in Edit |
| AI all / AI caption (shared) | ✅ in Edit | ❌ (avoid rewriting “what went out” casually) |
| Per-platform overrides + AI | ✅ in Edit | ✅ in Edit under Publishes |
| Reschedule times / add platforms | ✅ in Edit | ❌ |
| Replace media | ❌ v1 | ❌ |
| Duplicate & reuse | ✅ | ✅ |

### Affordance of “edits changed”
- **Edit** primary when not editing  
- Banner: *Editing scheduled post* / *Editing live copy — times locked*  
- **Save changes** (primary) + **Cancel** (secondary) only in Edit mode  
- Optional subtle “Unsaved changes” when dirty  
- After save: toast + return to View (or stay in Edit — prefer return to View)

---

## 6. Layout (keep structure; clarify modes)

Keep screenshot layout: hero · copy column · performance · publishes · event · boards.

| Region | View | Edit (scheduled) | Edit (live) |
|--------|------|------------------|-------------|
| Hero | Media only | Media only | Media only |
| Title / caption / transcript / CTA | Read-only text | Fields + AI | Fields only (no AI all) |
| Publishes | Rows collapsed | Expand: times + overrides + AI | Expand: overrides + AI; times locked |
| Header | Edit · Duplicate · Delete | Save · Cancel · Duplicate | Save · Cancel · Duplicate |

---

## 7. Success criteria

- [ ] Default view mode — no free-fire editing  
- [ ] Edit mode with Save / Cancel  
- [ ] Scheduled ≠ Live option set  
- [ ] Live: post-publish copy + platform overrides; no times  
- [ ] Per-platform optional, design-system consistent  
- [ ] Boards + event panels stay (preview for event)  
- [ ] No Studio board hijack  

## 8. Out of scope (no feature creep)

- Push edits to Meta/YT APIs  
- Replace media  
- Full DAM versioning  
- Forcing per-platform copy on board AI prepare  
