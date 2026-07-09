import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

/** Hover-reveal solid control for empty calendar days. */
export function EmptyDayNewPostAffordance() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-within/cell:opacity-100">
      <Link
        to="/scheduler"
        onClick={(e) => e.stopPropagation()}
        data-testid="empty-day-new-post"
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-md border-[1.5px] border-foreground bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-[2px_2px_0_0_var(--color-foreground)] transition-[transform,box-shadow,background-color] hover:translate-x-px hover:translate-y-px hover:bg-secondary hover:shadow-[1px_1px_0_0_var(--color-foreground)]"
      >
        <Plus className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
        Add
      </Link>
    </div>
  );
}
