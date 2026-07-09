import type { ContentEvent } from "@/lib/workspaces/types";
import { formatEventDateTime, formatEventMeta } from "@/lib/events/display";
import { CREATE } from "@/lib/create-actions";
import { Layers, X } from "lucide-react";

export function EventAssociationPicker({
  events,
  value,
  onChange,
  onCreateEvent,
}: {
  events: ContentEvent[];
  value?: string;
  onChange: (eventId: string | undefined) => void;
  onCreateEvent?: () => void;
}) {
  const selected = events.find((e) => e.id === value);

  if (events.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-body-sm text-muted-foreground">
          No events yet. Create one to group this card with related media.
        </p>
        {onCreateEvent ? (
          <button
            type="button"
            onClick={onCreateEvent}
            className="text-sm font-medium text-accent hover:underline"
          >
            {CREATE.event} →
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div data-testid="event-association-picker" className="space-y-3">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Link this card to a ministry event (sermon, worship night…). Cards stay grouped under that
        event.
      </p>

      {selected ? (
        <div className="flex items-start justify-between gap-3 rounded-sm border border-accent/50 bg-accent/5 px-3 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
              <span className="text-xs font-semibold text-foreground">{selected.title}</span>
            </div>
            <p className="mt-1 label-mono text-[0.5rem] text-muted-foreground">
              {formatEventDateTime(selected.date, "short")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            data-testid="event-association-clear"
            aria-label="Remove event association"
            className="shrink-0 rounded-sm border border-foreground bg-surface p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {events.map((event) => {
          const active = event.id === value;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => onChange(active ? undefined : event.id)}
              data-testid={`event-associate-${event.id}`}
              className={`rounded-sm border px-3 py-2.5 text-left transition-colors ${
                active
                  ? "border-accent bg-accent/10"
                  : "border-border bg-paper-2 hover:border-accent/40 hover:bg-secondary/40"
              }`}
            >
              <div className="text-xs font-semibold leading-snug text-foreground">
                {event.title}
              </div>
              <div className="mt-1 label-mono text-[0.5rem] text-muted-foreground">
                {formatEventMeta(event.date, event.kind)}
              </div>
            </button>
          );
        })}
      </div>
      {onCreateEvent ? (
        <button
          type="button"
          onClick={onCreateEvent}
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
        >
          + {CREATE.event}
        </button>
      ) : null}
    </div>
  );
}
