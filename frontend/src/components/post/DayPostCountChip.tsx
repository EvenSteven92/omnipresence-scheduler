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
  const cardWord = count === 1 ? "CARD" : "CARDS";

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
      className={`mt-auto flex w-full cursor-pointer items-center gap-2 rounded-md border-[1.5px] border-foreground px-2.5 py-2 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] ${
        eventLinked
          ? "bg-accent ring-2 ring-inset ring-foreground/20"
          : needsEvent
            ? "border-dashed border-warning bg-warning/15"
            : variant === "scheduled"
              ? "bg-paper-2"
              : "bg-accent"
      } ${dense ? "min-h-[2.5rem]" : "min-h-[2.75rem]"}`}
    >
      <span className="font-display text-base font-bold leading-none text-foreground">{count}</span>
      <span className="font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.06em] text-foreground">
        {cardWord}
      </span>
      {eventLinked ? (
        <span
          data-testid="day-post-event-highlight-label"
          className="ml-auto font-mono text-[0.45rem] normal-case tracking-[0.1em] text-foreground/70"
        >
          {eventHighlightCount} linked
        </span>
      ) : needsEvent ? (
        <span
          data-testid="day-post-needs-event-label"
          className="ml-auto font-mono text-[0.45rem] normal-case tracking-[0.1em] text-warning"
        >
          {unassociatedCount} needs event
        </span>
      ) : null}
    </button>
  );
}