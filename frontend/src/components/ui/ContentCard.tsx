import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CARD_PREVIEW_HEIGHT } from "@/components/post/MediaPreview";

export type ContentCardSize = "chip" | "row" | "stream" | "sm" | "md";

export type ContentCardVariant = "default" | "scheduled" | "highlight";

const VARIANT_BORDER: Record<ContentCardVariant, string> = {
  default: "border-[1.5px] border-foreground bg-card",
  scheduled: "border-[1.5px] border-dashed border-muted-foreground/60 bg-background/40",
  highlight:
    "border-[1.5px] border-dashed border-warning bg-warning/10 ring-1 ring-inset ring-warning/30",
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
  draggable,
  onDragStart,
  onDragEnd,
}: {
  size?: ContentCardSize;
  orientation?: "rail" | "stacked";
  variant?: ContentCardVariant;
  thumbnail?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  platforms?: ReactNode;
  trailing?: ReactNode;
  onOpen?: () => void;
  fullWidth?: boolean;
  className?: string;
  testId?: string;
  children?: ReactNode;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}) {
  const interactive = Boolean(onOpen);
  const isStream = size === "stream";
  const isRow = size === "row";
  const isStacked = orientation === "stacked" && !isRow && !isStream;
  const isMd = size === "md";

  if (isStream) {
    return (
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
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
        className={cn("block w-full", className)}
      >
        <div
          className={cn(
            "group card-pop flex items-center gap-4 rounded-lg border-[1.5px] border-foreground bg-card p-3.5 text-left",
            interactive && "card-pop-interactive cursor-pointer",
            VARIANT_BORDER[variant],
          )}
        >
          {thumbnail}
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <div className="font-mono text-[0.625rem] font-bold uppercase leading-none tracking-[0.06em] text-accent">
                {eyebrow}
              </div>
            ) : null}
            <div className="mt-1.5 truncate font-display text-[1.0625rem] font-semibold leading-tight text-foreground">
              {title}
            </div>
            {meta ? <div className="mt-1 text-body-sm text-muted-foreground">{meta}</div> : null}
            {platforms ? <div className="mt-2.5 flex flex-wrap gap-1.5">{platforms}</div> : null}
          </div>
          {trailing ? (
            <div className="flex shrink-0 flex-col items-end justify-between self-stretch">
              {trailing}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    );
  }

  const titleClass = cn(
    "block leading-tight text-foreground",
    size === "chip" && "line-clamp-1 text-[0.55rem]",
    size === "row" && "truncate text-sm font-medium",
    size === "sm" && "line-clamp-2 font-display text-sm font-semibold",
    size === "md" && "line-clamp-2 font-display text-xl font-bold",
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
    "group overflow-hidden rounded-lg border text-left transition-[transform,box-shadow,border-color] duration-150",
    VARIANT_BORDER[variant],
    isRow
      ? cn(
          "flex w-full items-center hover:bg-paper-2/40",
          fullWidth ? "gap-3 px-3 py-2" : "gap-4 px-4 py-3",
        )
      : isMd
        ? "card-pop flex w-full flex-col"
        : cn(
            "flex",
            isStacked ? "flex-col" : "",
            fullWidth ? "w-full" : "inline-flex w-fit max-w-full",
            !isMd && !isStacked && CARD_PREVIEW_HEIGHT,
          ),
    interactive && !isMd && "cursor-pointer hover:border-foreground",
    interactive && isMd && "card-pop-interactive cursor-pointer",
    className,
  );

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
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
      className={cn(isRow || fullWidth || isStream ? "block w-full" : "inline-block w-fit max-w-full")}
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