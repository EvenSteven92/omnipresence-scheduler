import { Link } from "@tanstack/react-router";
import { FilePlus } from "lucide-react";
import { CREATE } from "@/lib/create-actions";

/** Hover-reveal solid control for empty calendar days. */
export function EmptyDayNewPostAffordance() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100 group-focus-within/cell:opacity-100">
      <Link
        to="/scheduler"
        onClick={(e) => e.stopPropagation()}
        data-testid="empty-day-new-post"
        aria-label={CREATE.card}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
      >
        <FilePlus className="h-3.5 w-3.5" strokeWidth={2} />
        {CREATE.card}
      </Link>
    </div>
  );
}
