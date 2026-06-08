import type { EventPerformance } from "@/lib/events/display";
import { fmtCompact } from "@/lib/events/display";
import { Eye, Heart, Share2, Activity } from "lucide-react";

export function EventPerformanceStrip({ perf }: { perf: EventPerformance }) {
  const cells = [
    { label: "total_views", value: fmtCompact(perf.totalViews), icon: Eye },
    { label: "total_likes", value: fmtCompact(perf.totalLikes), icon: Heart },
    { label: "total_shares", value: fmtCompact(perf.totalShares), icon: Share2 },
    {
      label: "avg_engagement",
      value: perf.publishedCount > 0 ? `${(perf.avgEngagement * 100).toFixed(1)}%` : "—",
      icon: Activity,
      highlight: true,
    },
  ];

  return (
    <div
      data-testid="event-performance-strip"
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      {cells.map(({ label, value, icon: Icon, highlight }) => (
        <div key={label} className="kpi-card px-4 py-4">
          <div className="flex items-start justify-between">
            <div className="label-mono">{label}</div>
            <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div
            className={`mt-3 text-2xl font-semibold tracking-tight ${
              highlight ? "text-accent" : "text-foreground"
            }`}
          >
            {value}
          </div>

        </div>
      ))}
    </div>
  );
}