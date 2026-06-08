import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import type { Platform } from "@/lib/mock-data";
import { PlatformChip, type PlatformChipSize } from "./PlatformChip";

export interface PlatformEntry {
  platform: Platform;
  /** ISO string OR display string (e.g. "11:00"); leave undefined for unscheduled */
  at?: string;
  /** Lifecycle state: published renders the icon brighter; pending dims it */
  state?: "scheduled" | "published" | "pending" | "failed";
}

/**
 * Horizontal row of platform chips + optional timestamps.
 * Used at the bottom of every PostCard in the app (Dashboard, Calendar, Scheduler).
 */
export function PlatformRow({
  entries,
  size = "md",
  compact = false,
}: {
  entries: PlatformEntry[];
  size?: "sm" | "md";
  compact?: boolean;
}) {
  const chipSize: PlatformChipSize = size === "sm" ? "xs" : "sm";

  return (
    <div
      data-testid="platform-row"
      className={`flex flex-wrap items-center ${compact ? "gap-1 py-0.5" : "gap-1.5 border-t border-border bg-background/40 px-4 py-3"}`}
    >
      {entries.map((e, i) => {
        const meta = PLATFORMS_BY_SHORT[e.platform];
        const dim = e.state === "pending" || e.state === "failed";
        const failed = e.state === "failed";
        return (
          <PlatformChip
            key={`${e.platform}-${i}`}
            platform={e.platform}
            label={e.at}
            size={chipSize}
            variant={failed ? "danger" : dim ? "muted" : "default"}
            title={`${meta?.full ?? e.platform}${e.at ? ` · ${e.at}` : ""}`}
          />
        );
      })}
    </div>
  );
}