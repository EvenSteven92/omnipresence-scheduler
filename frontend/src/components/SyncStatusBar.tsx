import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";

function formatSyncedAt(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

/**
 * Thin status strip — only surfaces when there is something actionable
 * (connected platforms or a sync warning). Replaces the opaque news ticker.
 */
export function SyncStatusBar() {
  const { workspaceId } = useWorkspace();
  const { data: status } = usePlatformConnections(workspaceId);

  const message = useMemo(() => {
    if (!status) return null;

    const yt = status.youtube.connected;
    const fb = status.meta.facebook.connected;
    const ig = status.meta.instagram.connected;
    const anyConnected = yt || fb || ig;

    if (!anyConnected) return null;

    const syncedAts = [
      status.youtube.syncedAt,
      status.meta.facebook.syncedAt,
      status.meta.instagram.syncedAt,
    ].filter(Boolean) as string[];

    const freshest = syncedAts.sort((a, b) => +new Date(b) - +new Date(a))[0];
    const when = formatSyncedAt(freshest);

    const parts: string[] = [];
    if (yt) parts.push("YouTube");
    if (fb) parts.push("Facebook");
    if (ig) parts.push("Instagram");

    const label = parts.join(" · ");
    return when ? `${label} synced · ${when}` : `${label} connected`;
  }, [status]);

  if (!message) return null;

  const hasWarning =
    status?.youtube.connected && !status.youtube.syncedAt
      ? true
      : status?.meta.facebook.connected && !status.meta.facebook.syncedAt;

  return (
    <div
      data-testid="sync-status-bar"
      className="flex h-8 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-surface/80 px-4 text-xs"
    >
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        {hasWarning ? (
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={1.75} />
        )}
        <span className="truncate">{message}</span>
      </div>
      <Link
        to="/workspaces"
        hash="connect-platform"
        className="shrink-0 text-[0.65rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        Manage connections
      </Link>
    </div>
  );
}