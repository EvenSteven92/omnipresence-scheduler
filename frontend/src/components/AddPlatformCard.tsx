import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Solid connect-channel card — links to workspaces connect section. */
export function AddPlatformCard({
  testId,
  variant = "grid",
  description,
}: {
  testId: string;
  variant?: "grid" | "strip";
  description?: string;
}) {
  const copy =
    description ??
    (variant === "strip"
      ? "Connect OAuth for another network."
      : "Connect a social account to track views, likes, and shares here.");

  return (
    <Link
      to="/workspaces"
      hash="connect-platform"
      data-testid={testId}
      className={cn(
        "kpi-card flex border-[1.5px] border-foreground bg-card transition-[transform,box-shadow,background-color] duration-150 hover:bg-secondary",
        variant === "strip"
          ? "min-w-[10.5rem] max-w-[13rem] flex-1 basis-[calc(25%-0.75rem)] flex-col justify-center gap-3 px-5 py-4 sm:basis-[calc(20%-0.8rem)] lg:min-w-[11.5rem]"
          : "min-h-[11.5rem] flex-col items-center justify-center gap-3 px-4 py-6 text-center",
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border-[1.5px] border-foreground bg-accent text-foreground",
          variant === "strip" ? "h-8 w-8" : "h-10 w-10",
        )}
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className={variant === "strip" ? "space-y-1" : undefined}>
        <div className="font-display text-sm font-bold text-foreground">Add platform</div>
        <p
          className={cn(
            "leading-relaxed text-muted-foreground",
            variant === "strip" ? "text-[0.65rem] leading-snug" : "mt-1.5 text-body-sm",
          )}
        >
          {copy}
        </p>
      </div>
    </Link>
  );
}
