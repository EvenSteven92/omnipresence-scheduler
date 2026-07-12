import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";
import { demoPreviewForPost } from "@/lib/demo-media";

const MAX_THUMBS = 2;

/**
 * Compact month cell — never expands the grid.
 * minmax(0,1fr) parent + min-w-0 + overflow-hidden keep thumbs/events clipped.
 */
export function CalendarDayCell({
  day,
  date,
  muted,
  isToday,
  isSelected,
  events = [],
  posts = [],
  dropActive = false,
  fillHeight = false,
  onSelect,
  onDropPost,
}: {
  day: number;
  date: Date;
  muted: boolean;
  isToday: boolean;
  isSelected: boolean;
  events?: ContentEvent[];
  posts?: ScheduledPost[];
  dropActive?: boolean;
  /** Stretch to fill equal-height week rows in the month grid. */
  fillHeight?: boolean;
  onSelect: () => void;
  onDropPost?: (e: React.DragEvent, date: Date) => void;
}) {
  const postCount = posts.length;
  const eventCount = events.length;
  const thumbs = posts.slice(0, MAX_THUMBS);
  const overflow = Math.max(0, postCount - MAX_THUMBS);
  const primaryEvent = events[0];

  return (
    <button
      type="button"
      data-testid={muted ? undefined : `cal-day-${day}`}
      disabled={muted}
      onClick={() => {
        if (!muted) onSelect();
      }}
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
      className={cn(
        /* min-w-0 is required so CSS grid children can shrink below content size */
        "group relative flex min-w-0 w-full flex-col overflow-hidden p-1.5 text-left transition-colors sm:p-2",
        fillHeight
          ? "h-full min-h-[5.5rem]"
          : "h-[6.75rem] sm:h-[7.25rem]",
        muted
          ? "cursor-default bg-paper-2/60 text-muted-foreground/40"
          : "cursor-pointer bg-card hover:bg-paper-2/50",
        isSelected && !muted && "bg-brand-soft ring-2 ring-inset ring-brand",
        isToday && !muted && !isSelected && "ring-1 ring-inset ring-foreground/30",
        dropActive && !muted && "bg-brand-soft ring-2 ring-inset ring-brand",
      )}
    >
      <div className="flex min-w-0 shrink-0 items-center justify-between gap-1">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-data text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm",
            isToday && !muted && "bg-foreground text-background",
            isSelected && !isToday && !muted && "bg-foreground text-background",
            !isToday && !isSelected && "text-foreground",
          )}
        >
          {day}
        </span>
        {postCount > 0 && !muted ? (
          <span className="max-w-[3rem] truncate rounded-lg border border-line/20 bg-paper-2 px-1 py-0.5 font-data text-[0.65rem] font-semibold tabular-nums text-foreground">
            {postCount}
          </span>
        ) : null}
      </div>

      {primaryEvent && !muted ? (
        <div className="mt-1 min-w-0 shrink-0">
          <span
            className="block w-full truncate rounded-md border border-line bg-foreground px-1 py-0.5 font-mono text-[0.55rem] font-bold uppercase leading-tight tracking-wide text-background"
            title={
              eventCount > 1
                ? `${primaryEvent.title} (+${eventCount - 1} more)`
                : primaryEvent.title
            }
          >
            {eventCount > 1 ? `${primaryEvent.title} +${eventCount - 1}` : primaryEvent.title}
          </span>
        </div>
      ) : null}

      {thumbs.length > 0 && !muted ? (
        <div className="mt-auto flex min-w-0 items-end gap-0.5 overflow-hidden pt-1">
          {thumbs.map((post) => (
            <span
              key={post.id}
              className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-line bg-paper-2 sm:h-7 sm:w-7"
              title={post.title}
            >
              <img
                src={demoPreviewForPost({ id: post.id, title: post.title })}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </span>
          ))}
          {overflow > 0 ? (
            <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md border border-line bg-paper-2 px-0.5 font-data text-[0.6rem] font-bold text-foreground sm:h-7 sm:min-w-7">
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
