import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { ConnectPlatformSection, LiveConnectionStrip } from "@/components/ConnectPlatformSection";
import { TeamAccessGate } from "@/components/TeamAccessGate";
import { useTeamSession } from "@/hooks/useTeamSession";
import { useWorkspace } from "@/lib/workspace-context";
import { useOAuthAutoSync } from "@/hooks/useOAuthAutoSync";
import { OnboardingStepper } from "@/components/workspaces/OnboardingStepper";
import { ArrowRight, Link2 } from "lucide-react";

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

      <div className="page-content space-y-6">
        {banner ? (
          <div className="panel border border-accent/30 bg-accent/5 p-4 text-body-sm text-foreground">
            {banner}
          </div>
        ) : null}

        <div className="max-w-4xl space-y-6">
          <OnboardingStepper />

          {!teamAuthed ? (
            <TeamAccessGate
              onAuthed={() => {
                sessionStorage.setItem("team_authed", "1");
                queryClient.setQueryData(["team-session"], true);
              }}
            />
          ) : null}

          <ConnectPlatformSection workspace={workspace} teamAuthed={teamAuthed} />

          <div className="panel p-5">
            <h2 className="text-title">How it works</h2>
            <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
              Each workspace is one company or brand. Metrics, scheduled posts, platform
              connections, and drafts only show that workspace&apos;s accounts. Switch companies from
              the sidebar anytime.
            </p>
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-eyebrow">Your workspaces · {workspaces.length}</h2>
              <button
                type="button"
                disabled
                className="btn-action gap-2 opacity-60"
                title="Available when backend onboarding ships"
              >
                <Link2 className="h-3 w-3" />
                Add company (soon)
              </button>
            </div>
            {workspaces.map((ws) => {
              const active = ws.id === workspace.id;
              return (
                <article
                  key={ws.id}
                  data-testid={`workspace-card-${ws.slug}`}
                  className={`overflow-hidden rounded-md border bg-surface-elevated ${
                    active ? "border-accent" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-foreground font-data text-sm font-bold text-background">
                        {ws.initials}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-title">{ws.name}</h3>
                        <p className="mt-0.5 text-body-sm text-muted-foreground">{ws.tagline}</p>
                        <OnboardingBadge status={ws.onboardingStatus} />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={active}
                      onClick={() => setWorkspaceId(ws.id)}
                      className="btn-action shrink-0 disabled:opacity-50"
                    >
                      {active ? "Active" : "Switch to"}
                    </button>
                  </div>

                  <div className="px-5 py-4">
                    <div className="text-eyebrow mb-3">Connected platforms</div>
                    {active ? (
                      <LiveConnectionStrip workspace={ws} />
                    ) : (
                      <p className="text-body-sm text-muted-foreground">
                        Switch to this workspace to connect accounts.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </div>
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
