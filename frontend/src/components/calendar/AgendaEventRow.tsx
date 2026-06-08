import { ArrowRight, Layers } from "lucide-react";
import { formatEventMeta } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";

/** Compact event album row for the calendar agenda sidebar. */
export function AgendaEventRow({
  event,
  highlighted = false,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: {
  event: ContentEvent;
  /** True when this row is driving calendar card highlights. */
  highlighted?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      data-testid={`agenda-event-${event.id}`}
      data-agenda-event-highlighted={highlighted ? "true" : "false"}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      className={`group flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left transition-colors ${
        highlighted
          ? "border-accent bg-accent/15 ring-1 ring-inset ring-accent/40"
          : "border-accent/30 bg-accent/5 hover:border-accent/60 hover:bg-accent/10"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border bg-background/60 ${
          highlighted ? "border-accent/50" : "border-border"
        }`}
      >
        <Layers className="h-3 w-3 text-accent" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-foreground">{event.title}</span>
        <span className="mt-0.5 block label-mono text-[0.45rem] text-muted-foreground">
          {formatEventMeta(event.date, event.kind)}
        </span>
      </span>
      <ArrowRight
        className={`h-3 w-3 shrink-0 transition-all ${
          highlighted
            ? "translate-x-0.5 text-accent opacity-100"
            : "text-muted-foreground opacity-0 group-hover:translate-x-0.5 group-hover:opacity-100"
        }`}
      />
    </button>
  );
}