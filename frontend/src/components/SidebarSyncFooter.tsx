import { useMemo } from "react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useWorkerHealth } from "@/hooks/useWorkerHealth";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

function formatSyncedShort(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.round(hours / 24);
  return `${days}D AGO`;
}

const PLATFORM_SHORT: Record<string, string> = {
  YT: "YT",
  FB: "FB",
  IG: "IG",
};

export function SidebarSyncFooter({ collapsed }: { collapsed: boolean }) {
  const { workspaceId } = useWorkspace();
  const { data: status } = usePlatformConnections(workspaceId);
  const { data: worker } = useWorkerHealth();

  const label = useMemo(() => {
    const workerPart = worker?.online ? "WORKER ON" : "WORKER OFF";

    if (!status) return workerPart;

    const yt = status.youtube.connected;
    const fb = status.meta.facebook.connected;
    const ig = status.meta.instagram.connected;
    if (!yt && !fb && !ig) return `${workerPart} · NOT CONNECTED`;

    const syncedAts = [
      status.youtube.syncedAt,
      status.meta.facebook.syncedAt,
      status.meta.instagram.syncedAt,
    ].filter(Boolean) as string[];
    const freshest = syncedAts.sort((a, b) => +new Date(b) - +new Date(a))[0];
    const when = formatSyncedShort(freshest);

    const platforms: string[] = [];
    if (yt) platforms.push(PLATFORM_SHORT.YT!);
    if (fb) platforms.push(PLATFORM_SHORT.FB!);
    if (ig) platforms.push(PLATFORM_SHORT.IG!);

    const syncPart = when ? `SYNCED ${when}` : "CONNECTED";
    const channels = platforms.length > 0 ? ` · ${platforms.join(" · ")}` : "";
    return `${workerPart} · ${syncPart}${channels}`;
  }, [status, worker?.online]);

  if (!label) return null;

  return (
    <p
      data-testid="sidebar-sync-footer"
      className={cn(
        "font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground",
        collapsed && "sr-only",
      )}
      title={label}
    >
      {label}
    </p>
  );
}
