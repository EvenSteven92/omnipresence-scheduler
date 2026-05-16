import { Image as ImageIcon } from "lucide-react";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import type { Platform } from "@/lib/mock-data";

export interface PlatformEntry {
  platform: Platform;
  /** ISO string OR display string (e.g. "11:00"); leave undefined for unscheduled */
  at?: string;
  /** Lifecycle state: published renders the icon brighter; pending dims it */
  state?: "scheduled" | "published" | "pending" | "failed";
}

/**
 * Horizontal row of platform icons + optional timestamps.
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
  const iconBox = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <div
      data-testid="platform-row"
      className={`flex flex-wrap items-center gap-2 ${compact ? "" : "border-t border-border bg-background/40 px-3 py-2"}`}
    >
      {entries.map((e, i) => {
        const meta = PLATFORMS_BY_SHORT[e.platform];
        const Icon = meta?.Icon ?? ImageIcon;
        const dim = e.state === "pending" || e.state === "failed";
        const failed = e.state === "failed";
        return (
          <div
            key={`${e.platform}-${i}`}
            title={`${meta?.full ?? e.platform}${e.at ? " · " + e.at : ""}`}
            className="flex items-center gap-1.5"
          >
            <span
              className={`inline-flex shrink-0 items-center justify-center rounded-full ${iconBox} ${
                failed
                  ? "bg-danger text-background"
                  : dim
                    ? "bg-muted-foreground/50 text-background"
                    : "bg-foreground text-background"
              }`}
            >
              <Icon className={iconSize} strokeWidth={2} />
            </span>
            {e.at && (
              <span className="font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground">
                {e.at}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
