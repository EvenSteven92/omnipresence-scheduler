import { Plus } from "lucide-react";

/** Top-left date control — orange fill when today or an event lands on this day. */
export function CalendarDayDateBadge({
  day,
  muted,
  isToday,
  hasEvent,
  eventCount = 0,
  emptyDayCellHover = false,
  onClick,
}: {
  day: number;
  muted: boolean;
  isToday: boolean;
  hasEvent: boolean;
  eventCount?: number;
  /** Empty main-calendar day — date inverts to dark text when the cell fills orange. */
  emptyDayCellHover?: boolean;
  onClick?: () => void;
}) {
  const accentFill = isToday || hasEvent;
  const interactive = !muted && !!onClick;

  return (
    <div className="group/date relative z-20 flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        data-testid={muted ? undefined : `cal-date-${day}`}
        className={`relative shrink-0 text-left ${interactive ? "cursor-pointer" : "cursor-default"}`}
      >
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[0.65rem] font-mono transition-colors ${
            accentFill
              ? "bg-accent text-accent-foreground"
              : muted
                ? "text-muted-foreground/40"
                : "text-foreground"
          } ${isToday ? "font-semibold" : ""} ${
            emptyDayCellHover
              ? "group-hover/cell:bg-transparent group-hover/cell:text-accent-foreground"
              : ""
          }`}
        >
          <span className="tabular-nums group-hover/date:hidden">{day}</span>
          {interactive ? (
            <Plus className="hidden h-3 w-3 group-hover/date:block" strokeWidth={2} />
          ) : null}
        </span>
        {interactive && eventCount === 0 ? (
          <span
            className={`pointer-events-none absolute left-0 top-full z-10 mt-1 hidden whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.12em] group-hover/date:block ${
              emptyDayCellHover ? "text-accent-foreground" : "text-accent"
            }`}
          >
            new_event
          </span>
        ) : null}
      </button>
      {interactive && eventCount > 0 ? (
        <span
          data-testid={`cal-event-count-${day}`}
          className={`hidden whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.12em] group-hover/date:inline ${
            emptyDayCellHover ? "text-accent-foreground" : "text-accent"
          }`}
        >
          {eventCount}_event{eventCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </div>
  );
}
