import type { GrowthMatrixMetricDelta, MetricTrend } from "@/lib/timeframe";

export const PERFORMANCE_METRICS = [
  { key: "views" as const, label: "views" },
  { key: "likes" as const, label: "likes" },
  { key: "shares" as const, label: "shares" },
];

export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

const TREND_CLASS: Record<MetricTrend, string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-muted-foreground",
};

function shareOfTop(value: number, max: number): number {
  if (value === 0 || max === 0) return 0;
  return (value / max) * 100;
}

export function PerformanceMetricCounters({
  values,
  deltas,
  max,
  size = "md",
}: {
  values: { views: number; likes: number; shares: number };
  /** Period-over-period change — green/red like Core Performance KPIs. */
  deltas?: Record<"views" | "likes" | "shares", GrowthMatrixMetricDelta>;
  /** Share of top performer within a set (event album cards). */
  max?: { views: number; likes: number; shares: number };
  size?: "sm" | "md";
}) {
  const valueClass = size === "sm" ? "text-xl" : "text-2xl";

  return (
    <div className="grid grid-cols-3 gap-3">
      {PERFORMANCE_METRICS.map((m) => {
        const value = values[m.key];
        const delta = deltas?.[m.key];
        const sharePct = max ? shareOfTop(value, max[m.key]) : null;

        return (
          <div key={m.key}>
            <div className="text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {m.label}
            </div>
            <div
              className={`mt-2 font-semibold tracking-tight text-foreground tabular-nums ${valueClass}`}
            >
              {fmtCompact(value)}
            </div>
            {delta?.label ? (
              <div className={`mt-1 text-xs ${TREND_CLASS[delta.trend]}`}>{delta.label}</div>
            ) : sharePct !== null ? (
              <div className="mt-1 text-xs text-muted-foreground">{sharePct.toFixed(0)}%</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
