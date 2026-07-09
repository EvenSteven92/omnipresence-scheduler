import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PLATFORMS, PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import type { Platform } from "@/lib/mock-data";
import { Link2, RefreshCw, Check } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const META_PLATFORMS = new Set<Platform>(["FB", "IG"]);
const LIVE_NOW = new Set<Platform>(["YT", "FB", "IG"]);

export function ConnectPlatformSection({
  workspace,
  id = "connect-platform",
  teamAuthed = true,
}: {
  workspace: WorkspaceProfile;
  id?: string;
  /** @deprecated Team access code removed; always treated as true. */
  teamAuthed?: boolean;
}) {
  const queryClient = useQueryClient();
  const { data: accountStatus, refetch } = usePlatformConnections(workspace.id);
  const youtubeConnected = accountStatus?.youtube.connected ?? false;
  const metaFacebookConnected = accountStatus?.meta.facebook.connected ?? false;
  const metaInstagramConnected = accountStatus?.meta.instagram.connected ?? false;
  const [syncingYouTube, setSyncingYouTube] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const availableCards = PLATFORMS.filter(
    (p) => workspace.platforms.includes(p.short) && LIVE_NOW.has(p.short),
  );
  const comingSoonCards = PLATFORMS.filter(
    (p) => workspace.platforms.includes(p.short) && !LIVE_NOW.has(p.short),
  );

  const connectedCount = [
    youtubeConnected,
    metaFacebookConnected || metaInstagramConnected,
  ].filter(Boolean).length;

  async function syncYouTube() {
    setSyncingYouTube(true);
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
      if (!res.ok) throw new Error(data.detail ?? `Sync failed (${res.status})`);
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["youtube-metrics", workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["platform-connections", workspace.id] }),
      ]);
      setSyncMessage({
        tone: "success",
        text: `YouTube refreshed · ${data.videoCount ?? 0} videos`,
      });
    } catch (error) {
      setSyncMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "YouTube sync failed",
      });
    } finally {
      setSyncingYouTube(false);
    }
  }

  async function syncMeta() {
    setSyncingMeta(true);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/meta/sync?workspace=${workspace.id}`, {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? `Sync failed (${res.status})`);
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ["meta-metrics", workspace.id] }),
        queryClient.invalidateQueries({ queryKey: ["platform-connections", workspace.id] }),
      ]);
      setSyncMessage({ tone: "success", text: "Meta metrics refreshed" });
    } catch (error) {
      setSyncMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Meta sync failed",
      });
    } finally {
      setSyncingMeta(false);
    }
  }

  function handleConnect(platform: Platform) {
    if (platform === "YT") {
      window.location.href = `/api/accounts/youtube/connect?workspace=${workspace.id}`;
      return;
    }
    if (META_PLATFORMS.has(platform)) {
      window.location.href = `/api/accounts/meta/connect?workspace=${workspace.id}`;
    }
  }

  function platformConnected(short: Platform) {
    if (short === "YT") return youtubeConnected;
    if (short === "FB") return metaFacebookConnected;
    if (short === "IG") return metaInstagramConnected;
    return false;
  }

  return (
    <section
      id={id}
      data-testid="connect-platform-section"
      className="scroll-mt-8 rounded-md border-[1.5px] border-foreground bg-card shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-[1.5px] border-foreground px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-foreground">Connect channels</h2>
          <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">
            Link YouTube and Meta to pull live analytics for{" "}
            <span className="font-medium text-foreground">{workspace.name}</span>. Other networks
            ship next.
          </p>
        </div>
        <Badge tone={connectedCount > 0 ? "success" : "muted"}>
          {connectedCount > 0 ? `${connectedCount} live` : "None connected"}
        </Badge>
      </div>

      <div className="space-y-6 p-5">
        {syncMessage ? (
          <p
            className={cn(
              "rounded-md border-[1.5px] border-foreground px-4 py-2.5 text-sm font-medium",
              syncMessage.tone === "success"
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {syncMessage.text}
          </p>
        ) : null}

        <div>
          <h3 className="mb-3 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Available now
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {availableCards.map((meta) => {
              const connected = platformConnected(meta.short);
              const isMetaCard = META_PLATFORMS.has(meta.short);
              const showMetaOnce = meta.short === "FB";

              if (isMetaCard && !showMetaOnce) return null;

              const syncing = meta.short === "YT" ? syncingYouTube : syncingMeta;

              return (
                <div
                  key={meta.short}
                  className={cn(
                    "flex flex-col gap-3 rounded-md border-[1.5px] border-foreground p-4",
                    connected ? "bg-paper-2" : "bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <PlatformChip platform={meta.short} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-bold text-foreground">
                        {meta.short === "FB" ? "Facebook & Instagram" : meta.full}
                      </div>
                      <p className="mt-0.5 text-body-sm text-muted-foreground">
                        {connected ? "Connected · metrics sync on refresh" : "One-click OAuth"}
                      </p>
                    </div>
                    {connected ? (
                      <Badge tone="success">
                        <Check className="h-3 w-3" /> Live
                      </Badge>
                    ) : null}
                  </div>
                  {connected ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      onClick={() => void (meta.short === "YT" ? syncYouTube() : syncMeta())}
                      disabled={syncing}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Refreshing…" : "Refresh metrics"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                      onClick={() => handleConnect(meta.short === "FB" ? "FB" : meta.short)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Connect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {comingSoonCards.length > 0 ? (
          <div>
            <h3 className="mb-3 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Coming soon
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {comingSoonCards.map((meta) => (
                <div
                  key={meta.short}
                  data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                  className="flex items-center gap-3 rounded-md border-[1.5px] border-foreground/40 bg-paper-2 px-4 py-4"
                >
                  <PlatformChip platform={meta.short} size="lg" variant="muted" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{meta.full}</div>
                    <Badge tone="muted" className="mt-1.5">
                      Coming soon
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LiveConnectionStrip({ workspace }: { workspace: WorkspaceProfile }) {
  const { data: accountStatus } = usePlatformConnections(workspace.id);
  const live = accountStatus?.connections.filter((c) => c.status === "ok") ?? [];
  const demoPlatforms = workspace.platforms.filter((p) => !live.some((c) => c.platform === p));

  return (
    <div className="flex flex-wrap gap-2">
      {live.map((c) => {
        const meta = PLATFORMS_BY_SHORT[c.platform];
        return (
          <div
            key={c.platform}
            className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-foreground bg-success/10 px-3 py-2"
          >
            <PlatformChip platform={c.platform} size="md" />
            <span className="text-body-sm font-medium text-foreground">
              {meta?.full ?? c.platform}
            </span>
            <Badge tone="success">Live</Badge>
          </div>
        );
      })}
      {demoPlatforms.slice(0, 4).map((p) => (
        <div
          key={p}
          className="inline-flex items-center gap-2 rounded-md border-[1.5px] border-foreground/40 bg-paper-2 px-3 py-2"
        >
          <PlatformChip platform={p} size="md" variant="muted" />
          <Badge tone="muted">Sample</Badge>
        </div>
      ))}
      {demoPlatforms.length > 4 ? (
        <span className="self-center text-body-sm text-muted-foreground">
          +{demoPlatforms.length - 4} sample
        </span>
      ) : null}
    </div>
  );
}
