import { PLATFORMS } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { Link2, Plus } from "lucide-react";

/**
 * Scaffold for OAuth connect — surfaces platforms not yet linked on this workspace.
 */
export function ConnectPlatformSection({
  workspace,
  id = "connect-platform",
}: {
  workspace: WorkspaceProfile;
  id?: string;
}) {
  const connected = new Set(
    workspace.platformConnections.filter((c) => c.status === "ok").map((c) => c.platform),
  );
  const available = PLATFORMS.filter((p) => workspace.platforms.includes(p.short));
  const toConnect = available.filter((p) => !connected.has(p.short));

  return (
    <section id={id} data-testid="connect-platform-section" className="scroll-mt-8">
      <div className="panel border border-dashed border-border bg-surface/40 p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-mono mb-2">add_social_platform</div>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              Connect OAuth for a network to pull metrics into your growth matrix and enable
              scheduling. Pick a platform below — full OAuth ships with the backend.
            </p>
          </div>
          <span className="rounded-sm border border-border bg-background/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            {workspace.name}
          </span>
        </div>

        {toConnect.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            All enabled platforms are connected. Manage tokens in your workspace card below.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {toConnect.map((meta) => {
              const conn = workspace.platformConnections.find((c) => c.platform === meta.short);
              const needsReconnect = conn?.status === "disconnected";
              const expiring = conn?.status === "expiring";
              return (
                <button
                  key={meta.short}
                  type="button"
                  disabled
                  data-testid={`connect-platform-${meta.short.replace(/\s+/g, "-")}`}
                  title="OAuth connect — coming soon"
                  className="kpi-card flex cursor-not-allowed items-center gap-3 px-4 py-4 text-left opacity-60"
                >
                  <PlatformChip platform={meta.short} size="xl" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground">{meta.full}</div>
                    <div className="label-mono mt-0.5 text-[0.55rem] text-muted-foreground">
                      {needsReconnect
                        ? "reconnect"
                        : expiring
                          ? `expires · ${conn?.expiresInDays ?? "?"}d`
                          : "connect_oauth"}
                    </div>
                  </div>
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                </button>
              );
            })}
          </div>
        )}

        <p className="label-mono mt-6 text-muted-foreground/70">
          stub · buttons log intent only until Phase 1 OAuth worker is live
        </p>
      </div>
    </section>
  );
}