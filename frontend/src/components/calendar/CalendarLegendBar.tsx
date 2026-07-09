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
    <span className="flex items-center gap-1.5 rounded-md border border-foreground bg-card px-2 py-1 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {icon ? (
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-foreground bg-secondary">
          <Layers className="h-2 w-2" strokeWidth={2} />
        </span>
      ) : (
        <span className={`inline-block h-2 w-2 rounded-sm border border-foreground ${swatch}`} />
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
        title="Highlight posts not yet tied to an event"
        className={`flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.08em] transition-colors ${
          highlightUnassociated
            ? "border-warning bg-warning/15 text-warning"
            : "border-foreground bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        <span
          className={`inline-block h-2 w-2 rounded-sm border border-foreground ${
            highlightUnassociated ? "bg-warning" : "bg-transparent"
          }`}
        />
        Show unlinked posts
        {unassociatedCount > 0 ? (
          <span className="font-data text-[0.5rem] opacity-80">({unassociatedCount})</span>
        ) : null}
      </button>
      <Legend swatch="bg-accent" label="Today · event" />
      <Legend
        swatch="bg-warning/40"
        label="Needs event"
        active={unassociatedCount > 0}
      />
      <Legend swatch="bg-secondary" label="Link event" icon />
    </div>
  );
}
