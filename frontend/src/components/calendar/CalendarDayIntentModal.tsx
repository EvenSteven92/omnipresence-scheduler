import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarPlus, FilePlus, X as XIcon } from "lucide-react";
import { CREATE } from "@/lib/create-actions";

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
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <div className="page-kicker">Plan this day</div>
            <p className="mt-2 text-sm font-semibold text-foreground">{dateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Nothing planned yet — add a card or an event for this day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="shrink-0 rounded-md border border-line bg-background p-1.5 text-muted-foreground hover:text-foreground"
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
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-accent/40 bg-card">
              <FilePlus className="h-4 w-4 text-accent" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{CREATE.card}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Upload media and set where & when to publish.
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
            className="flex w-full items-center gap-3 rounded-md border border-line bg-paper-2 px-4 py-3 text-left transition-colors hover:bg-secondary"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface">
              <CalendarPlus className="h-4 w-4 text-foreground" strokeWidth={1.75} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{CREATE.event}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                A real-world moment (sermon, worship night…) to group cards under.
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
