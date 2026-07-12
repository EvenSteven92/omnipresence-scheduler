import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, ChevronDown, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { useWorkspace } from "@/lib/workspace-context";
import { todayStart } from "@/lib/demo-clock";
import {
  openCardDestination,
  resolveCardDestination,
} from "@/lib/card-navigation";
import { cardPerformance, formatPublishWhen } from "@/lib/card-detail";
import { isPublishedPost, type PostDetailSource } from "@/lib/post-detail";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import {
  contentCardAnchorDate,
  getAgendaContentCards,
  groupAgendaByDay,
  type AgendaBand,
} from "@/lib/scheduled-post-display";
import { cn } from "@/lib/utils";

function bandLabel(band: AgendaBand): string {
  switch (band) {
    case "past":
      return "Past";
    case "now":
      return "Now";
    case "later":
      return "Later";
  }
}

function mergeAgendaPosts(
  scheduled: ScheduledPost[],
  published: {
    id: string;
    title: string;
    platforms: ScheduledPost["platforms"];
    date: string;
    platformTimes?: ScheduledPost["platformTimes"];
    eventId?: string;
    caption?: string;
    hashtags?: string;
    views?: number;
    likes?: number;
    shares?: number;
    engagementRate?: number;
  }[],
): ScheduledPost[] {
  const byId = new Map<string, ScheduledPost>();
  for (const p of published) {
    byId.set(p.id, {
      id: p.id,
      title: p.title,
      platforms: p.platforms,
      date: p.date,
      platformTimes: p.platformTimes,
      status: "published",
      eventId: p.eventId,
      caption: p.caption,
      hashtags: p.hashtags,
      ...(p.views != null
        ? {
            views: p.views,
            likes: p.likes,
            shares: p.shares,
            engagementRate: p.engagementRate,
          }
        : {}),
    } as ScheduledPost);
  }
  for (const p of scheduled) {
    byId.set(p.id, p);
  }
  return getAgendaContentCards(Array.from(byId.values()));
}

function QueueCardInlineExpand({
  post,
  published,
  onOpenBoard,
  onFindInLibrary,
}: {
  post: ScheduledPost;
  published: PostDetailSource | null;
  onOpenBoard?: () => void;
  onFindInLibrary?: () => void;
}) {
  const platforms = post.platforms;
  const source = (published ?? post) as PostDetailSource;
  const perf = cardPerformance(source);
  const isLive =
    post.status === "published" || (published != null && isPublishedPost(published));

  return (
    <div
      className="animate-fade-in border-t border-line bg-paper-2/60 px-4 py-3"
      data-testid={`queue-inline-${post.id}`}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Schedule
          </p>
          {platforms.length === 0 ? (
            <p className="mt-1.5 text-xs text-muted-foreground">No platforms</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {platforms.map((p) => {
                const iso = post.platformTimes?.[p] ?? post.date;
                const meta = PLATFORMS_BY_SHORT[p];
                return (
                  <li
                    key={p}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-card px-2 py-1.5 text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {meta?.full ?? p}
                    </span>
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      {formatPublishWhen(iso)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {post.caption?.trim() ? (
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {post.caption.trim()}
            </p>
          ) : null}
        </div>
        <div>
          <p className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Performance
          </p>
          {!isLive ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Metrics appear after go-live.
            </p>
          ) : (
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  ["Views", perf.views],
                  ["Engagement", perf.engagement],
                  ["Likes", perf.likes],
                  ["Shares", perf.shares],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-md border border-line bg-card px-2 py-1.5"
                >
                  <div className="font-display text-sm font-bold text-foreground">
                    {value}
                  </div>
                  <div className="font-mono text-[0.55rem] font-semibold uppercase text-muted-foreground">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {onOpenBoard ? (
          <button
            type="button"
            onClick={onOpenBoard}
            className="btn-action btn-action-primary min-h-8 inline-flex items-center gap-1.5 !text-white text-caption"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open on board
          </button>
        ) : (
          <button
            type="button"
            onClick={onFindInLibrary}
            className="btn-action btn-action-secondary min-h-8 text-caption"
          >
            Find in Boards library
          </button>
        )}
      </div>
    </div>
  );
}

export function DashboardUpNextQueue() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const todayRef = useRef<HTMLElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const publishedById = useMemo(() => {
    const m = new Map(
      (workspace.publishedPosts ?? []).map((p) => [p.id, p as PostDetailSource]),
    );
    return m;
  }, [workspace.publishedPosts]);

  const agenda = useMemo(
    () =>
      mergeAgendaPosts(
        workspace.scheduledPosts,
        workspace.publishedPosts ?? [],
      ),
    [workspace.scheduledPosts, workspace.publishedPosts],
  );

  const dayGroups = useMemo(
    () => groupAgendaByDay(agenda, todayStart()),
    [agenda],
  );

  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({
        block: "start",
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, [dayGroups.length]);

  function handleOpen(cardId: string) {
    const dest = resolveCardDestination(workspaceId, cardId);
    if (dest.kind === "board") {
      // Has a board — jump there (Details chevron still expands in place)
      openCardDestination(workspaceId, cardId, navigate);
      return;
    }
    // No board — inline expand schedule/perf (never dead-end card detail)
    setExpandedId((id) => (id === cardId ? null : cardId));
  }

  let lastBand: AgendaBand | null = null;

  return (
    <section data-testid="dashboard-up-next" className="min-w-0">
      {agenda.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing on the agenda yet"
          description="Scheduled and published posts appear here as a full timeline — scroll back for history."
          action={
            <Link to="/studio" className="btn-action-primary btn-action">
              Create a card
            </Link>
          }
          className="border border-line bg-card py-10"
        />
      ) : (
        <div className="space-y-7">
          {dayGroups.map((group) => {
            const showBandHeader = group.band !== lastBand;
            lastBand = group.band;
            const publishCount = group.posts.reduce(
              (sum, p) => sum + p.platforms.length,
              0,
            );
            const weekday = group.date.toLocaleDateString(undefined, {
              weekday: "long",
            });
            const dateLabel = group.date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            return (
              <section
                key={group.date.toISOString()}
                ref={
                  group.isToday || (group.band === "now" && showBandHeader)
                    ? todayRef
                    : undefined
                }
                className={cn(group.band === "past" && "opacity-70")}
                data-agenda-band={group.band}
              >
                {showBandHeader ? (
                  <div
                    className={cn(
                      "mb-4 flex items-center gap-3 border-t-2 pt-4",
                      group.band === "past" && "border-line",
                      group.band === "now" && "border-foreground",
                      group.band === "later" && "border-line",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em]",
                        group.band === "now"
                          ? "bg-foreground text-white"
                          : "border border-line bg-paper-2 text-muted-foreground",
                      )}
                    >
                      {bandLabel(group.band)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.band === "past"
                        ? "Earlier posts"
                        : group.band === "now"
                          ? "Today through the next few days"
                          : "Further out"}
                    </span>
                  </div>
                ) : null}
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-display text-xl font-bold text-foreground">
                    {dateLabel}
                  </span>
                  <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {weekday}
                    {group.isToday ? " · Today" : ""}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[0.625rem] font-semibold text-muted-foreground">
                    {group.posts.length} card
                    {group.posts.length === 1 ? "" : "s"} · {publishCount}{" "}
                    publish{publishCount === 1 ? "" : "es"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.posts.map((post) => {
                    const expanded = expandedId === post.id;
                    const dest = resolveCardDestination(workspaceId, post.id);
                    return (
                      <div
                        key={post.id}
                        className={cn(
                          "overflow-hidden rounded-lg border border-line bg-card",
                          expanded && "ring-1 ring-foreground/15",
                        )}
                      >
                        <div className="relative">
                          <StreamContentCard
                            post={post}
                            testId={`up-next-${post.id}`}
                            onOpen={() => handleOpen(post.id)}
                          />
                          <button
                            type="button"
                            className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-md border border-line bg-card/95 px-2 py-1 font-mono text-[0.55rem] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId((id) =>
                                id === post.id ? null : post.id,
                              );
                            }}
                            data-testid={`queue-expand-${post.id}`}
                          >
                            <ChevronDown
                              className={cn(
                                "h-3 w-3 transition-transform",
                                expanded && "rotate-180",
                              )}
                            />
                            {expanded ? "Less" : "Details"}
                          </button>
                        </div>
                        {expanded ? (
                          <QueueCardInlineExpand
                            post={post}
                            published={publishedById.get(post.id) ?? null}
                            onOpenBoard={
                              dest.kind === "board"
                                ? () =>
                                    openCardDestination(
                                      workspaceId,
                                      post.id,
                                      navigate,
                                    )
                                : undefined
                            }
                            onFindInLibrary={
                              dest.kind === "library"
                                ? () =>
                                    openCardDestination(
                                      workspaceId,
                                      post.id,
                                      navigate,
                                    )
                                : undefined
                            }
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
