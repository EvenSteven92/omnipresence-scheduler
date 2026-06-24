import { AlertTriangle, Plus } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { CalendarDayPostContent } from "@/components/post/CalendarDayPostContent";
import { CalendarDayDateBadge } from "@/components/calendar/CalendarDayDateBadge";
import { SchedulePostStencil } from "@/components/calendar/SchedulePostStencil";

export function CalendarMonthDayCell({
  day,
  date,
  muted,
  isToday,
  isSelected,
  isQuietDay = false,
  events,
  posts,
  isAssociated,
  hoveredEventId,
  resolveEventId,
  onDateClick,
  onOpenPosts,
  onDropPost,
  dropActive = false,
}: {
  day: number;
  date: Date;
  muted: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** Dashboard upcoming strip — no posts scheduled in the 7-day window. */
  isQuietDay?: boolean;
  events?: ContentEvent[];
  posts?: ScheduledPost[];
  isAssociated?: (post: ScheduledPost) => boolean;
  hoveredEventId?: string | null;
  resolveEventId?: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onDateClick: () => void;
  onOpenPosts: (posts: ScheduledPost[], date: Date) => void;
  onDropPost?: (e: React.DragEvent, date: Date) => void;
  dropActive?: boolean;
}) {
  const hasEvent = (events?.length ?? 0) > 0;
  const hasPosts = (posts?.length ?? 0) > 0;
  const emptyMainDay = !muted && !isQuietDay && !hasPosts;

  return (
    <div
      data-testid={muted ? undefined : isQuietDay ? `upcoming-quiet-day-${day}` : `cal-day-${day}`}
      onDragOver={
        !muted && onDropPost
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }
          : undefined
      }
      onDrop={
        !muted && onDropPost
          ? (e) => {
              e.preventDefault();
              onDropPost(e, date);
            }
          : undefined
      }
      className={`group/cell relative flex min-h-[168px] min-w-0 flex-col gap-2 bg-card p-3 transition-colors ${
        muted ? "bg-paper-2/50 text-muted-foreground/40" : ""
      } ${
        !muted && emptyMainDay ? "text-muted-foreground/70 hover:bg-background/60" : ""
      } ${
        !muted && isToday
          ? "ring-1 ring-inset ring-accent"
          : !muted && isQuietDay
            ? "ring-1 ring-inset ring-warning/70"
            : !muted && isSelected
              ? "ring-1 ring-inset ring-border"
              : ""
      } ${dropActive && !muted ? "ring-2 ring-inset ring-accent bg-accent/5" : ""}`}
    >
      <CalendarDayDateBadge
        day={day}
        muted={muted}
        isToday={isToday}
        hasEvent={hasEvent}
        eventCount={events?.length ?? 0}
        emptyDayCellHover={emptyMainDay}
        onClick={muted || emptyMainDay ? undefined : onDateClick}
      />

      {hasPosts ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center">
          <div className="w-full min-w-0">
            <CalendarDayPostContent
              posts={posts!}
              date={date}
              onOpenPosts={onOpenPosts}
              dense
              isAssociated={isAssociated}
              hoveredEventId={hoveredEventId}
              resolveEventId={resolveEventId}
            />
          </div>
        </div>
      ) : isQuietDay ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-2">
          <div
            data-testid={`upcoming-quiet-day-label-${day}`}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-warning" strokeWidth={1.75} />
            <span className="text-[0.5rem] uppercase tracking-[0.12em] text-warning">
              Quiet day
            </span>
          </div>
          <div className="w-full min-w-0">
            <SchedulePostStencil dense />
          </div>
        </div>
      ) : emptyMainDay ? (
        <button
          type="button"
          onClick={onDateClick}
          data-testid={`empty-day-create-${day}`}
          aria-label="Add a post or event to this day"
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="flex items-center gap-1.5 rounded-sm border border-border bg-background/90 px-2.5 py-1.5 text-xs text-foreground opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover/cell:opacity-100">
            <Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
            New
          </span>
        </button>
      ) : null}
    </div>
  );
}
