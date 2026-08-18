import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  Inbox,
  Radio,
  ShieldOff,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/lib/workspace-context";
import { useClientOps } from "@/hooks/useClientOps";
import { useWorkerHealth } from "@/hooks/useWorkerHealth";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { buildAttentionItems } from "@/lib/client-ops";
import { getUpcomingContentCards, UPCOMING_WINDOW_DAYS } from "@/lib/scheduled-post-display";
import { todayStart } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";
import { CREATE } from "@/lib/create-actions";
import { FilePlus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — OmniPresence" },
      {
        name: "description",
        content:
          "Personal command center — attention, unread, next publishes across your clients.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { workspace, workspaceId, workspaces } = useWorkspace();
  const ops = useClientOps(workspaceId);
  const { data: worker } = useWorkerHealth();
  const { data: accounts } = usePlatformConnections(workspaceId);

  const connected = Boolean(
    accounts?.youtube.connected ||
      accounts?.meta.facebook.connected ||
      accounts?.meta.instagram.connected,
  );

  const upcoming = useMemo(
    () => getUpcomingContentCards(workspace.scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [workspace.scheduledPosts],
  );

  const next24h = useMemo(() => {
    const cutoff = Date.now() + 24 * 60 * 60 * 1000;
    return upcoming
      .filter((p) => +new Date(p.date) <= cutoff)
      .slice(0, 6);
  }, [upcoming]);

  const failedCount = useMemo(
    () => workspace.scheduledPosts.filter((p) => p.status === "failed").length,
    [workspace.scheduledPosts],
  );

  const attention = useMemo(
    () =>
      buildAttentionItems({
        clientId: workspaceId,
        clientName: workspace.name,
        scheduledCount: upcoming.length,
        failedCount,
        connected,
        workerOnline: worker?.online ?? false,
      }),
    [workspaceId, workspace.name, upcoming.length, failedCount, connected, worker?.online],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Command center"
        description={`Personal ops for ${workspace.name} — and ${workspaces.length} clients total. Armed auto-post; no approval queue.`}
        actions={
          <>
            <Link to="/engage" className="btn-action btn-action-secondary">
              <Inbox className="h-3.5 w-3.5" />
              Engage
            </Link>
            <Link to="/studio" className="btn-action-primary btn-action">
              <FilePlus className="h-3.5 w-3.5" strokeWidth={2} />
              {CREATE.card}
            </Link>
          </>
        }
      />

      <div className="page-content mx-auto max-w-[1320px] space-y-6">
        {/* Status strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusCard
            label="Auto-post"
            value={ops.autoPublish ? "Armed" : "Paused"}
            tone={ops.autoPublish ? "success" : "warning"}
            detail={
              ops.paused
                ? "Kill switch on for this client"
                : !ops.globalArmed
                  ? "Master armed is off"
                  : !ops.armed
                    ? "Client armed is off"
                    : worker?.online
                      ? "Will fire at scheduled times"
                      : "Armed in UI — worker not online yet"
            }
          />
          <StatusCard
            label="Local worker"
            value={worker?.online ? "Online" : "Offline"}
            tone={worker?.online ? "success" : "warning"}
            detail={worker?.detail ?? "Checking…"}
          />
          <StatusCard
            label="Unread / inbox"
            value="—"
            tone="muted"
            detail="Engage hub syncs after OAuth (Phase 3)"
          />
          <StatusCard
            label="Next 7 days"
            value={String(upcoming.length)}
            tone="default"
            detail="Scheduled content cards"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-foreground">Needs attention</h2>
              <Link
                to="/clients"
                className="font-mono text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                Clients <ArrowRight className="inline h-3 w-3" />
              </Link>
            </div>
            {attention.length === 0 ? (
              <div className="rounded-lg border border-line bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing urgent for {workspace.name}.
              </div>
            ) : (
              <ul className="space-y-2">
                {attention.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href ?? "/clients"}
                      className={cn(
                        "flex gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-paper-2/80",
                        item.severity === "critical" && "border-destructive/40 bg-destructive/5",
                        item.severity === "warning" && "border-warning/40 bg-warning/5",
                        item.severity === "info" && "border-line bg-card",
                      )}
                    >
                      <SeverityIcon severity={item.severity} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">Next 24 hours</h2>
                <Link
                  to="/queue"
                  className="font-mono text-[0.625rem] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                >
                  Full queue <ArrowRight className="inline h-3 w-3" />
                </Link>
              </div>
              {next24h.length === 0 ? (
                <div className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted-foreground">
                  No publishes in the next day.{" "}
                  <Link to="/studio" className="font-semibold text-foreground underline-offset-2 hover:underline">
                    Schedule from Boards
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
                  {next24h.map((post) => (
                    <li
                      key={post.id}
                      className="flex items-center gap-3 px-4 py-3"
                      data-testid={`overview-next-${post.id}`}
                    >
                      <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {post.title}
                        </span>
                        <span className="font-mono text-[0.625rem] text-muted-foreground">
                          {new Date(post.date).toLocaleString(undefined, {
                            weekday: "short",
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          · {post.platforms.join(" · ")}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-mono text-[0.55rem] font-bold uppercase",
                          ops.autoPublish
                            ? "bg-success/15 text-success"
                            : "bg-warning/15 text-warning",
                        )}
                      >
                        {ops.autoPublish ? "Armed" : "Held"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-lg border border-line bg-card p-4">
              <h3 className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Publish controls
              </h3>
              <p className="mt-2 text-xs text-muted-foreground">
                No approval step — scheduled posts publish when armed and the worker is online.
              </p>
              <div className="mt-4 space-y-3">
                <ToggleRow
                  label="Master armed"
                  description="All clients"
                  on={ops.globalArmed}
                  onChange={ops.setMasterArmed}
                />
                <ToggleRow
                  label={`${workspace.name} armed`}
                  description="This client’s schedule"
                  on={ops.armed}
                  onChange={ops.setArmed}
                />
                <ToggleRow
                  label="Kill switch"
                  description="Pause publishes for this client"
                  on={ops.paused}
                  onChange={ops.setPaused}
                  danger
                />
              </div>
            </section>

            <section className="rounded-lg border border-line bg-foreground p-4 text-background">
              <div className="flex items-center gap-2 font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em] text-background/70">
                <Bell className="h-3.5 w-3.5" />
                Clients
              </div>
              <ul className="mt-3 space-y-2">
                {workspaces.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className={c.id === workspaceId ? "font-bold" : "text-background/80"}>
                      {c.name}
                    </span>
                    <span className="font-mono text-[0.55rem] uppercase text-background/60">
                      {c.id === workspaceId ? "Active" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/clients"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-background px-3 py-2 text-sm font-semibold text-foreground"
              >
                Manage clients
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "success" | "warning" | "muted" | "default";
}) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-xl font-bold",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "muted" && "text-muted-foreground",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </div>
      <p className="mt-1 line-clamp-2 text-[0.7rem] text-muted-foreground">{detail}</p>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") {
    return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
  }
  if (severity === "warning") {
    return <Radio className="mt-0.5 h-4 w-4 shrink-0 text-warning" />;
  }
  return <ShieldOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />;
}

function ToggleRow({
  label,
  description,
  on,
  onChange,
  danger,
}: {
  label: string;
  description: string;
  on: boolean;
  onChange: (next: boolean) => void;
  danger?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="block text-[0.7rem] text-muted-foreground">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? (danger ? "bg-destructive" : "bg-foreground") : "bg-line",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card transition-transform",
            on && "translate-x-5",
          )}
        />
      </button>
    </label>
  );
}
