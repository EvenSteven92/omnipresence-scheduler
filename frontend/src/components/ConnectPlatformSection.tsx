import { PLATFORMS } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { useYouTubeMetrics } from "@/hooks/useYouTubeMetrics";
import { Link2, RefreshCw } from "lucide-react";

export function ConnectPlatformSection({
  workspace,
  id = "connect-platform",
  teamAuthed = false,
}: {
  workspace: WorkspaceProfile;
  id?: string;
  teamAuthed?: boolean;
}) {
  const { data: youtubeMetrics, refetch, isFetching } = useYouTubeMetrics(workspace.id);
  const youtubeConnected = youtubeMetrics?.connected ?? false;

  const connected = new Set(
    workspace.platformConnections
      .filter((c) => c.status === "ok")
      .map((c) => c.platform)
      .concat(youtubeConnected ? ["YT"] : []),
  );
  const available = PLATFORMS.filter((p) => workspace.platforms.includes(p.short));
  const toConnect = available.filter((p) => !connected.has(p.short));

  async function syncYouTube() {
    await fetch(`/api/youtube/sync?workspace=${workspace.id}`, { method: "POST" });
    await refetch();
  }

  return (
    <section id={id} data-testid="connect-platform-section" className="scroll-mt-8">
      <div className="panel border border-dashed border-border bg-surface/40 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-mono mb-2">add_social_platform</div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Connect OAuth to pull live metrics into your dashboard. YouTube is live now
              (read-only). Meta and X are next.
            </p>
          </div>
          <span className="rounded-sm border border-border bg-background/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            {workspace.name}
          </span>
        </div>

        {youtubeConnected && youtubeMetrics?.channel ? (
          <div className="mt-6 rounded-sm border border-success/30 bg-success/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  YouTube connected · {youtubeMetrics.channel.channelTitle}
                </div>
                <div className="label-mono mt-1 text-[0.55rem] text-muted-foreground">
                  {youtubeMetrics.videos.length} videos synced · last{" "}
                  {new Date(youtubeMetrics.channel.syncedAt).toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void syncYouTube()}
                disabled={!teamAuthed || isFetching}
                className="btn-action inline-flex items-center gap-2"
              >
                <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
                Sync now
              </button>
            </div>
          </div>
        ) : null}

        {toConnect.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            All enabled platforms are connected for this workspace.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {toConnect.map((meta) => {
              const conn = workspace.platformConnections.find((c) => c.platform === meta.short);
              const needsReconnect = conn?.status === "disconnected";
              const expiring = conn?.status === "expiring";
              const isYouTube = meta.short === "YT";
              const canConnectYouTube = isYouTube && teamAuthed;
              const disabled = !isYouTube || !teamAuthed;

              return (
                <button
                  key={meta.short}
                  type="button"
                  disabled={disabled}
                  data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                  title={
                    isYouTube
                      ? teamAuthed
                        ? "Connect YouTube (read-only)"
                        : "Unlock team access first"
                      : "Coming soon"
                  }
                  onClick={() => {
                    if (canConnectYouTube) {
                      window.location.href = `/api/accounts/youtube/connect?workspace=${workspace.id}`;
                    }
                  }}
                  className={`kpi-card flex items-center gap-3 px-4 py-4 text-left ${
                    disabled ? "cursor-not-allowed opacity-60" : "hover:border-accent/50"
                  }`}
                >
                  <PlatformChip platform={meta.short} size="xl" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground">{meta.full}</div>
                    <div className="label-mono mt-0.5 text-[0.55rem] text-muted-foreground">
                      {isYouTube
                        ? teamAuthed
                          ? "connect_oauth · read_only"
                          : "unlock_team_access"
                        : needsReconnect
                          ? "reconnect"
                          : expiring
                            ? `expires · ${conn?.expiresInDays ?? "?"}d`
                            : "coming_soon"}
                    </div>
                  </div>
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        )}

        <p className="label-mono mt-6 text-muted-foreground/70">
          youtube_live · meta_and_x_next
        </p>
      </div>
    </section>
  );
}