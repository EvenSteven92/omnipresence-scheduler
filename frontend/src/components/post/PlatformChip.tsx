import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformIcon } from "@/components/post/PlatformIcon";

export type PlatformChipSize = "xs" | "sm" | "md" | "lg" | "xl";
export type PlatformChipVariant =
  | "default"
  | "danger"
  | "warning"
  | "muted"
  | "scheduled"
  | "active";

const SIZES: Record<PlatformChipSize, { icon: string; text: string; pad: string; gap: string }> = {
  xs: { icon: "h-2 w-2", text: "text-[0.45rem]", pad: "px-1 py-0.5", gap: "gap-1" },
  sm: { icon: "h-2.5 w-2.5", text: "text-[0.5rem]", pad: "px-1.5 py-0.5", gap: "gap-1" },
  md: { icon: "h-3 w-3", text: "text-[0.55rem]", pad: "px-2 py-1", gap: "gap-1.5" },
  lg: { icon: "h-4 w-4", text: "text-[0.6rem]", pad: "px-2.5 py-1.5", gap: "gap-2" },
  xl: { icon: "h-4 w-4", text: "text-[0.65rem]", pad: "px-3 py-2", gap: "gap-2" },
};

function chipBorderClass(variant: PlatformChipVariant): string {
  if (variant === "danger") return "border-danger/60 bg-danger/10";
  if (variant === "warning") return "border-warning/60 bg-warning/10";
  if (variant === "muted") return "border-border/50 bg-background/40 opacity-70";
  if (variant === "scheduled") return "border-dashed border-muted-foreground/45 bg-background/40";
  if (variant === "active") return "border-[1.5px] border-foreground bg-accent text-foreground";
  return "border-[1.5px] border-foreground bg-card";
}

/**
 * Site-wide platform chip — brand-colored icon in a compact bordered pill.
 * Matches the publish-times calendar style used in the composer.
 */
export function PlatformChip({
  platform,
  label,
  size = "sm",
  variant = "default",
  title,
  className = "",
}: {
  platform: string;
  label?: string;
  size?: PlatformChipSize;
  variant?: PlatformChipVariant;
  title?: string;
  className?: string;
}) {
  const meta = PLATFORMS_BY_SHORT[platform];
  const s = SIZES[size];
  const borderClass = chipBorderClass(variant);
  const labelClass = "text-foreground/90";

  return (
    <span
      title={title ?? (meta?.full ? `${meta.full}${label ? ` · ${label}` : ""}` : platform)}
      className={`inline-flex max-w-full shrink-0 items-center rounded-sm border ${borderClass} ${s.pad} ${s.gap} ${className}`}
    >
      <PlatformIcon
        platform={platform}
        className={`${s.icon} shrink-0`}
        muted={variant === "muted"}
      />
      {label ? (
        <span className={`truncate font-mono uppercase tracking-wide ${labelClass} ${s.text}`}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

/** Toggleable platform chip — composer tabs, preview picker, workspace rows. */
export function PlatformSelectChip({
  platform,
  label,
  size = "md",
  active = false,
  disabled = false,
  onClick,
  title,
  className = "",
  "data-testid": dataTestId,
}: {
  platform: string;
  label?: string;
  size?: PlatformChipSize;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const meta = PLATFORMS_BY_SHORT[platform];
  const s = SIZES[size];
  const displayLabel = label ?? platform;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      data-testid={dataTestId}
      title={title ?? meta?.full ?? platform}
      className={`inline-flex max-w-full shrink-0 items-center rounded-sm border font-mono uppercase tracking-[0.12em] transition-colors ${s.pad} ${s.gap} ${s.text} ${
        disabled
          ? "cursor-not-allowed border-border/40 bg-background/30 text-muted-foreground/40"
          : active
            ? chipBorderClass("active")
            : "border-[1.5px] border-foreground bg-card text-foreground hover:bg-secondary"
      } ${className}`}
    >
      <PlatformIcon
        platform={platform}
        className={`${s.icon} shrink-0`}
        muted={disabled || active}
      />
      {displayLabel}
    </button>
  );
}
