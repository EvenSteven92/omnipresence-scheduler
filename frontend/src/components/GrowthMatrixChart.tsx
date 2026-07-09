import { AddPlatformCard } from "@/components/AddPlatformCard";
import { CollapsibleSection } from "@/components/post/CollapsibleSection";
import {
  PERFORMANCE_METRICS,
  PerformanceMetricCounters,
} from "@/components/PerformanceMetricCounters";
import { isAllTime, timeframeLabel, type GrowthMatrixRow, type Timeframe } from "@/lib/timeframe";
import { PlatformChip } from "@/components/post/PlatformChip";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";

/**
 * Compare reach, reactions, and reshares per platform for the active timeframe.
 * Counters scale with the date range; percentages show vs prior window.
 */
export function GrowthMatrixChart({
  rows,
  timeframe,
  defaultOpen = true,
}: {
  rows: GrowthMatrixRow[];
  timeframe: Timeframe;
  defaultOpen?: boolean;
}) {
  const sorted = [...rows].sort((a, b) => b.views - a.views);
  const periodLabel = timeframeLabel(timeframe);
  const allTime = isAllTime(timeframe);

  return (
    <div data-testid="growth-matrix-chart">
      <CollapsibleSection
        title="Cross-platform growth"
        subtitle={
          allTime
            ? "Per-platform lifetime totals for the selected range."
            : `Per-platform totals · ${periodLabel} vs the prior window.`
        }
        defaultOpen={defaultOpen}
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Each card is one platform. Totals reflect the{" "}
          <span className="text-foreground">{periodLabel}</span> range selected above.
          {allTime ? (
            <> Lifetime totals — no period comparison.</>
          ) : (
            <>
              {" "}
              Percentage beneath each counter is change vs the prior{" "}
              <span className="text-foreground">{periodLabel}</span> window.
            </>
          )}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-4 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          {PERFORMANCE_METRICS.map((m) => (
            <span key={m.key}>{m.label}</span>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((row) => {
            const meta = PLATFORMS_BY_SHORT[row.platform];
            return (
              <div
                key={row.platform}
                className="kpi-card flex flex-col border-l-[3px] px-4 py-4"
                style={{ borderLeftColor: meta?.brandColor ?? "var(--color-border)" }}
              >
                <div className="mb-4 flex items-center justify-between gap-2 border-b-[1.5px] border-foreground pb-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <PlatformChip
                      platform={row.platform}
                      size="md"
                      title={meta?.full ?? row.platform}
                    />
                    <span className="truncate text-xs font-semibold leading-snug text-foreground">
                      {meta?.full ?? row.platform}
                    </span>
                  </div>
                  <span className="shrink-0 label-mono text-[0.5rem] text-muted-foreground/80">
                    {row.platform}
                  </span>
                </div>
                <PerformanceMetricCounters
                  values={{ views: row.views, likes: row.likes, shares: row.shares }}
                  deltas={row.deltas}
                />
              </div>
            );
          })}

          <AddPlatformCard testId="growth-matrix-add-platform" variant="grid" />
        </div>
      </CollapsibleSection>
    </div>
  );
}
