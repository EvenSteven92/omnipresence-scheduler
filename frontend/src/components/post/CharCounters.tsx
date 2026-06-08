import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "./PlatformChip";
import type { Platform } from "@/lib/mock-data";

/** Hard caption-character ceilings per platform (varies by surface). */
export const CHAR_LIMITS: Record<Platform, number> = {
  X: 280,
  FB: 63_206,
  IG: 2_200,
  YT: 5_000,
  RUMBLE: 5_000,
  "YT SHORTS": 100,
  TIKTOK: 4_000,
  "IG STORY": 200,
  "FB STORY": 200,
};

function tone(used: number, max: number): { label: string; color: string } {
  const pct = max > 0 ? used / max : 0;
  if (pct >= 1) return { label: "over", color: "text-danger border-danger" };
  if (pct >= 0.9) return { label: "tight", color: "text-warning border-warning" };
  if (pct >= 0.6) return { label: "fits", color: "text-foreground border-border" };
  return { label: "fits", color: "text-muted-foreground border-border" };
}

/** Inline strip of per-platform character counters under the caption. */
export function CharCounters({
  text,
  platforms,
}: {
  text: string;
  platforms: Platform[];
}) {
  const used = text.length;
  if (platforms.length === 0) {
    return (
      <div className="label-mono mt-1.5 text-muted-foreground/60">
        select_platforms_to_see_limits
      </div>
    );
  }
  return (
    <div data-testid="char-counters" className="mt-1.5 flex flex-wrap gap-1">
      {platforms.map((p) => {
        const meta = PLATFORMS_BY_SHORT[p];
        const max = CHAR_LIMITS[p];
        const t = tone(used, max);
        const display = max >= 1000 ? `${used}/${(max / 1000).toFixed(max % 1000 === 0 ? 0 : 1)}k` : `${used}/${max}`;
        const pct = max > 0 ? used / max : 0;
        return (
          <PlatformChip
            key={p}
            platform={p}
            label={display}
            size="xs"
            variant={pct >= 1 ? "danger" : "default"}
            className={`font-mono ${t.color}`}
            title={`${meta?.full ?? p} · ${used.toLocaleString()} / ${max.toLocaleString()}`}
          />
        );
      })}
    </div>
  );
}
