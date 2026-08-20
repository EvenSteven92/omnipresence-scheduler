import { Link } from "@tanstack/react-router";
import {
  CalendarPlus,
  ChevronDown,
  FilePlus,
  GripVertical,
  Layers,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventMeta } from "@/lib/events/display";
import {
  contentCardPublishSpread,
  scheduledPostPlatformEntries,
} from "@/lib/scheduled-post-display";
import { demoPreviewForPost } from "@/lib/demo-media";
import { PlatformChip } from "@/components/post/PlatformChip";
import { Button } from "@/components/ui/Button";
import { TrafficLight } from "@/components/ui/TrafficLight";
import { cardStatusFromPost } from "@/lib/card-display";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { CREATE } from "@/lib/create-actions";
import { DRAG_POST_TYPE } from "@/components/calendar/CalendarQueueView";
import { cn } from "@/lib/utils";

/**
 * Day detail panel — events as parents, cards nested underneath.
 * Drag a card onto an event to associate. Publish details collapse like Queue.
 */
export function CalendarDayPanel({
  date,
  events,
  posts,
  resolveEventId,
  onClose,
  onOpenPost,
  onOpenEvent,
  onAssociateToEvent,
  onCreateEvent,
  onCardDragState,
}: {
  date: Date | null;
  events: ContentEvent[];
  posts: ScheduledPost[];
  resolveEventId: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onClose: () => void;
  onOpenPost: (post: ScheduledPost) => void;
  onOpenEvent: (event: ContentEvent) => void;
  onAssociateToEvent: (postId: string, eventId: string) => void;
  onCreateEvent: () => void;
  /** Notify parent while dragging so month cells can highlight reschedule targets. */
  onCardDragState?: (postId: string | null) => void;
}) {
  const [dragOverEventId, setDragOverEventId] = useState<string | null>(null);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [collapsedEvents, setCollapsedEvents] = useState<Record<string, boolean>>(
    {},
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => +new Date(a.date) - +new Date(b.date),
      ),
    [events],
  );

  const postsByEvent = useMemo(() => {
    const map = new Map<string, ScheduledPost[]>();
    for (const e of sortedEvents) map.set(e.id, []);
    const unassigned: ScheduledPost[] = [];
    for (const p of posts) {
      const eid = resolveEventId(p);
      if (eid && map.has(eid)) {
        map.get(eid)!.push(p);
      } else if (eid) {
        // Linked to event not on this day — still show under unassigned for visibility
        unassigned.push(p);
      } else {
        unassigned.push(p);
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    }
    unassigned.sort((a, b) => +new Date(a.date) - +new Date(b.date));
    return { map, unassigned };
  }, [posts, sortedEvents, resolveEventId]);

  function handleDropOnEvent(e: React.DragEvent, eventId: string) {
    e.preventDefault();
    e.stopPropagation();
    const postId =
      e.dataTransfer.getData(DRAG_POST_TYPE) ||
      e.dataTransfer.getData("text/plain");
    setDragOverEventId(null);
    setDraggingPostId(null);
    if (postId) onAssociateToEvent(postId, eventId);
  }

  if (!date) {
    return (
      <aside
        data-testid="calendar-day-panel-empty"
        className="flex h-full min-h-[28rem] flex-col items-center justify-center rounded-lg border border-line bg-card p-8 text-center shadow-[var(--shadow-card)]"
      >
        <p className="page-kicker">Day detail</p>
        <h2 className="mt-2 font-display text-xl font-bold text-foreground">
          Select a day
        </h2>
        <p className="mt-2 max-w-xs text-body-sm text-muted-foreground">
          Click any date to review events and cards. Drag a card onto an event
          to nest it.
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
      className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-lg border border-line bg-card shadow-[var(--shadow-card)] animate-slide-in-right"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="page-kicker">Selected day</p>
          <h2 className="mt-1 font-display text-xl font-bold leading-tight text-foreground">
            {heading}
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            {posts.length} card{posts.length === 1 ? "" : "s"} · {events.length}{" "}
            event{events.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close day panel"
          className="rounded-lg border border-line bg-paper-2 p-2 text-foreground hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex shrink-0 gap-2 border-b border-line px-4 py-3">
        <Link
          to="/studio"
          className="btn-action-primary btn-action min-h-9 flex-1 justify-center text-body-sm"
        >
          <FilePlus className="h-3.5 w-3.5" strokeWidth={2} />
          {CREATE.card}
        </Link>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-9 flex-1"
          onClick={onCreateEvent}
        >
          <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
          {CREATE.event}
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {sortedEvents.length === 0 && postsByEvent.unassigned.length === 0 ? (
          <p className="rounded-lg border border-line/30 bg-paper-2 px-3 py-4 text-body-sm text-muted-foreground">
            Nothing on this day yet. Create an event or schedule a card.
          </p>
        ) : null}

        {sortedEvents.map((event) => {
          const nested = postsByEvent.map.get(event.id) ?? [];
          const isOpen = collapsedEvents[event.id] !== true;
          const isDrop = dragOverEventId === event.id;
          return (
            <section
              key={event.id}
              data-testid={`day-panel-event-block-${event.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "link";
                setDragOverEventId(event.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverEventId((id) => (id === event.id ? null : id));
                }
              }}
              onDrop={(e) => handleDropOnEvent(e, event.id)}
              className={cn(
                "rounded-lg border transition-colors",
                isDrop
                  ? "border-brand bg-brand-soft/40 ring-2 ring-brand/40"
                  : "border-line bg-paper-2/40",
              )}
            >
              <div className="flex items-stretch gap-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedEvents((m) => ({
                      ...m,
                      [event.id]: isOpen,
                    }))
                  }
                  className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary/60"
                  data-testid={`day-panel-event-${event.id}`}
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      !isOpen && "-rotate-90",
                    )}
                  />
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-foreground text-white">
                    <Layers className="h-3.5 w-3.5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-bold text-foreground">
                      {event.title}
                    </span>
                    <span className="mt-0.5 block text-caption text-muted-foreground">
                      {formatEventMeta(event.date, event.kind)} · {nested.length}{" "}
                      card{nested.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenEvent(event)}
                  className="shrink-0 self-center px-3 py-2 text-caption font-semibold text-muted-foreground hover:text-foreground"
                  title="Open event"
                >
                  Open
                </button>
              </div>

              {isOpen ? (
                <div className="space-y-2 border-t border-line px-2 py-2 pl-8">
                  {nested.length === 0 ? (
                    <div
                      className={cn(
                        "rounded-md border border-dashed px-3 py-4 text-center text-xs text-muted-foreground",
                        isDrop
                          ? "border-brand bg-brand-soft/30 text-foreground"
                          : "border-line bg-card/50",
                      )}
                    >
                      {isDrop
                        ? "Drop to add to this event"
                        : "Drop a card here to nest it under this event"}
                    </div>
                  ) : (
                    nested.map((post) => (
                      <DayPanelCardRow
                        key={post.id}
                        post={post}
                        dragging={draggingPostId === post.id}
                        onOpen={() => onOpenPost(post)}
                        onDragStart={() => {
                          setDraggingPostId(post.id);
                          onCardDragState?.(post.id);
                        }}
                        onDragEnd={() => {
                          setDraggingPostId(null);
                          setDragOverEventId(null);
                          onCardDragState?.(null);
                        }}
                      />
                    ))
                  )}
                </div>
              ) : null}
            </section>
          );
        })}

        {postsByEvent.unassigned.length > 0 ? (
          <section data-testid="day-panel-unassigned">
            <h3 className="mb-2 font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Not on an event
            </h3>
            <p className="mb-2 text-[0.65rem] text-muted-foreground">
              Drag onto an event above to nest it.
            </p>
            <ul className="space-y-2">
              {postsByEvent.unassigned.map((post) => (
                <li key={post.id}>
                  <DayPanelCardRow
                    post={post}
                    dragging={draggingPostId === post.id}
                    onOpen={() => onOpenPost(post)}
                    onDragStart={() => {
                      setDraggingPostId(post.id);
                      onCardDragState?.(post.id);
                    }}
                    onDragEnd={() => {
                      setDraggingPostId(null);
                      setDragOverEventId(null);
                      onCardDragState?.(null);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {sortedEvents.length === 0 && postsByEvent.unassigned.length > 0 ? (
          <p className="text-center text-xs text-muted-foreground">
            Create an event to group these cards, then drag them onto it.
          </p>
        ) : null}
      </div>
    </aside>
  );
}

function DayPanelCardRow({
  post,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  post: ScheduledPost;
  dragging?: boolean;
  onOpen: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const entries = scheduledPostPlatformEntries(post);
  const status = cardStatusFromPost(post);

  return (
    <div
      data-testid={`day-panel-card-${post.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_POST_TYPE, post.id);
        e.dataTransfer.setData("text/plain", post.id);
        e.dataTransfer.effectAllowed = "copyMove";
        onDragStart?.();
      }}
      onDragEnd={() => onDragEnd?.()}
      className={cn(
        "rounded-lg border border-line bg-card shadow-sm transition-opacity",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <span
          className="flex shrink-0 cursor-grab touch-none items-center self-stretch px-0.5 text-muted-foreground active:cursor-grabbing"
          title="Drag onto an event"
          aria-hidden
        >
          <GripVertical className="h-4 w-4" />
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 gap-2.5 text-left"
        >
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-paper-2">
            <img
              src={demoPreviewForPost({ id: post.id, title: post.title })}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute left-0.5 top-0.5">
              <TrafficLight status={status} size="sm" />
            </span>
          </span>
          <span className="min-w-0 flex-1 py-0.5">
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
            setDetailsOpen((o) => !o);
          }}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-paper-2 px-1.5 py-1 font-mono text-[0.55rem] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          data-testid={`day-panel-details-${post.id}`}
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              detailsOpen && "rotate-180",
            )}
          />
          Details
        </button>
      </div>
      {detailsOpen ? (
        <ul className="space-y-1 border-t border-line px-3 py-2 animate-fade-in">
          {entries.map((entry) => (
            <li
              key={entry.platform}
              className="flex items-center justify-between gap-2 text-caption text-foreground"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <PlatformChip platform={entry.platform} size="xs" />
                <span className="truncate font-medium">
                  {PLATFORMS_BY_SHORT[entry.platform]?.full ?? entry.platform}
                </span>
              </span>
              <span className="shrink-0 font-data text-muted-foreground">
                {entry.at ?? "—"}
              </span>
            </li>
          ))}
          {entries.length === 0 ? (
            <li className="text-caption text-muted-foreground">
              No platforms set
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
