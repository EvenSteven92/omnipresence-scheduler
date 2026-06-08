/**
 * Compact summary for calendar days with scheduled content cards.
 * Click opens the day grid picker before drilling into a single card.
 * Warning styling when any card on the day still needs an event album.
 */
export function DayPostCountChip({
  count,
  onOpen,
  variant = "default",
  dense = false,
  unassociatedCount = 0,
  eventHighlightCount = 0,
}: {
  count: number;
  onOpen: () => void;
  variant?: "default" | "scheduled";
  dense?: boolean;
  /** Cards on this day missing an event album link. */
  unassociatedCount?: number;
  /** Cards on this day linked to the agenda-hovered event album. */
  eventHighlightCount?: number;
}) {
  const needsEvent = unassociatedCount > 0;
  const eventLinked = eventHighlightCount > 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      data-testid="day-post-count-chip"
      data-needs-event={needsEvent ? "true" : "false"}
      data-event-highlight={eventLinked ? "true" : "false"}
      className={`flex w-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm border font-mono uppercase tracking-[0.12em] text-foreground transition-colors hover:border-accent ${
        eventLinked
          ? "border-accent bg-accent/15 ring-2 ring-inset ring-accent/50"
          : needsEvent
            ? "border-dashed border-warning/70 bg-warning/10 ring-1 ring-inset ring-warning/30"
            : variant === "scheduled"
              ? "border-muted-foreground/45 bg-background/40"
              : "border-border bg-background/60"
      } ${
        dense
          ? "min-h-[2.75rem] px-2 py-1.5 text-[0.6875rem]"
          : "min-h-[4.5rem] px-2 py-2 text-[0.75rem]"
      }`}
    >
      <span>
        {count}_card{count === 1 ? "" : "s"}
      </span>
      {eventLinked ? (
        <span
          data-testid="day-post-event-highlight-label"
          className={`font-mono normal-case text-accent ${
            dense ? "text-[0.45rem] tracking-[0.1em]" : "text-[0.5rem] tracking-[0.12em]"
          }`}
        >
          {eventHighlightCount}_linked
        </span>
      ) : needsEvent ? (
        <span
          data-testid="day-post-needs-event-label"
          className={`font-mono normal-case text-warning ${
            dense ? "text-[0.45rem] tracking-[0.1em]" : "text-[0.5rem] tracking-[0.12em]"
          }`}
        >
          {unassociatedCount}_needs_event
        </span>
      ) : null}
    </button>
  );
}