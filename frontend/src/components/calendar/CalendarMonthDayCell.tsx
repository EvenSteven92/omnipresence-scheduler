import { AlertTriangle } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { CalendarDayPostContent } from "@/components/post/CalendarDayPostContent";
import { CalendarDayDateBadge } from "@/components/calendar/CalendarDayDateBadge";
import { EmptyDayNewPostAffordance } from "@/components/calendar/EmptyDayNewPostAffordance";
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
}) {
  const hasEvent = (events?.length ?? 0) > 0;
  const hasPosts = (posts?.length ?? 0) > 0;
  const emptyMainDay = !muted && !isQuietDay && !hasPosts;

  return (
    <div
      data-testid={
        muted ? undefined : isQuietDay ? `upcoming-quiet-day-${day}` : `cal-day-${day}`
      }
      className={`group/cell relative flex min-h-[168px] min-w-0 flex-col gap-2 bg-surface p-3 transition-colors ${
        muted
          ? "text-muted-foreground/40"
          : emptyMainDay
            ? "hover:bg-accent"
            : isToday
              ? "ring-1 ring-inset ring-accent"
              : isQuietDay
                ? "ring-1 ring-inset ring-warning/70 hover:ring-accent"
                : isSelected
                  ? "ring-1 ring-inset ring-border hover:ring-accent"
                  : "hover:ring-1 hover:ring-inset hover:ring-accent"
      }`}
    >
      <CalendarDayDateBadge
        day={day}
        muted={muted}
        isToday={isToday}
        hasEvent={hasEvent}
        eventCount={events?.length ?? 0}
        emptyDayCellHover={emptyMainDay}
        onClick={muted ? undefined : onDateClick}
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
            <span className="label-mono text-[0.5rem] text-warning">quiet_day</span>
          </div>
          <div className="w-full min-w-0">
            <SchedulePostStencil dense />
          </div>
        </div>
      ) : emptyMainDay ? (
        <EmptyDayNewPostAffordance />
      ) : null}
    </div>
  );
}