import { Link } from "@tanstack/react-router";
import { CalendarPlus, FilePlus, Layers, Link2, X } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventMeta, groupDayPostsByEvent } from "@/lib/events/display";
import {
  contentCardPublishSpread,
  scheduledPostPlatformEntries,
} from "@/lib/scheduled-post-display";
import { demoPreviewForPost } from "@/lib/demo-media";
import { PlatformChip } from "@/components/post/PlatformChip";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { CREATE } from "@/lib/create-actions";

/**
 * Clean day detail panel — events + cards for the selected day.
 * Create actions live here, not on every calendar cell.
 */
export function CalendarDayPanel({
  date,
  events,
  posts,
  resolveEventId,
  showUnlinkedOnly = false,
  onClose,
  onOpenPost,
  onOpenEvent,
  onAssociatePost,
  onCreateEvent,
}: {
  date: Date | null;
  events: ContentEvent[];
  posts: ScheduledPost[];
  resolveEventId: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  showUnlinkedOnly?: boolean;
  onClose: () => void;
  onOpenPost: (post: ScheduledPost) => void;
  onOpenEvent: (event: ContentEvent) => void;
  onAssociatePost: (post: ScheduledPost) => void;
  onCreateEvent: () => void;
}) {
  const filteredPosts = useMemo(() => {
    if (!showUnlinkedOnly) return posts;
    return posts.filter((p) => !resolveEventId(p));
  }, [posts, showUnlinkedOnly, resolveEventId]);

  const groups = useMemo(
    () => groupDayPostsByEvent(filteredPosts, events, resolveEventId),
    [filteredPosts, events, resolveEventId],
  );

  if (!date) {
    return (
      <aside
        data-testid="calendar-day-panel-empty"
        className="flex h-full min-h-[28rem] flex-col items-center justify-center rounded-md border border-foreground bg-card p-8 text-center shadow-[var(--shadow-card)]"
      >
        <p className="page-kicker">Day detail</p>
        <h2 className="mt-2 font-display text-xl font-bold text-foreground">Select a day</h2>
        <p className="mt-2 max-w-xs text-body-sm text-muted-foreground">
          Click any date to review cards and events, link uploads, or create new content for that
          day.
        </p>
      </aside>
    );
  }

  const heading = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <aside
      data-testid="calendar-day-panel"
      className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-md border border-foreground bg-card shadow-[var(--shadow-card)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-foreground px-5 py-4">
        <div className="min-w-0">
          <p className="page-kicker">Selected day</p>
          <h2 className="mt-1 font-display text-xl font-bold leading-tight text-foreground">
            {heading}
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {posts.length} card{posts.length === 1 ? "" : "s"} · {events.length} event
            {events.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day panel"
          className="rounded-md border border-foreground bg-paper-2 p-2 text-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex gap-2 border-b border-foreground px-4 py-3">
        <Link
          to="/scheduler"
          className="btn-action-primary btn-action min-h-9 flex-1 justify-center text-body-sm"
        >
          <FilePlus className="h-3.5 w-3.5" strokeWidth={2} />
          {CREATE.card}
        </Link>
        <Button type="button" variant="secondary" size="sm" className="min-h-9 flex-1" onClick={onCreateEvent}>
          <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
          {CREATE.event}
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        {/* Events first — primary organization model */}
        <section>
          <h3 className="mb-2 font-display text-sm font-bold text-foreground">Events</h3>
          {events.length === 0 ? (
            <p className="rounded-md border border-foreground/30 bg-paper-2 px-3 py-4 text-body-sm text-muted-foreground">
              No events on this day. Create one to group related cards (sermon, worship night,
              campaign…).
            </p>
          ) : (
            <ul className="space-y-2">
              {events.map((event) => {
                const linked = posts.filter((p) => resolveEventId(p) === event.id).length;
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      data-testid={`day-panel-event-${event.id}`}
                      onClick={() => onOpenEvent(event)}
                      className="flex w-full items-center gap-3 rounded-md border border-foreground bg-paper-2 px-3 py-3 text-left transition-colors hover:bg-secondary"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-foreground bg-foreground text-white">
                        <Layers className="h-4 w-4 text-white" strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm font-bold text-foreground">
                          {event.title}
                        </span>
                        <span className="mt-0.5 block text-caption text-muted-foreground">
                          {formatEventMeta(event.date, event.kind)} · {linked} card
                          {linked === 1 ? "" : "s"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Cards grouped by event association */}
        <section>
          <h3 className="mb-2 font-display text-sm font-bold text-foreground">Cards</h3>
          {filteredPosts.length === 0 ? (
            <p className="rounded-md border border-foreground/30 bg-paper-2 px-3 py-4 text-body-sm text-muted-foreground">
              {showUnlinkedOnly
                ? "All cards on this day are linked to an event."
                : "No cards scheduled this day."}
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.event?.id ?? "unassigned"}>
                  <p
                    className={cn(
                      "mb-2 text-caption font-semibold uppercase tracking-[0.06em]",
                      group.event ? "text-muted-foreground" : "text-warning",
                    )}
                  >
                    {group.event ? group.event.title : "Not linked to an event"}
                  </p>
                  <ul className="space-y-2">
                    {group.posts.map((post) => (
                      <li key={post.id}>
                        <DayPanelCardRow
                          post={post}
                          linked={Boolean(group.event)}
                          onOpen={() => onOpenPost(post)}
                          onAssociate={() => onAssociatePost(post)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}

function DayPanelCardRow({
  post,
  linked,
  onOpen,
  onAssociate,
}: {
  post: ScheduledPost;
  linked: boolean;
  onOpen: () => void;
  onAssociate: () => void;
}) {
  const entries = scheduledPostPlatformEntries(post);

  return (
    <div
      data-testid={`day-panel-card-${post.id}`}
      className="rounded-md border border-foreground bg-card p-2.5"
    >
      <div className="flex gap-3">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 gap-3 text-left">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-foreground bg-paper-2">
            <img
              src={demoPreviewForPost({ id: post.id, title: post.title })}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-bold text-foreground">
              {post.title}
            </span>
            <span className="mt-0.5 block text-caption text-muted-foreground">
              {contentCardPublishSpread(post)}
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAssociate();
          }}
          title={linked ? "Change event" : "Link to event"}
          className={cn(
            "flex shrink-0 flex-col items-center justify-center gap-1 rounded-md border border-foreground px-2 py-1.5 text-caption font-semibold transition-colors hover:bg-secondary",
            linked ? "bg-paper-2 text-foreground" : "bg-warning/15 text-foreground",
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          {linked ? "Event" : "Link"}
        </button>
      </div>
      {/* Atomic when & where — one row per platform publish */}
      <ul className="mt-2 space-y-1 border-t border-foreground/15 pt-2">
        {entries.map((e) => (
          <li
            key={e.platform}
            className="flex items-center justify-between gap-2 text-caption text-foreground"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <PlatformChip platform={e.platform} size="xs" />
              <span className="truncate font-medium">
                {PLATFORMS_BY_SHORT[e.platform]?.full ?? e.platform}
              </span>
            </span>
            <span className="shrink-0 font-data text-muted-foreground">
              {e.at ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
