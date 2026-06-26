import { fmtCompact } from "@/components/PerformanceMetricCounters";
import { cn } from "@/lib/utils";

export function CardStats({
  views,
  likes,
  engagementRate,
  className,
}: {
  views: number;
  likes: number;
  /** Decimal rate — e.g. 0.042 → 4.2% */
  engagementRate: number;
  className?: string;
}) {
  const cells = [
    { label: "Views", value: fmtCompact(views), accent: false },
    { label: "Likes", value: fmtCompact(likes), accent: false },
    { label: "Engagement", value: `${(engagementRate * 100).toFixed(1)}%`, accent: true },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-px overflow-hidden rounded-md border-[1.5px] border-foreground bg-foreground",
        className,
      )}
    >
      {cells.map(({ label, value, accent }) => (
        <div key={label} className="bg-card px-3 py-2.5 text-center">
          <div
            className={cn(
              "font-display text-lg font-bold leading-none text-foreground",
              accent && "text-accent",
            )}
          >
            {value}
          </div>
          <div className="mt-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
