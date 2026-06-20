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
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-2 border-t border-border bg-background/40 px-3 py-2.5 text-center",
        className,
      )}
    >
      <div>
        <div className="font-mono text-sm text-foreground">{fmtCompact(views)}</div>
        <div className="text-body-sm text-muted-foreground">Views</div>
      </div>
      <div>
        <div className="font-mono text-sm text-foreground">{fmtCompact(likes)}</div>
        <div className="text-body-sm text-muted-foreground">Likes</div>
      </div>
      <div>
        <div className="font-mono text-sm text-accent">{(engagementRate * 100).toFixed(1)}%</div>
        <div className="text-body-sm text-muted-foreground">Engagement</div>
      </div>
    </div>
  );
}