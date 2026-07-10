import { Activity, Eye, UserCheck } from "lucide-react";
import { LiveDataBadge, SampleDataBadge } from "@/components/LiveDataBadge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { LiveMetricsBundle } from "@/lib/live-metrics";
import { hasLiveMetrics } from "@/lib/live-metrics";

const ICONS: Record<string, typeof Eye> = {
  followers: UserCheck,
  views: Eye,
  engagement: Activity,
};

export function DashboardKpiRail({
  metrics,
  liveBundle,
}: {
  metrics: Array<{
    key: string;
    label: string;
    value: string;
    delta?: string;
    trend?: "up" | "down" | "flat";
    note?: string;
  }>;
  liveBundle: LiveMetricsBundle;
}) {
  const keys = new Set(["followers", "views", "engagement"]);
  const compact = metrics.filter((m) => keys.has(m.key));

  return (
    <Card elevated data-testid="dashboard-kpi-rail">
      <CardHeader
        title="Quick stats"
        description="Last 7 days"
        action={hasLiveMetrics(liveBundle) ? <LiveDataBadge /> : <SampleDataBadge />}
      />
      <CardBody className="space-y-3 pt-0">
        {compact.map((m) => {
          const Icon = ICONS[m.key] ?? Eye;
          return (
            <div
              key={m.key}
              data-testid={`metric-${m.key}`}
              className="rounded-md border border-line bg-paper-2 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-body-sm text-muted-foreground">{m.label}</span>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <div className="mt-2 font-data text-xl font-semibold text-foreground">{m.value}</div>
              {m.delta ? (
                <div
                  className={`mt-1 text-body-sm ${
                    m.trend === "up"
                      ? "text-success"
                      : m.trend === "down"
                        ? "text-danger"
                        : "text-muted-foreground"
                  }`}
                >
                  {m.delta}
                </div>
              ) : null}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
