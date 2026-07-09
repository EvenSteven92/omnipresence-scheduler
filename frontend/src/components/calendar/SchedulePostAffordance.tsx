import { Link } from "@tanstack/react-router";
import { FilePlus } from "lucide-react";
import { CREATE } from "@/lib/create-actions";
import { cn } from "@/lib/utils";

/** Compact solid “New card” control for calendar day cells (hover-reveal). */
export function SchedulePostAffordance({ dense = false }: { dense?: boolean }) {
  return (
    <Link
      to="/scheduler"
      onClick={(e) => e.stopPropagation()}
      data-testid="schedule-post-affordance"
      aria-label={CREATE.card}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-md border-[1.5px] border-transparent text-muted-foreground transition-colors group-hover/cell:border-foreground group-hover/cell:bg-card group-hover/cell:text-foreground",
        dense ? "min-h-[2.75rem] px-2 py-1.5" : "min-h-[4.5rem] px-2 py-2",
      )}
    >
      <FilePlus
        className={cn(
          "opacity-0 transition-opacity group-hover/cell:opacity-100",
          dense ? "h-2.5 w-2.5" : "h-3 w-3",
        )}
        strokeWidth={2}
      />
      <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-[0.08em] opacity-0 transition-opacity group-hover/cell:opacity-100">
        Card
      </span>
    </Link>
  );
}
