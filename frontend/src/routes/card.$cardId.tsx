import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Copy, Layers, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { CardStatusBadge } from "@/components/ui/CardStatusBadge";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { EmptyState } from "@/components/ui/EmptyState";
import { fmtCompact } from "@/components/PerformanceMetricCounters";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
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
import { getEventById } from "@/lib/events/display";
import { isPublishedPost, type PostDetailSource } from "@/lib/post-detail";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { draftFromPostDetail, stashRepublishDraft } from "@/lib/republish";
import { buildPlatformSlots } from "@/lib/schedule-display";
import { inferMediaAspect, inferMediaKind } from "@/lib/scheduled-post-display";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";
import type { ContentEvent, WorkspaceId, WorkspaceProfile } from "@/lib/workspaces/types";

export type CardDetailOrigin = "queue" | "calendar" | "analytics" | "event" | "album";

const CARD_DETAIL_ORIGINS: readonly CardDetailOrigin[] = [
  "queue",
  "calendar",
  "analytics",
  "event",
  "album", // legacy deep-link
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
  const { workspace, workspaceId, removeScheduledPost } = useWorkspace();
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
      post={post}
      events={events}
      workspace={workspace}
      workspaceId={workspaceId}
      origin={from}
      resolveEventId={resolveEventId}
      removeScheduledPost={removeScheduledPost}
    />
  );
}

function CardDetailView({
  post,
  events,
  workspace,
  workspaceId,
  origin,
  resolveEventId,
  removeScheduledPost,
}: {
  post: PostDetailSource;
  events: ContentEvent[];
  workspace: WorkspaceProfile;
  workspaceId: WorkspaceId;
  origin?: CardDetailOrigin;
  resolveEventId: (post: Pick<PostDetailSource, "id" | "eventId">) => string | undefined;
  removeScheduledPost: (postId: string) => void;
}) {
  const navigate = useNavigate();
  const published = isPublishedPost(post);
  const publishedPost = published ? (post as PublishedPost) : null;
  const status = published ? ("LIVE" as const) : cardStatusFromPost(post as ScheduledPost);
  const albumLabel = resolveAlbumLabel(post, events);
  const eventId = resolveEventId(post) ?? post.eventId;
  const linkedEvent = eventId ? getEventById(events, eventId) : undefined;
  const mediaKind = inferMediaKind(post.title);
  const mediaType = inferCardMediaType(post.title, mediaKind);
  const aspect = inferMediaAspect(post.title, mediaKind) === "9/16" ? "portrait" : "video";
  const perf = cardPerformance(post);
  const slots = buildPlatformSlots(post.platforms, post.platformTimes, post.date);
  const caption = cardCaption(post);
  const hashtags = cardHashtagList(post);
  const metaRows = cardSourceFileRows(post);

  function editCard() {
    const draft = draftFromPostDetail(post, {
      allowedPlatforms: workspace.platforms,
      eventId: eventId,
    });
    stashRepublishDraft(workspaceId, draft);
    navigate({ to: "/scheduler" });
  }

  function duplicateCard() {
    const draft = draftFromPostDetail(post, {
      allowedPlatforms: workspace.platforms,
      eventId: eventId,
    });
    stashRepublishDraft(workspaceId, { ...draft, id: `${draft.id}-copy` });
    navigate({ to: "/scheduler" });
  }

  function deleteCard() {
    if (!published) removeScheduledPost(post.id);
    navigate({ to: "/" });
  }

  const fromEvent = (origin === "event" || origin === "album") && linkedEvent;
  const backLabel =
    origin === "calendar"
      ? "Calendar"
      : origin === "analytics"
        ? "Analytics"
        : fromEvent
          ? "Events"
          : "Queue";

  function goBack() {
    if (origin === "calendar") {
      navigate({ to: "/calendar" });
    } else if (origin === "analytics") {
      navigate({ to: "/analytics" });
    } else if (fromEvent && linkedEvent) {
      navigate({ to: "/events", search: { event: linkedEvent.id } });
    } else {
      navigate({ to: "/" });
    }
  }

  return (
    <div>
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
          </div>
          <h1 className="page-title mt-2 text-[2.125rem]">{post.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={editCard}
            className="btn-action-primary btn-action"
          >
            Edit card
          </button>
          <button
            type="button"
            onClick={duplicateCard}
            title="Duplicate"
            className="btn-action h-[42px] w-[42px] justify-center p-0"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={deleteCard}
            title="Delete"
            className="btn-action h-[42px] w-[42px] justify-center p-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex flex-col gap-4">
            <section className="panel overflow-hidden">
              <CardThumbnail
                post={post}
                alt={post.title}
                kind={mediaKind}
                aspect={aspect}
                layout="block"
                mediaType={mediaType}
                className={`${aspect === "portrait" ? "!aspect-[9/16]" : "!aspect-video"} max-h-[520px] w-full !border-0`}
              />
            </section>

            <section className="panel p-[18px]">
              <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                CAPTION
              </div>
              <p className="text-[0.90625rem] leading-relaxed text-foreground">{caption}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-line px-2 py-1.5 font-mono text-[0.6875rem] font-semibold text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </section>

            <section className="panel p-[18px]">
              <div className="mb-3 font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
                SOURCE FILE
              </div>
              <div className="flex flex-col gap-[1.5px] overflow-hidden rounded-md border border-foreground bg-line">
                {metaRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 bg-card px-3 py-2.5"
                  >
                    <span className="shrink-0 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                      {row.key}
                    </span>
                    {row.key === "DROPBOX" ? (
                      <a
                        href={row.value}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 truncate text-xs font-medium text-foreground underline decoration-line underline-offset-2 hover:text-muted-foreground"
                        title={row.value}
                      >
                        {row.value.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    ) : (
                      <span className="font-data text-xs font-semibold text-foreground">
                        {row.value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-4">
            <section className="overflow-hidden rounded-lg border border-foreground bg-foreground p-[18px]">
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

            <section className="panel p-[18px]">
              <div className="mb-3.5 flex items-center justify-between">
                <span className="font-display text-base font-bold text-foreground">Publishes</span>
                <span className="font-mono text-[0.625rem] font-bold text-muted-foreground">
                  {slots.length} TOTAL
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {slots.map((slot) => {
                  const meta = PLATFORMS_BY_SHORT[slot.platform];
                  const publishStatus = published ? "LIVE" : "SCHEDULED";
                  return (
                    <div
                      key={slot.platform}
                      className="rounded-lg border border-foreground px-3 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: platformDotColor(slot.platform) }}
                        />
                        <span className="text-[0.8125rem] font-bold text-foreground">
                          {meta?.full ?? slot.platform}
                        </span>
                        <span className="font-mono text-[0.6875rem] font-semibold text-muted-foreground">
                          {formatPublishWhen(slot.iso)}
                        </span>
                        <CardStatusBadge
                          status={publishStatus === "LIVE" ? "LIVE" : "SCHEDULED"}
                          className="ml-auto"
                        />
                      </div>
                      {publishedPost ? (
                        <div className="mt-2.5 flex gap-4 border-t border-line pt-2.5">
                          <div>
                            <span className="font-display text-[0.9375rem] font-bold">
                              {fmtCompact(publishedPost.views)}
                            </span>{" "}
                            <span className="font-mono text-[0.5625rem] font-semibold uppercase text-muted-foreground">
                              Views
                            </span>
                          </div>
                          <div>
                            <span className="font-display text-[0.9375rem] font-bold">
                              {fmtCompact(publishedPost.likes)}
                            </span>{" "}
                            <span className="font-mono text-[0.5625rem] font-semibold uppercase text-muted-foreground">
                              Likes
                            </span>
                          </div>
                          <div>
                            <span className="font-display text-[0.9375rem] font-bold">
                              {fmtCompact(publishedPost.shares)}
                            </span>{" "}
                            <span className="font-mono text-[0.5625rem] font-semibold uppercase text-muted-foreground">
                              Shares
                            </span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={editCard}
                  className="rounded-md border border-foreground bg-card px-3 py-3 font-mono text-[0.6875rem] font-bold uppercase text-foreground hover:bg-secondary"
                >
                  + Add publish
                </button>
              </div>
            </section>

            {linkedEvent ? (
              <Link
                to="/events"
                search={{ event: linkedEvent.id }}
                className="panel flex items-center gap-3 p-4 transition-colors hover:bg-paper-2/40"
              >
                <span className="flex h-[34px] w-[34px] items-center justify-center rounded-md border border-foreground bg-paper-2">
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
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
