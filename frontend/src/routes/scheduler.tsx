import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ScheduleEventModal } from "@/components/calendar/ScheduleEventModal";
import { ComposerPreviewRail } from "@/components/composer/ComposerPreviewRail";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import { aiGenerate } from "@/lib/ai-client";

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
import { PLATFORMS, PLATFORMS_BY_SHORT } from "@/lib/platforms";
import {
  combineDateAndTime,
  displayedSlotForPlatform,
  pendingSlotsFromQueue,
  toDateInputValue,
  toTimeInputValue,
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
        content: "Upload media, compose copy, and schedule across every channel.",
      },
    ],
  }),
  component: ComposePage,
});

type RepublishLocationState = {
  republishDraft?: DraftPost;
};

function SectionLabel({ n, title, action }: { n: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <div className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
        {n} · {title}
      </div>
      {action}
    </div>
  );
}

function formatChipDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatChipTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

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
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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

  const updateActive = useCallback((updater: (draft: DraftPost) => DraftPost) => {
    setQueue((cur) => {
      const idx = activeIndex;
      const draft = cur[idx];
      if (!draft) return cur;
      const next = cur.slice();
      next[idx] = updater(draft);
      return next;
    });
  }, [activeIndex]);

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
    const activeId = queue[activeIndex]?.id ?? null;
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

  async function generateCaption() {
    if (!activeDraft || aiBusy) return;
    setAiBusy(true);
    try {
      const event = activeDraft.eventId
        ? getEventById(workspaceEvents, activeDraft.eventId)
        : undefined;
      const eventContext = event ? `Album: "${event.title}". ` : "";
      const brief = `${eventContext}${activeDraft.transcript?.trim() || activeDraft.caption?.trim() || activeDraft.filename}`;
      const [caption, hashtags] = await Promise.all([
        aiGenerate({
          kind: "caption",
          brief,
          title: activeDraft.title ?? activeDraft.filename,
          platforms: activeDraft.platforms,
          tone: workspace.voice,
        }),
        aiGenerate({
          kind: "hashtags",
          brief,
          title: activeDraft.title ?? activeDraft.filename,
          platforms: activeDraft.platforms,
          tone: workspace.voice,
        }),
      ]);
      updateActive((d) => ({ ...d, caption, hashtags }));
    } finally {
      setAiBusy(false);
    }
  }

  async function generateAll() {
    if (aiAllBusy || queue.length === 0) return;
    setAiAllBusy(true);
    try {
      for (let i = 0; i < queue.length; i++) {
        const d = queue[i]!;
        const event = d.eventId ? getEventById(workspaceEvents, d.eventId) : undefined;
        const eventContext = event ? `Album: "${event.title}". ` : "";
        const brief = `${eventContext}${d.transcript?.trim() || d.caption?.trim() || d.filename}`;
        try {
          const [caption, hashtags] = await Promise.all([
            aiGenerate({
              kind: "caption",
              brief,
              title: d.title ?? d.filename,
              platforms: d.platforms,
              tone: workspace.voice,
            }),
            aiGenerate({
              kind: "hashtags",
              brief,
              title: d.title ?? d.filename,
              platforms: d.platforms,
              tone: workspace.voice,
            }),
          ]);
          setQueue((cur) =>
            cur.map((item) => (item.id === d.id ? { ...item, caption, hashtags } : item)),
          );
        } catch {
          /* skip failed item */
        }
      }
    } finally {
      setAiAllBusy(false);
    }
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
      navigate({ to: "/" });
      return;
    }

    setQueue(remaining);
    setActiveIndex((i) => Math.min(i, remaining.length - 1));
  }

  function goPrev() {
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  function goNext() {
    setActiveIndex((i) => Math.min(queue.length - 1, i + 1));
  }

  const canSchedule = activeDraft != null && draftToScheduledPost(activeDraft) != null;

  return (
    <div className="composer-shell min-h-0 flex-1" data-testid="compose-page">
      <div className="composer-editor-pane overflow-y-auto">
        <div className="page-content mx-auto max-w-[720px] px-4 py-6 md:px-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                to="/"
                className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Queue
              </Link>
              <h1 className="page-title mt-2">Compose a card</h1>
              <p className="mt-1.5 text-body-sm text-muted-foreground">
                One upload becomes one card — then schedule it across every channel.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {queue.length > 1 ? (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Card {activeIndex + 1} of {queue.length}
                  </span>
                  <button
                    type="button"
                    onClick={goPrev}
                    disabled={activeIndex === 0}
                    className="btn-action disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={activeIndex >= queue.length - 1}
                    className="btn-action disabled:opacity-40"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={generateAll}
                    disabled={aiAllBusy}
                    className="btn-action"
                    data-testid="generate-all-btn"
                  >
                    {aiAllBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Generate all
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
                Schedule {publishCount} publish{publishCount === 1 ? "" : "es"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* 01 · MEDIA */}
            <section className="panel p-[18px]">
              <SectionLabel n="01" title="MEDIA" />
              {activeDraft ? (
                <div className="flex items-center gap-4 rounded-md border-[1.5px] border-foreground bg-paper-2 px-5 py-5">
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
                    <div className="mt-1 font-mono text-[0.6875rem] font-medium text-muted-foreground">
                      {formatMediaMeta(activeDraft)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => replaceInputRef.current?.click()}
                    className="shrink-0 rounded-md border-[1.5px] border-foreground bg-card px-3 py-2 font-mono text-[0.6875rem] font-semibold uppercase transition-colors hover:bg-secondary"
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
                    "flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-md border-[1.5px] border-foreground bg-paper-2 px-5 py-8 text-center transition-colors hover:bg-secondary",
                    isDragging && "bg-accent/15",
                  )}
                >
                  <p className="font-display text-sm font-semibold text-foreground">
                    Drop files or click to browse
                  </p>
                  <p className="mt-1 font-mono text-[0.6875rem] text-muted-foreground">
                    Images and video · multiple files become multiple cards
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
                {/* 02 · CAPTION */}
                <section className="panel p-[18px]">
                  <SectionLabel
                    n="02"
                    title="CAPTION"
                    action={
                      <button
                        type="button"
                        onClick={generateCaption}
                        disabled={aiBusy}
                        data-testid="generate-caption-btn"
                        className="btn-action gap-1.5 py-1.5 text-[0.6875rem] disabled:opacity-50"
                      >
                        {aiBusy ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        Generate
                      </button>
                    }
                  />
                  <input
                    type="text"
                    value={activeDraft.title ?? ""}
                    onChange={(e) => updateActive((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Card title"
                    data-testid="card-title-input"
                    className="mb-3 w-full border-0 border-b-[1.5px] border-foreground/20 bg-transparent px-0 py-1 font-display text-lg font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none"
                  />
                  <textarea
                    value={activeDraft.caption}
                    onChange={(e) => updateActive((d) => ({ ...d, caption: e.target.value }))}
                    placeholder="Write your caption…"
                    rows={5}
                    data-testid="caption-input"
                    className="w-full resize-y rounded-md border-[1.5px] border-foreground bg-paper-2 px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <div className="mt-2 flex justify-between font-mono text-[0.6875rem] font-medium text-muted-foreground">
                    <span>HASHTAGS · {countHashtagsInText(activeDraft.caption)}</span>
                    <span>
                      {activeDraft.caption.length} / {captionLimit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTranscriptOpen((o) => !o)}
                    className="mt-4 flex w-full items-center gap-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    Transcript
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", transcriptOpen && "rotate-180")}
                    />
                  </button>
                  {transcriptOpen ? (
                    <textarea
                      value={activeDraft.transcript}
                      onChange={(e) =>
                        updateActive((d) => ({ ...d, transcript: e.target.value }))
                      }
                      placeholder="Paste source transcript for AI context…"
                      rows={4}
                      data-testid="transcript-input"
                      className="mt-2 w-full resize-y rounded-md border-[1.5px] border-foreground bg-background px-3.5 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40"
                    />
                  ) : null}
                </section>

                {/* 03 · PLATFORMS */}
                <section className="panel p-[18px]">
                  <SectionLabel n="03" title="PLATFORMS" />
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
                            "inline-flex items-center gap-2 rounded-md border-[1.5px] border-foreground px-3 py-2.5 text-[0.8125rem] font-semibold transition-colors",
                            active
                              ? "bg-accent text-foreground"
                              : "bg-card text-foreground hover:bg-secondary",
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: platformDotColor(meta.short) }}
                          />
                          {meta.full}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 04 · SCHEDULE */}
                <section className="panel p-[18px]">
                  <SectionLabel n="04" title="SCHEDULE" />
                  {activeDraft.platforms.length === 0 ? (
                    <p className="text-body-sm text-muted-foreground">
                      Select at least one platform above.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {activeDraft.platforms.map((platform) => {
                        const meta = PLATFORMS_BY_SHORT[platform];
                        const committed = activeDraft.proposedTimes?.[platform];
                        const displayed = displayedSlotForPlatform(platform, today(), undefined);
                        const slot = committed
                          ? {
                              dateValue: toDateInputValue(new Date(committed)),
                              timeValue: toTimeInputValue(committed),
                              iso: committed,
                            }
                          : displayed;

                        return (
                          <div
                            key={platform}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border-[1.5px] border-foreground px-3 py-2.5"
                            data-testid={`schedule-row-${platform.replace(/\s+/g, "-")}`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ background: platformDotColor(platform) }}
                              />
                              <span className="text-[0.8125rem] font-semibold text-foreground">
                                {meta?.full ?? platform}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="relative cursor-pointer">
                                <span className="rounded-md border-[1.5px] border-foreground bg-card px-2.5 py-1 font-mono text-[0.6875rem] font-semibold">
                                  {formatChipDate(slot.iso)}
                                </span>
                                <input
                                  type="date"
                                  value={slot.dateValue}
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    updatePlatformSchedule(platform, e.target.value, slot.timeValue);
                                  }}
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                />
                              </label>
                              <label className="relative cursor-pointer">
                                <span className="rounded-md border-[1.5px] border-foreground bg-card px-2.5 py-1 font-mono text-[0.6875rem] font-semibold">
                                  {formatChipTime(slot.iso)}
                                </span>
                                <input
                                  type="time"
                                  value={slot.timeValue}
                                  onChange={(e) => {
                                    if (!e.target.value) return;
                                    updatePlatformSchedule(platform, slot.dateValue, e.target.value);
                                  }}
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* 05 · ADD TO ALBUM */}
                <section className="panel p-[18px]">
                  <SectionLabel n="05" title="ADD TO ALBUM" />
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
                            "rounded-md border-[1.5px] border-foreground px-3 py-2 text-[0.8125rem] font-semibold transition-colors",
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
                      className="rounded-md border-[1.5px] border-foreground bg-card px-3 py-2 font-mono text-[0.6875rem] font-semibold uppercase text-foreground transition-colors hover:bg-secondary"
                    >
                      + New album
                    </button>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {activeDraft ? (
        <ComposerPreviewRail
          draft={activeDraft}
          workspaceSlug={workspace.slug}
          workspaceInitials={workspace.initials}
        />
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