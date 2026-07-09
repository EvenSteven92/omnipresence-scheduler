import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Solid control to associate a card with an event. */
export function EventAssociateButton({
  onClick,
  dense = false,
}: {
  onClick: (e: React.MouseEvent) => void;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid="event-associate-button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={cn(
        "inline-flex w-full items-center justify-center gap-1.5 rounded-md border-[1.5px] border-foreground bg-card font-semibold text-foreground transition-colors hover:bg-secondary",
        dense ? "px-2 py-1 text-[0.6rem]" : "px-2.5 py-1.5 text-body-sm",
      )}
    >
      <Link2 className={dense ? "h-3 w-3" : "h-3.5 w-3.5"} strokeWidth={2} />
      Link event
    </button>
  );
}
