import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PLATFORMS, PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
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
  const queryClient = useQueryClient();
  const { data: accountStatus, refetch } = usePlatformConnections(workspace.id);
  const youtubeConnected = accountStatus?.youtube.connected ?? false;
  const livePlatforms = new Set(accountStatus?.livePlatforms ?? ["YT"]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  const integrationCards = PLATFORMS.filter((p) => workspace.platforms.includes(p.short));

  async function syncYouTube() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/youtube/sync?workspace=${workspace.id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as {
        detail?: string;
        syncedAt?: string;
        videoCount?: number;
      };
      if (!res.ok) {
        throw new Error(data.detail ?? `Sync failed (${res.status})`);
      }
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["youtube-metrics", workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["platform-connections", workspace.id] }),
      ]);
      const syncedLabel = data.syncedAt
        ? new Date(data.syncedAt).toLocaleString()
        : "just now";
      setSyncMessage({
        tone: "success",
        text: `Synced ${data.videoCount ?? 0} videos · ${syncedLabel}`,
      });
    } catch (error) {
      setSyncMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "YouTube sync failed",
      });
    } finally {
      setSyncing(false);
    }
  }

  return (
    <section id={id} data-testid="connect-platform-section" className="scroll-mt-8">
      <div className="panel border border-dashed border-border bg-surface/40 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-mono mb-2">platform_integrations</div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Connect real accounts one at a time. YouTube is live (read-only). Other platforms
              stay in demo mode until we wire OAuth for each.
            </p>
          </div>
          <span className="rounded-sm border border-border bg-background/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            {workspace.name}
          </span>
        </div>

        {youtubeConnected && accountStatus?.youtube.channelTitle ? (
          <div className="mt-6 rounded-sm border border-success/30 bg-success/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  YouTube connected · {accountStatus.youtube.channelTitle}
                </div>
                <div className="label-mono mt-1 text-[0.55rem] text-muted-foreground">
                  live_oauth ·{" "}
                  {accountStatus.youtube.syncedAt
                    ? `synced ${new Date(accountStatus.youtube.syncedAt).toLocaleString()}`
                    : "awaiting first sync"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void syncYouTube()}
                disabled={!teamAuthed || syncing}
                className="btn-action inline-flex items-center gap-2 disabled:opacity-50"
                title={teamAuthed ? "Pull latest YouTube metrics" : "Unlock team access first"}
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            </div>
            {syncMessage ? (
              <p
                className={`mt-3 text-sm ${
                  syncMessage.tone === "success" ? "text-success" : "text-destructive"
                }`}
              >
                {syncMessage.text}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {integrationCards.map((meta) => {
            const isLive = livePlatforms.has(meta.short);
            const isYouTube = meta.short === "YT";
            const connected =
              isYouTube && youtubeConnected
                ? true
                : accountStatus?.connections.find((c) => c.platform === meta.short)?.status ===
                  "ok";

            if (isLive && isYouTube) {
              return (
                <button
                  key={meta.short}
                  type="button"
                  disabled={!teamAuthed || connected}
                  data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                  title={
                    connected
                      ? "YouTube already connected"
                      : teamAuthed
                        ? "Connect YouTube (read-only)"
                        : "Unlock team access first"
                  }
                  onClick={() => {
                    if (teamAuthed && !connected) {
                      window.location.href = `/api/accounts/youtube/connect?workspace=${workspace.id}`;
                    }
                  }}
                  className={`kpi-card flex items-center gap-3 px-4 py-4 text-left ${
                    !teamAuthed || connected
                      ? "cursor-default opacity-80"
                      : "hover:border-accent/50"
                  }`}
                >
                  <PlatformChip platform={meta.short} size="xl" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground">{meta.full}</div>
                    <div className="label-mono mt-0.5 text-[0.55rem] text-muted-foreground">
                      {connected
                        ? "live · connected"
                        : teamAuthed
                          ? "connect_oauth · read_only"
                          : "unlock_team_access"}
                    </div>
                  </div>
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </button>
              );
            }

            return (
              <div
                key={meta.short}
                data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                className="kpi-card flex items-center gap-3 px-4 py-4 text-left opacity-55"
              >
                <PlatformChip platform={meta.short} size="xl" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-foreground">{meta.full}</div>
                  <div className="label-mono mt-0.5 text-[0.55rem] text-muted-foreground">
                    demo_data · coming_soon
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="label-mono mt-6 text-muted-foreground/70">
          live: youtube · next: meta · x
        </p>
      </div>
    </section>
  );
}

export function LiveConnectionStrip({
  workspace,
}: {
  workspace: WorkspaceProfile;
}) {
  const { data: accountStatus } = usePlatformConnections(workspace.id);
  const live = accountStatus?.connections.filter((c) => c.status === "ok") ?? [];
  const demoPlatforms = workspace.platforms.filter(
    (p) => !live.some((c) => c.platform === p),
  );

  return (
    <div className="flex flex-wrap gap-3">
      {live.map((c) => {
        const meta = PLATFORMS_BY_SHORT[c.platform];
        return (
          <div
            key={c.platform}
            className="inline-flex items-center gap-2 rounded-sm border border-success/40 bg-success/5 px-3 py-2"
          >
            <PlatformChip platform={c.platform} size="md" />
            <span className="label-mono text-[0.55rem] text-success">
              {meta?.full ?? c.platform} · live
            </span>
          </div>
        );
      })}
      {demoPlatforms.slice(0, 4).map((p) => (
        <div
          key={p}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 opacity-60"
        >
          <PlatformChip platform={p} size="md" />
          <span className="label-mono text-[0.55rem] text-muted-foreground">demo</span>
        </div>
      ))}
      {demoPlatforms.length > 4 ? (
        <span className="label-mono self-center text-[0.55rem] text-muted-foreground">
          +{demoPlatforms.length - 4} demo
        </span>
      ) : null}
    </div>
  );
}