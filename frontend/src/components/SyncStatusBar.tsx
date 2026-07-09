import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Link2 } from "lucide-react";
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

export function SyncStatusBar() {
  const { workspaceId } = useWorkspace();
  const { data: status } = usePlatformConnections(workspaceId);

  const { message, tone, cta } = useMemo(() => {
    if (!status) {
      return {
        message: "Connect a channel to see live metrics",
        tone: "prompt" as const,
        cta: "Connect accounts",
      };
    }

    const yt = status.youtube.connected;
    const fb = status.meta.facebook.connected;
    const ig = status.meta.instagram.connected;
    const anyConnected = yt || fb || ig;

    if (!anyConnected) {
      return {
        message: "No channels connected — connect YouTube or Meta to pull live analytics",
        tone: "prompt" as const,
        cta: "Connect accounts",
      };
    }

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

    const label = parts.join(", ");
    const needsSync = (yt && !status.youtube.syncedAt) || (fb && !status.meta.facebook.syncedAt);

    if (needsSync) {
      return {
        message: `${label} connected — syncing metrics…`,
        tone: "warning" as const,
        cta: "View connections",
      };
    }

    return {
      message: when ? `${label} synced · ${when}` : `${label} connected`,
      tone: "ok" as const,
      cta: "Manage connections",
    };
  }, [status]);

  return (
    <div
      data-testid="sync-status-bar"
      className="flex min-h-10 w-full shrink-0 items-center justify-between gap-3 border-b-[1.5px] border-foreground bg-card px-4 py-2 text-body-sm"
    >
      <div className="flex min-w-0 items-center gap-2 text-foreground">
        {tone === "ok" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" strokeWidth={1.75} />
        ) : tone === "warning" ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-warning" strokeWidth={1.75} />
        ) : (
          <Link2 className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
        )}
        <span className="truncate text-muted-foreground">{message}</span>
      </div>
      <Link
        to="/workspaces"
        hash="connect-platform"
        className="shrink-0 font-semibold text-foreground underline decoration-accent decoration-2 underline-offset-2 hover:text-accent"
      >
        {cta}
      </Link>
    </div>
  );
}
