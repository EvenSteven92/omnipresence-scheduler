import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  StudioCanvas,
  type CanvasMode,
  type MarqueeWorld,
} from "@/components/studio/StudioCanvas";
import { StudioCard } from "@/components/studio/StudioCard";
import type { StudioTool } from "@/components/studio/StudioCardToolbar";
import { StudioEventCard } from "@/components/studio/StudioEventCard";
import { StudioScheduleShelf } from "@/components/studio/StudioScheduleShelf";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import {
  applyMeasuredDimensions,
  applyProposedTimes,
  defaultDraftFromFile,
  suggestTimesForDraft,
  type DraftPost,
} from "@/lib/composer-draft";
import {
  readComposerShelf,
  removeFromReady,
  revokeDraftMediaUrls,
  stageDraftsAsReady,
  writeComposerShelf,
} from "@/lib/draft-storage";
import { measureMediaFile } from "@/lib/media-aspect";
import { pendingSlotsFromQueue } from "@/lib/schedule-engine";
import { generateCaptionWithHashtags, generateTranscript } from "@/lib/studio-ai";
import {
  cardBounds,
  cascadePosition,
  ensureCanvasPositions,
  hasScriptSource,
  isCaptionReady,
  normalizeRect,
  rectsIntersect,
  type Viewport,
} from "@/lib/studio-layout";
import {
  readEventLayout,
  setEventPosition,
  writeEventLayout,
  type EventLayoutMap,
} from "@/lib/studio-event-layout";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import type { ContentEvent } from "@/lib/workspaces/types";
import { applyCadencePreset } from "@/lib/schedule-engine";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Primary whiteboard — prepare reels, string to events, schedule from the shelf.",
      },
    ],
  }),
  component: StudioPage,
});

const DRAG_THRESHOLD = 3;

function StudioPage() {
  const { workspace, workspaceId, addScheduledPosts } = useWorkspace();
  const { customEvents, addEvent } = useCustomEvents(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [eventLayout, setEventLayout] = useState<EventLayoutMap>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState<StudioTool | null>(null);
  const [timesBusy, setTimesBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mode, setMode] = useState<CanvasMode>("select");
  const [marquee, setMarquee] = useState<MarqueeWorld | null>(null);
  const [liveDrag, setLiveDrag] = useState<{
    ids: string[];
    dx: number;
    dy: number;
  } | null>(null);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [shelfWidth, setShelfWidth] = useState(0);
  const [scheduleTargetIds, setScheduleTargetIds] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<Viewport>({ panX: 0, panY: 0, zoom: 1 });

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    const shelf = readComposerShelf(workspaceId);
    const merged = ensureCanvasPositions([...shelf.drafting, ...shelf.ready]);
    setDrafts(merged);
    setEventLayout(readEventLayout(workspaceId));
    setSelectedIds(new Set());
    setFocusId(null);
    setSelectedEventId(null);
  }, [workspaceId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ready = drafts.filter(
      (d) => d.caption.trim() && (d.previewUrl || d.dropboxUrl || d.filename),
    );
    const drafting = drafts.filter((d) => !ready.some((r) => r.id === d.id));
    const shelf = readComposerShelf(workspaceId);
    writeComposerShelf(workspaceId, drafting, ready, shelf.savedDrafts);
  }, [workspaceId, drafts]);

  // Seed event positions for events missing layout
  useEffect(() => {
    let map = { ...eventLayout };
    let changed = false;
    let i = 0;
    for (const ev of events) {
      if (!map[ev.id]) {
        map[ev.id] = { x: 80 + (i % 3) * 300, y: 520 + Math.floor(i / 3) * 160 };
        changed = true;
        i += 1;
      }
    }
    if (changed) {
      writeEventLayout(workspaceId, map);
      setEventLayout(map);
    }
  }, [events, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDraft = useCallback((id: string, updater: (d: DraftPost) => DraftPost) => {
    setDrafts((cur) => cur.map((d) => (d.id === id ? updater(d) : d)));
  }, []);

  const captionReadySelection = useMemo(
    () => drafts.filter((d) => selectedIds.has(d.id) && isCaptionReady(d)),
    [drafts, selectedIds],
  );

  const scheduleTargets = useMemo(
    () => drafts.filter((d) => scheduleTargetIds.includes(d.id)),
    [drafts, scheduleTargetIds],
  );

  function openScheduleShelf(ids?: string[]) {
    const raw =
      ids ??
      (selectedIds.size > 0
        ? [...selectedIds]
        : focusId
          ? [focusId]
          : []);
    const ready = drafts.filter((d) => raw.includes(d.id) && isCaptionReady(d));
    if (ready.length === 0) {
      showToast("Select reels with caption + hashtags first");
      return;
    }
    setScheduleTargetIds(ready.map((d) => d.id));
    setFocusId(ready[0]!.id);
    setShelfOpen(true);
  }

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      setDrafts((cur) => {
        let next = [...cur];
        const created: DraftPost[] = arr.map((f) => {
          const base = defaultDraftFromFile(f, workspace.platforms);
          const pos = cascadePosition(next);
          const card: DraftPost = {
            ...base,
            canvasX: pos.x,
            canvasY: pos.y,
            studioOpen: {},
          };
          next = [...next, card];
          return card;
        });
        const last = created[created.length - 1];
        if (last) {
          setSelectedIds(new Set([last.id]));
          setFocusId(last.id);
          setSelectedEventId(null);
        }
        void Promise.all(
          arr.map(async (file, i) => {
            const dims = await measureMediaFile(file);
            if (!dims) return;
            const id = created[i]?.id;
            if (!id) return;
            setDrafts((c) =>
              c.map((d) =>
                d.id === id ? applyMeasuredDimensions(d, dims.width, dims.height) : d,
              ),
            );
          }),
        );
        return next;
      });
      showToast(`Added ${arr.length} reel${arr.length === 1 ? "" : "s"}`);
    },
    [workspace.platforms, showToast],
  );

  function removeDraft(id: string) {
    const victim = drafts.find((d) => d.id === id);
    if (victim) revokeDraftMediaUrls([victim]);
    setDrafts((cur) => cur.filter((d) => d.id !== id));
    removeFromReady(workspaceId, [id]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setScheduleTargetIds((ids) => ids.filter((x) => x !== id));
    setFocusId((fid) => (fid === id ? null : fid));
    showToast("Card removed");
  }

  async function runTranscript(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    setBusy("transcript");
    try {
      const text = await generateTranscript(draft);
      updateDraft(id, (d) => ({
        ...d,
        transcript: text,
        studioOpen: { ...d.studioOpen, transcript: true },
      }));
      showToast("Transcript draft ready");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Transcript failed");
    } finally {
      setBusy(null);
    }
  }

  async function runCaption(id: string) {
    const draft = drafts.find((d) => d.id === id);
    if (!draft) return;
    if (!hasScriptSource(draft)) {
      showToast("Add a transcript or call to action first");
      return;
    }
    setBusy("caption");
    try {
      const { draft: next } = await generateCaptionWithHashtags(draft, {
        scheduledPosts: workspace.scheduledPosts,
        queue: drafts,
        voice: workspace.voice,
        events,
        postingTimes: workspace.postingTimes,
      });
      updateDraft(id, (d) => ({
        ...d,
        caption: next.caption,
        hashtags: next.hashtags,
        studioOpen: { ...d.studioOpen, caption: true, title: true },
      }));
      showToast("Caption generated from transcript & CTA");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Caption failed");
    } finally {
      setBusy(null);
    }
  }

  function applyBestTimesToTargets() {
    const targets = scheduleTargets.length > 0 ? scheduleTargets : captionReadySelection;
    if (targets.length === 0) return;
    setTimesBusy(true);
    try {
      if (targets.length === 1) {
        const draft = targets[0]!;
        const assigned = pendingSlotsFromQueue(
          drafts.filter((d) => d.id !== draft.id),
        );
        const times = suggestTimesForDraft(
          draft,
          workspace.scheduledPosts,
          assigned,
          workspace.postingTimes,
        );
        updateDraft(draft.id, (d) => applyProposedTimes(d, times));
      } else {
        const { byFile } = applyCadencePreset(
          targets,
          "peak",
          workspace.scheduledPosts,
          workspace.postingTimes,
        );
        setDrafts((cur) =>
          cur.map((d) => {
            const times = byFile[d.id];
            return times ? applyProposedTimes(d, times) : d;
          }),
        );
      }
      showToast("Peak times applied");
    } finally {
      setTimesBusy(false);
    }
  }

  async function commitScheduleTargets() {
    const targets = scheduleTargets;
    const posts = targets
      .map((d) => draftToScheduledPost(d))
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (posts.length === 0) {
      showToast("Set platforms and times for each reel");
      return;
    }
    stageDraftsAsReady(
      workspaceId,
      posts.map((p) => p.id),
    );
    await addScheduledPosts(posts);
    const ids = new Set(posts.map((p) => p.id));
    removeFromReady(workspaceId, [...ids]);
    setDrafts((cur) => cur.filter((d) => !ids.has(d.id)));
    setScheduleTargetIds([]);
    setShelfOpen(false);
    setSelectedIds(new Set());
    showToast(
      posts.length === 1
        ? "Scheduled — see Queue / Calendar"
        : `Scheduled ${posts.length} reels`,
    );
  }

  function handleTool(id: string, tool: StudioTool) {
    if (tool === "remove") {
      removeDraft(id);
      return;
    }
    if (tool === "transcript") {
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, transcript: true },
      }));
      if (!drafts.find((d) => d.id === id)?.transcript?.trim()) {
        void runTranscript(id);
      }
      return;
    }
    if (tool === "cta") {
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, cta: true },
      }));
      return;
    }
    if (tool === "caption") {
      updateDraft(id, (d) => ({
        ...d,
        studioOpen: { ...d.studioOpen, caption: true, title: true },
      }));
      void runCaption(id);
      return;
    }
    if (tool === "schedule") {
      openScheduleShelf([id]);
    }
  }

  function selectCard(id: string) {
    setSelectedIds(new Set([id]));
    setFocusId(id);
    setSelectedEventId(null);
  }

  function selectEvent(id: string) {
    setSelectedEventId(id);
    setSelectedIds(new Set());
    setFocusId(null);
  }

  function onReelDragStart(id: string, e: React.PointerEvent) {
    if (mode !== "select") return;
    e.preventDefault();
    e.stopPropagation();

    let ids = selectedIds.has(id) ? [...selectedIds] : [id];
    if (!selectedIds.has(id)) {
      setSelectedIds(new Set([id]));
      setFocusId(id);
      setSelectedEventId(null);
      ids = [id];
    }

    const origins = new Map<string, { x: number; y: number }>();
    for (const d of drafts) {
      if (ids.includes(d.id)) {
        origins.set(d.id, { x: d.canvasX ?? 48, y: d.canvasY ?? 48 });
      }
    }

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let moved = false;
    let lastDx = 0;
    let lastDy = 0;
    const handle = e.currentTarget as HTMLElement;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    function onMove(ev: PointerEvent) {
      const z = viewportRef.current.zoom || 1;
      const dx = (ev.clientX - startClientX) / z;
      const dy = (ev.clientY - startClientY) / z;
      if (
        !moved &&
        Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY) < DRAG_THRESHOLD
      ) {
        return;
      }
      moved = true;
      lastDx = dx;
      lastDy = dy;
      setLiveDrag({ ids, dx, dy });
    }

    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try {
        handle.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      if (moved) {
        setDrafts((cur) =>
          cur.map((d) => {
            if (!ids.includes(d.id)) return d;
            const o = origins.get(d.id);
            if (!o) return d;
            return { ...d, canvasX: o.x + lastDx, canvasY: o.y + lastDy };
          }),
        );
      }
      setLiveDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onEventDragStart(eventId: string, e: React.PointerEvent) {
    if (mode !== "select") return;
    e.preventDefault();
    e.stopPropagation();
    const pos = eventLayout[eventId] ?? { x: 80, y: 520 };
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let lastDx = 0;
    let lastDy = 0;
    let moved = false;
    const handle = e.currentTarget as HTMLElement;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const ids = [`event:${eventId}`];

    function onMove(ev: PointerEvent) {
      const z = viewportRef.current.zoom || 1;
      const dx = (ev.clientX - startClientX) / z;
      const dy = (ev.clientY - startClientY) / z;
      if (
        !moved &&
        Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY) < DRAG_THRESHOLD
      ) {
        return;
      }
      moved = true;
      lastDx = dx;
      lastDy = dy;
      setLiveDrag({ ids, dx, dy });
    }

    function onUp(ev: PointerEvent) {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try {
        handle.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      if (moved) {
        const next = setEventPosition(
          workspaceId,
          eventId,
          pos.x + lastDx,
          pos.y + lastDy,
        );
        setEventLayout(next);
      }
      setLiveDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function onMarqueeStart(world: { x: number; y: number }) {
    setMarquee({ start: world, current: world });
  }
  function onMarqueeMove(world: { x: number; y: number }) {
    setMarquee((m) => (m ? { ...m, current: world } : null));
  }
  function onMarqueeEnd() {
    setMarquee((m) => {
      if (!m) return null;
      const box = normalizeRect(m.start, m.current);
      if (box.w < 4 && box.h < 4) {
        setSelectedIds(new Set());
        setFocusId(null);
        setSelectedEventId(null);
        return null;
      }
      const hit = new Set<string>();
      for (const d of drafts) {
        if (rectsIntersect(box, cardBounds(d))) hit.add(d.id);
      }
      setSelectedIds(hit);
      setFocusId(hit.size > 0 ? [...hit][0]! : null);
      setSelectedEventId(null);
      return null;
    });
  }

  async function createEventOnBoard() {
    const title = window.prompt("Event title", "Sunday Service");
    if (!title?.trim()) return;
    const id = `evt-${Math.random().toString(36).slice(2, 10)}`;
    const event: ContentEvent = {
      id,
      title: title.trim(),
      date: new Date().toISOString(),
      kind: "sunday_sermon",
    };
    await addEvent(event);
    const n = Object.keys(eventLayout).length;
    const pos = { x: 100 + (n % 3) * 40, y: 100 + (n % 4) * 40 };
    const map = setEventPosition(workspaceId, id, pos.x, pos.y);
    setEventLayout(map);
    setSelectedEventId(id);
    setSelectedIds(new Set());
    showToast("Event card added — attach reels with stringing");
  }

  function assignEventToSelection(eventId: string) {
    const ids =
      selectedIds.size > 0
        ? [...selectedIds]
        : scheduleTargetIds.length > 0
          ? scheduleTargetIds
          : [];
    if (ids.length === 0) {
      showToast("Select reels first, then attach");
      return;
    }
    setDrafts((cur) =>
      cur.map((d) => (ids.includes(d.id) ? { ...d, eventId } : d)),
    );
    const ev = events.find((e) => e.id === eventId);
    showToast(
      `Linked ${ids.length} reel${ids.length === 1 ? "" : "s"} to ${ev?.title ?? "event"}`,
    );
  }

  const primaryId =
    focusId && selectedIds.has(focusId)
      ? focusId
      : selectedIds.size === 1
        ? [...selectedIds][0]!
        : null;

  const eventById = useMemo(() => {
    const m = new Map(events.map((e) => [e.id, e]));
    return m;
  }, [events]);

  const emptyOverlay =
    drafts.length === 0 && events.length === 0 ? (
      <div className="w-[min(90vw,22rem)] text-center">
        <p className="font-serif-accent text-2xl text-foreground md:text-3xl">
          Drop reels onto the board
        </p>
        <p className="mt-3 text-body-sm text-muted-foreground">
          Prepare cards, string to events, then open Schedule from the toolbar.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn-action btn-action-primary !text-white"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Add reels
          </button>
          <button
            type="button"
            className="btn-action btn-action-secondary"
            onClick={() => void createEventOnBoard()}
          >
            New event
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-testid="studio-page">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Studio
          </p>
          <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
            Board
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Everything is a card — reels, events, schedule from the shelf
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-action btn-action-primary !text-white"
            data-testid="studio-add-reels"
          >
            <Plus className="h-4 w-4" />
            Add reels
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </header>

      <StudioCanvas
        drafts={drafts}
        mode={mode}
        onModeChange={setMode}
        onBackgroundClick={() => {
          setSelectedIds(new Set());
          setFocusId(null);
          setSelectedEventId(null);
        }}
        onDropFiles={addFiles}
        onViewportChange={(vp) => {
          viewportRef.current = vp;
        }}
        marquee={marquee}
        onMarqueeStart={onMarqueeStart}
        onMarqueeMove={onMarqueeMove}
        onMarqueeEnd={onMarqueeEnd}
        emptyOverlay={emptyOverlay}
        shelfWidth={shelfOpen ? shelfWidth : 0}
        scheduleDisabled={captionReadySelection.length === 0 && !shelfOpen}
        onOpenSchedule={() => openScheduleShelf()}
        onNewEvent={() => void createEventOnBoard()}
      >
        {/* Simple string lines: event → linked reels */}
        <svg
          className="pointer-events-none absolute inset-0 h-[4000px] w-[4000px] overflow-visible"
          aria-hidden
        >
          {drafts.map((d) => {
            if (!d.eventId) return null;
            const ep = eventLayout[d.eventId];
            if (!ep) return null;
            const x1 = ep.x + 140;
            const y1 = ep.y + 60;
            const x2 = (d.canvasX ?? 48) + 160;
            const y2 = (d.canvasY ?? 48) + 40;
            return (
              <line
                key={`str-${d.id}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                className="text-foreground/20"
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            );
          })}
        </svg>

        {events.map((ev) => {
          const pos = eventLayout[ev.id] ?? { x: 80, y: 520 };
          const linked = drafts.filter((d) => d.eventId === ev.id).length;
          const live =
            liveDrag && liveDrag.ids.includes(`event:${ev.id}`)
              ? { x: liveDrag.dx, y: liveDrag.dy }
              : null;
          return (
            <StudioEventCard
              key={ev.id}
              event={ev}
              x={pos.x}
              y={pos.y}
              selected={selectedEventId === ev.id}
              linkedCount={linked}
              canDrag={mode === "select"}
              liveOffset={live}
              onSelect={() => selectEvent(ev.id)}
              onDragStart={(e) => onEventDragStart(ev.id, e)}
              onAssignSelected={
                selectedIds.size > 0
                  ? () => assignEventToSelection(ev.id)
                  : undefined
              }
            />
          );
        })}

        {drafts.map((draft) => {
          const isSel = selectedIds.has(draft.id);
          const live =
            liveDrag && liveDrag.ids.includes(draft.id)
              ? { x: liveDrag.dx, y: liveDrag.dy }
              : null;
          const evTitle = draft.eventId
            ? eventById.get(draft.eventId)?.title
            : undefined;
          return (
            <StudioCard
              key={draft.id}
              draft={draft}
              selected={primaryId === draft.id && selectedIds.size === 1}
              multiSelected={isSel}
              busy={primaryId === draft.id ? busy : null}
              canDrag={mode === "select"}
              liveOffset={live}
              eventTitle={evTitle}
              onSelect={() => selectCard(draft.id)}
              onChange={(updater) => updateDraft(draft.id, updater)}
              onTool={(tool) => handleTool(draft.id, tool)}
              onGenerateTranscript={() => void runTranscript(draft.id)}
              onGenerateCaption={() => void runCaption(draft.id)}
              onDragStart={(e) => onReelDragStart(draft.id, e)}
            />
          );
        })}
      </StudioCanvas>

      {selectedIds.size > 1 ? (
        <div
          data-testid="studio-batch-bar"
          className="absolute left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-line bg-card px-4 py-2 shadow-[var(--shadow-card)]"
          style={{
            transform:
              shelfOpen && shelfWidth > 0
                ? `translateX(calc(-50% - ${shelfWidth / 2}px))`
                : undefined,
          }}
        >
          <span className="text-sm font-semibold text-foreground">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            className="btn-action btn-action-primary !text-white min-h-8 text-caption"
            disabled={captionReadySelection.length === 0}
            onClick={() => openScheduleShelf()}
          >
            Schedule
            {captionReadySelection.length > 0
              ? ` (${captionReadySelection.length})`
              : ""}
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => {
              setSelectedIds(new Set());
              setFocusId(null);
            }}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <StudioScheduleShelf
        open={shelfOpen}
        drafts={scheduleTargets}
        focusId={focusId}
        committedPosts={workspace.scheduledPosts}
        events={events}
        workspacePlatforms={workspace.platforms}
        busy={timesBusy}
        onClose={() => setShelfOpen(false)}
        onFocus={(id) => setFocusId(id)}
        onChangeDraft={updateDraft}
        onBestTimes={applyBestTimesToTargets}
        onCommit={() => void commitScheduleTargets()}
        onWidthChange={setShelfWidth}
        onAssignEvent={assignEventToSelection}
      />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-foreground px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] md:bottom-20"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
