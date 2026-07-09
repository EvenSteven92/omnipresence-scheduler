import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScheduleEventModal } from "@/components/calendar/ScheduleEventModal";
import { ComposerPreviewRail } from "@/components/composer/ComposerPreviewRail";
import { ComposerPublishPlan } from "@/components/composer/ComposerPublishPlan";
import { ComposerQueueRail } from "@/components/composer/ComposerQueueRail";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import { prepareBatchWithAi, prepareCardWithAi } from "@/lib/ai-schedule";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import {
  applyProposedTimes,
  countHashtagsInText,
  defaultDraftFromFile,
  distributeBulkDraftTimes,
  formatMediaMeta,
  replaceDraftMedia,
  revokePreviewUrl,
  suggestTimesForDraft,
  type DraftPost,
} from "@/lib/composer-draft";
import { suggestTimesForDay } from "@/lib/schedule-engine";
import {
  clearPersistedDrafts,
  readPersistedDrafts,
  writePersistedDrafts,
} from "@/lib/draft-storage";
import { platformDotColor } from "@/lib/card-display";
import { getEventById } from "@/lib/events/display";
import type { Platform } from "@/lib/mock-data";
import { PLATFORMS } from "@/lib/platforms";
import {
  combineDateAndTime,
  pendingSlotsFromQueue,
} from "@/lib/schedule-engine";
import {
  dismissRepublishDraft,
  normalizeRepublishDraft,
  peekRepublishDraft,
} from "@/lib/republish";
import { today } from "@/lib/demo-clock";
import { useWorkspace } from "@/lib/workspace-context";
import type { WorkspaceId } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "Compose a card — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Upload media into atomic cards, AI-prepare captions and best times, schedule across every channel.",
      },
    ],
  }),
  component: ComposePage,
});

type RepublishLocationState = {
  republishDraft?: DraftPost;
};

function ComposePage() {
  const navigate = useNavigate();
  const { workspace, workspaceId, addScheduledPosts } = useWorkspace();
  const { customEvents, addEvent } = useCustomEvents(workspaceId);
  const { isAssociated } = useEventAssociations(workspaceId);

  const workspaceEvents = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const republishFromNavigation = useRouterState({
    select: (state) =>
      state.location.pathname === "/scheduler"
        ? ((state.location.state as RepublishLocationState | undefined)?.republishDraft ?? null)
        : null,
  });

  const [queue, setQueue] = useState<DraftPost[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAllBusy, setAiAllBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scheduleReasons, setScheduleReasons] = useState<
    Partial<Record<string, Partial<Record<string, string>>>>
  >({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const prevWorkspaceIdRef = useRef<WorkspaceId | null>(null);

  const activeDraft = queue[activeIndex] ?? null;
  const publishCount = activeDraft?.platforms.length ?? 0;
  const captionLimit = 2200;

  const availablePlatforms = useMemo(
    () => PLATFORMS.filter((p) => workspace.platforms.includes(p.short)),
    [workspace.platforms],
  );

  const updateActive = useCallback(
    (updater: (draft: DraftPost) => DraftPost) => {
      setQueue((cur) => {
        const idx = activeIndex;
        const draft = cur[idx];
        if (!draft) return cur;
        const next = cur.slice();
        next[idx] = updater(draft);
        return next;
      });
    },
    [activeIndex],
  );

  useEffect(() => {
    const raw = republishFromNavigation ?? peekRepublishDraft(workspaceId);
    if (!raw) return;
    const draft = normalizeRepublishDraft(raw);
    const times = suggestTimesForDraft(draft, workspace.scheduledPosts, [], workspace.postingTimes);
    setQueue([applyProposedTimes(draft, times)]);
    setActiveIndex(0);
    const dismissId = window.setTimeout(() => dismissRepublishDraft(workspaceId), 0);
    return () => window.clearTimeout(dismissId);
  }, [workspaceId, republishFromNavigation, workspace.scheduledPosts, workspace.postingTimes]);

  useEffect(() => {
    if (prevWorkspaceIdRef.current === workspaceId) return;
    prevWorkspaceIdRef.current = workspaceId;
    if (peekRepublishDraft(workspaceId)) return;
    const persisted = readPersistedDrafts(workspaceId);
    setQueue(persisted.queue);
    const idx = persisted.activeId
      ? Math.max(0, persisted.queue.findIndex((d) => d.id === persisted.activeId))
      : 0;
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [workspaceId]);

  useEffect(() => {
    if (peekRepublishDraft(workspaceId)) return;
    writePersistedDrafts(workspaceId, queue, []);
  }, [workspaceId, queue, activeIndex]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;

      const created = arr.map((f) => defaultDraftFromFile(f, workspace.platforms));
      const byFile =
        created.length > 1
          ? distributeBulkDraftTimes(created, workspace.scheduledPosts, workspace.postingTimes)
          : null;

      const withTimes = created.map((draft) => {
        if (byFile?.[draft.id]) {
          return applyProposedTimes(draft, byFile[draft.id]!);
        }
        const assigned = pendingSlotsFromQueue(queue);
        const times = suggestTimesForDraft(
          draft,
          workspace.scheduledPosts,
          assigned,
          workspace.postingTimes,
        );
        return applyProposedTimes(draft, times);
      });

      const startLen = queue.length;
      setQueue((cur) => [...cur, ...withTimes]);
      setActiveIndex(startLen);
    },
    [queue, workspace.platforms, workspace.scheduledPosts, workspace.postingTimes],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function togglePlatform(platform: Platform) {
    if (!activeDraft) return;
    const has = activeDraft.platforms.includes(platform);
    const platforms = has
      ? activeDraft.platforms.filter((p) => p !== platform)
      : [...activeDraft.platforms, platform];

    updateActive((draft) => {
      let proposedTimes = { ...(draft.proposedTimes ?? {}) };
      if (has) {
        delete proposedTimes[platform];
      } else {
        const assigned = pendingSlotsFromQueue(queue.filter((d) => d.id !== draft.id));
        const times = suggestTimesForDay(
          { id: draft.id, platforms: [platform] },
          today(),
          workspace.scheduledPosts,
          assigned,
          workspace.postingTimes,
        );
        if (times[platform]) proposedTimes[platform] = times[platform];
      }
      return { ...draft, platforms, proposedTimes };
    });
  }

  function updatePlatformSchedule(platform: Platform, dateStr: string, timeStr: string) {
    if (!activeDraft) return;
    const iso = combineDateAndTime(dateStr, timeStr);
    updateActive((draft) => ({
      ...draft,
      proposedTimes: { ...(draft.proposedTimes ?? {}), [platform]: iso },
    }));
  }

  async function prepareActiveWithAi() {
    if (!activeDraft || aiBusy) return;
    setAiBusy(true);
    try {
      const { draft, scheduleReasons: reasons } = await prepareCardWithAi(activeDraft, {
        scheduledPosts: workspace.scheduledPosts,
        queue,
        postingTimes: workspace.postingTimes,
        voice: workspace.voice,
        events: workspaceEvents,
      });
      setQueue((cur) => cur.map((d) => (d.id === draft.id ? draft : d)));
      setScheduleReasons((prev) => ({ ...prev, [draft.id]: reasons }));
    } finally {
      setAiBusy(false);
    }
  }

  async function prepareAllWithAi() {
    if (aiAllBusy || queue.length === 0) return;
    setAiAllBusy(true);
    setBatchProgress(`0 / ${queue.length}`);
    try {
      const prepared = await prepareBatchWithAi(queue, {
        scheduledPosts: workspace.scheduledPosts,
        postingTimes: workspace.postingTimes,
        voice: workspace.voice,
        events: workspaceEvents,
        onProgress: (done, total) => setBatchProgress(`${done} / ${total}`),
      });
      setQueue(prepared);
    } finally {
      setAiAllBusy(false);
      setBatchProgress(null);
    }
  }

  function suggestTimesOnly() {
    if (!activeDraft) return;
    const assigned = pendingSlotsFromQueue(queue.filter((d) => d.id !== activeDraft.id));
    const times = suggestTimesForDraft(
      activeDraft,
      workspace.scheduledPosts,
      assigned,
      workspace.postingTimes,
    );
    updateActive((d) => applyProposedTimes(d, times));
    const reasons: Partial<Record<string, string>> = {};
    for (const p of activeDraft.platforms) {
      if (times[p]) reasons[p] = `Audience peak for this network`;
    }
    setScheduleReasons((prev) => ({ ...prev, [activeDraft.id]: reasons }));
  }

  function scheduleCurrent() {
    if (!activeDraft) return;
    const scheduled = draftToScheduledPost(activeDraft);
    if (!scheduled) return;

    addScheduledPosts([scheduled]);
    revokePreviewUrl(activeDraft);

    const remaining = queue.filter((d) => d.id !== activeDraft.id);
    if (remaining.length === 0) {
      setQueue([]);
      clearPersistedDrafts(workspaceId);
      navigate({ to: "/calendar" });
      return;
    }

    setQueue(remaining);
    setActiveIndex((i) => Math.min(i, remaining.length - 1));
  }

  function scheduleAllReady() {
    const ready = queue
      .map((d) => draftToScheduledPost(d))
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (ready.length === 0) return;

    addScheduledPosts(ready);
    queue.forEach(revokePreviewUrl);

    const readyIds = new Set(ready.map((p) => p.id));
    const remaining = queue.filter((d) => !readyIds.has(d.id));
    if (remaining.length === 0) {
      setQueue([]);
      clearPersistedDrafts(workspaceId);
      navigate({ to: "/calendar" });
      return;
    }
    setQueue(remaining);
    setActiveIndex(0);
  }

  const canSchedule = activeDraft != null && draftToScheduledPost(activeDraft) != null;
  const readyCount = queue.filter((d) => draftToScheduledPost(d) != null).length;

  function selectQueueId(id: string) {
    const idx = queue.findIndex((d) => d.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  return (
    <div className="composer-shell" data-testid="compose-page">
      <ComposerQueueRail
        queue={queue}
        activeId={activeDraft?.id ?? null}
        onSelect={selectQueueId}
        onAddClick={() => fileInputRef.current?.click()}
        isDragging={isDragging}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      />

      <div className="composer-editor-pane">
        <div className="mx-auto w-full max-w-[720px] px-4 py-5 pb-24 md:px-6 md:pb-10">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/calendar"
                className="text-caption font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Calendar
              </Link>
              <h1 className="page-title mt-2">Compose cards</h1>
              <p className="mt-1.5 text-body-sm text-muted-foreground">
                Atomic design: each upload is one card with its own where & when.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              {queue.length > 1 ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={prepareAllWithAi}
                    disabled={aiAllBusy}
                    data-testid="generate-all-btn"
                    className="btn-action btn-action-secondary disabled:opacity-50"
                  >
                    {aiAllBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {aiAllBusy && batchProgress
                      ? `AI batch ${batchProgress}`
                      : `AI prepare all (${queue.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={scheduleAllReady}
                    disabled={readyCount === 0}
                    data-testid="schedule-all-btn"
                    className="btn-action-primary btn-action disabled:opacity-50"
                  >
                    Schedule all ready ({readyCount})
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={scheduleCurrent}
                disabled={!canSchedule}
                data-testid="schedule-publishes-btn"
                className="btn-action-primary btn-action disabled:opacity-50"
              >
                Schedule this card
                {publishCount > 0 ? ` · ${publishCount} publish${publishCount === 1 ? "" : "es"}` : ""}
              </button>
            </div>
          </div>

          {/* Mobile queue hint */}
          {queue.length > 0 ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {queue.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "shrink-0 rounded-md border-[1.5px] border-foreground px-3 py-1.5 text-caption font-semibold",
                    i === activeIndex ? "bg-accent" : "bg-card",
                  )}
                >
                  {i + 1}. {d.title?.slice(0, 16) || d.filename.slice(0, 16)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            {/* MEDIA */}
            <section className="rounded-md border-[1.5px] border-foreground bg-card p-[18px] shadow-[var(--shadow-card)]">
              <div className="mb-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">
                01 · Media
              </div>
              {activeDraft ? (
                <div className="flex items-center gap-4 rounded-md border-[1.5px] border-foreground bg-paper-2 px-4 py-4">
                  <CardThumbnail
                    src={activeDraft.previewUrl}
                    post={{
                      id: activeDraft.id,
                      title: activeDraft.filename,
                      mediaKind: activeDraft.mediaKind,
                    }}
                    alt={activeDraft.filename}
                    kind={activeDraft.mediaKind}
                    layout="square"
                    className="!h-[74px] !w-[74px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-[0.9375rem] font-semibold text-foreground">
                      {activeDraft.filename}
                    </div>
                    <div className="mt-1 text-caption font-medium text-muted-foreground">
                      {formatMediaMeta(activeDraft)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="btn-action btn-action-secondary min-h-9 shrink-0"
                  >
                    Replace
                  </button>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        updateActive((d) => replaceDraftMedia(d, file, workspace.platforms));
                      }
                      e.target.value = "";
                    }}
                  />
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                  data-testid="media-dropzone"
                  className={cn(
                    "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-md border-[1.5px] border-foreground bg-paper-2 px-5 py-10 text-center transition-colors hover:bg-secondary",
                    isDragging && "bg-accent/15",
                  )}
                >
                  <p className="font-display text-lg font-bold text-foreground">
                    Drop reels, clips, or images
                  </p>
                  <p className="mt-2 max-w-sm text-body-sm text-muted-foreground">
                    Batch upload (e.g. 14 sermon reels) — each file becomes its own card with
                    independent platforms and times.
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </section>

            {activeDraft ? (
              <>
                {/* AI STRIP */}
                <section className="rounded-md border-[1.5px] border-foreground bg-accent/10 p-4 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">
                        AI prepare this card
                      </p>
                      <p className="mt-0.5 text-caption text-muted-foreground">
                        Caption + hashtags from transcript · best time per platform
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={prepareActiveWithAi}
                      disabled={aiBusy}
                      data-testid="generate-caption-btn"
                      className="btn-action-primary btn-action disabled:opacity-50"
                    >
                      {aiBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {aiBusy ? "Preparing…" : "Run AI prepare"}
                    </button>
                  </div>
                </section>

                {/* COPY */}
                <section className="rounded-md border-[1.5px] border-foreground bg-card p-[18px] shadow-[var(--shadow-card)]">
                  <div className="mb-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    02 · Caption & context
                  </div>
                  <input
                    type="text"
                    value={activeDraft.title ?? ""}
                    onChange={(e) => updateActive((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Card title"
                    data-testid="card-title-input"
                    className="mb-3 w-full border-0 border-b-[1.5px] border-foreground/25 bg-transparent px-0 py-1 font-display text-lg font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
                  />
                  <textarea
                    value={activeDraft.caption}
                    onChange={(e) => updateActive((d) => ({ ...d, caption: e.target.value }))}
                    placeholder="Write your caption…"
                    rows={5}
                    data-testid="caption-input"
                    className="w-full resize-y rounded-md border-[1.5px] border-foreground bg-paper-2 px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="mt-2 flex justify-between text-caption font-medium text-muted-foreground">
                    <span>
                      Hashtags ·{" "}
                      {countHashtagsInText(activeDraft.hashtags) ||
                        countHashtagsInText(activeDraft.caption)}
                    </span>
                    <span>
                      {activeDraft.caption.length} / {captionLimit}
                    </span>
                  </div>
                  {activeDraft.hashtags ? (
                    <p className="mt-2 rounded-md border border-foreground/20 bg-paper-2 px-3 py-2 text-body-sm text-accent">
                      {activeDraft.hashtags}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setTranscriptOpen((o) => !o)}
                    className="mt-4 flex w-full items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                  >
                    Transcript / AI context
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        transcriptOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {transcriptOpen ? (
                    <textarea
                      value={activeDraft.transcript}
                      onChange={(e) =>
                        updateActive((d) => ({ ...d, transcript: e.target.value }))
                      }
                      placeholder="Paste sermon notes or reel transcript — AI uses this for caption, hashtags, and timing context…"
                      rows={4}
                      data-testid="transcript-input"
                      className="mt-2 w-full resize-y rounded-md border-[1.5px] border-foreground bg-background px-3.5 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : null}
                </section>

                {/* PLATFORMS */}
                <section className="rounded-md border-[1.5px] border-foreground bg-card p-[18px] shadow-[var(--shadow-card)]">
                  <div className="mb-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    03 · Where it posts
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {availablePlatforms.map((meta) => {
                      const active = activeDraft.platforms.includes(meta.short);
                      return (
                        <button
                          key={meta.short}
                          type="button"
                          onClick={() => togglePlatform(meta.short)}
                          data-testid={`platform-${meta.short.replace(/\s+/g, "-")}`}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-md border-[1.5px] border-foreground px-3 py-2.5 text-body-sm font-semibold transition-colors",
                            active
                              ? "bg-accent text-foreground"
                              : "bg-card text-foreground hover:bg-secondary",
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full border border-foreground"
                            style={{ background: platformDotColor(meta.short) }}
                          />
                          {meta.full}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Mobile publish plan (hidden on xl where rail shows) */}
                <section className="rounded-md border-[1.5px] border-foreground bg-card p-[18px] shadow-[var(--shadow-card)] xl:hidden">
                  <ComposerPublishPlan
                    draft={activeDraft}
                    scheduleReasons={scheduleReasons[activeDraft.id]}
                    onUpdateTime={updatePlatformSchedule}
                    onSuggestTimes={suggestTimesOnly}
                  />
                </section>

                {/* ALBUM */}
                <section className="rounded-md border-[1.5px] border-foreground bg-card p-[18px] shadow-[var(--shadow-card)]">
                  <div className="mb-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    04 · Event album
                  </div>
                  <p className="mb-3 text-body-sm text-muted-foreground">
                    Link this card to a ministry moment so the calendar groups related media.
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {workspaceEvents.map((event) => {
                      const active = activeDraft.eventId === event.id;
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() =>
                            updateActive((d) => ({
                              ...d,
                              eventId: active ? undefined : event.id,
                            }))
                          }
                          data-testid={`album-${event.id}`}
                          className={cn(
                            "rounded-md border-[1.5px] border-foreground px-3 py-2 text-body-sm font-semibold transition-colors",
                            active
                              ? "bg-accent text-foreground"
                              : "bg-card text-foreground hover:bg-secondary",
                          )}
                        >
                          {event.title}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setCreateAlbumOpen(true)}
                      className="btn-action btn-action-secondary min-h-9"
                    >
                      + New album
                    </button>
                  </div>
                  {activeDraft.eventId ? (
                    <p className="mt-3 text-caption text-muted-foreground">
                      Linked to{" "}
                      <span className="font-semibold text-foreground">
                        {getEventById(workspaceEvents, activeDraft.eventId)?.title ?? "album"}
                      </span>
                    </p>
                  ) : null}
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {activeDraft ? (
        <aside className="composer-preview-pane p-5 pb-16">
          <div className="flex flex-col gap-6">
            <ComposerPublishPlan
              draft={activeDraft}
              scheduleReasons={scheduleReasons[activeDraft.id]}
              onUpdateTime={updatePlatformSchedule}
              onSuggestTimes={suggestTimesOnly}
            />
            <ComposerPreviewRail
              draft={activeDraft}
              workspaceSlug={workspace.slug}
              workspaceInitials={workspace.initials}
            />
          </div>
        </aside>
      ) : null}

      {createAlbumOpen ? (
        <ScheduleEventModal
          date={today()}
          scheduledPosts={workspace.scheduledPosts}
          publishedPosts={workspace.publishedPosts}
          isAssociated={isAssociated}
          onCreate={(event) => {
            addEvent(event);
            updateActive((d) => ({ ...d, eventId: event.id }));
            setCreateAlbumOpen(false);
          }}
          onClose={() => setCreateAlbumOpen(false)}
        />
      ) : null}
    </div>
  );
}
