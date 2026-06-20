import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CARD_PREVIEW_HEIGHT } from "@/components/post/MediaPreview";

export type ContentCardSize = "chip" | "row" | "sm" | "md";

export type ContentCardVariant = "default" | "scheduled" | "highlight";

const VARIANT_BORDER: Record<ContentCardVariant, string> = {
  default: "border-border bg-surface-elevated",
  scheduled: "border-dashed border-muted-foreground/45 bg-background/40",
  highlight: "border-dashed border-warning/70 bg-warning/10 ring-1 ring-inset ring-warning/30",
};

export function ContentCard({
  size = "sm",
  orientation = "rail",
  variant = "default",
  thumbnail,
  eyebrow,
  title,
  meta,
  platforms,
  trailing,
  onOpen,
  fullWidth = false,
  className,
  testId,
  children,
}: {
  size?: ContentCardSize;
  /** `rail` = thumb left; `stacked` = thumb on top (16:9 landscape). */
  orientation?: "rail" | "stacked";
  variant?: ContentCardVariant;
  thumbnail?: ReactNode;
  eyebrow?: ReactNode;
  title: string;
  meta?: ReactNode;
  platforms?: ReactNode;
  trailing?: ReactNode;
  onOpen?: () => void;
  fullWidth?: boolean;
  className?: string;
  testId?: string;
  children?: ReactNode;
}) {
  const interactive = Boolean(onOpen);
  const isRow = size === "row";
  const isStacked = orientation === "stacked" && !isRow;
  const isMd = size === "md";

  const titleClass = cn(
    "block leading-tight text-foreground",
    size === "chip" && "line-clamp-1 text-[0.55rem]",
    size === "row" && "truncate text-sm font-medium",
    size === "sm" && "line-clamp-2 text-[0.65rem]",
    size === "md" && "line-clamp-2 text-sm font-medium",
  );

  const metaClass = cn(
    size === "chip" && "block font-mono text-[0.5rem] text-accent",
    size === "row" && "mt-0.5 block text-body-sm text-muted-foreground",
    size === "sm" && "block font-mono text-[0.55rem] text-accent",
    size === "md" && "block text-body-sm text-muted-foreground",
  );

  const body = (
    <div
      className={cn(
        "flex min-h-0 flex-col justify-between overflow-hidden",
        isRow
          ? "min-w-0 flex-1"
          : isStacked || isMd
            ? "flex-1"
            : cn("min-w-0 shrink-0", size === "chip" ? "w-36" : fullWidth ? "min-w-0 flex-1" : "w-52"),
        size === "chip" && "gap-1 p-2",
        size === "row" && "gap-0",
        size === "sm" && "gap-1.5 p-2",
        size === "md" && "gap-3 px-5 py-5",
      )}
    >
      <div className="min-w-0 space-y-0.5">
        {eyebrow}
        <span className={titleClass}>{title}</span>
        {meta ? <span className={metaClass}>{meta}</span> : null}
      </div>
      {platforms ? <div className="min-w-0">{platforms}</div> : null}
    </div>
  );

  const frameClass = cn(
    "group overflow-hidden rounded-md border text-left transition-colors",
    VARIANT_BORDER[variant],
    isRow
      ? cn(
          "flex w-full items-center hover:bg-secondary/30",
          fullWidth ? "gap-3 px-3 py-2" : "gap-4 px-4 py-3",
        )
      : isMd
        ? "flex w-full flex-col"
        : cn(
            "flex",
            isStacked ? "flex-col" : "",
            fullWidth ? "w-full" : "inline-flex w-fit max-w-full",
            !isMd && CARD_PREVIEW_HEIGHT,
          ),
    interactive && "cursor-pointer hover:border-accent/40",
    className,
  );

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onOpen?.();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpen?.();
              }
            }
          : undefined
      }
      data-testid={testId}
      className={cn(isRow || fullWidth ? "block w-full" : "inline-block w-fit max-w-full")}
    >
      <div className={frameClass}>
        {thumbnail}
        {body}
        {trailing}
      </div>
      {children}
    </div>
  );
}