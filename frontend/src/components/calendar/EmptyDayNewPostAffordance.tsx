import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

/** Centered new-post control — visible when an empty main-calendar day cell is hovered. */
export function EmptyDayNewPostAffordance() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100">
      <Link
        to="/scheduler"
        onClick={(e) => e.stopPropagation()}
        data-testid="empty-day-new-post"
        className="group/newpost pointer-events-auto relative flex items-center justify-center rounded-sm p-2"
      >
        <Plus className="h-5 w-5 text-accent-foreground" strokeWidth={2} />
        <span className="pointer-events-none absolute top-full z-10 mt-1 hidden whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-accent-foreground group-hover/newpost:block">
          new_post
        </span>
      </Link>
    </div>
  );
}