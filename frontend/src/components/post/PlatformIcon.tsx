import { Image as ImageIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip, type PlatformChipSize } from "@/components/post/PlatformChip";

export type PlatformIconBadgeSize = "xs" | "sm" | "md" | "schedule" | "lg" | "xl";

function hexToRgb(hex: string): [number, number, number] | null {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)];
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Dark-brand colors (e.g. X black) need a light glyph on this dark UI. */
function displayBrandColor(hex: string): string {
  if (hex === "currentColor") return hex;
  return relativeLuminance(hex) < 0.15 ? "#E7E9EA" : hex;
}

export function platformBrandColor(platform: string): string {
  const color = PLATFORMS_BY_SHORT[platform]?.brandColor ?? "currentColor";
  return displayBrandColor(color);
}

export function platformIconStyle(platform: string, muted = false): CSSProperties {
  if (muted) return {};
  const color = platformBrandColor(platform);
  if (color === "currentColor") return {};
  return { color };
}

/** Inline platform icon — same size classes, brand-colored glyph. */
export function PlatformIcon({
  platform,
  className = "h-3 w-3",
  muted = false,
}: {
  platform: string;
  className?: string;
  muted?: boolean;
}) {
  const meta = PLATFORMS_BY_SHORT[platform];
  const Icon = meta?.Icon ?? ImageIcon;
  return <Icon className={className} style={platformIconStyle(platform, muted)} strokeWidth={2} />;
}

const BADGE_TO_CHIP_SIZE: Record<PlatformIconBadgeSize, PlatformChipSize> = {
  xs: "xs",
  sm: "sm",
  md: "md",
  schedule: "md",
  lg: "lg",
  xl: "xl",
};

/** @deprecated Prefer PlatformChip — kept for existing imports; renders the site-wide chip style. */
export function PlatformIconBadge({
  platform,
  size = "sm",
  variant = "brand",
  className = "",
}: {
  platform: string;
  size?: PlatformIconBadgeSize;
  variant?: "brand" | "danger" | "muted";
  className?: string;
}) {
  return (
    <PlatformChip
      platform={platform}
      size={BADGE_TO_CHIP_SIZE[size]}
      variant={variant === "danger" ? "danger" : variant === "muted" ? "muted" : "default"}
      className={className}
    />
  );
}