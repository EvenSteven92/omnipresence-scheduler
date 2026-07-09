import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";
import { demoPreviewForPost } from "@/lib/demo-media";

const MAX_THUMBS = 3;

/**
 * Minimal month cell — day number, optional event marker, post thumbs/count.
 * No create buttons or hover stencils. Click opens the day panel.
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
  onSelect: () => void;
  onDropPost?: (e: React.DragEvent, date: Date) => void;
}) {
  const postCount = posts.length;
  const eventCount = events.length;
  const thumbs = posts.slice(0, MAX_THUMBS);
  const overflow = Math.max(0, postCount - MAX_THUMBS);

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
        "group relative flex min-h-[7.5rem] flex-col items-stretch gap-1.5 p-2 text-left transition-colors",
        muted
          ? "cursor-default bg-paper-2/60 text-muted-foreground/40"
          : "cursor-pointer bg-card hover:bg-paper-2/50",
        isSelected && !muted && "bg-accent/15 ring-2 ring-inset ring-foreground",
        isToday && !muted && !isSelected && "ring-1 ring-inset ring-accent",
        dropActive && !muted && "bg-accent/20 ring-2 ring-inset ring-accent",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md font-data text-sm font-semibold",
            isToday && !muted && "bg-accent text-foreground",
            isSelected && !isToday && !muted && "bg-foreground text-background",
            !isToday && !isSelected && "text-foreground",
          )}
        >
          {day}
        </span>
        {postCount > 0 && !muted ? (
          <span className="rounded-md border border-foreground/20 bg-paper-2 px-1.5 py-0.5 font-data text-[0.7rem] font-semibold text-foreground">
            {postCount}
          </span>
        ) : null}
      </div>

      {eventCount > 0 && !muted ? (
        <div className="flex flex-wrap gap-1">
          {events.slice(0, 2).map((ev) => (
            <span
              key={ev.id}
              className="max-w-full truncate rounded-sm border border-foreground bg-foreground px-1.5 py-0.5 font-mono text-[0.6rem] font-bold uppercase tracking-wide text-background"
              title={ev.title}
            >
              {ev.title}
            </span>
          ))}
          {eventCount > 2 ? (
            <span className="font-data text-[0.65rem] text-muted-foreground">+{eventCount - 2}</span>
          ) : null}
        </div>
      ) : null}

      {thumbs.length > 0 && !muted ? (
        <div className="mt-auto flex items-end gap-1">
          {thumbs.map((post) => (
            <span
              key={post.id}
              className="h-8 w-8 shrink-0 overflow-hidden rounded-sm border border-foreground bg-paper-2"
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
            <span className="flex h-8 min-w-8 items-center justify-center rounded-sm border border-foreground bg-paper-2 px-1 font-data text-[0.65rem] font-bold text-foreground">
              +{overflow}
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
