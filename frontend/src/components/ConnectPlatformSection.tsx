import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PLATFORMS, PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import type { Platform } from "@/lib/mock-data";
import { Link2, RefreshCw, Check } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

const META_PLATFORMS = new Set<Platform>(["FB", "IG"]);
const LIVE_NOW = new Set<Platform>(["YT", "FB", "IG"]);

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
  const metaFacebookConnected = accountStatus?.meta.facebook.connected ?? false;
  const metaInstagramConnected = accountStatus?.meta.instagram.connected ?? false;
  const [syncingYouTube, setSyncingYouTube] = useState(false);
  const [syncingMeta, setSyncingMeta] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ tone: "success" | "error"; text: string } | null>(
    null,
  );

  const availableCards = PLATFORMS.filter(
    (p) => workspace.platforms.includes(p.short) && LIVE_NOW.has(p.short),
  );
  const comingSoonCards = PLATFORMS.filter(
    (p) => workspace.platforms.includes(p.short) && !LIVE_NOW.has(p.short),
  );

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
    if (!teamAuthed) return;
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
    <section id={id} data-testid="connect-platform-section" className="scroll-mt-8">
      <Card elevated>
        <CardHeader
          title="Connect your channels"
          description="Link YouTube and Meta to pull live analytics. Other platforms are coming soon."
          action={<Badge tone="muted">{workspace.name}</Badge>}
        />
        <CardBody className="space-y-6 pt-0">
          {!teamAuthed ? (
            <p className="rounded-sm border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
              Unlock team access above before connecting accounts.
            </p>
          ) : null}

          {syncMessage ? (
            <p
              className={`text-sm ${syncMessage.tone === "success" ? "text-success" : "text-destructive"}`}
            >
              {syncMessage.text}
            </p>
          ) : null}

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Available now</h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {availableCards.map((meta) => {
                const connected = platformConnected(meta.short);
                const isMetaCard = META_PLATFORMS.has(meta.short);
                const showMetaOnce = meta.short === "FB";

                if (isMetaCard && !showMetaOnce) return null;

                return (
                  <div
                    key={meta.short}
                    className="flex items-center gap-3 rounded-sm border border-border bg-background/40 px-4 py-4"
                  >
                    <PlatformChip platform={meta.short} size="xl" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {meta.short === "FB" ? "Facebook & Instagram" : meta.full}
                      </div>
                      <p className="mt-0.5 text-body-sm text-muted-foreground">
                        {connected ? "Connected · read-only metrics" : "One-click OAuth connect"}
                      </p>
                    </div>
                    {connected ? (
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge tone="success">
                          <Check className="h-3 w-3" /> Connected
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void (meta.short === "YT" || showMetaOnce ? (meta.short === "YT" ? syncYouTube() : syncMeta()) : null)
                          }
                          disabled={!teamAuthed || (meta.short === "YT" ? syncingYouTube : syncingMeta)}
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${(meta.short === "YT" ? syncingYouTube : syncingMeta) ? "animate-spin" : ""}`}
                          />
                          Refresh
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!teamAuthed}
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
              <h4 className="mb-3 text-sm font-semibold text-muted-foreground">Coming soon</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {comingSoonCards.map((meta) => (
                  <div
                    key={meta.short}
                    data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                    className="flex items-center gap-3 rounded-sm border border-dashed border-border px-4 py-4 opacity-60"
                  >
                    <PlatformChip platform={meta.short} size="xl" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-foreground">{meta.full}</div>
                      <Badge tone="muted" className="mt-1">
                        Coming soon
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </section>
  );
}

export function LiveConnectionStrip({ workspace }: { workspace: WorkspaceProfile }) {
  const { data: accountStatus } = usePlatformConnections(workspace.id);
  const live = accountStatus?.connections.filter((c) => c.status === "ok") ?? [];
  const demoPlatforms = workspace.platforms.filter((p) => !live.some((c) => c.platform === p));

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
            <span className="text-body-sm font-medium text-success">{meta?.full ?? c.platform}</span>
            <Badge tone="success">Live</Badge>
          </div>
        );
      })}
      {demoPlatforms.slice(0, 4).map((p) => (
        <div
          key={p}
          className="inline-flex items-center gap-2 rounded-sm border border-border px-3 py-2 opacity-70"
        >
          <PlatformChip platform={p} size="md" />
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