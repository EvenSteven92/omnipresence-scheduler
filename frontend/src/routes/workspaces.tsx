import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ConnectPlatformSection } from "@/components/ConnectPlatformSection";
import { useWorkspace } from "@/lib/workspace-context";
import { useOAuthAutoSync } from "@/hooks/useOAuthAutoSync";
import { OnboardingStepper } from "@/components/workspaces/OnboardingStepper";
import { ArrowRight, Building2, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

export const Route = createFileRoute("/workspaces")({
  head: () => ({
    meta: [
      { title: "Admin — TORCC OmniSocial" },
      {
        name: "description",
        content: "Set up workspaces and connect social accounts for metrics and publishing.",
      },
    ],
  }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const { workspace, workspaces, setWorkspaceId, workspaceId, postsDbMode } = useWorkspace();
  const [banner, setBanner] = useState<string | null>(null);
  const [bannerTone, setBannerTone] = useState<"success" | "warning" | "error">("success");
  const [oauthParams, setOauthParams] = useState<{ youtube?: string | null; meta?: string | null }>(
    {},
  );

  useOAuthAutoSync(workspaceId, oauthParams);

  useEffect(() => {
    if (window.location.hash === "#connect-platform") {
      document
        .getElementById("connect-platform")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const params = new URLSearchParams(window.location.search);
    const youtube = params.get("youtube");
    const meta = params.get("meta");
    setOauthParams({ youtube, meta });
    if (youtube === "connected") {
      setBanner("YouTube connected — syncing metrics now.");
      setBannerTone("success");
    } else if (youtube === "denied") {
      setBanner("YouTube connect was cancelled.");
      setBannerTone("warning");
    } else if (youtube === "error") {
      setBanner(params.get("message") ?? "YouTube connect failed.");
      setBannerTone("error");
    } else if (meta === "connected") {
      setBanner("Meta connected — syncing Facebook and Instagram metrics now.");
      setBannerTone("success");
    } else if (meta === "partial") {
      setBanner(
        params.get("message") ??
          "Meta connected with limited access. Add pages_read_engagement in Login for Business, then reconnect.",
      );
      setBannerTone("warning");
    } else if (meta === "denied") {
      setBanner("Meta connect was cancelled.");
      setBannerTone("warning");
    } else if (meta === "error") {
      setBanner(params.get("message") ?? "Meta connect failed.");
      setBannerTone("error");
    }

    if (params.has("youtube") || params.has("meta")) {
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Workspace setup"
        description={`Configure ${workspace.name}: channel connections and brand switching.`}
        actions={
          <>
            <Link to="/" className="btn-action btn-action-secondary">
              Queue <ArrowRight className="h-3 w-3" />
            </Link>
            <Link to="/scheduler" className="btn-action-primary btn-action">
              + New post
            </Link>
          </>
        }
      />

      <div className="page-content mx-auto max-w-[1320px] space-y-6">
        <div
          className={cn(
            "rounded-md border-[1.5px] border-foreground px-4 py-3 text-body-sm",
            postsDbMode ? "bg-success/10 text-foreground" : "bg-paper-2 text-muted-foreground",
          )}
          data-testid="posts-storage-mode"
        >
          {postsDbMode ? (
            <>
              <span className="font-semibold text-foreground">Shared database</span> — scheduled
              cards are stored in Postgres and sync for the whole team.
            </>
          ) : (
            <>
              <span className="font-semibold text-foreground">Local demo mode</span> — set{" "}
              <code className="font-data text-foreground">DATABASE_URL</code> on Vercel and run{" "}
              <code className="font-data text-foreground">migrate-posts-events.sql</code> to enable
              shared schedules.
            </>
          )}
        </div>
        {banner ? (
          <div
            role="status"
            className={cn(
              "rounded-md border-[1.5px] border-foreground px-4 py-3 text-body-sm font-medium text-foreground",
              bannerTone === "success" && "bg-success/10",
              bannerTone === "warning" && "bg-warning/10",
              bannerTone === "error" && "bg-destructive/10",
            )}
          >
            {banner}
          </div>
        ) : null}

        <OnboardingStepper />

        <div className="page-grid">
          <div className="page-grid-main space-y-6">
            <ConnectPlatformSection workspace={workspace} />
          </div>

          <aside className="page-grid-rail space-y-4">
            {/* Active workspace spotlight */}
            <section
              data-testid="active-workspace-card"
              className="rounded-md border-[1.5px] border-foreground bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-eyebrow">Active workspace</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-[1.5px] border-foreground bg-accent font-display text-lg font-extrabold text-foreground">
                  {workspace.initials}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-display text-xl font-bold text-foreground">
                    {workspace.name}
                  </h2>
                  <OnboardingBadge status={workspace.onboardingStatus} />
                </div>
              </div>
              <p className="mt-4 text-body-sm leading-relaxed text-muted-foreground">
                Metrics, scheduled posts, and OAuth connections stay scoped to this brand. Switch
                companies below or from the sidebar.
              </p>
            </section>

            {/* Workspace switcher list */}
            <section className="rounded-md border-[1.5px] border-foreground bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-foreground">Your workspaces</h2>
                <span className="font-data text-body-sm text-muted-foreground">
                  {workspaces.length}
                </span>
              </div>
              <div className="space-y-2">
                {workspaces.map((ws) => {
                  const active = ws.id === workspace.id;
                  return (
                    <div
                      key={ws.id}
                      data-testid={`workspace-card-${ws.slug}`}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border-[1.5px] border-foreground px-3 py-2.5",
                        active ? "bg-accent/15 shadow-[2px_2px_0_0_var(--color-foreground)]" : "bg-card",
                      )}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-[1.5px] border-foreground bg-foreground font-data text-xs font-bold text-background">
                        {ws.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {ws.name}
                        </div>
                        <OnboardingBadge status={ws.onboardingStatus} compact />
                      </div>
                      {active ? (
                        <Badge tone="accent">Active</Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setWorkspaceId(ws.id)}
                          className="btn-action btn-action-secondary shrink-0 py-1.5 text-[0.7rem]"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled
                className="btn-action btn-action-secondary mt-3 w-full justify-center gap-2 opacity-50"
                title="Available when backend onboarding ships"
              >
                <Link2 className="h-3 w-3" />
                Add company (soon)
              </button>
            </section>

            {/* How it works */}
            <section className="rounded-md border-[1.5px] border-foreground bg-paper-2 p-5">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-accent" strokeWidth={2} />
                <h2 className="font-display text-sm font-bold text-foreground">How it works</h2>
              </div>
              <ol className="mt-3 space-y-2.5 text-body-sm leading-relaxed text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">1. Connect</span> — OAuth for
                  YouTube and Meta pulls live metrics.
                </li>
                <li>
                  <span className="font-semibold text-foreground">2. Publish</span> — schedule from
                  Composer; each workspace stays isolated.
                </li>
                <li>
                  <span className="font-semibold text-foreground">3. Review</span> — analytics and
                  calendar stay scoped to this brand.
                </li>
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function OnboardingBadge({ status, compact = false }: { status: string; compact?: boolean }) {
  const config =
    status === "complete"
      ? { label: "Connected", cls: "text-success" }
      : status === "needs_accounts"
        ? { label: "Needs accounts", cls: "text-warning" }
        : { label: "Draft", cls: "text-muted-foreground" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-[0.08em]",
        compact ? "mt-0.5 text-[0.55rem]" : "mt-1 text-[0.625rem]",
        config.cls,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "complete"
            ? "bg-success"
            : status === "needs_accounts"
              ? "bg-warning"
              : "bg-muted-foreground",
        )}
        aria-hidden
      />
      {config.label}
    </span>
  );
}
