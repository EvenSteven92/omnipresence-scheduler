import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

/** Dashed stencil affordance — open New Post to schedule on this day. */
export function SchedulePostStencil({ dense = false }: { dense?: boolean }) {
  return (
    <Link
      to="/scheduler"
      onClick={(e) => e.stopPropagation()}
      data-testid="schedule-post-stencil"
      className={`flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border bg-background/20 uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-foreground ${
        dense
          ? "min-h-[2.75rem] px-2 py-1.5 text-[0.45rem]"
          : "min-h-[4.5rem] px-2 py-2 text-[0.5rem]"
      }`}
    >
      <Plus className={dense ? "h-2.5 w-2.5" : "h-3 w-3"} strokeWidth={1.75} />
      <span className="label-mono">new_post</span>
    </Link>
  );
}