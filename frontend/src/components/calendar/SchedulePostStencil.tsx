import { Plus } from "lucide-react";

/** Dashed placeholder — scheduling affordance appears on hover only. */
export function SchedulePostStencil({ dense = false }: { dense?: boolean }) {
  return (
    <div
      data-testid="schedule-post-stencil"
      className={`flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-transparent text-muted-foreground transition-colors group-hover/cell:border-border group-hover/cell:bg-background/20 ${
        dense ? "min-h-[2.75rem] px-2 py-1.5" : "min-h-[4.5rem] px-2 py-2"
      }`}
    >
      <Plus
        className={`opacity-0 transition-opacity group-hover/cell:opacity-100 ${dense ? "h-2.5 w-2.5" : "h-3 w-3"}`}
        strokeWidth={1.75}
      />
      <span className="text-[0.5rem] uppercase tracking-[0.12em] opacity-0 transition-opacity group-hover/cell:opacity-100">
        Add
      </span>
    </div>
  );
}