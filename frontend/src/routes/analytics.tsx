import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { metrics, growthMatrix } from "@/lib/mock-data";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — TORCC OmniSocial" },
      { name: "description", content: "Deep performance analytics across every connected social account." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const max = Math.max(...growthMatrix.map((g) => g.views));
  return (
    <div className="pb-20">
      <PageHeader eyebrow="analytics_engine" title="Analytics" />
      <div className="px-10 pt-8">
        <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">
          {metrics.slice(0, 4).map((m) => (
            <div key={m.label} className="bg-surface p-5">
              <div className="label-mono">{m.label.replace(/ /g, "_")}</div>
              <div className="mt-3 text-2xl font-semibold text-foreground">{m.value}</div>
              <div className={`mt-1 text-xs ${m.trend === "up" ? "text-success" : "text-danger"}`}>{m.delta}</div>
            </div>
          ))}
        </div>

        <div className="panel mt-8 p-6">
          <div className="label-mono mb-6">platform_breakdown</div>
          <div className="space-y-4">
            {growthMatrix.map((g) => (
              <div key={g.platform} className="grid grid-cols-[80px_1fr_80px] items-center gap-4">
                <span className="label-mono">{g.platform}</span>
                <div className="h-6 bg-background">
                  <div className="h-full bg-foreground" style={{ width: `${(g.views / max) * 100}%` }} />
                </div>
                <span className="text-right text-xs text-foreground">{g.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
