import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScheduleEventModal } from "@/components/calendar/ScheduleEventModal";
import { DropboxLinkField } from "@/components/composer/DropboxLinkField";
import { ComposerQueueRail } from "@/components/composer/ComposerQueueRail";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { prepareBatchWithAi, prepareCardWithAi } from "@/lib/ai-schedule";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import {
  applyMeasuredDimensions,
  countHashtagsInText,
  defaultDraftFromDropbox,
  defaultDraftFromFile,
  formatMediaMeta,
  replaceDraftMedia,
  type DraftPost,
} from "@/lib/composer-draft";
import { humanAspectDescription, measureMediaFile } from "@/lib/media-aspect";
import {
  isDraftReadyToStage,
  readComposerShelf,
  stageDraftsAsReady,
  writeComposerShelf,
} from "@/lib/draft-storage";
import { getEventById } from "@/lib/events/display";
import {
  dismissRepublishDraft,
  normalizeRepublishDraft,
  peekRepublishDraft,
} from "@/lib/republish";
import { today } from "@/lib/demo-clock";
import { useWorkspace } from "@/lib/workspace-context";
import type { WorkspaceId } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";
import { CREATE } from "@/lib/create-actions";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "Reel studio — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Prepare reels — media, captions, platforms. Mark ready, then schedule on the Schedule page.",
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
  const { workspace, workspaceId } = useWorkspace();
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
  const [readyCount, setReadyCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiAllBusy, setAiAllBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const prevWorkspaceIdRef = useRef<WorkspaceId | null>(null);

  const activeDraft = queue[activeIndex] ?? null;
  const captionLimit = 2200;

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
    setQueue([draft]);
    setActiveIndex(0);
    const dismissId = window.setTimeout(() => dismissRepublishDraft(workspaceId), 0);
    return () => window.clearTimeout(dismissId);
  }, [workspaceId, republishFromNavigation]);

  useEffect(() => {
    if (prevWorkspaceIdRef.current === workspaceId) return;
    prevWorkspaceIdRef.current = workspaceId;
    if (peekRepublishDraft(workspaceId)) return;
    const shelf = readComposerShelf(workspaceId);
    setQueue(shelf.drafting);
    setReadyCount(shelf.ready.length);
    const idx = shelf.activeId
      ? Math.max(0, shelf.drafting.findIndex((d) => d.id === shelf.activeId))
      : 0;
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [workspaceId]);

  useEffect(() => {
    if (peekRepublishDraft(workspaceId)) return;
    const shelf = readComposerShelf(workspaceId);
    writeComposerShelf(workspaceId, queue, shelf.ready, shelf.savedDrafts);
    setReadyCount(shelf.ready.length);
  }, [workspaceId, queue, activeIndex]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files);
      if (arr.length === 0) return;
      // Compose only — platforms + times chosen on Schedule
      const created = arr.map((f) => defaultDraftFromFile(f, workspace.platforms));
      const startLen = queue.length;
      setQueue((cur) => [...cur, ...created]);
      setActiveIndex(startLen);
      // Measure real aspect ratios async
      void Promise.all(
        arr.map(async (file, i) => {
          const dims = await measureMediaFile(file);
          if (!dims) return;
          const draftId = created[i]?.id;
          if (!draftId) return;
          setQueue((cur) =>
            cur.map((d) =>
              d.id === draftId ? applyMeasuredDimensions(d, dims.width, dims.height) : d,
            ),
          );
        }),
      );
    },
    [queue, workspace.platforms],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  async function prepareActiveWithAi() {
    if (!activeDraft || aiBusy) return;
    setAiBusy(true);
    try {
      const { draft } = await prepareCardWithAi(activeDraft, {
        scheduledPosts: workspace.scheduledPosts,
        queue,
        postingTimes: workspace.postingTimes,
        voice: workspace.voice,
        events: workspaceEvents,
        fillTimes: false,
      });
      setQueue((cur) => cur.map((d) => (d.id === draft.id ? draft : d)));
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

  function markReady(ids: string[]) {
    setStageError(null);
    const targets = queue.filter((d) => ids.includes(d.id));
    const incomplete = targets.filter((d) => !isDraftReadyToStage(d));
    if (incomplete.length > 0) {
      setStageError(
        "Add media (or Dropbox) and a caption before marking ready.",
      );
      return;
    }
    const { drafting, ready } = stageDraftsAsReady(workspaceId, ids);
    setQueue(drafting);
    setReadyCount(ready.length);
    setActiveIndex((i) => Math.min(i, Math.max(0, drafting.length - 1)));
  }

  function markCurrentReady() {
    if (!activeDraft) return;
    markReady([activeDraft.id]);
  }

  function markAllReady() {
    markReady(queue.map((d) => d.id));
  }

  const canStageCurrent = activeDraft != null && isDraftReadyToStage(activeDraft);
  const stageableCount = queue.filter(isDraftReadyToStage).length;

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
        <div className="mx-auto w-full max-w-[760px] px-4 py-5 pb-28 md:px-6 md:pb-10">
          {/* Studio header — Buffer clarity + Opus batch power */}
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div className="min-w-0">
              <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Reel studio
              </p>
              <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight text-foreground md:text-[2rem]">
                {queue.length === 0
                  ? "Drop reels. Get them ready."
                  : `Prepare ${queue.length} reel${queue.length === 1 ? "" : "s"}`}
              </h1>
              <p className="mt-1.5 max-w-lg text-body-sm text-muted-foreground">
                Media, captions, platforms, events — then mark ready. Scheduling is a separate step.
              </p>
              {stageError ? (
                <p className="mt-2 text-sm font-medium text-destructive">{stageError}</p>
              ) : null}
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:min-w-[13rem] sm:items-end">
              {readyCount > 0 ? (
                <Link
                  to="/schedule"
                  className="btn-action btn-action-secondary justify-center"
                  data-testid="go-schedule-ready"
                >
                  Schedule ready ({readyCount}) →
                </Link>
              ) : null}
              {queue.length > 0 ? (
                <>
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
                      ? `AI ${batchProgress}`
                      : `AI prepare all${queue.length > 1 ? ` (${queue.length})` : ""}`}
                  </button>
                  <button
                    type="button"
                    onClick={stageableCount > 1 ? markAllReady : markCurrentReady}
                    disabled={stageableCount === 0 && !canStageCurrent}
                    data-testid="mark-ready-btn"
                    className="btn-action btn-action-primary !text-white disabled:opacity-50"
                  >
                    {stageableCount > 1
                      ? `Mark ${stageableCount} ready`
                      : canStageCurrent
                        ? "Mark ready"
                        : "Finish card to continue"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-action btn-action-primary !text-white"
                >
                  Add reels
                </button>
              )}
            </div>
          </header>

          {/* Mobile queue hint */}
          {queue.length > 0 ? (
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {queue.map((d, i) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={cn(
                    "shrink-0 rounded-md border border-foreground px-3 py-1.5 text-caption font-semibold",
                    i === activeIndex
                      ? "bg-foreground text-white"
                      : "bg-card text-foreground",
                  )}
                >
                  {i + 1}. {d.title?.slice(0, 16) || d.filename.slice(0, 16)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            {/* MEDIA */}
            <section className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="mb-3 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Media
              </div>
              {activeDraft ? (
                <div className="flex items-center gap-4 rounded-md border border-foreground bg-paper-2 px-4 py-4">
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
                    {activeDraft.aspectLabel ? (
                      <p className="mt-1.5 inline-flex rounded-md border border-line bg-background px-2 py-0.5 text-[0.65rem] font-medium text-foreground">
                        Detected {activeDraft.aspectLabel}
                        {activeDraft.aspectBucket
                          ? ` · ${humanAspectDescription(activeDraft.aspectBucket).split("—")[0]?.trim()}`
                          : ""}
                      </p>
                    ) : null}
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
                    "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-md border border-foreground bg-paper-2 px-5 py-10 text-center transition-colors hover:bg-secondary",
                    isDragging && "bg-secondary",
                  )}
                >
                  <p className="font-display text-xl font-semibold tracking-tight text-foreground">
                    Drop Sunday’s reels here
                  </p>
                  <p className="mt-2 max-w-md text-body-sm text-muted-foreground">
                    Multi-select 14 clips at once — or paste a Dropbox link below. Each file becomes
                    its own scheduled card.
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
              {activeDraft ? (
                <div className="mt-4 border-t border-line pt-4">
                  <DropboxLinkField
                    value={activeDraft.dropboxUrl}
                    directUrl={activeDraft.dropboxDirectUrl}
                    onResolved={(result) => {
                      updateActive((d) => ({
                        ...d,
                        dropboxUrl: result.shareUrl,
                        dropboxDirectUrl: result.directUrl,
                        // Prefer local blob preview when user uploaded a file
                        previewUrl: d.previewUrl?.startsWith("blob:")
                          ? d.previewUrl
                          : result.directUrl,
                        filename:
                          d.filename && d.filename !== "untitled"
                            ? d.filename
                            : result.filename ?? d.filename,
                        mediaKind:
                          result.mediaKind === "image" || result.mediaKind === "video"
                            ? result.mediaKind
                            : d.mediaKind,
                      }));
                    }}
                    onClear={() => {
                      updateActive((d) => ({
                        ...d,
                        dropboxUrl: undefined,
                        dropboxDirectUrl: undefined,
                        previewUrl: d.previewUrl?.startsWith("blob:") ? d.previewUrl : undefined,
                      }));
                    }}
                  />
                </div>
              ) : (
                <div className="mt-4 border-t border-line pt-4">
                  <DropboxLinkField
                    onResolved={(result) => {
                      const draft = defaultDraftFromDropbox(result, workspace.platforms);
                      const startLen = queue.length;
                      setQueue((cur) => [...cur, draft]);
                      setActiveIndex(startLen);
                    }}
                    onClear={() => {}}
                  />
                </div>
              )}
            </section>

            {activeDraft ? (
              <>
                {/* AI STRIP — first-class, black panel white copy */}
                <section className="rounded-md border border-foreground bg-foreground p-4 text-white shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-white">
                        AI prepare this reel
                      </p>
                      <p className="mt-0.5 text-caption text-white/65">
                        Caption + hashtags + best times — one click
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={prepareActiveWithAi}
                      disabled={aiBusy}
                      data-testid="generate-caption-btn"
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/30 bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-paper-2 disabled:opacity-50"
                    >
                      {aiBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {aiBusy ? "Preparing…" : "AI prepare"}
                    </button>
                  </div>
                </section>

                {/* COPY */}
                <section className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-3 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Caption
                  </div>
                  <input
                    type="text"
                    value={activeDraft.title ?? ""}
                    onChange={(e) => updateActive((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Card title"
                    data-testid="card-title-input"
                    className="mb-3 w-full border-0 border-b border-foreground/25 bg-transparent px-0 py-1 font-display text-lg font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
                  />
                  <textarea
                    value={activeDraft.caption}
                    onChange={(e) => updateActive((d) => ({ ...d, caption: e.target.value }))}
                    placeholder="Write your caption…"
                    rows={5}
                    data-testid="caption-input"
                    className="w-full resize-y rounded-md border border-foreground bg-paper-2 px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
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
                      className="mt-2 w-full resize-y rounded-md border border-foreground bg-background px-3.5 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  ) : null}
                </section>

                {/* EVENT */}
                <section className="rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-3 text-caption font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Event (optional)
                  </div>
                  <p className="mb-3 text-body-sm text-muted-foreground">
                    Link to a ministry moment so the calendar groups related reels.
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
                            "rounded-md border border-foreground px-3 py-2 text-body-sm font-semibold transition-colors",
                            active
                              ? "bg-foreground text-white"
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
                      + {CREATE.event}
                    </button>
                  </div>
                  {activeDraft.eventId ? (
                    <p className="mt-3 text-caption text-muted-foreground">
                      Linked to{" "}
                      <span className="font-semibold text-foreground">
                        {getEventById(workspaceEvents, activeDraft.eventId)?.title ?? "event"}
                      </span>
                    </p>
                  ) : null}
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>

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
