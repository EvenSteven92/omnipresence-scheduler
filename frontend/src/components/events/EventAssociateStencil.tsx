import { Layers } from "lucide-react";

/** Dashed stencil affordance — associate an unlinked card with an event album. */
export function EventAssociateStencil({
  onClick,
  dense = false,
}: {
  onClick: (e: React.MouseEvent) => void;
  dense?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      data-testid="event-associate-stencil"
      className={`flex w-full items-center justify-center gap-1.5 rounded-sm border border-dashed border-border bg-background/20 text-muted-foreground transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-foreground ${
        dense ? "px-1 py-1 text-[0.45rem]" : "px-2 py-1.5 text-[0.5rem]"
      } uppercase tracking-[0.12em]`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-sm border border-dashed border-border/80 bg-surface ${
          dense ? "h-4 w-4" : "h-5 w-5"
        }`}
      >
        <Layers className={dense ? "h-2 w-2" : "h-2.5 w-2.5"} strokeWidth={1.75} />
      </span>
      Associate_Event
    </button>
  );
}