import { CalendarDays, Link2 } from "lucide-react";
import type { ContentEvent } from "@/lib/workspaces/types";
import { cn } from "@/lib/utils";

/**
 * Event as a board card — “everything is a card.”
 * Reels string to events via eventId on drafts.
 */
export function StudioEventCard({
  event,
  x,
  y,
  selected,
  linkedCount,
  canDrag,
  liveOffset,
  onSelect,
  onDragStart,
  onAssignSelected,
}: {
  event: ContentEvent;
  x: number;
  y: number;
  selected: boolean;
  linkedCount: number;
  canDrag: boolean;
  liveOffset?: { x: number; y: number } | null;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onAssignSelected?: () => void;
}) {
  const ox = liveOffset?.x ?? 0;
  const oy = liveOffset?.y ?? 0;
  const dateLabel = new Date(event.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      data-testid={`studio-event-${event.id}`}
      data-studio-card={event.id}
      data-studio-event="true"
      className={cn("absolute will-change-transform", selected && "z-30")}
      style={{
        left: x,
        top: y,
        width: 280,
        transform:
          ox !== 0 || oy !== 0 ? `translate3d(${ox}px, ${oy}px, 0)` : undefined,
      }}
    >
      <article
        className={cn(
          "overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-card)] select-none",
          "transition-[border-color,box-shadow,transform] duration-150 ease-out",
          selected
            ? "scale-[1.01] border-brand shadow-[0_0_0_2px_color-mix(in_oklab,var(--brand)_35%,transparent)]"
            : "border-line hover:border-foreground/30",
        )}
      >
        <div
          className={cn(
            "flex items-start gap-3 border-b border-line bg-paper-2 px-3 py-3 touch-none",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={(e) => {
            if (!canDrag || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onDragStart(e);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-card">
            <CalendarDays className="h-4 w-4 text-foreground" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Event
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-bold text-foreground">
              {event.title}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">{dateLabel}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">
            {linkedCount} reel{linkedCount === 1 ? "" : "s"} linked
          </span>
          {onAssignSelected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssignSelected();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-caption font-semibold text-foreground hover:bg-secondary"
            >
              <Link2 className="h-3 w-3" />
              Attach selection
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
}
