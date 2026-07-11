/**
 * Card detail — single-post cockpit for Library / Calendar / Queue.
 * Not used from Studio board flow (whiteboard stays on canvas).
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  Copy,
  Layers,
  Loader2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioBoardCard } from "@/components/studio/StudioBoardCard";
import { StudioScheduleShelf } from "@/components/studio/StudioScheduleShelf";
import { CardStatusBadge } from "@/components/ui/CardStatusBadge";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmtCompact } from "@/components/PerformanceMetricCounters";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import {
  cardCaption,
  cardHashtagList,
  cardPerformance,
  cardSourceFileRows,
  findWorkspaceCard,
  formatPublishWhen,
} from "@/lib/card-detail";
import {
  cardStatusFromPost,
  inferCardMediaType,
  platformDotColor,
  resolveAlbumLabel,
} from "@/lib/card-display";
import type { DraftPost } from "@/lib/composer-draft";
import { applyProposedTimes } from "@/lib/composer-draft";
import { getEventById } from "@/lib/events/display";
import type { Platform, PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { isPublishedPost, type PostDetailSource } from "@/lib/post-detail";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { draftFromPostDetail } from "@/lib/republish";
import {
  applyCadencePreset,
  combineDateAndTime,
  toDateInputValue,
  toTimeInputValue,
} from "@/lib/schedule-engine";
import { buildPlatformSlots } from "@/lib/schedule-display";
import { inferMediaAspect, inferMediaKind } from "@/lib/scheduled-post-display";
import {
  generateCallToAction,
  generateCaptionWithHashtags,
  generateTranscript,
} from "@/lib/studio-ai";
import { boardsContainingCardId } from "@/lib/studio-boards";
import { useWorkspace } from "@/lib/workspace-context";
import type { ContentEvent, WorkspaceId, WorkspaceProfile } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

export type CardDetailOrigin =
  | "queue"
  | "calendar"
  | "analytics"
  | "event"
  | "album"
  | "library";

const CARD_DETAIL_ORIGINS: readonly CardDetailOrigin[] = [
  "queue",
  "calendar",
  "analytics",
  "event",
  "album",
  "library",
];

type CardDetailSearch = { from?: CardDetailOrigin };

export const Route = createFileRoute("/card/$cardId")({
  validateSearch: (search: Record<string, unknown>): CardDetailSearch => ({
    from:
      typeof search.from === "string" &&
      CARD_DETAIL_ORIGINS.includes(search.from as CardDetailOrigin)
        ? (search.from as CardDetailOrigin)
        : undefined,
  }),
  head: ({ params }) => ({
    meta: [{ title: `Card — ${params.cardId} — TORCC OmniPresence` }],
  }),
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const { from } = Route.useSearch();
  const {
    workspace,
    workspaceId,
    removeScheduledPost,
    upsertScheduledPost,
    addScheduledPosts,
  } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const { resolveEventId } = useEventAssociations(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const post = findWorkspaceCard(workspace, cardId);

  if (!post) {
    return (
      <div className="page-content">
        <EmptyState
          title="Card not found"
          description="This content card may have been removed or belongs to another workspace."
          action={
            <Link to="/" className="btn-action-primary btn-action">
              Back to queue
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <CardDetailView
      key={post.id}
      post={post}
      events={events}
      workspace={workspace}
      workspaceId={workspaceId}
      origin={from}
      resolveEventId={resolveEventId}
      removeScheduledPost={removeScheduledPost}
      upsertScheduledPost={upsertScheduledPost}
      addScheduledPosts={addScheduledPosts}
    />
  );
}

type EditState = {
  title: string;
  caption: string;
  hashtags: string;
  transcript: string;
  callToAction: string;
  platforms: Platform[];
  platformTimes: Partial<Record<Platform, string>>;
  platformTitles: Partial<Record<Platform, string>>;
  platformCaptions: Partial<Record<Platform, string>>;
  platformHashtags: Partial<Record<Platform, string>>;
  eventId?: string;
};

function postToEditState(post: PostDetailSource): EditState {
  const p = post as ScheduledPost;
  return {
    title: post.title,
    caption: cardCaption(post),
    hashtags: post.hashtags?.trim() || cardHashtagList(post).join(" "),
    transcript: p.transcript ?? "",
    callToAction: p.callToAction ?? "",
    platforms: [...post.platforms],
    platformTimes: { ...(p.platformTimes ?? {}) },
    platformTitles: { ...(p.platformTitles ?? {}) },
    platformCaptions: { ...(p.platformCaptions ?? {}) },
    platformHashtags: { ...(p.platformHashtags ?? {}) },
    eventId: post.eventId,
  };
}

function CardDetailView({
  post,
  events,
  workspace,
  workspaceId,
  origin,
  resolveEventId,
  removeScheduledPost,
  upsertScheduledPost,
  addScheduledPosts,
}: {
  post: PostDetailSource;
  events: ContentEvent[];
  workspace: WorkspaceProfile;
  workspaceId: WorkspaceId;
  origin?: CardDetailOrigin;
  resolveEventId: (post: Pick<PostDetailSource, "id" | "eventId">) => string | undefined;
  removeScheduledPost: (postId: string) => void;
  upsertScheduledPost: (post: ScheduledPost) => void | Promise<void>;
  addScheduledPosts: (posts: ScheduledPost[]) => void | Promise<void>;
}) {
  const navigate = useNavigate();
  const published = isPublishedPost(post);
  const publishedPost = published ? (post as PublishedPost) : null;
  const scheduled = !published ? (post as ScheduledPost) : null;
  const canEditScheduled =
    !published &&
    (scheduled?.status === "scheduled" ||
      scheduled?.status === "draft" ||
      scheduled?.status === "failed");

  const status = published
    ? ("LIVE" as const)
    : cardStatusFromPost(post as ScheduledPost);
  const eventId = resolveEventId(post) ?? post.eventId;
  const linkedEvent = eventId ? getEventById(events, eventId) : undefined;
  const albumLabel = resolveAlbumLabel(post, events);
  const mediaKind = inferMediaKind(post.title);
  const mediaType = inferCardMediaType(post.title, mediaKind);
  const aspect =
    inferMediaAspect(post.title, mediaKind) === "9/16" ? "portrait" : "video";
  const perf = cardPerformance(post);
  const metaRows = cardSourceFileRows(post);

  const [edit, setEdit] = useState<EditState>(() => postToEditState(post));
  const [reuseDraft, setReuseDraft] = useState<DraftPost | null>(null);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [shelfWidth, setShelfWidth] = useState(0);
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [timesBusy, setTimesBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [openTranscript, setOpenTranscript] = useState(false);
  const [openCta, setOpenCta] = useState(false);

  const boardsUsed = useMemo(
    () => boardsContainingCardId(workspaceId, post.id),
    [workspaceId, post.id],
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => {
    setEdit(postToEditState(post));
    setReuseDraft(null);
    setShelfOpen(false);
  }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeDraft = reuseDraft;
  /** Editing the existing scheduled/draft card (not a duplicate session). */
  const workingAsScheduled = !reuseDraft && canEditScheduled;
  /** Live card from library — can edit post-publish copy, not times/media. */
  const isLiveEdit = published && !reuseDraft;
  /** Title, caption, hashtags, transcript, CTA, platform overrides */
  const canEditCopy = Boolean(reuseDraft) || workingAsScheduled || isLiveEdit;
  /** Platform publish times — only scheduled or reuse draft */
  const canEditTimes = Boolean(reuseDraft) || workingAsScheduled;
  const canSave = workingAsScheduled || isLiveEdit;

  const slots = useMemo(() => {
    const platforms = activeDraft?.platforms ?? edit.platforms;
    const times = activeDraft?.proposedTimes ?? edit.platformTimes;
    const date =
      activeDraft?.proposedTimes &&
      Object.values(activeDraft.proposedTimes).filter(Boolean)[0]
        ? (Object.values(activeDraft.proposedTimes).filter(Boolean)[0] as string)
        : post.date;
    return buildPlatformSlots(platforms, times, date);
  }, [activeDraft, edit.platforms, edit.platformTimes, post.date]);

  function patchEdit(partial: Partial<EditState>) {
    setEdit((e) => ({ ...e, ...partial }));
  }

  function patchReuse(updater: (d: DraftPost) => DraftPost) {
    setReuseDraft((d) => (d ? updater(d) : d));
  }

  async function saveInPlace() {
    if (!canSave) return;
    const times = edit.platformTimes;
    const isos = edit.platforms
      .map((p) => times[p])
      .filter(Boolean) as string[];
    const baseDate =
      isos.length > 0
        ? isos.slice().sort()[0]!
        : scheduled?.date ?? publishedPost?.date ?? post.date;

    // Live posts: store as scheduled row with status published so library finds updates first
    const next: ScheduledPost = {
      id: post.id,
      title: edit.title.trim() || post.title,
      caption: edit.caption,
      hashtags: edit.hashtags,
      transcript: edit.transcript || undefined,
      callToAction: edit.callToAction || undefined,
      platforms: edit.platforms,
      platformTimes: canEditTimes ? edit.platformTimes : scheduled?.platformTimes ?? publishedPost?.platformTimes,
      platformTitles: edit.platformTitles,
      platformCaptions: edit.platformCaptions,
      platformHashtags: edit.platformHashtags,
      eventId: edit.eventId ?? post.eventId,
      date: canEditTimes ? baseDate : post.date,
      status: published ? "published" : scheduled?.status ?? "scheduled",
      dropboxUrl: "dropboxUrl" in post ? post.dropboxUrl : undefined,
      dropboxDirectUrl: "dropboxDirectUrl" in post ? post.dropboxDirectUrl : undefined,
      previewUrl: "previewUrl" in post ? post.previewUrl : undefined,
      sourceCardId:
        "sourceCardId" in post
          ? (post as ScheduledPost).sourceCardId
          : undefined,
    };
    await upsertScheduledPost(next);
    showToast(
      published
        ? "Copy updated in OmniPresence — re-sync to networks if needed"
        : "Changes saved",
    );
  }

  function startDuplicateReuse() {
    const draft = draftFromPostDetail(post, {
      allowedPlatforms: workspace.platforms,
      eventId: eventId,
    });
    // Carry local edits if user tweaked before duplicating
    const enriched: DraftPost = {
      ...draft,
      title: edit.title,
      caption: edit.caption,
      hashtags: edit.hashtags,
      transcript: edit.transcript,
      callToAction: edit.callToAction,
      platformTitles: edit.platformTitles,
      platformCaptions: edit.platformCaptions,
      platformHashtags: edit.platformHashtags,
      eventId: edit.eventId ?? eventId,
      sourceCardId: post.id,
    };
    setReuseDraft(enriched);
    setOpenTranscript(Boolean(enriched.transcript?.trim()));
    setOpenCta(Boolean(enriched.callToAction?.trim()) || Boolean(eventId));
    showToast("Duplicate ready — edit then Schedule");
  }

  function cancelReuse() {
    setReuseDraft(null);
    setShelfOpen(false);
  }

  async function runAiShared(kind: "transcript" | "caption" | "cta" | "all") {
    const base: DraftPost =
      reuseDraft ??
      ({
        ...draftFromPostDetail(post, {
          allowedPlatforms: workspace.platforms,
          eventId: edit.eventId ?? eventId,
        }),
        id: post.id,
        title: edit.title,
        caption: edit.caption,
        hashtags: edit.hashtags,
        transcript: edit.transcript,
        callToAction: edit.callToAction,
      } as DraftPost);

    setAiBusy(kind);
    try {
      let next = { ...base };
      if (kind === "transcript" || kind === "all") {
        next.transcript = await generateTranscript(next);
      }
      if ((kind === "cta" || kind === "all") && linkedEvent) {
        next.callToAction = await generateCallToAction(
          next,
          linkedEvent,
          workspace.voice,
        );
        next.eventId = linkedEvent.id;
      }
      if (kind === "caption" || kind === "all") {
        if (!next.transcript?.trim() && !next.callToAction?.trim()) {
          next.transcript = await generateTranscript(next);
        }
        const { draft: withCopy } = await generateCaptionWithHashtags(next, {
          scheduledPosts: workspace.scheduledPosts,
          queue: [],
          voice: workspace.voice,
          events,
          postingTimes: workspace.postingTimes,
        });
        next.caption = withCopy.caption;
        next.hashtags = withCopy.hashtags;
      }

      if (reuseDraft) {
        setReuseDraft(next);
      } else {
        patchEdit({
          title: next.title ?? edit.title,
          caption: next.caption,
          hashtags: next.hashtags,
          transcript: next.transcript,
          callToAction: next.callToAction ?? "",
          eventId: next.eventId,
        });
        if (next.transcript) setOpenTranscript(true);
        if (next.callToAction) setOpenCta(true);
      }
      showToast("AI update ready");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiBusy(null);
    }
  }

  async function runAiPlatform(platform: Platform, field: "caption" | "hashtags") {
    const baseTitle = reuseDraft?.title ?? edit.title;
    const baseCap =
      (reuseDraft
        ? reuseDraft.platformCaptions?.[platform] ?? reuseDraft.caption
        : edit.platformCaptions[platform] ?? edit.caption) || baseTitle;
    setAiBusy(`${platform}-${field}`);
    try {
      const draftLike: DraftPost = {
        ...draftFromPostDetail(post, { allowedPlatforms: [platform] }),
        id: `tmp-${platform}`,
        title: baseTitle,
        caption: baseCap,
        hashtags:
          (reuseDraft
            ? reuseDraft.platformHashtags?.[platform] ?? reuseDraft.hashtags
            : edit.platformHashtags[platform] ?? edit.hashtags) || "",
        transcript: reuseDraft?.transcript ?? edit.transcript,
        callToAction: reuseDraft?.callToAction ?? edit.callToAction,
        platforms: [platform],
      };
      const { draft: withCopy } = await generateCaptionWithHashtags(draftLike, {
        scheduledPosts: workspace.scheduledPosts,
        queue: [],
        voice: workspace.voice,
        events,
        postingTimes: workspace.postingTimes,
      });
      if (reuseDraft) {
        patchReuse((d) => ({
          ...d,
          platformCaptions:
            field === "caption"
              ? { ...d.platformCaptions, [platform]: withCopy.caption }
              : d.platformCaptions,
          platformHashtags:
            field === "hashtags"
              ? { ...d.platformHashtags, [platform]: withCopy.hashtags }
              : d.platformHashtags,
        }));
      } else {
        if (field === "caption") {
          patchEdit({
            platformCaptions: {
              ...edit.platformCaptions,
              [platform]: withCopy.caption,
            },
          });
        } else {
          patchEdit({
            platformHashtags: {
              ...edit.platformHashtags,
              [platform]: withCopy.hashtags,
            },
          });
        }
      }
      showToast(`${platform} ${field} draft ready`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "AI failed");
    } finally {
      setAiBusy(null);
    }
  }

  function applyBestTimes() {
    if (!reuseDraft) return;
    setTimesBusy(true);
    try {
      const { byFile } = applyCadencePreset(
        [reuseDraft],
        "peak",
        workspace.scheduledPosts,
        workspace.postingTimes,
      );
      const times = byFile[reuseDraft.id];
      if (times) {
        setReuseDraft((d) => (d ? applyProposedTimes(d, times) : d));
      }
      showToast("Peak times applied");
    } finally {
      setTimesBusy(false);
    }
  }

  async function commitReuse() {
    if (!reuseDraft) return;
    const scheduledPost = draftToScheduledPost(reuseDraft);
    if (!scheduledPost) {
      showToast("Set platforms and times first");
      return;
    }
    await addScheduledPosts([scheduledPost]);
    setShelfOpen(false);
    setReuseDraft(null);
    showToast("Scheduled — original card unchanged");
    navigate({ to: "/card/$cardId", params: { cardId: scheduledPost.id }, search: { from: "library" } });
  }

  function deleteCard() {
    if (!published) removeScheduledPost(post.id);
    navigate({ to: origin === "library" ? "/library" : "/" });
  }

  const fromEvent = (origin === "event" || origin === "album") && linkedEvent;
  const backLabel =
    origin === "calendar"
      ? "Calendar"
      : origin === "analytics"
        ? "Analytics"
        : origin === "library"
          ? "Library"
          : fromEvent
            ? "Events"
            : "Queue";

  function goBack() {
    if (origin === "calendar") navigate({ to: "/calendar" });
    else if (origin === "analytics") navigate({ to: "/analytics" });
    else if (origin === "library") navigate({ to: "/library" });
    else if (fromEvent && linkedEvent)
      navigate({ to: "/events", search: { event: linkedEvent.id } });
    else navigate({ to: "/" });
  }

  const displayTitle = reuseDraft?.title ?? edit.title;
  const displayCaption = reuseDraft?.caption ?? edit.caption;
  const displayHashtags = reuseDraft?.hashtags ?? edit.hashtags;
  const displayTranscript = reuseDraft?.transcript ?? edit.transcript;
  const displayCta = reuseDraft?.callToAction ?? edit.callToAction;

  const fieldClass =
    "w-full rounded-md border border-line bg-paper-2 px-3 py-2 text-sm text-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15 disabled:opacity-60";

  return (
    <div className="relative">
      <div className="page-header flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <button
            type="button"
            onClick={goBack}
            className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
          >
            ← {backLabel}
          </button>
          <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em] text-accent">
              {albumLabel}
            </span>
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
            <CardStatusBadge status={status} />
            {reuseDraft ? (
              <span className="rounded-md border border-brand/30 bg-brand-soft px-2 py-0.5 font-mono text-[0.6rem] font-bold uppercase text-foreground">
                Duplicate — original stays as-is
              </span>
            ) : workingAsScheduled ? (
              <span className="font-mono text-[0.6rem] font-semibold uppercase text-muted-foreground">
                Editing scheduled card
              </span>
            ) : isLiveEdit ? (
              <span className="font-mono text-[0.6rem] font-semibold uppercase text-muted-foreground">
                Live — copy editable · times fixed
              </span>
            ) : null}
          </div>
          <h1 className="page-title mt-2 text-[2.125rem]">{displayTitle}</h1>
          {isLiveEdit ? (
            <p className="mt-2 max-w-xl text-xs text-muted-foreground">
              You can edit title, caption, hashtags, transcript, and CTA the way
              networks usually allow after posting. Publish times and media stay
              fixed. Updates save in OmniPresence — re-sync to social if needed.
              Use <strong>Duplicate & reuse</strong> to repost.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {canSave ? (
            <button
              type="button"
              onClick={() => void saveInPlace()}
              className="btn-action-primary btn-action"
              data-testid="card-save-changes"
            >
              Save changes
            </button>
          ) : null}
          <button
            type="button"
            onClick={startDuplicateReuse}
            className={cn(
              "btn-action inline-flex items-center gap-2",
              !canSave && "btn-action-primary",
            )}
            data-testid="card-duplicate-reuse"
          >
            <Copy className="h-4 w-4" />
            Duplicate & reuse
          </button>
          {!published ? (
            <button
              type="button"
              onClick={deleteCard}
              title="Delete"
              className="btn-action h-[42px] w-[42px] justify-center p-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="page-content pb-28">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-4">
            <section className="panel overflow-hidden">
              <CardThumbnail
                post={post}
                alt={displayTitle}
                kind={mediaKind}
                aspect={aspect}
                layout="block"
                mediaType={mediaType}
                className={`${aspect === "portrait" ? "!aspect-[9/16]" : "!aspect-video"} max-h-[520px] w-full !border-0`}
              />
            </section>

            {/* Title */}
            <section className="panel space-y-2 p-[18px]">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                  Title
                </span>
              </div>
              <input
                type="text"
                value={displayTitle}
                disabled={!canEditCopy}
                onChange={(e) =>
                  reuseDraft
                    ? patchReuse((d) => ({ ...d, title: e.target.value }))
                    : patchEdit({ title: e.target.value })
                }
                className={fieldClass}
              />
            </section>

            {/* Transcript */}
            <section className="panel overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenTranscript((o) => !o)}
                className="flex w-full items-center justify-between px-[18px] py-3 text-left"
              >
                <span className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                  Transcript
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    openTranscript && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200 ease-out",
                  openTranscript ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-2 px-[18px] pb-[18px]">
                    <textarea
                      value={displayTranscript}
                      disabled={!canEditCopy}
                      onChange={(e) =>
                        reuseDraft
                          ? patchReuse((d) => ({
                              ...d,
                              transcript: e.target.value,
                            }))
                          : patchEdit({ transcript: e.target.value })
                      }
                      rows={5}
                      className={cn(fieldClass, "font-mono text-xs")}
                      placeholder="Script / spoken outline…"
                    />
                    {!!canEditCopy ? (
                      <button
                        type="button"
                        disabled={aiBusy != null}
                        onClick={() => void runAiShared("transcript")}
                        className="btn-action btn-action-secondary min-h-9 text-caption"
                      >
                        {aiBusy === "transcript" || aiBusy === "all" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        AI transcript
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {/* Caption + hashtags */}
            <section className="panel space-y-3 p-[18px]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                  Caption & hashtags
                </span>
                {!!canEditCopy ? (
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={aiBusy != null}
                      onClick={() => void runAiShared("caption")}
                      className="btn-action btn-action-secondary min-h-8 text-caption"
                    >
                      {aiBusy === "caption" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI caption
                    </button>
                    <button
                      type="button"
                      disabled={aiBusy != null}
                      onClick={() => void runAiShared("all")}
                      className="btn-action btn-action-secondary min-h-8 text-caption"
                    >
                      {aiBusy === "all" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      AI all
                    </button>
                  </div>
                ) : null}
              </div>
              <textarea
                value={displayCaption}
                disabled={!canEditCopy}
                onChange={(e) =>
                  reuseDraft
                    ? patchReuse((d) => ({ ...d, caption: e.target.value }))
                    : patchEdit({ caption: e.target.value })
                }
                rows={4}
                className={fieldClass}
              />
              <input
                type="text"
                value={displayHashtags}
                disabled={!canEditCopy}
                onChange={(e) =>
                  reuseDraft
                    ? patchReuse((d) => ({ ...d, hashtags: e.target.value }))
                    : patchEdit({ hashtags: e.target.value })
                }
                className={fieldClass}
                placeholder="#hashtags"
              />
              {!canEditCopy ? (
                <div className="flex flex-wrap gap-1.5">
                  {cardHashtagList(post).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-line px-2 py-1.5 font-mono text-[0.6875rem] font-semibold text-accent"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>

            {/* CTA */}
            <section className="panel overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenCta((o) => !o)}
                className="flex w-full items-center justify-between px-[18px] py-3 text-left"
              >
                <span className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                  Call to action
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    openCta && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-200",
                  openCta ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="space-y-2 px-[18px] pb-[18px]">
                    <input
                      type="text"
                      value={displayCta}
                      disabled={!canEditCopy}
                      onChange={(e) =>
                        reuseDraft
                          ? patchReuse((d) => ({
                              ...d,
                              callToAction: e.target.value,
                            }))
                          : patchEdit({ callToAction: e.target.value })
                      }
                      className={fieldClass}
                      placeholder="Join us Sunday · Link in bio…"
                    />
                    {!!canEditCopy && linkedEvent ? (
                      <button
                        type="button"
                        disabled={aiBusy != null}
                        onClick={() => void runAiShared("cta")}
                        className="btn-action btn-action-secondary min-h-9 text-caption"
                      >
                        {aiBusy === "cta" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        AI CTA from {linkedEvent.title}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="panel p-[18px]">
              <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                Source file
              </div>
              <div className="flex flex-col gap-[1.5px] overflow-hidden rounded-lg border border-line bg-line">
                {metaRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 bg-card px-3 py-2.5"
                  >
                    <span className="shrink-0 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {row.key}
                    </span>
                    <span className="font-data text-xs font-semibold text-foreground">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-lg border border-line bg-foreground p-[18px]">
              <div className="mb-3.5 flex items-center justify-between gap-2">
                <span className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-white/70">
                  Card performance
                </span>
                <span
                  className={`text-[0.5625rem] font-medium uppercase tracking-[0.06em] ${
                    perf.published ? "text-success" : "text-white/55"
                  }`}
                >
                  {perf.published ? "Live" : "Not published yet"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                {(
                  [
                    ["Views", perf.views],
                    ["Engagement", perf.engagement],
                    ["Likes", perf.likes],
                    ["Shares", perf.shares],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <div className="font-display text-[1.875rem] font-semibold leading-none tracking-tight text-white">
                      {value}
                    </div>
                    <div className="mt-1 text-[0.5625rem] font-medium uppercase tracking-[0.06em] text-white/65">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Publishes accordion */}
            <section className="panel p-[18px]">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="font-display text-base font-bold text-foreground">
                  Publishes
                </span>
                <span className="font-mono text-[0.625rem] font-bold text-muted-foreground">
                  {slots.length} TOTAL
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {slots.map((slot) => {
                  const meta = PLATFORMS_BY_SHORT[slot.platform];
                  const open = expandedPlatform === slot.platform;
                  const canEditTime = canEditTimes;
                  const pTitle = reuseDraft
                    ? reuseDraft.platformTitles?.[slot.platform] ??
                      reuseDraft.title ??
                      ""
                    : edit.platformTitles[slot.platform] ?? edit.title;
                  const pCap = reuseDraft
                    ? reuseDraft.platformCaptions?.[slot.platform] ??
                      reuseDraft.caption
                    : edit.platformCaptions[slot.platform] ?? edit.caption;
                  const pTags = reuseDraft
                    ? reuseDraft.platformHashtags?.[slot.platform] ??
                      reuseDraft.hashtags
                    : edit.platformHashtags[slot.platform] ?? edit.hashtags;
                  const iso =
                    (reuseDraft?.proposedTimes ?? edit.platformTimes)[
                      slot.platform
                    ] ?? slot.iso;

                  return (
                    <div
                      key={slot.platform}
                      className="rounded-lg border border-line"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPlatform(open ? null : slot.platform)
                        }
                        className="flex w-full flex-wrap items-center gap-2 px-3 py-3 text-left"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            background: platformDotColor(slot.platform),
                          }}
                        />
                        <span className="text-[0.8125rem] font-bold text-foreground">
                          {meta?.full ?? slot.platform}
                        </span>
                        <span className="font-mono text-[0.6875rem] font-semibold text-muted-foreground">
                          {formatPublishWhen(iso)}
                        </span>
                        <CardStatusBadge
                          status={published && !reuseDraft ? "LIVE" : "SCHEDULED"}
                          className="ml-auto"
                        />
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </button>
                      {open ? (
                        <div className="space-y-2 border-t border-line px-3 py-3 animate-fade-in">
                          {canEditTime ? (
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="date"
                                value={toDateInputValue(new Date(iso))}
                                onChange={(e) => {
                                  const next = combineDateAndTime(
                                    e.target.value,
                                    toTimeInputValue(iso) || "12:00",
                                  );
                                  if (reuseDraft) {
                                    patchReuse((d) => ({
                                      ...d,
                                      proposedTimes: {
                                        ...d.proposedTimes,
                                        [slot.platform]: next,
                                      },
                                    }));
                                  } else {
                                    patchEdit({
                                      platformTimes: {
                                        ...edit.platformTimes,
                                        [slot.platform]: next,
                                      },
                                    });
                                  }
                                }}
                                className={cn(fieldClass, "flex-1")}
                              />
                              <input
                                type="time"
                                value={toTimeInputValue(iso)}
                                onChange={(e) => {
                                  const next = combineDateAndTime(
                                    toDateInputValue(new Date(iso)),
                                    e.target.value,
                                  );
                                  if (reuseDraft) {
                                    patchReuse((d) => ({
                                      ...d,
                                      proposedTimes: {
                                        ...d.proposedTimes,
                                        [slot.platform]: next,
                                      },
                                    }));
                                  } else {
                                    patchEdit({
                                      platformTimes: {
                                        ...edit.platformTimes,
                                        [slot.platform]: next,
                                      },
                                    });
                                  }
                                }}
                                className={cn(fieldClass, "w-[7rem]")}
                              />
                            </div>
                          ) : null}
                          <label className="block space-y-1">
                            <span className="text-[0.65rem] font-semibold text-muted-foreground">
                              Title override
                            </span>
                            <input
                              type="text"
                              value={pTitle ?? ""}
                              disabled={!canEditCopy}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (reuseDraft) {
                                  patchReuse((d) => ({
                                    ...d,
                                    platformTitles: {
                                      ...d.platformTitles,
                                      [slot.platform]: v,
                                    },
                                  }));
                                } else {
                                  patchEdit({
                                    platformTitles: {
                                      ...edit.platformTitles,
                                      [slot.platform]: v,
                                    },
                                  });
                                }
                              }}
                              className={fieldClass}
                              placeholder={displayTitle}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[0.65rem] font-semibold text-muted-foreground">
                              Caption override
                            </span>
                            <textarea
                              value={pCap ?? ""}
                              disabled={!canEditCopy}
                              rows={3}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (reuseDraft) {
                                  patchReuse((d) => ({
                                    ...d,
                                    platformCaptions: {
                                      ...d.platformCaptions,
                                      [slot.platform]: v,
                                    },
                                  }));
                                } else {
                                  patchEdit({
                                    platformCaptions: {
                                      ...edit.platformCaptions,
                                      [slot.platform]: v,
                                    },
                                  });
                                }
                              }}
                              className={fieldClass}
                            />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-[0.65rem] font-semibold text-muted-foreground">
                              Hashtags override
                            </span>
                            <input
                              type="text"
                              value={pTags ?? ""}
                              disabled={!canEditCopy}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (reuseDraft) {
                                  patchReuse((d) => ({
                                    ...d,
                                    platformHashtags: {
                                      ...d.platformHashtags,
                                      [slot.platform]: v,
                                    },
                                  }));
                                } else {
                                  patchEdit({
                                    platformHashtags: {
                                      ...edit.platformHashtags,
                                      [slot.platform]: v,
                                    },
                                  });
                                }
                              }}
                              className={fieldClass}
                            />
                          </label>
                          {!!canEditCopy ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={aiBusy != null}
                                onClick={() =>
                                  void runAiPlatform(slot.platform, "caption")
                                }
                                className="btn-action btn-action-secondary min-h-8 text-caption"
                              >
                                <Sparkles className="h-3 w-3" />
                                AI caption
                              </button>
                              <button
                                type="button"
                                disabled={aiBusy != null}
                                onClick={() =>
                                  void runAiPlatform(slot.platform, "hashtags")
                                }
                                className="btn-action btn-action-secondary min-h-8 text-caption"
                              >
                                <Sparkles className="h-3 w-3" />
                                AI hashtags
                              </button>
                            </div>
                          ) : null}
                          {publishedPost && !reuseDraft ? (
                            <div className="flex gap-4 border-t border-line pt-2">
                              <div>
                                <span className="font-display text-[0.9375rem] font-bold">
                                  {fmtCompact(publishedPost.views)}
                                </span>{" "}
                                <span className="font-mono text-[0.5625rem] font-semibold uppercase text-muted-foreground">
                                  Views
                                </span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Boards provenance */}
            <section className="panel p-[18px]">
              <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                Used on boards
              </div>
              {boardsUsed.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Not found on a Studio board yet (board cards keep this id when
                  scheduled from the whiteboard).
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {boardsUsed.map((b) => (
                    <StudioBoardCard
                      key={b.id}
                      board={b}
                      onOpen={() => navigate({ to: "/studio" })}
                    />
                  ))}
                </div>
              )}
            </section>

            {linkedEvent ? (
              <div className="panel space-y-2 p-4">
                <Link
                  to="/events"
                  search={{ event: linkedEvent.id }}
                  className="flex items-center gap-3 transition-colors hover:opacity-90"
                >
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-line bg-paper-2">
                    <Layers className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[0.5625rem] font-semibold uppercase text-muted-foreground">
                      Part of event
                    </span>
                    <span className="mt-1 block truncate font-display text-[0.9375rem] font-bold text-foreground">
                      {linkedEvent.title}
                    </span>
                  </span>
                  <span className="font-mono text-muted-foreground">→</span>
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {/* Reuse footer */}
      {reuseDraft ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 py-3 backdrop-blur-sm md:px-8">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Duplicating for a new schedule — original post stays unchanged.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cancelReuse}
                className="btn-action btn-action-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShelfOpen(true)}
                className="btn-action btn-action-primary !text-white"
                data-testid="card-schedule-reuse"
              >
                Schedule reuse
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reuseDraft ? (
        <StudioScheduleShelf
          open={shelfOpen}
          drafts={[reuseDraft]}
          focusId={reuseDraft.id}
          committedPosts={workspace.scheduledPosts}
          workspacePlatforms={workspace.platforms}
          busy={timesBusy}
          onClose={() => setShelfOpen(false)}
          onFocus={() => {}}
          onChangeDraft={(_id, updater) => patchReuse(updater)}
          onBestTimes={applyBestTimes}
          onCommit={() => void commitReuse()}
          onWidthChange={setShelfWidth}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-foreground px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)]"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
