import { Plus } from "lucide-react";

/** Dashed stencil affordance — schedule a new event album on this day. */
export function ScheduleEventStencil({
  onClick,
}: {
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      data-testid="schedule-event-stencil"
      className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border bg-background/20 px-2 py-2 text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-foreground"
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-sm border border-dashed border-border/80 bg-surface">
        <Plus className="h-2.5 w-2.5" strokeWidth={1.75} />
      </span>
      Schedule_Event
    </button>
  );
}