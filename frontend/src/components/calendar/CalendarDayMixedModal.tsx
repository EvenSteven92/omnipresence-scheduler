import { useEffect } from "react";
import { Layers, LayoutGrid, X as XIcon } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";

export function CalendarDayMixedModal({
  date,
  events,
  posts,
  onViewPosts,
  onViewEvents,
  onClose,
}: {
  date: Date;
  events: ContentEvent[];
  posts: ScheduledPost[];
  onViewPosts: () => void;
  onViewEvents: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      onClick={onClose}
      data-testid="calendar-day-mixed-modal"
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b-[1.5px] border-foreground px-5 py-4">
          <div>
            <div className="label-mono">this_day_has_both</div>
            <p className="mt-2 text-sm font-semibold text-foreground">{dateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {posts.length} content card{posts.length === 1 ? "" : "s"} and {events.length} event
              album{events.length === 1 ? "" : "s"} — pick what to open.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 rounded-sm border-[1.5px] border-foreground bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2 p-5">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewPosts();
            }}
            data-testid="day-mixed-view-posts"
            className="flex w-full items-center gap-3 rounded-sm border border-accent/50 bg-accent/10 px-4 py-3 text-left transition-colors hover:bg-accent/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-accent/40 bg-card">
              <LayoutGrid className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Content cards</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {posts.length} scheduled card{posts.length === 1 ? "" : "s"} for this day
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onViewEvents();
            }}
            data-testid="day-mixed-view-events"
            className="flex w-full items-center gap-3 rounded-sm border-[1.5px] border-foreground bg-paper-2 px-4 py-3 text-left transition-colors hover:bg-secondary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-[1.5px] border-foreground bg-surface">
              <Layers className="h-4 w-4 text-foreground" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Event albums</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {events.length} ministry moment{events.length === 1 ? "" : "s"} on this day
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
