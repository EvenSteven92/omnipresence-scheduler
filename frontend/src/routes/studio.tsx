import { createFileRoute } from "@tanstack/react-router";
import { Check, FolderOpen, Loader2, Plus, Save, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScheduleEventModal } from "@/components/calendar/ScheduleEventModal";
import {
  StudioCanvas,
  type CanvasMode,
  type MarqueeWorld,
} from "@/components/studio/StudioCanvas";
import { StudioBoardPicker } from "@/components/studio/StudioBoardPicker";
import { StudioSaveBoardDialog } from "@/components/studio/StudioSaveBoardDialog";
import { StudioCard } from "@/components/studio/StudioCard";
import type { StudioTool } from "@/components/studio/StudioCardToolbar";
import { StudioConnectionLayer } from "@/components/studio/StudioConnectionLayer";
import { StudioEventCard } from "@/components/studio/StudioEventCard";
import { StudioGroupMenu } from "@/components/studio/StudioGroupMenu";
import { StudioLayersPanel } from "@/components/studio/StudioLayersPanel";
import { StudioScheduleShelf } from "@/components/studio/StudioScheduleShelf";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import {
  applyMeasuredDimensions,
  applyProposedTimes,
  defaultDraftFromFile,
  suggestTimesForDraft,
  type DraftPost,
} from "@/lib/composer-draft";
import { revokeDraftMediaUrls } from "@/lib/draft-storage";
import { measureMediaFile } from "@/lib/media-aspect";
import { pendingSlotsFromQueue } from "@/lib/schedule-engine";
import {
  generateCallToAction,
  generateCaptionWithHashtags,
  generateTranscript,
  prepareStudioCardWithAi,
} from "@/lib/studio-ai";
import {
  boardHasContent,
  createBoard,
  deleteBoard,
  emptySnapshot,
  getActiveBoardId,
  listBoards,
  migrateLegacyStudioBoard,
  readBoard,
  renameBoard,
  setActiveBoardId,
  writeBoard,
  type StudioBoardId,
  type StudioBoardMeta,
} from "@/lib/studio-boards";
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
import type { EventLayoutMap } from "@/lib/studio-event-layout";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import {
  cardStatusFromPost,
  cardStatusFromPosts,
  type CardLifecycleStatus,
} from "@/lib/card-display";
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
  const { customEvents, addEvent, updateEvent } = useCustomEvents(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [eventLayout, setEventLayout] = useState<EventLayoutMap>({});
  /** Opt-in: only these workspace events appear as board cards. */
  const [boardEventIds, setBoardEventIds] = useState<string[]>([]);
  const [layersOpen, setLayersOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState<StudioTool | null>(null);
  const [timesBusy, setTimesBusy] = useState(false);
  const [batchAiBusy, setBatchAiBusy] = useState(false);
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

  /** Multi-board session state */
  const [boards, setBoards] = useState<StudioBoardMeta[]>([]);
  const [activeBoardId, setActiveBoardIdState] = useState<StudioBoardId | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(true);
  const [boardName, setBoardName] = useState("Board");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingNewName, setPendingNewName] = useState<string | null>(null);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  /** Autosave status for header — Docs/Notion-style affirmation */
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "unsaved"
  >("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const skipSaveRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<Viewport>({ panX: 0, panY: 0, zoom: 1 });
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  const refreshBoardList = useCallback(() => {
    setBoards(listBoards(workspaceId));
  }, [workspaceId]);

  const boardEvents = useMemo(
    () =>
      boardEventIds
        .map((id) => events.find((e) => e.id === id))
        .filter((e): e is ContentEvent => e != null),
    [boardEventIds, events],
  );

  const offBoardEvents = useMemo(() => {
    const on = new Set(boardEventIds);
    return events.filter((e) => !on.has(e.id));
  }, [events, boardEventIds]);

  const postById = useMemo(() => {
    const m = new Map(workspace.scheduledPosts.map((p) => [p.id, p]));
    return m;
  }, [workspace.scheduledPosts]);

  function lifecycleForDraft(id: string): CardLifecycleStatus {
    const post = postById.get(id);
    if (!post) return "IDLE";
    return cardStatusFromPost(post);
  }

  const loadBoard = useCallback(
    (boardId: StudioBoardId) => {
      skipSaveRef.current = true;
      const snap = readBoard(workspaceId, boardId) ?? emptySnapshot();
      const meta = listBoards(workspaceId).find((b) => b.id === boardId);
      setActiveBoardId(workspaceId, boardId);
      setActiveBoardIdState(boardId);
      setBoardName(meta?.name ?? "Board");
      setDrafts(ensureCanvasPositions(snap.drafts));
      setEventLayout(snap.eventLayout ?? {});
      setBoardEventIds(snap.boardEventIds ?? []);
      setHiddenIds(new Set(snap.hiddenIds ?? []));
      setSelectedIds(new Set());
      setFocusId(null);
      setSelectedEventId(null);
      setLayersOpen(false);
      setShelfOpen(false);
      setPickerOpen(false);
      refreshBoardList();
      window.setTimeout(() => {
        skipSaveRef.current = false;
      }, 0);
    },
    [workspaceId, refreshBoardList],
  );

  const saveActiveBoard = useCallback(
    (opts?: { manual?: boolean }) => {
      if (!activeBoardId || skipSaveRef.current) return;
      setSaveStatus("saving");
      const eventTitles = boardEventIds
        .map((id) => events.find((e) => e.id === id)?.title)
        .filter((t): t is string => Boolean(t));
      writeBoard(
        workspaceId,
        activeBoardId,
        {
          drafts,
          boardEventIds,
          eventLayout,
          hiddenIds: [...hiddenIds],
        },
        workspace.scheduledPosts,
        { eventTitles },
      );
      refreshBoardList();
      const now = Date.now();
      setLastSavedAt(now);
      setSaveStatus("saved");
      if (opts?.manual) {
        showToast("Board saved — your work is safe");
      }
      window.setTimeout(() => {
        setSaveStatus((s) => (s === "saved" ? "idle" : s));
      }, 2500);
    },
    [
      activeBoardId,
      workspaceId,
      drafts,
      boardEventIds,
      eventLayout,
      hiddenIds,
      workspace.scheduledPosts,
      events,
      refreshBoardList,
      showToast,
    ],
  );

  // Boards nav → always land on library (picker), never auto-open a canvas
  useEffect(() => {
    migrateLegacyStudioBoard(workspaceId);
    refreshBoardList();
    setActiveBoardIdState(getActiveBoardId(workspaceId));
    setPickerOpen(true);
    setDrafts([]);
    setEventLayout({});
    setBoardEventIds([]);
    setHiddenIds(new Set());
    setSaveStatus("idle");
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save active board snapshot while on canvas
  useEffect(() => {
    if (pickerOpen || !activeBoardId) return;
    saveActiveBoard();
  }, [drafts, boardEventIds, eventLayout, hiddenIds, pickerOpen, activeBoardId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Layout only for events already on the board (never auto-place workspace history)
  useEffect(() => {
    if (boardEventIds.length === 0) return;
    let map = { ...eventLayout };
    let changed = false;
    let i = 0;
    for (const id of boardEventIds) {
      if (!map[id]) {
        map[id] = {
          x: 80 + (i % 3) * 300,
          y: 520 + Math.floor(i / 3) * 160,
        };
        changed = true;
        i += 1;
      }
    }
    if (changed) {
      setEventLayout(map);
    }
  }, [boardEventIds, workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setScheduleTargetIds((ids) => ids.filter((x) => x !== id));
    setFocusId((fid) => (fid === id ? null : fid));
    showToast("Removed from board (scheduled posts keep in Queue)");
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
    await addScheduledPosts(posts);
    // Keep cards on the board — traffic light + border reflect scheduled/live
    setScheduleTargetIds([]);
    setShelfOpen(false);
    setSelectedIds(new Set());
    showToast(
      posts.length === 1
        ? "Scheduled — card stays on board (yellow border)"
        : `Scheduled ${posts.length} reels — kept on this board`,
    );
    // Force persist with latest scheduledPosts after add (next tick)
    window.setTimeout(() => saveActiveBoard(), 0);
  }

  function startNewBoardNow(name: string) {
    const meta = createBoard(workspaceId, {
      name: name.trim() || undefined,
    });
    loadBoard(meta.id);
    showToast(`Started “${meta.name}”`);
  }

  function handleNewBoard(name: string) {
    const hasWork =
      activeBoardId &&
      boardHasContent({
        drafts,
        boardEventIds,
        eventLayout,
      });
    if (hasWork) {
      setPendingNewName(name.trim() || "");
      setSaveDialogOpen(true);
      return;
    }
    if (activeBoardId) saveActiveBoard();
    startNewBoardNow(name);
  }

  function handleOpenPicker() {
    if (activeBoardId) saveActiveBoard();
    refreshBoardList();
    setPickerOpen(true);
  }

  /** Force-flush autosave — does not move the board into another list. */
  function handleSaveCurrent() {
    if (!activeBoardId) return;
    saveActiveBoard({ manual: true });
  }

  const saveStatusLabel = useMemo(() => {
    if (saveStatus === "saving") return "Saving…";
    if (saveStatus === "saved") return "Saved just now";
    if (lastSavedAt) {
      const mins = Math.max(0, Math.round((Date.now() - lastSavedAt) / 60_000));
      if (mins < 1) return "All changes saved";
      if (mins < 60) return `All changes saved · ${mins}m ago`;
      return "All changes saved";
    }
    return "Autosaves as you work";
  }, [saveStatus, lastSavedAt]);

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
    if (tool === "prepare") {
      void (async () => {
        setBusy("prepare");
        try {
          const draft = drafts.find((d) => d.id === id);
          if (!draft) return;
          const prepared = await prepareStudioCardWithAi(draft, {
            scheduledPosts: workspace.scheduledPosts,
            queue: drafts,
            voice: workspace.voice,
            events,
            postingTimes: workspace.postingTimes,
          });
          updateDraft(id, () => prepared);
          showToast("AI prepare complete");
        } catch (e) {
          showToast(e instanceof Error ? e.message : "AI prepare failed");
        } finally {
          setBusy(null);
        }
      })();
      return;
    }
    if (tool === "schedule") {
      openScheduleShelf([id]);
    }
  }

  function selectCard(id: string, additive = false) {
    setSelectedEventId(null);
    if (additive) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setFocusId(id);
      return;
    }
    setSelectedIds(new Set([id]));
    setFocusId(id);
  }

  function selectEvent(id: string) {
    setSelectedEventId(id);
    setSelectedIds(new Set());
    setFocusId(null);
  }

  function toggleHidden(id: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeEventFromBoard(eventId: string) {
    setBoardEventIds((ids) => ids.filter((id) => id !== eventId));
    if (selectedEventId === eventId) setSelectedEventId(null);
    setHiddenIds((prev) => {
      const n = new Set(prev);
      n.delete(`event:${eventId}`);
      return n;
    });
    showToast("Event removed from board (not deleted)");
  }

  async function handleGroupTool(tool: StudioTool) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (tool === "remove") {
      for (const id of ids) removeDraft(id);
      return;
    }
    if (tool === "prepare") {
      await aiPrepareSelected();
      return;
    }
    if (tool === "schedule") {
      openScheduleShelf(ids);
      return;
    }
    if (tool === "transcript") {
      for (const id of ids) {
        updateDraft(id, (d) => ({
          ...d,
          studioOpen: { ...d.studioOpen, transcript: true },
        }));
        const d = draftsRef.current.find((x) => x.id === id);
        if (!d?.transcript?.trim()) await runTranscript(id);
      }
      return;
    }
    if (tool === "cta") {
      for (const id of ids) {
        updateDraft(id, (d) => ({
          ...d,
          studioOpen: { ...d.studioOpen, cta: true },
        }));
      }
      return;
    }
    if (tool === "caption") {
      for (const id of ids) {
        updateDraft(id, (d) => ({
          ...d,
          studioOpen: { ...d.studioOpen, caption: true, title: true },
        }));
        await runCaption(id);
      }
    }
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
        setEventLayout((prev) => ({
          ...prev,
          [eventId]: { x: pos.x + lastDx, y: pos.y + lastDy },
        }));
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

  function openEventModal() {
    setEventModalOpen(true);
  }

  async function placeCreatedEventOnBoard(event: ContentEvent) {
    await addEvent(event);
    setBoardEventIds((ids) => {
      const next = [...new Set([...ids, event.id])];
      const n = next.length - 1;
      const pos = { x: 100 + (n % 3) * 40, y: 100 + (n % 4) * 40 };
      setEventLayout((prev) => ({ ...prev, [event.id]: pos }));
      return next;
    });
    setSelectedEventId(event.id);
    setSelectedIds(new Set());
    setLayersOpen(true);
    setEventModalOpen(false);
    showToast("Event on board — attach reels, or post later anytime");
  }

  /** Place an existing workspace event onto the board (late content). */
  function placeEventOnBoard(eventId: string) {
    if (boardEventIds.includes(eventId)) {
      selectEvent(eventId);
      return;
    }
    setBoardEventIds((ids) => {
      const next = [...new Set([...ids, eventId])];
      if (!eventLayout[eventId]) {
        const n = next.length - 1;
        setEventLayout((prev) => ({
          ...prev,
          [eventId]: {
            x: 100 + (n % 3) * 40,
            y: 100 + (n % 4) * 40,
          },
        }));
      }
      return next;
    });
    selectEvent(eventId);
    showToast("Event placed on board");
  }

  async function assignEventToSelection(eventId: string) {
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
    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      showToast("Event not found");
      return;
    }

    // Link first so UI shows strings immediately
    setDrafts((cur) =>
      cur.map((d) =>
        ids.includes(d.id)
          ? { ...d, eventId, studioOpen: { ...d.studioOpen, cta: true } }
          : d,
      ),
    );
    showToast(
      `Linked ${ids.length} reel${ids.length === 1 ? "" : "s"} to ${ev.title} — generating CTAs…`,
    );

    // AI CTA per reel once stringed to the event
    for (const id of ids) {
      const draft = drafts.find((d) => d.id === id);
      if (!draft) continue;
      try {
        const cta = await generateCallToAction(
          { ...draft, eventId },
          ev,
          workspace.voice,
        );
        updateDraft(id, (d) => ({
          ...d,
          eventId,
          callToAction: cta,
          studioOpen: { ...d.studioOpen, cta: true },
        }));
      } catch {
        updateDraft(id, (d) => ({
          ...d,
          eventId,
          callToAction: d.callToAction || `Join us for ${ev.title}`,
          studioOpen: { ...d.studioOpen, cta: true },
        }));
      }
    }
    showToast("CTAs generated from event — edit if needed, then caption");
  }

  async function aiPrepareSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchAiBusy(true);
    try {
      let working = drafts;
      let i = 0;
      for (const id of ids) {
        i += 1;
        showToast(`AI prepare ${i} / ${ids.length}…`);
        const draft = working.find((d) => d.id === id);
        if (!draft) continue;
        const prepared = await prepareStudioCardWithAi(draft, {
          scheduledPosts: workspace.scheduledPosts,
          queue: working,
          voice: workspace.voice,
          events,
          postingTimes: workspace.postingTimes,
        });
        working = working.map((d) => (d.id === id ? prepared : d));
        setDrafts(working);
      }
      showToast(`AI prepared ${ids.length} reel${ids.length === 1 ? "" : "s"}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI prepare failed");
    } finally {
      setBatchAiBusy(false);
    }
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
    drafts.length === 0 && boardEvents.length === 0 ? (
      <div className="w-[min(90vw,22rem)] text-center">
        <p className="font-serif-accent text-2xl text-foreground md:text-3xl">
          Drop reels onto the board
        </p>
        <p className="mt-3 text-body-sm text-muted-foreground">
          Events appear only when you add them. Prepare reels, string to events,
          schedule from the shelf. Your board autosaves.
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
            onClick={openEventModal}
          >
            New event
          </button>
        </div>
      </div>
    ) : null;

  if (pickerOpen || !activeBoardId) {
    return (
      <div
        className="relative flex h-full min-h-0 flex-col overflow-hidden bg-background"
        data-testid="studio-page"
      >
        <StudioBoardPicker
          boards={boards}
          activeId={activeBoardId}
          onOpen={(id) => {
            loadBoard(id);
            showToast("Board opened");
          }}
          onNew={handleNewBoard}
          onSave={(id) => {
            if (id === activeBoardId) {
              saveActiveBoard({ manual: true });
            } else {
              // Force touch updatedAt by re-writing existing snapshot
              const snap = readBoard(workspaceId, id);
              if (snap) {
                writeBoard(workspaceId, id, snap, workspace.scheduledPosts);
                refreshBoardList();
              }
              showToast("Board saved — your work is safe");
            }
          }}
          onDelete={(id) => {
            deleteBoard(workspaceId, id);
            refreshBoardList();
            if (activeBoardId === id) {
              setActiveBoardIdState(null);
              setPickerOpen(true);
              setDrafts([]);
            }
            showToast("Board deleted");
          }}
        />
        <StudioSaveBoardDialog
          open={saveDialogOpen}
          boardName={boardName}
          onCancel={() => {
            setSaveDialogOpen(false);
            setPendingNewName(null);
          }}
          onSaveAndContinue={() => {
            if (activeBoardId) saveActiveBoard({ manual: true });
            setSaveDialogOpen(false);
            const n = pendingNewName;
            setPendingNewName(null);
            startNewBoardNow(n ?? "");
          }}
          onSkip={() => {
            if (activeBoardId) saveActiveBoard();
            setSaveDialogOpen(false);
            const n = pendingNewName;
            setPendingNewName(null);
            startNewBoardNow(n ?? "");
          }}
        />
        {toast ? (
          <div
            role="status"
            className="animate-slide-in-up fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-foreground px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] md:bottom-20"
          >
            {toast}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col" data-testid="studio-page">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Studio board
          </p>
          <input
            type="text"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            onBlur={() => {
              if (activeBoardId && boardName.trim()) {
                renameBoard(workspaceId, activeBoardId, boardName.trim());
                refreshBoardList();
              }
            }}
            className="mt-0.5 w-full max-w-md border-0 bg-transparent font-display text-lg font-bold tracking-tight text-foreground outline-none focus:ring-0"
            data-testid="studio-board-name"
            aria-label="Board name"
          />
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="inline-flex items-center gap-1"
              data-testid="board-save-status"
              title="Boards autosave continuously — Save is optional"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 text-success" />
              )}
              {saveStatusLabel}
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>Yellow border = scheduled · green = live</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPicker}
            className="btn-action btn-action-secondary"
            data-testid="studio-boards-btn"
          >
            <FolderOpen className="h-4 w-4" />
            Boards
          </button>
          <button
            type="button"
            onClick={() => handleNewBoard("")}
            className="btn-action btn-action-secondary"
            data-testid="studio-new-board"
          >
            <Plus className="h-4 w-4" />
            New board
          </button>
          <button
            type="button"
            onClick={handleSaveCurrent}
            className="btn-action btn-action-secondary"
            title="Force save now (boards also autosave)"
            data-testid="studio-save-board"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
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

      <StudioSaveBoardDialog
        open={saveDialogOpen}
        boardName={boardName}
        onCancel={() => {
          setSaveDialogOpen(false);
          setPendingNewName(null);
        }}
        onSaveAndContinue={() => {
          if (activeBoardId) saveActiveBoard({ manual: true });
          setSaveDialogOpen(false);
          const n = pendingNewName;
          setPendingNewName(null);
          startNewBoardNow(n ?? "");
        }}
        onSkip={() => {
          if (activeBoardId) saveActiveBoard();
          setSaveDialogOpen(false);
          const n = pendingNewName;
          setPendingNewName(null);
          startNewBoardNow(n ?? "");
        }}
      />

      {eventModalOpen ? (
        <ScheduleEventModal
          date={new Date()}
          scheduledPosts={workspace.scheduledPosts}
          publishedPosts={workspace.publishedPosts ?? []}
          isAssociated={() => false}
          onClose={() => setEventModalOpen(false)}
          onCreate={(event) => {
            void placeCreatedEventOnBoard(event);
          }}
        />
      ) : null}

      {/* Board body: layers dock inside this frame only (not over app nav) */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <StudioLayersPanel
          open={layersOpen}
          drafts={drafts}
          boardEvents={boardEvents}
          offBoardEvents={offBoardEvents}
          selectedIds={selectedIds}
          selectedEventId={selectedEventId}
          hiddenIds={hiddenIds}
          onClose={() => setLayersOpen(false)}
          onSelectDraft={(id) => {
            selectCard(id);
            setHiddenIds((prev) => {
              if (!prev.has(id)) return prev;
              const n = new Set(prev);
              n.delete(id);
              return n;
            });
          }}
          onSelectEvent={(id) => {
            selectEvent(id);
            setHiddenIds((prev) => {
              const key = `event:${id}`;
              if (!prev.has(key)) return prev;
              const n = new Set(prev);
              n.delete(key);
              return n;
            });
          }}
          onToggleHidden={toggleHidden}
          onRemoveEventFromBoard={removeEventFromBoard}
          onNewEvent={openEventModal}
          onPlaceEvent={placeEventOnBoard}
        />

        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-200 ease-out"
          style={{ paddingLeft: layersOpen ? "15.5rem" : 0 }}
        >
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
            layersOpen={layersOpen}
            onToggleLayers={() => setLayersOpen((o) => !o)}
            scheduleDisabled={captionReadySelection.length === 0 && !shelfOpen}
            onOpenSchedule={() => openScheduleShelf()}
            onNewEvent={openEventModal}
          >
            <StudioConnectionLayer
              drafts={drafts.filter((d) => !hiddenIds.has(d.id))}
              eventLayout={eventLayout}
              liveDrag={liveDrag}
            />

            {boardEvents.map((ev) => {
              if (hiddenIds.has(`event:${ev.id}`)) return null;
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
                  trafficStatus={
                    linked > 0
                      ? cardStatusFromPosts(
                          workspace.scheduledPosts.filter(
                            (p) => p.eventId === ev.id,
                          ),
                        )
                      : "IDLE"
                  }
                  canDrag={mode === "select"}
                  liveOffset={live}
                  onSelect={() => selectEvent(ev.id)}
                  onDragStart={(e) => onEventDragStart(ev.id, e)}
                  onAssignSelected={
                    selectedIds.size > 0
                      ? () => void assignEventToSelection(ev.id)
                      : undefined
                  }
                  onChange={(patch) => updateEvent({ ...ev, ...patch })}
                />
              );
            })}

            {drafts.map((draft) => {
              if (hiddenIds.has(draft.id)) return null;
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
                  lifecycleStatus={lifecycleForDraft(draft.id)}
                  onSelect={(e) =>
                    selectCard(draft.id, e.shiftKey || e.metaKey || e.ctrlKey)
                  }
                  onChange={(updater) => updateDraft(draft.id, updater)}
                  onTool={(tool) => handleTool(draft.id, tool)}
                  onGenerateTranscript={() => void runTranscript(draft.id)}
                  onGenerateCaption={() => void runCaption(draft.id)}
                  onDragStart={(e) => onReelDragStart(draft.id, e)}
                />
              );
            })}
          </StudioCanvas>
        </div>

        {selectedIds.size > 1 ? (
          <StudioGroupMenu
            count={selectedIds.size}
            busy={batchAiBusy ? "batch" : busy}
            scheduleCount={captionReadySelection.length}
            shelfOffset={shelfOpen ? shelfWidth : 0}
            onTool={(tool) => void handleGroupTool(tool)}
            onClear={() => {
              setSelectedIds(new Set());
              setFocusId(null);
            }}
          />
        ) : null}

        <StudioScheduleShelf
          open={shelfOpen}
          drafts={scheduleTargets}
          focusId={focusId}
          committedPosts={workspace.scheduledPosts}
          workspacePlatforms={workspace.platforms}
          busy={timesBusy}
          onClose={() => setShelfOpen(false)}
          onFocus={(id) => setFocusId(id)}
          onChangeDraft={updateDraft}
          onBestTimes={applyBestTimesToTargets}
          onCommit={() => void commitScheduleTargets()}
          onWidthChange={setShelfWidth}
        />
      </div>

      {toast ? (
        <div
          role="status"
          className="animate-slide-in-up fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-foreground px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] md:bottom-20"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
