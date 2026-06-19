import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

export function AddPlatformStencilCard({
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
      className={`kpi-card flex border border-dashed border-border bg-background/20 transition-colors hover:border-accent/60 hover:bg-accent/5 ${
        variant === "strip"
          ? "min-w-[10.5rem] max-w-[13rem] flex-1 basis-[calc(25%-0.75rem)] flex-col justify-center gap-3 px-5 py-4 sm:basis-[calc(20%-0.8rem)] lg:min-w-[11.5rem]"
          : "min-h-[11.5rem] flex-col items-center justify-center gap-3 px-4 py-6 text-center"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-sm border border-dashed border-border bg-surface text-muted-foreground ${
          variant === "strip" ? "h-8 w-8" : "h-10 w-10"
        }`}
      >
        <Plus className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className={variant === "strip" ? "space-y-1" : undefined}>
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
          Add_Platform
        </div>
        <p
          className={`leading-relaxed text-muted-foreground ${
            variant === "strip" ? "text-[0.6rem] leading-snug" : "mt-1.5 text-[0.65rem]"
          }`}
        >
          {copy}
        </p>
      </div>
    </Link>
  );
}
