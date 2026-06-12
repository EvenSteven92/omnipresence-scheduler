import { Layers } from "lucide-react";

function Legend({
  swatch,
  label,
  active = true,
  icon = false,
}: {
  swatch: string;
  label: string;
  active?: boolean;
  icon?: boolean;
}) {
  if (!active) return null;
  return (
    <span className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
      {icon ? (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-dashed border-border bg-background/40">
          <Layers className="h-2 w-2" strokeWidth={1.75} />
        </span>
      ) : (
        <span className={`inline-block h-2 w-2 rounded-sm border ${swatch}`} />
      )}
      {label}
    </span>
  );
}

export function CalendarLegendBar({
  highlightUnassociated,
  onToggleHighlight,
  unassociatedCount,
}: {
  highlightUnassociated: boolean;
  onToggleHighlight: () => void;
  unassociatedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onToggleHighlight}
        data-testid="highlight-unassociated-toggle"
        title="Highlight posts not yet tied to an event album"
        className={`flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] transition-colors ${
          highlightUnassociated
            ? "border-warning/70 bg-warning/10 text-warning"
            : "border-border bg-surface text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-sm border ${
            highlightUnassociated
              ? "border-dashed border-warning bg-warning/30"
              : "border-dashed border-muted-foreground/50 bg-transparent"
          }`}
        />
        Show unlinked posts
        {unassociatedCount > 0 ? (
          <span className="font-mono text-[0.5rem] opacity-80">({unassociatedCount})</span>
        ) : null}
      </button>
      <Legend swatch="bg-accent" label="Today · event" />
      <Legend
        swatch="border-dashed border-warning/70 bg-warning/20"
        label="Needs event"
        active={unassociatedCount > 0}
      />
      <Legend swatch="border-dashed border-border bg-background/30" label="Link to event" icon />
    </div>
  );
}