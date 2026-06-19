import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  dismissRepublishDraft,
  normalizeRepublishDraft,
  peekRepublishDraft,
} from "@/lib/republish";
import { CalendarClock, Upload } from "lucide-react";
import { ComposerCard, type DraftPost } from "@/components/post/ComposerCard";
import { PlatformPreview } from "@/components/post/PlatformPreview";
import { BulkScheduleModal } from "@/components/scheduler/BulkScheduleModal";
import { ContentQueueItem } from "@/components/scheduler/ContentQueueItem";
import { ScheduleWeekPanel } from "@/components/scheduler/ScheduleWeekPanel";
import { SchedulerWorkflowSteps } from "@/components/scheduler/SchedulerWorkflowSteps";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import type { BulkScheduleResult } from "@/lib/schedule-engine";
import { DraftDropStencil } from "@/components/scheduler/DraftDropStencil";
import { PotentialPostsDropStencil } from "@/components/scheduler/PotentialPostsDropStencil";
import type { Platform } from "@/lib/mock-data";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import type { WorkspaceId } from "@/lib/workspaces/types";
import {
  clearPersistedDrafts,
  readPersistedDrafts,
  writePersistedDrafts,
} from "@/lib/draft-storage";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "New Post — TORCC OmniSocial" },
      {
        name: "description",
        content: "Upload media, compose copy, and choose platforms — one file per content card.",
      },
    ],
  }),
  component: NewPostPage,
});

const QUEUE_DRAG_TYPE = "application/x-queue-post";
const DRAFT_DRAG_TYPE = "application/x-draft-post";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function detectFormat(filename: string): "landscape" | "portrait" | "story" {
  const lower = filename.toLowerCase();
  if (lower.includes("story") || lower.includes("ig_story") || lower.includes("fb_story")) return "story";
  if (lower.includes("reel") || lower.includes("short") || lower.includes("tiktok") || lower.includes("portrait"))
    return "portrait";
  if (lower.includes("rumble")) return "landscape";
  return "landscape";
}

function detectMediaKind(filename: string): "image" | "video" {
  const lower = filename.toLowerCase();
  return /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(lower) ? "video" : "image";
}

function defaultDraftFromFile(
  file: { name: string; sizeBytes: number },
  allowed: Platform[],
): DraftPost {
  const fmt = detectFormat(file.name);
  const mediaKind = detectMediaKind(file.name);
  const platforms: Platform[] =
    fmt === "story"
      ? (["IG STORY", "FB STORY"] as Platform[]).filter((p) => allowed.includes(p))
      : fmt === "portrait"
        ? (["IG", "TIKTOK", "YT SHORTS"] as Platform[]).filter((p) => allowed.includes(p))
        : (["YT", "RUMBLE", "FB", "X"] as Platform[]).filter((p) => allowed.includes(p));
  if (platforms.length === 0 && allowed.length > 0) platforms.push(allowed[0]!);
  return {
    id: uid(),
    filename: file.name,
    sizeMB: file.sizeBytes / (1024 * 1024),
    mediaKind,
    format: fmt,
    autoFormat: fmt,
    platforms,
    caption: "",
    hashtags: "",
    transcript: "",
  };
}

function sortSavedDrafts(drafts: DraftPost[]): DraftPost[] {
  return [...drafts].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

type RepublishLocationState = {
  republishDraft?: DraftPost;
};

function NewPostPage() {
  const { workspace, workspaceId, addScheduledPosts } = useWorkspace();
  const republishFromNavigation = useRouterState({
    select: (state) =>
      state.location.pathname === "/scheduler"
        ? (state.location.state as RepublishLocationState | undefined)?.republishDraft ?? null
        : null,
  });
  const [queue, setQueue] = useState<DraftPost[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<DraftPost[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draftZoneActive, setDraftZoneActive] = useState(false);
  const [queueZoneActive, setQueueZoneActive] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const queueFileInput = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkScheduleOpen, setBulkScheduleOpen] = useState(false);

  const allPosts = useMemo(() => [...queue, ...savedDrafts], [queue, savedDrafts]);
  const bulkScheduleFiles = useMemo(
    () => queue.filter((d) => selectedIds.has(d.id)),
    [queue, selectedIds],
  );
  const hasSidebar = queue.length > 0 || savedDrafts.length > 0;
  const readyToApply = useMemo(
    () => queue.filter((d) => draftToScheduledPost(d) != null),
    [queue],
  );

  const prevWorkspaceIdRef = useRef<WorkspaceId | null>(null);

  useEffect(() => {
    const raw = republishFromNavigation ?? peekRepublishDraft(workspaceId);
    if (!raw) return;
    const draft = normalizeRepublishDraft(raw);
    setSavedDrafts([]);
    setQueue([draft]);
    setSelectedIds(new Set([draft.id]));
    setActiveId(draft.id);
    const dismissId = window.setTimeout(() => dismissRepublishDraft(workspaceId), 0);
    return () => window.clearTimeout(dismissId);
  }, [workspaceId, republishFromNavigation]);

  useEffect(() => {
    if (prevWorkspaceIdRef.current === workspaceId) return;
    prevWorkspaceIdRef.current = workspaceId;
    if (peekRepublishDraft(workspaceId)) return;
    const persisted = readPersistedDrafts(workspaceId);
    setQueue(persisted.queue);
    setSavedDrafts(persisted.savedDrafts);
    setActiveId(persisted.activeId);
    setSelectedIds(new Set(persisted.queue.map((d) => d.id)));
  }, [workspaceId]);

  useEffect(() => {
    if (peekRepublishDraft(workspaceId)) return;
    writePersistedDrafts(workspaceId, queue, savedDrafts);
  }, [workspaceId, queue, savedDrafts]);

  useEffect(() => {
    setSelectedIds((cur) => {
      const inQueue = new Set(queue.map((d) => d.id));
      return new Set([...cur].filter((id) => inQueue.has(id)));
    });
  }, [queue]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).map((f) => ({ name: f.name, sizeBytes: f.size }));
      const created = arr.map((f) => defaultDraftFromFile(f, workspace.platforms));
      setQueue((cur) => [...cur, ...created]);
      setSelectedIds((cur) => {
        const next = new Set(cur);
        created.forEach((d) => next.add(d.id));
        return next;
      });
      if (created[0]) setActiveId(created[0].id);
    },
    [workspace.platforms],
  );

  function handleFileInputChange(files: FileList | null, input: HTMLInputElement | null) {
    if (files?.length) addFiles(files);
    if (input) input.value = "";
  }

  function toggleSelect(id: string) {
    setSelectedIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllQueue() {
    setSelectedIds(new Set(queue.map((d) => d.id)));
  }

  function applyBulkSchedule(result: BulkScheduleResult) {
    setQueue((cur) =>
      cur.map((d) => {
        const times = result.byFile[d.id];
        if (!times) return d;
        return { ...d, proposedTimes: { ...(d.proposedTimes ?? {}), ...times } };
      }),
    );
    setBulkScheduleOpen(false);
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [workspace.platforms, addFiles],
  );

  function updateDraft(id: string, next: DraftPost) {
    setQueue((cur) => cur.map((d) => (d.id === id ? next : d)));
    setSavedDrafts((cur) => cur.map((d) => (d.id === id ? { ...next, savedAt: d.savedAt } : d)));
  }

  function removeDraft(id: string) {
    setQueue((cur) => cur.filter((d) => d.id !== id));
    setSavedDrafts((cur) => cur.filter((d) => d.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }

  function clearAll() {
    const count = queue.length + savedDrafts.length;
    if (count > 0) {
      const ok = window.confirm(
        `Clear ${count} item${count === 1 ? "" : "s"} from the queue and draft zone? This cannot be undone.`,
      );
      if (!ok) return;
    }
    setQueue([]);
    setSavedDrafts([]);
    setActiveId(null);
    setSelectedIds(new Set());
    clearPersistedDrafts(workspaceId);
  }

  function reorderQueue(fromId: string, toId: string) {
    if (fromId === toId) return;
    setQueue((cur) => {
      const from = cur.findIndex((d) => d.id === fromId);
      const to = cur.findIndex((d) => d.id === toId);
      if (from === -1 || to === -1) return cur;
      const next = cur.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  function addDemoSet() {
    const demo = [
      { name: "service_recap_w18.mp4", sizeBytes: 56 * 1024 * 1024 },
      { name: "worship_clip_03_portrait.mp4", sizeBytes: 41 * 1024 * 1024 },
      { name: "qa_segment_a.mp4", sizeBytes: 125 * 1024 * 1024 },
      { name: "quote_card_set.png", sizeBytes: 4.4 * 1024 * 1024 },
    ];
    const created = demo.map((f) => defaultDraftFromFile(f, workspace.platforms));
    setQueue((cur) => [...cur, ...created]);
    setSelectedIds((cur) => {
      const next = new Set(cur);
      created.forEach((d) => next.add(d.id));
      return next;
    });
    if (created[0]) setActiveId(created[0].id);
  }

  function saveToDraftZone(post: DraftPost) {
    const saved: DraftPost = { ...post, savedAt: Date.now() };
    setQueue((cur) => cur.filter((d) => d.id !== post.id));
    setSavedDrafts((cur) => sortSavedDrafts([saved, ...cur.filter((d) => d.id !== post.id)]));
  }

  function moveToQueue(post: DraftPost, insertBeforeId?: string) {
    const { savedAt: _savedAt, ...rest } = post;
    const revived: DraftPost = rest;
    setSavedDrafts((cur) => cur.filter((d) => d.id !== post.id));
    setQueue((cur) => {
      if (!insertBeforeId) return [...cur, revived];
      const idx = cur.findIndex((d) => d.id === insertBeforeId);
      if (idx === -1) return [...cur, revived];
      const next = cur.slice();
      next.splice(idx, 0, revived);
      return next;
    });
  }

  function reorderSavedDrafts(fromId: string, toId: string) {
    if (fromId === toId) return;
    setSavedDrafts((cur) => {
      const from = cur.findIndex((d) => d.id === fromId);
      const to = cur.findIndex((d) => d.id === toId);
      if (from === -1 || to === -1) return cur;
      const next = cur.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  function bumpDraftToTop(id: string) {
    setSavedDrafts((cur) => {
      const post = cur.find((d) => d.id === id);
      if (!post) return cur;
      return [post, ...cur.filter((d) => d.id !== id)];
    });
  }

  function readDragId(e: React.DragEvent): { kind: "queue" | "draft"; id: string } | null {
    const draftId = e.dataTransfer.getData(DRAFT_DRAG_TYPE);
    if (draftId) return { kind: "draft", id: draftId };
    const queueId = e.dataTransfer.getData(QUEUE_DRAG_TYPE) || e.dataTransfer.getData("text/plain");
    if (queueId) return { kind: "queue", id: queueId };
    return null;
  }

  function handleDraftZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setDraftZoneActive(false);
    setDraggingId(null);
    const drag = readDragId(e);
    if (!drag) return;
    if (drag.kind === "queue") {
      const post = queue.find((d) => d.id === drag.id);
      if (post) saveToDraftZone(post);
      return;
    }
    bumpDraftToTop(drag.id);
  }

  function handleQueueZoneDrop(e: React.DragEvent) {
    e.preventDefault();
    setQueueZoneActive(false);
    setDraggingId(null);
    const drag = readDragId(e);
    if (!drag || drag.kind !== "draft") return;
    const post = savedDrafts.find((d) => d.id === drag.id);
    if (post) moveToQueue(post);
  }

  function clearDragState() {
    setDraggingId(null);
    setDraftZoneActive(false);
    setQueueZoneActive(false);
  }

  function applyPendingSchedule() {
    const posts = readyToApply
      .map((d) => draftToScheduledPost(d))
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (posts.length === 0) return;
    addScheduledPosts(posts);
    const appliedIds = new Set(posts.map((p) => p.id));
    setQueue((cur) => cur.filter((d) => !appliedIds.has(d.id)));
    setSelectedIds((cur) => {
      const next = new Set(cur);
      appliedIds.forEach((id) => next.delete(id));
      return next;
    });
    setActiveId((cur) => (cur && appliedIds.has(cur) ? null : cur));
  }

  useEffect(() => {
    if (allPosts.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !allPosts.some((d) => d.id === activeId)) {
      setActiveId(queue[0]?.id ?? savedDrafts[0]?.id ?? null);
    }
  }, [allPosts, queue, savedDrafts, activeId]);

  const activeDraft = useMemo(
    () => allPosts.find((d) => d.id === activeId) ?? queue[0] ?? savedDrafts[0],
    [allPosts, queue, savedDrafts, activeId],
  );
  const activeIndex = activeDraft ? allPosts.findIndex((d) => d.id === activeDraft.id) + 1 : 0;
  const activeInDraftZone = activeDraft ? savedDrafts.some((d) => d.id === activeDraft.id) : false;

  const empty = allPosts.length === 0;

  const queueDragHandlers = (postId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDraggingId(postId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(QUEUE_DRAG_TYPE, postId);
      e.dataTransfer.setData("text/plain", postId);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDragEnd: clearDragState,
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const drag = readDragId(e);
      if (!drag) return;
      if (drag.kind === "draft") {
        const post = savedDrafts.find((d) => d.id === drag.id);
        if (post) moveToQueue(post, postId);
      } else if (drag.id !== postId) {
        reorderQueue(drag.id, postId);
      }
      clearDragState();
    },
  });

  const draftDragHandlers = (postId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDraggingId(postId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData(DRAFT_DRAG_TYPE, postId);
      e.dataTransfer.setData("text/plain", postId);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },
    onDragEnd: clearDragState,
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const drag = readDragId(e);
      if (!drag) return;
      if (drag.kind === "queue") {
        const post = queue.find((d) => d.id === drag.id);
        if (post) saveToDraftZone(post);
      } else if (drag.id !== postId) {
        reorderSavedDrafts(drag.id, postId);
      }
      clearDragState();
    },
  });

  return (
    <div className="flex h-full overflow-hidden">
      {hasSidebar && (
        <aside
          data-testid="content-queue"
          className="flex h-full w-[300px] shrink-0 flex-col border-r border-border bg-surface"
        >
          <div className="border-b border-border px-4 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Content queue
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {queue.length} potential · {savedDrafts.length} draft{savedDrafts.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="border-b border-border px-4 py-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => queueFileInput.current?.click()}
                data-testid="queue-add-files-btn"
                className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-background/40 px-3 py-2.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-accent/60 hover:bg-secondary/30 hover:text-foreground"
              >
                <Upload className="h-3 w-3" strokeWidth={1.5} />
                Add
              </button>
              <button
                type="button"
                onClick={clearAll}
                data-testid="clear-all-btn"
                className="rounded-sm border border-border bg-background/40 px-3 py-2.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                Clear
              </button>
            </div>
            {queue.length > 0 ? (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBulkScheduleOpen(true)}
                  disabled={bulkScheduleFiles.length === 0}
                  data-testid="bulk-schedule-btn"
                  className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-accent/60 bg-accent/10 px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20 disabled:opacity-50"
                >
                  <CalendarClock className="h-3 w-3" strokeWidth={1.75} />
                  Schedule ({bulkScheduleFiles.length})
                </button>
                <button
                  type="button"
                  onClick={selectAllQueue}
                  data-testid="select-all-queue-btn"
                  className="rounded-sm border border-border bg-background/40 px-2 py-2 text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  All
                </button>
              </div>
            ) : null}
            <input
              ref={queueFileInput}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => handleFileInputChange(e.target.files, e.target)}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              data-testid="potential-posts-zone"
              className="flex min-h-0 flex-1 flex-col border-b border-border"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAFT_DRAG_TYPE)) {
                  e.preventDefault();
                  setQueueZoneActive(true);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setQueueZoneActive(false);
              }}
              onDrop={handleQueueZoneDrop}
            >
              <div className="border-b border-border/60 px-4 py-2">
                <div className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Ready to configure
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                <PotentialPostsDropStencil active={queueZoneActive} />
                {queue.map((d, idx) => (
                  <ContentQueueItem
                    key={d.id}
                    post={d}
                    index={idx + 1}
                    active={d.id === activeDraft?.id}
                    onSelect={() => setActiveId(d.id)}
                    isDragging={draggingId === d.id}
                    dragHandlers={queueDragHandlers(d.id)}
                    selectable
                    selected={selectedIds.has(d.id)}
                    onToggleSelect={() => toggleSelect(d.id)}
                  />
                ))}
              </div>
            </div>

            <div
              data-testid="draft-dropzone"
              className="flex min-h-[42%] flex-col bg-background/20"
              onDragOver={(e) => {
                if (
                  e.dataTransfer.types.includes(QUEUE_DRAG_TYPE) ||
                  e.dataTransfer.types.includes(DRAFT_DRAG_TYPE) ||
                  e.dataTransfer.types.includes("text/plain")
                ) {
                  e.preventDefault();
                  setDraftZoneActive(true);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDraftZoneActive(false);
              }}
              onDrop={handleDraftZoneDrop}
            >
              <div className="border-b border-border/60 px-4 py-2">
                <div className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Saved drafts
                </div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                <DraftDropStencil active={draftZoneActive} />
                {savedDrafts.map((d, idx) => (
                  <ContentQueueItem
                    key={d.id}
                    post={d}
                    index={idx + 1}
                    active={d.id === activeDraft?.id}
                    onSelect={() => setActiveId(d.id)}
                    isDragging={draggingId === d.id}
                    dragHandlers={draftDragHandlers(d.id)}
                    variant="draft"
                    savedAt={d.savedAt}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PageHeader
          eyebrow={<WorkspaceEyebrow />}
          title="New Post"
          actions={
            <>
              <span
                className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground"
                data-testid="status-pill"
              >
                {empty ? "Empty" : `${queue.length} in queue`}
              </span>
              <NewEventPostActions showPostLink={false} />
            </>
          }
        />

        <div className="flex-1 overflow-y-auto">
          <div className={empty ? "page-content" : "px-8 py-6"}>
            {empty ? (
              <>
                <SchedulerWorkflowSteps active="upload" />
                <p className="mb-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Each upload is one content card on your calendar, even when you post the same file to several platforms. Add files, pick networks, write copy, and set publish times per platform.
                </p>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInput.current?.click()}
                  data-testid="dropzone"
                  className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-sm border border-dashed bg-surface px-8 py-14 transition-colors ${
                    isDragging ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"
                  }`}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
                  <div className="text-center">
                    <div className="text-title text-foreground">Drop files to start</div>
                    <p className="mt-2 text-body-sm text-muted-foreground">
                      MP4, MOV, JPG, PNG
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addDemoSet();
                    }}
                    data-testid="add-demo-set-btn"
                    className="rounded-sm border border-border bg-background/60 px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
                  >
                    Add demo set
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => handleFileInputChange(e.target.files, e.target)}
                  />
                </div>
              </>
            ) : activeDraft ? (
              <div className="mx-auto max-w-6xl">
                <SchedulerWorkflowSteps active={readyToApply.length > 0 ? "schedule" : "configure"} />
                <p className="mb-4 text-xs text-muted-foreground">
                  Card {activeIndex} of {allPosts.length}
                  {activeInDraftZone ? " · saved draft" : " · ready to configure"}
                </p>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <ComposerCard
                    key={activeDraft.id}
                    index={activeIndex}
                    post={activeDraft}
                    focused
                    hidePreview
                    onChange={(next) => updateDraft(activeDraft.id, next)}
                    onRemove={() => removeDraft(activeDraft.id)}
                    onSaveDraft={() => saveToDraftZone(activeDraft)}
                    expanded
                  />
                  <aside className="hidden lg:block">
                    <div className="sticky top-6">
                      <PlatformPreview
                        variant="panel"
                        platforms={activeDraft.platforms}
                        caption={activeDraft.caption}
                        platformCaptions={activeDraft.platformCaptions}
                        hashtags={activeDraft.hashtags}
                        filename={activeDraft.filename}
                        format={activeDraft.format}
                      />
                    </div>
                  </aside>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ScheduleWeekPanel
        queue={queue}
        scheduledPosts={workspace.scheduledPosts}
        activeFileId={activeDraft?.id}
        readyCount={readyToApply.length}
        onSelectFile={setActiveId}
        onApply={applyPendingSchedule}
      />

      {bulkScheduleOpen ? (
        <BulkScheduleModal
          files={bulkScheduleFiles}
          scheduledPosts={workspace.scheduledPosts}
          onClose={() => setBulkScheduleOpen(false)}
          onApprove={applyBulkSchedule}
        />
      ) : null}
    </div>
  );
}