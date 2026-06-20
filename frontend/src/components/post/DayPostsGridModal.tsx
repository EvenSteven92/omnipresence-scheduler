import { useEffect, useMemo } from "react";
import { AlertTriangle, Layers, X as XIcon } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventMeta, groupDayPostsByEvent } from "@/lib/events/display";
import { ContentCardChip } from "@/components/post/ContentCardChip";

const needsEventSectionClass =
  "rounded-sm border border-dashed border-warning/70 bg-warning/10 ring-1 ring-inset ring-warning/30";

function DayPostsEventGroupHeader({
  event,
  postCount,
}: {
  event: ContentEvent;
  postCount: number;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border pb-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-accent/30 bg-accent/5">
        <Layers className="h-3 w-3 text-accent" strokeWidth={1.5} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold leading-tight text-foreground">
          {event.title}
        </h3>
        <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">
          {formatEventMeta(event.date, event.kind)}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">
        {postCount} card{postCount === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function DayPostsUnassignedGroupHeader({ postCount }: { postCount: number }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-warning/30 pb-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-dashed border-warning/60 bg-warning/15">
        <AlertTriangle className="h-3 w-3 text-warning" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-warning">
          unassigned_media
        </div>
        <p className="mt-0.5 text-[0.65rem] leading-snug text-muted-foreground">
          Link these cards to an event album below.
        </p>
      </div>
      <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-warning">
        {postCount}_needs_event
      </span>
    </div>
  );
}

/**
 * Day picker for scheduled content cards — one or many per day.
 * Cards are grouped by event album in a wrapping grid of uniform-height chips.
 */
export function DayPostsGridModal({
  date,
  posts,
  events = [],
  resolveEventId,
  onSelect,
  onClose,
  highlightUnassociated = false,
  isAssociated,
  onAssociatePost,
}: {
  date: Date;
  posts: ScheduledPost[];
  events?: ContentEvent[];
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onSelect: (post: ScheduledPost) => void;
  onClose: () => void;
  highlightUnassociated?: boolean;
  isAssociated?: (post: ScheduledPost) => boolean;
  onAssociatePost?: (post: ScheduledPost, e: React.MouseEvent) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const groups = useMemo(() => {
    const ordered = groupDayPostsByEvent(posts, events, resolveEventId);
    const unassigned = ordered.filter((group) => group.event == null);
    const assigned = ordered.filter((group) => group.event != null);
    return [...unassigned, ...assigned];
  }, [posts, events, resolveEventId]);

  const unassociatedCount = useMemo(
    () => (isAssociated ? posts.filter((post) => !isAssociated(post)).length : 0),
    [posts, isAssociated],
  );

  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      onClick={onClose}
      data-testid="day-posts-grid-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="text-title text-sm">Posts for this day</div>
            <h2 className="mt-1.5 text-base font-semibold text-foreground">{dateLabel}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {posts.length} content card{posts.length === 1 ? "" : "s"}
              {unassociatedCount > 0
                ? ` · ${unassociatedCount} still need${unassociatedCount === 1 ? "s" : ""} an event album`
                : " — pick one to open details."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="day-posts-grid-close"
            aria-label="close"
            className="shrink-0 rounded-sm border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="flex flex-col gap-5">
            {groups.map((group) => {
              const isUnassigned = group.event == null;

              return (
                <section
                  key={group.event?.id ?? "unassigned"}
                  data-testid={
                    group.event
                      ? `day-posts-event-group-${group.event.id}`
                      : "day-posts-unassigned-group"
                  }
                  className={
                    isUnassigned
                      ? `space-y-2.5 rounded-sm p-3 ${needsEventSectionClass}`
                      : "space-y-2.5"
                  }
                >
                  {group.event ? (
                    <DayPostsEventGroupHeader event={group.event} postCount={group.posts.length} />
                  ) : (
                    <DayPostsUnassignedGroupHeader postCount={group.posts.length} />
                  )}

                  <div className="flex flex-wrap gap-3">
                    {group.posts.map((post) => (
                      <ContentCardChip
                        key={post.id}
                        post={post}
                        layout="rail"
                        associated={isAssociated ? isAssociated(post) : true}
                        highlightUnassociated={isUnassigned || highlightUnassociated}
                        onOpen={() => onSelect(post)}
                        onAssociate={onAssociatePost ? (e) => onAssociatePost(post, e) : undefined}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
