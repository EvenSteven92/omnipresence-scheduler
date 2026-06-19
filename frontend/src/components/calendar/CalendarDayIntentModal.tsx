import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, FilePlus, X as XIcon } from "lucide-react";

export function CalendarDayIntentModal({
  date,
  onCreateEvent,
  onClose,
}: {
  date: Date;
  onCreateEvent: () => void;
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
      data-testid="calendar-day-intent-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="label-mono">plan_this_day</div>
            <p className="mt-2 text-sm font-semibold text-foreground">{dateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing scheduled yet — start with a content card or an event album.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 rounded-sm border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2 p-5">
          <Link
            to="/scheduler"
            onClick={onClose}
            data-testid="day-intent-new-post"
            className="flex w-full items-center gap-3 rounded-sm border border-accent/50 bg-accent/10 px-4 py-3 text-left transition-colors hover:bg-accent/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-accent/40 bg-background/80">
              <FilePlus className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">Schedule a post</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Upload media and queue publishes for this day.
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => {
              onClose();
              onCreateEvent();
            }}
            data-testid="day-intent-new-event"
            className="flex w-full items-center gap-3 rounded-sm border border-border bg-background/40 px-4 py-3 text-left transition-colors hover:bg-secondary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-surface">
              <CalendarPlus className="h-4 w-4 text-foreground" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">
                Create event album
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Group sermon reels, clips, and cards under one ministry moment.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
