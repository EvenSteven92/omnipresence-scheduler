import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

/** Centered add control — visible when an empty main-calendar day cell is hovered. */
export function EmptyDayNewPostAffordance() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100">
      <Link
        to="/scheduler"
        onClick={(e) => e.stopPropagation()}
        data-testid="empty-day-new-post"
        className="group/newpost pointer-events-auto flex items-center gap-1.5 rounded-sm border border-border bg-background/90 px-2.5 py-1.5 text-xs text-foreground shadow-sm backdrop-blur-sm transition-colors hover:border-accent/60 hover:bg-accent/10"
      >
        <Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        Add
      </Link>
    </div>
  );
}
