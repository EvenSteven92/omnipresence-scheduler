import { useEffect } from "react";
import { X as XIcon, Layers, ArrowRight } from "lucide-react";
import { ScheduleEventAffordance } from "@/components/calendar/ScheduleEventAffordance";
import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventMeta } from "@/lib/events/display";

export function CalendarDayEventsModal({
  date,
  events,
  onClose,
  onScheduleEvent,
  onSelectEvent,
}: {
  date: Date;
  events: ContentEvent[];
  onClose: () => void;
  onScheduleEvent: () => void;
  onSelectEvent: (event: ContentEvent) => void;
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
      data-testid="calendar-day-events-modal"
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md modal-shell overflow-hidden"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="text-title text-sm">Events this day</div>
            <p className="mt-2 text-sm font-semibold text-foreground">{dateLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {events.length} event album{events.length === 1 ? "" : "s"} — pick one to see queued
              posts.
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
        <ul className="divide-y divide-border">
          {events.map((event) => (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelectEvent(event)}
                data-testid={`day-event-select-${event.id}`}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/30"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border bg-background/60">
                  <Layers className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{event.title}</span>
                  <span className="mt-0.5 label-mono text-[0.5rem] text-muted-foreground">
                    {formatEventMeta(event.date, event.kind)}
                  </span>
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t-[1.5px] border-foreground px-5 py-4">
          <ScheduleEventAffordance onClick={onScheduleEvent} />
        </div>
      </div>
    </div>
  );
}
