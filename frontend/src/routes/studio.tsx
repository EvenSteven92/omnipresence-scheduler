import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  type EmbeddedBoardEvent,
  type StudioBoardId,
  type StudioBoardMeta,
} from "@/lib/studio-boards";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
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

const LIBRARY_TABS = ["all", "boards", "cards"] as const;
const LIBRARY_SORTS = [
  "edited",
  "created",
  "name",
  "scheduled",
  "published",
] as const;
const LIBRARY_STATUS = [
  "all",
  "draft",
  "scheduled",
  "live",
  "failed",
] as const;

export type StudioSearch = {
  board?: string;
  focusCard?: string;
  library?: (typeof LIBRARY_TABS)[number];
  q?: string;
  sort?: (typeof LIBRARY_SORTS)[number];
  dir?: "asc" | "desc";
  status?: (typeof LIBRARY_STATUS)[number];
  picker?: "1";
};

export const Route = createFileRoute("/studio")({
  validateSearch: (search: Record<string, unknown>): StudioSearch => {
    const library =
      typeof search.library === "string" &&
      (LIBRARY_TABS as readonly string[]).includes(search.library)
        ? (search.library as StudioSearch["library"])
        : undefined;
    const sort =
      typeof search.sort === "string" &&
      (LIBRARY_SORTS as readonly string[]).includes(search.sort)
        ? (search.sort as StudioSearch["sort"])
        : undefined;
    const dir =
      search.dir === "asc" || search.dir === "desc" ? search.dir : undefined;
    const status =
      typeof search.status === "string" &&
      (LIBRARY_STATUS as readonly string[]).includes(search.status)
        ? (search.status as StudioSearch["status"])
        : undefined;
    return {
      board: typeof search.board === "string" ? search.board : undefined,
      focusCard:
        typeof search.focusCard === "string" ? search.focusCard : undefined,
      library,
      q: typeof search.q === "string" ? search.q : undefined,
      sort,
      dir,
      status,
      picker: search.picker === "1" ? "1" : undefined,
    };
  },
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

function earliestScheduleIso(
  draft: DraftPost,
  post: ScheduledPost | PublishedPost | undefined,
): string | null {
  const times = [
    ...Object.values(post?.platformTimes ?? {}),
    ...Object.values(draft.proposedTimes ?? {}),
    post?.date,
  ].filter(Boolean) as string[];
  if (times.length === 0) return null;
  return times.slice().sort()[0] ?? null;
}

const DRAG_THRESHOLD = 3;

function StudioPage() {
  const studioSearch = Route.useSearch();
  const navigate = useNavigate();
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
  const [embeddedEvents, setEmbeddedEvents] = useState<EmbeddedBoardEvent[]>(
    [],
  );
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
  /** Miro-style stack: last interacted card sits above overlapping ones */
  const [stackFrontId, setStackFrontId] = useState<string | null>(null);
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

  const embeddedById = useMemo(() => {
    const m = new Map(embeddedEvents.map((e) => [e.id, e]));
    return m;
  }, [embeddedEvents]);

  /** Live workspace events + embedded stubs so cards survive session loss. */
  const boardEvents = useMemo(() => {
    return boardEventIds
      .map((id) => {
        const live = events.find((e) => e.id === id);
        if (live) return live;
        const stub = embeddedById.get(id);
        if (!stub) {
          // Ghost event so user can remove orphan ids
          return {
            id,
            title: "Event unavailable",
            date: new Date().toISOString(),
            kind: "other" as const,
            description: "This event is no longer in the workspace. Remove it from the board.",
          } satisfies ContentEvent;
        }
        return {
          id: stub.id,
          title: stub.title,
          date: stub.date,
          kind: (stub.kind as ContentEvent["kind"]) || "other",
          description: stub.description,
        } satisfies ContentEvent;
      })
      .filter((e): e is ContentEvent => e != null);
  }, [boardEventIds, events, embeddedById]);

  const offBoardEvents = useMemo(() => {
    const on = new Set(boardEventIds);
    return events.filter((e) => !on.has(e.id));
  }, [events, boardEventIds]);

  const postById = useMemo(() => {
    const m = new Map<string, ScheduledPost | PublishedPost>();
    for (const p of workspace.publishedPosts ?? []) {
      m.set(p.id, p);
    }
    for (const p of workspace.scheduledPosts) {
      m.set(p.id, p);
    }
    return m;
  }, [workspace.scheduledPosts, workspace.publishedPosts]);

  function lifecycleForDraft(id: string): CardLifecycleStatus {
    const post = postById.get(id);
    if (!post) return "IDLE";
    if ("status" in post && post.status) return cardStatusFromPost(post);
    if ("engagementRate" in post) return "LIVE";
    return "IDLE";
  }

  const sequenceByDraftId = useMemo(() => {
    const ranked = drafts
      .map((d) => {
        const status = lifecycleForDraft(d.id);
        if (status === "IDLE") return null;
        const post = postById.get(d.id);
        const iso = earliestScheduleIso(d, post);
        return {
          id: d.id,
          iso: iso ?? post?.date ?? "9999",
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .sort((a, b) => {
        const t = +new Date(a.iso) - +new Date(b.iso);
        return t !== 0 ? t : a.id.localeCompare(b.id);
      });
    const map = new Map<string, number>();
    ranked.forEach((row, i) => map.set(row.id, i + 1));
    return map;
  }, [drafts, postById]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBoard = useCallback(
    (boardId: StudioBoardId, opts?: { focusCard?: string }) => {
      skipSaveRef.current = true;
      const snap = readBoard(workspaceId, boardId) ?? emptySnapshot();
      const meta = listBoards(workspaceId).find((b) => b.id === boardId);
      setActiveBoardId(workspaceId, boardId);
      setActiveBoardIdState(boardId);
      setBoardName(meta?.name ?? "Board");
      setDrafts(ensureCanvasPositions(snap.drafts));
      setEventLayout(snap.eventLayout ?? {});
      setBoardEventIds(snap.boardEventIds ?? []);
      setEmbeddedEvents(snap.embeddedEvents ?? []);
      setHiddenIds(new Set(snap.hiddenIds ?? []));
      setSelectedIds(
        opts?.focusCard ? new Set([opts.focusCard]) : new Set(),
      );
      setFocusId(opts?.focusCard ?? null);
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
        .map(
          (id) =>
            events.find((e) => e.id === id)?.title ??
            embeddedById.get(id)?.title,
        )
        .filter((t): t is string => Boolean(t));
      // Refresh embedded stubs from live events
      const nextEmbedded: EmbeddedBoardEvent[] = boardEventIds.map((id) => {
        const live = events.find((e) => e.id === id);
        const prev = embeddedById.get(id);
        if (live) {
          return {
            id: live.id,
            title: live.title,
            date: live.date,
            kind: live.kind,
            description: live.description,
          };
        }
        return (
          prev ?? {
            id,
            title: "Event unavailable",
            date: new Date().toISOString(),
            kind: "other",
          }
        );
      });
      writeBoard(
        workspaceId,
        activeBoardId,
        {
          drafts,
          boardEventIds,
          eventLayout,
          hiddenIds: [...hiddenIds],
          embeddedEvents: nextEmbedded,
        },
        workspace.scheduledPosts,
        { eventTitles },
      );
      setEmbeddedEvents(nextEmbedded);
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
      embeddedById,
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
    setEmbeddedEvents([]);
    setHiddenIds(new Set());
    setSaveStatus("idle");
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep links: ?board=&focusCard= or force picker
  useEffect(() => {
    if (studioSearch.board) {
      const exists = listBoards(workspaceId).some(
        (b) => b.id === studioSearch.board,
      );
      if (exists) {
        loadBoard(studioSearch.board, {
          focusCard: studioSearch.focusCard,
        });
        return;
      }
      showToast("Board not found");
      setPickerOpen(true);
      return;
    }
    if (studioSearch.picker === "1" || studioSearch.library) {
      setPickerOpen(true);
    }
  }, [
    studioSearch.board,
    studioSearch.focusCard,
    studioSearch.picker,
    studioSearch.library,
    workspaceId,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save active board snapshot while on canvas
  useEffect(() => {
    if (pickerOpen || !activeBoardId) return;
    saveActiveBoard();
  }, [drafts, boardEventIds, eventLayout, hiddenIds, embeddedEvents, pickerOpen, activeBoardId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    const now = new Date().toISOString();
    setDrafts((cur) =>
      cur.map((d) => {
        if (d.id !== id) return d;
        const next = updater(d);
        return {
          ...next,
          createdAt: next.createdAt ?? d.createdAt ?? now,
          updatedAt: now,
        };
      }),
    );
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
    const scheduledIds = new Set(posts.map((p) => p.id));
    // Keep cards on the board; open Schedule section so times are visible
    setDrafts((cur) =>
      cur.map((d) =>
        scheduledIds.has(d.id)
          ? {
              ...d,
              studioOpen: { ...d.studioOpen, schedule: true },
              updatedAt: new Date().toISOString(),
            }
          : d,
      ),
    );
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
    setStackFrontId(id);
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
    setStackFrontId(`event:${id}`);
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
    setEmbeddedEvents((prev) => prev.filter((e) => e.id !== eventId));
    setEventLayout((prev) => {
      const next = { ...prev };
      delete next[eventId];
      return next;
    });
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
    setStackFrontId(id);

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
    setStackFrontId(`event:${eventId}`);
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
    setEmbeddedEvents((prev) => {
      if (prev.some((e) => e.id === event.id)) return prev;
      return [
        ...prev,
        {
          id: event.id,
          title: event.title,
          date: event.date,
          kind: event.kind,
          description: event.description,
        },
      ];
    });
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
    const live = events.find((e) => e.id === eventId);
    if (live) {
      setEmbeddedEvents((prev) => {
        if (prev.some((e) => e.id === eventId)) return prev;
        return [
          ...prev,
          {
            id: live.id,
            title: live.title,
            date: live.date,
            kind: live.kind,
            description: live.description,
          },
        ];
      });
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
          workspaceId={workspaceId}
          scheduledPosts={workspace.scheduledPosts}
          publishedPosts={workspace.publishedPosts}
          initialLibrary={studioSearch.library ?? "all"}
          initialQuery={studioSearch.q ?? ""}
          initialSort={studioSearch.sort ?? "edited"}
          initialDir={studioSearch.dir ?? "desc"}
          initialStatus={studioSearch.status ?? "all"}
          onLibraryStateChange={(state) => {
            void navigate({
              to: "/studio",
              search: {
                library: state.library,
                q: state.q || undefined,
                sort: state.sort === "edited" ? undefined : state.sort,
                dir: state.dir === "desc" ? undefined : state.dir,
                status: state.status === "all" ? undefined : state.status,
                picker: "1",
              },
              replace: true,
            });
          }}
          onOpen={(id) => {
            loadBoard(id);
            showToast("Board opened");
          }}
          onOpenCard={(card) => {
            if (card.boardId) {
              loadBoard(card.boardId, { focusCard: card.id });
              showToast(`Opened on ${card.boardName}`);
            } else {
              showToast("Card is not on a board yet");
            }
          }}
          onNew={handleNewBoard}
          onSave={(id) => {
            if (id === activeBoardId) {
              saveActiveBoard({ manual: true });
            } else {
              const snap = readBoard(workspaceId, id);
              if (snap) {
                writeBoard(workspaceId, id, snap, workspace.scheduledPosts);
                refreshBoardList();
              }
              showToast("Board saved — your work is safe");
            }
          }}
          onRename={(id, name) => {
            renameBoard(workspaceId, id, name);
            refreshBoardList();
            if (id === activeBoardId) setBoardName(name);
            showToast("Board renamed");
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
            focusWorld={
              focusId
                ? (() => {
                    const d = drafts.find((x) => x.id === focusId);
                    if (!d) return null;
                    return {
                      x: d.canvasX ?? 48,
                      y: d.canvasY ?? 48,
                      key: `${activeBoardId ?? ""}:${focusId}`,
                    };
                  })()
                : null
            }
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
                  stackFront={stackFrontId === `event:${ev.id}`}
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
                  onRaise={() => setStackFrontId(`event:${ev.id}`)}
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
                  sequenceNumber={sequenceByDraftId.get(draft.id) ?? null}
                  committedPost={postById.get(draft.id) ?? null}
                  stackFront={stackFrontId === draft.id}
                  onSelect={(e) =>
                    selectCard(draft.id, e.shiftKey || e.metaKey || e.ctrlKey)
                  }
                  onRaise={() => setStackFrontId(draft.id)}
                  onChange={(updater) => updateDraft(draft.id, updater)}
                  onTool={(tool) => handleTool(draft.id, tool)}
                  onGenerateTranscript={() => void runTranscript(draft.id)}
                  onGenerateCaption={() => void runCaption(draft.id)}
                  onDragStart={(e) => onReelDragStart(draft.id, e)}
                  onReschedule={() => openScheduleShelf([draft.id])}
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
