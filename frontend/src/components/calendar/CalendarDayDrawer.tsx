import { useEffect, useMemo, useState } from "react";
import { Layers, Plus, X } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventMeta } from "@/lib/events/display";
import { ContentCardChip } from "@/components/post/ContentCardChip";
import { ScheduleEventAffordance } from "@/components/calendar/ScheduleEventAffordance";
import { groupDayPostsByEvent } from "@/lib/events/display";
import { Link } from "@tanstack/react-router";

type Tab = "posts" | "events";

export function CalendarDayDrawer({
  date,
  events,
  posts,
  resolveEventId,
  highlightUnassociated,
  isAssociated,
  onClose,
  onSelectPost,
  onAssociatePost,
  onSelectEvent,
  onCreateEvent,
}: {
  date: Date;
  events: ContentEvent[];
  posts: ScheduledPost[];
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  highlightUnassociated?: boolean;
  isAssociated?: (post: ScheduledPost) => boolean;
  onClose: () => void;
  onSelectPost: (post: ScheduledPost) => void;
  onAssociatePost?: (post: ScheduledPost, e: React.MouseEvent) => void;
  onSelectEvent: (event: ContentEvent) => void;
  onCreateEvent: () => void;
}) {
  const defaultTab: Tab = posts.length > 0 ? "posts" : events.length > 0 ? "events" : "posts";
  const [tab, setTab] = useState<Tab>(defaultTab);

  useEffect(() => {
    setTab(posts.length > 0 ? "posts" : events.length > 0 ? "events" : "posts");
  }, [date, posts.length, events.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = useMemo(() => {
    const ordered = groupDayPostsByEvent(posts, events, resolveEventId);
    const unassigned = ordered.filter((g) => g.event == null);
    const assigned = ordered.filter((g) => g.event != null);
    return [...unassigned, ...assigned];
  }, [posts, events, resolveEventId]);

  return (
    <aside
      data-testid="calendar-day-drawer"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-foreground bg-card md:top-0"
      style={{ top: "var(--sync-bar-height, 0px)" }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-foreground px-5 py-4">
        <div>
          <div className="page-kicker">
            {date.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase()} ·{" "}
            {date
              .toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              .toUpperCase()}
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">
            {posts.length} card{posts.length === 1 ? "" : "s"} scheduled
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"} ·{" "}
            {posts.reduce((n, p) => n + p.platforms.length, 0)} publishes
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day panel"
          className="rounded-md border border-foreground bg-card p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex border-b border-foreground">
        <button
          type="button"
          data-testid="day-drawer-tab-posts"
          onClick={() => setTab("posts")}
          className={`flex-1 px-4 py-3 text-body-sm font-semibold transition-colors ${
            tab === "posts"
              ? "border-b-2 border-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Posts ({posts.length})
        </button>
        <button
          type="button"
          data-testid="day-drawer-tab-events"
          onClick={() => setTab("events")}
          className={`flex-1 px-4 py-3 text-body-sm font-semibold transition-colors ${
            tab === "events"
              ? "border-b-2 border-accent text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Events ({events.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "posts" ? (
          posts.length === 0 ? (
            <div className="space-y-4">
              <p className="text-body-sm text-muted-foreground">No posts scheduled for this day.</p>
              <Link to="/scheduler" className="btn-action-primary btn-action w-full justify-center">
                <Plus className="h-3.5 w-3.5" />
                Create a post
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.event?.id ?? "unassigned"}>
                  {group.event ? (
                    <p className="mb-2 text-body-sm font-medium text-foreground">
                      {group.event.title}
                    </p>
                  ) : (
                    <p className="mb-2 text-body-sm text-warning">Unassigned media</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {group.posts.map((post) => (
                      <ContentCardChip
                        key={post.id}
                        post={post}
                        dense
                        associated={group.event != null}
                        highlightUnassociated={Boolean(
                          highlightUnassociated && isAssociated && !isAssociated(post),
                        )}
                        onOpen={() => onSelectPost(post)}
                        onAssociate={onAssociatePost ? (e) => onAssociatePost(post, e) : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : events.length === 0 ? (
          <div className="space-y-4">
            <p className="text-body-sm text-muted-foreground">No events on this day.</p>
            <ScheduleEventAffordance onClick={onCreateEvent} />
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  data-testid={`drawer-event-${event.id}`}
                  className="flex w-full items-center gap-3 rounded-md border border-foreground bg-card px-4 py-3 text-left transition-colors hover:bg-secondary"
                >
                  <Layers className="h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-foreground">{event.title}</span>
                    <span className="text-body-sm text-muted-foreground">
                      {formatEventMeta(event.date, event.kind)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            <li className="pt-2">
              <ScheduleEventAffordance onClick={onCreateEvent} />
            </li>
          </ul>
        )}
      </div>
    </aside>
  );
}
