import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { ConnectPlatformSection } from "@/components/ConnectPlatformSection";
import { useWorkspace } from "@/lib/workspace-context";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Circle,
  ArrowRight,
  Link2,
} from "lucide-react";

export const Route = createFileRoute("/workspaces")({
  head: () => ({
    meta: [
      { title: "Workspaces — TORCC OmniSocial" },
      {
        name: "description",
        content: "Manage company workspaces and connect social accounts for metrics and publishing.",
      },
    ],
  }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const { workspace, workspaces, setWorkspaceId } = useWorkspace();

  useEffect(() => {
    if (window.location.hash === "#connect-platform") {
      document.getElementById("connect-platform")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="multi_tenant"
        title="Workspaces"
        actions={
          <>
            <Link to="/" className="btn-action">
              Dashboard <ArrowRight className="h-3 w-3" />
            </Link>
            <NewEventPostActions />
          </>
        }
      />

      <div className="page-content max-w-4xl">
        <div className="panel p-8">
          <div className="label-mono mb-2">how_it_works</div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Each workspace is one company or brand. Metrics, scheduled posts, platform
            connections, and drafts only show that workspace&apos;s accounts. Switch
            companies from the sidebar picker anytime.
          </p>
        </div>

        <ConnectPlatformSection workspace={workspace} />

        <section className="section-block space-y-4">
          <div className="label-mono">your_workspaces · {workspaces.length}</div>
          {workspaces.map((ws) => {
            const active = ws.id === workspace.id;
            return (
              <article
                key={ws.id}
                data-testid={`workspace-card-${ws.slug}`}
                className={`overflow-hidden rounded-sm border bg-surface ${
                  active ? "border-accent" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-6 py-5">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-foreground font-mono text-sm font-bold text-background">
                      {ws.initials}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{ws.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{ws.tagline}</p>
                      <OnboardingBadge status={ws.onboardingStatus} />
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => setWorkspaceId(ws.id)}
                    className="btn-action disabled:opacity-50"
                  >
                    {active ? "Active" : "Switch_To"}
                  </button>
                </div>

                <div className="px-6 py-5">
                  <div className="label-mono mb-3">connected_platforms</div>
                  <div className="flex flex-wrap gap-2">
                    {ws.platformConnections.map((c) => {
                      const meta = PLATFORMS_BY_SHORT[c.platform];
                      return (
                        <span
                          key={c.platform}
                          className="inline-flex items-center gap-2"
                        >
                          <PlatformChip
                            platform={c.platform}
                            label={c.platform}
                            size="md"
                            variant={
                              c.status === "disconnected"
                                ? "danger"
                                : c.status === "expiring"
                                  ? "warning"
                                  : "default"
                            }
                            title={meta?.full ?? c.platform}
                          />
                          <StatusDot status={c.status} />
                        </span>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="section-block">
          <div className="panel border-dashed p-8">
            <div className="flex items-start gap-4">
              <Building2 className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.25} />
              <div>
                <div className="label-mono mb-2">onboarding · coming_next</div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Future flow: enter company name → connect OAuth for each platform →
                  metrics sync automatically into this dashboard. For now, workspaces use
                  demo data per company; add a real workspace via API/DB in Phase 1.
                </p>
                <ol className="mt-4 space-y-2 text-sm text-foreground">
                  <li className="flex gap-2">
                    <span className="label-mono text-muted-foreground">01</span>
                    Create workspace (name, slug, timezone)
                  </li>
                  <li className="flex gap-2">
                    <span className="label-mono text-muted-foreground">02</span>
                    Connect accounts (X, Meta, YouTube, Rumble, TikTok, …)
                  </li>
                  <li className="flex gap-2">
                    <span className="label-mono text-muted-foreground">03</span>
                    Pull metrics + enable scheduling for that workspace only
                  </li>
                </ol>
                <button
                  type="button"
                  disabled
                  className="btn-action mt-6 gap-2 opacity-60"
                  title="Available when backend onboarding ships"
                >
                  <Link2 className="h-3 w-3" />
                  Add_Company (soon)
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function OnboardingBadge({ status }: { status: string }) {
  const cls =
    status === "complete"
      ? "border-success/50 text-success"
      : status === "needs_accounts"
        ? "border-warning/50 text-warning"
        : "border-border text-muted-foreground";
  return (
    <span className={`label-mono mt-2 inline-block rounded-sm border px-2 py-1 text-[0.55rem] ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="h-3 w-3 text-success" />;
  if (status === "expiring") return <AlertTriangle className="h-3 w-3 text-warning" />;
  return <Circle className="h-3 w-3 text-danger" />;
}