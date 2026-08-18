import { Link } from "@tanstack/react-router";
import { Check, Link2, BarChart3, FilePlus } from "lucide-react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

/**
 * Compact setup checklist for non-admin surfaces (e.g. dashboard rail).
 * Admin page uses the fuller OnboardingStepper instead.
 */
export function OnboardingChecklist({ className }: { className?: string }) {
  const { workspace, workspaceId } = useWorkspace();
  const { data: connections } = usePlatformConnections(workspaceId);

  const hasChannel =
    (connections?.youtube.connected ?? false) ||
    (connections?.meta.facebook.connected ?? false) ||
    (connections?.meta.instagram.connected ?? false);

  const hasPosts = workspace.scheduledPosts.length > 0 || workspace.publishedPosts.length > 0;
  const complete = workspace.onboardingStatus === "complete" || (hasChannel && hasPosts);

  if (complete) return null;

  const steps = [
    {
      id: "connect",
      done: hasChannel,
      icon: Link2,
      title: "Connect a channel",
      href: "/clients",
      hash: "connect-platform",
    },
    {
      id: "post",
      done: hasPosts,
      icon: FilePlus,
      title: "Schedule a card",
      href: "/studio",
    },
    {
      id: "analytics",
      done: hasChannel && hasPosts,
      icon: BarChart3,
      title: "Review analytics",
      href: "/analytics",
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <section
      className={cn(
        "rounded-lg border border-line bg-card p-5 shadow-[var(--shadow-card)]",
        className,
      )}
      data-testid="onboarding-checklist"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="page-kicker">Setup</p>
          <h2 className="mt-1 font-display text-base font-bold text-foreground">Getting started</h2>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            {doneCount} of {steps.length} · {workspace.name}
          </p>
        </div>
        <span className="font-data text-lg font-bold text-foreground">{pct}%</span>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-md border border-line bg-paper-2">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          const isNext = next?.id === step.id;
          return (
            <li
              key={step.id}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border border-line px-3 py-2",
                step.done ? "bg-paper-2" : isNext ? "bg-accent/10" : "bg-card",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-line",
                  step.done ? "bg-success text-background" : "bg-card text-muted-foreground",
                )}
              >
                {step.done ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {step.title}
              </span>
              {!step.done && isNext ? (
                <Link
                  to={step.href}
                  hash={"hash" in step ? step.hash : undefined}
                  className="shrink-0 font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em] text-accent hover:underline"
                >
                  Go →
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
