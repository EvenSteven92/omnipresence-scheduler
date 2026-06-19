import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { ConnectPlatformSection, LiveConnectionStrip } from "@/components/ConnectPlatformSection";
import { TeamAccessGate } from "@/components/TeamAccessGate";
import { useTeamSession } from "@/hooks/useTeamSession";
import { useWorkspace } from "@/lib/workspace-context";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useOAuthAutoSync } from "@/hooks/useOAuthAutoSync";
import { OnboardingStepper } from "@/components/workspaces/OnboardingStepper";
import { Building2, ArrowRight, Link2 } from "lucide-react";

export const Route = createFileRoute("/workspaces")({
  head: () => ({
    meta: [
      { title: "Workspaces — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Manage company workspaces and connect social accounts for metrics and publishing.",
      },
    ],
  }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const { workspace, workspaces, setWorkspaceId, workspaceId } = useWorkspace();
  const { data: connections } = usePlatformConnections(workspaceId);
  const hasConnectedAccounts =
    (connections?.youtube.connected ?? false) ||
    (connections?.meta.facebook.connected ?? false) ||
    (connections?.meta.instagram.connected ?? false) ||
    workspaces.some((ws) => ws.onboardingStatus === "complete");
  const queryClient = useQueryClient();
  const { data: teamAuthed = false } = useTeamSession();
  const [banner, setBanner] = useState<string | null>(null);
  const [oauthParams, setOauthParams] = useState<{ youtube?: string | null; meta?: string | null }>(
    {},
  );

  useOAuthAutoSync(workspaceId, oauthParams, teamAuthed);

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
    } else if (youtube === "denied") {
      setBanner("YouTube connect was cancelled.");
    } else if (youtube === "error") {
      setBanner(params.get("message") ?? "YouTube connect failed.");
    } else if (meta === "connected") {
      setBanner("Meta connected — syncing Facebook and Instagram metrics now.");
    } else if (meta === "partial") {
      setBanner(
        params.get("message") ??
          "Meta connected with limited access. Add pages_read_engagement in Login for Business, then reconnect.",
      );
    } else if (meta === "denied") {
      setBanner("Meta connect was cancelled.");
    } else if (meta === "error") {
      setBanner(params.get("message") ?? "Meta connect failed.");
    }

    if (params.has("youtube") || params.has("meta")) {
      const cleanUrl = `${window.location.pathname}${window.location.hash}`;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  return (
    <div>
      <PageHeader
        eyebrow="Workspaces"
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

      <div className="page-content max-w-3xl mx-auto space-y-6">
        <OnboardingStepper />

        {banner ? (
          <div className="panel border border-accent/30 bg-accent/5 p-4 text-body-sm text-foreground">
            {banner}
          </div>
        ) : null}

        {!teamAuthed ? (
          <TeamAccessGate
            onAuthed={() => {
              sessionStorage.setItem("team_authed", "1");
              queryClient.setQueryData(["team-session"], true);
            }}
          />
        ) : null}

        <ConnectPlatformSection workspace={workspace} teamAuthed={teamAuthed} />

        <div className="panel p-6">
          <h2 className="text-title text-sm">How it works</h2>
          <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
            Each workspace is one company or brand. Metrics, scheduled posts, platform connections,
            and drafts only show that workspace&apos;s accounts. Switch companies from the sidebar
            anytime.
          </p>
        </div>

        <section className="section-block space-y-4">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Your workspaces · {workspaces.length}
          </div>
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
                    {active ? "Active" : "Switch to"}
                  </button>
                </div>

                <div className="px-6 py-5">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Connected platforms
                  </div>
                  {active ? (
                    <LiveConnectionStrip workspace={ws} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Switch to this workspace to connect accounts.
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </section>

        {!hasConnectedAccounts ? (
          <section className="section-block">
            <div className="panel border-dashed p-8">
              <div className="flex items-start gap-4">
                <Building2 className="h-8 w-8 shrink-0 text-accent" strokeWidth={1.25} />
                <div>
                  <div className="mb-2 text-sm font-medium text-foreground">Getting started</div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Connect OAuth for each platform and metrics sync automatically into this
                    dashboard. Workspaces keep each company&apos;s accounts and content separate.
                  </p>
                  <ol className="mt-4 space-y-2 text-sm text-foreground">
                    <li className="flex gap-2">
                      <span className="font-mono text-muted-foreground">1</span>
                      Create workspace (name, slug, timezone)
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-muted-foreground">2</span>
                      Connect accounts (X, Meta, YouTube, Rumble, TikTok, …)
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-muted-foreground">3</span>
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
                    Add company (soon)
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function OnboardingBadge({ status }: { status: string }) {
  const config =
    status === "complete"
      ? { dot: "bg-success", label: "Connected", cls: "border-success/50 text-success" }
      : status === "needs_accounts"
        ? { dot: "bg-warning", label: "Needs accounts", cls: "border-warning/50 text-warning" }
        : {
            dot: "bg-muted-foreground",
            label: "Draft",
            cls: "border-border text-muted-foreground",
          };

  return (
    <span
      className={`mt-2 inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.55rem] uppercase tracking-[0.1em] ${config.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden />
      {config.label}
    </span>
  );
}
