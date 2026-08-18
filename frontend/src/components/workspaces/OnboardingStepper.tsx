import { Link } from "@tanstack/react-router";
import { BarChart3, Check, FilePlus, Link2, type LucideIcon } from "lucide-react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  done: boolean;
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  href?: string;
  hash?: string;
  anchor?: string;
};

export function OnboardingStepper() {
  const { workspace, workspaceId } = useWorkspace();
  const { data: connections } = usePlatformConnections(workspaceId);

  const hasChannel =
    (connections?.youtube.connected ?? false) ||
    (connections?.meta.facebook.connected ?? false) ||
    (connections?.meta.instagram.connected ?? false);

  const hasPosts = workspace.scheduledPosts.length > 0 || workspace.publishedPosts.length > 0;

  const steps: Step[] = [
    {
      id: "connect",
      done: hasChannel,
      icon: Link2,
      title: "Connect a channel",
      description: "Link YouTube or Meta for live metrics and publishing.",
      cta: "Connect channel",
      href: "/clients",
      hash: "connect-platform",
      anchor: "connect-platform",
    },
    {
      id: "create",
      done: hasPosts,
      icon: FilePlus,
      title: "Schedule a card",
      description: "Upload media, pick platforms, and set publish times.",
      cta: "Create a post",
      href: "/studio",
    },
    {
      id: "analyze",
      done: hasChannel && hasPosts,
      icon: BarChart3,
      title: "Review analytics",
      description: "See performance once content is live on a channel.",
      cta: "Open analytics",
      href: "/analytics",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const nextStep = steps.find((s) => !s.done);
  const pct = Math.round((doneCount / steps.length) * 100);

  if (allDone) {
    return (
      <section
        data-testid="onboarding-stepper"
        className="rounded-lg border border-line bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-success/15 text-success">
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <div>
              <p className="page-kicker text-success">Ready</p>
              <h2 className="font-display text-xl font-bold text-foreground">
                {workspace.name} is set up
              </h2>
              <p className="mt-0.5 text-body-sm text-muted-foreground">
                Channels connected and content in the pipeline. Keep publishing from the queue.
              </p>
            </div>
          </div>
          <Link to="/" className="btn-action-primary btn-action">
            Go to queue
          </Link>
        </div>
      </section>
    );
  }

  function goToStep(step: Step) {
    if (step.anchor) {
      document.getElementById(step.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <section
      data-testid="onboarding-stepper"
      className="rounded-lg border border-line bg-card p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="page-kicker">Setup guide</p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            Get {workspace.name} live
          </h2>
          <p className="mt-1 max-w-lg text-body-sm text-muted-foreground">
            Finish these steps to unlock live metrics, publishing, and analytics for this brand.
          </p>
        </div>
        <div className="text-right">
          <div className="font-data text-3xl font-bold tabular-nums text-foreground">
            {doneCount}
            <span className="text-muted-foreground">/{steps.length}</span>
          </div>
          <p className="text-eyebrow mt-0.5">steps complete</p>
        </div>
      </div>

      <div
        className="mt-5 h-2.5 overflow-hidden rounded-md border border-line bg-paper-2"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
      >
        <div
          className="h-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {pct}% complete
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isNext = nextStep?.id === step.id;
          return (
            <li
              key={step.id}
              data-testid={`onboarding-step-${step.id}`}
              className={cn(
                "flex flex-col rounded-lg border border-line p-4 transition-colors",
                step.done
                  ? "bg-paper-2/80"
                  : isNext
                    ? "bg-accent/10 "
                    : "bg-card",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border border-line text-sm font-bold",
                    step.done
                      ? "bg-success text-background"
                      : isNext
                        ? "bg-foreground text-white"
                        : "bg-card text-muted-foreground",
                  )}
                >
                  {step.done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : index + 1}
                </span>
                <Icon
                  className={cn("h-4 w-4", step.done ? "text-success" : "text-foreground")}
                  strokeWidth={1.75}
                />
              </div>
              <h3 className="mt-3 font-display text-sm font-bold text-foreground">{step.title}</h3>
              <p className="mt-1 flex-1 text-body-sm leading-snug text-muted-foreground">
                {step.description}
              </p>
              {step.done ? (
                <span className="mt-3 font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-success">
                  Done
                </span>
              ) : isNext ? (
                step.href ? (
                  <Link
                    to={step.href}
                    hash={step.hash}
                    className="btn-action-primary btn-action mt-3 w-full justify-center text-[0.75rem]"
                  >
                    {step.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToStep(step)}
                    className="btn-action-primary btn-action mt-3 w-full justify-center text-[0.75rem]"
                  >
                    {step.cta}
                  </button>
                )
              ) : (
                <span className="mt-3 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Later
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {nextStep ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
          <div className="min-w-0">
            <p className="text-eyebrow">Up next</p>
            <p className="mt-0.5 font-display text-lg font-bold text-foreground">{nextStep.title}</p>
            <p className="text-body-sm text-muted-foreground">{nextStep.description}</p>
          </div>
          {nextStep.href ? (
            <Link
              to={nextStep.href}
              hash={nextStep.hash}
              className="btn-action-primary btn-action shrink-0"
            >
              {nextStep.cta}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(nextStep)}
              className="btn-action-primary btn-action shrink-0"
            >
              {nextStep.cta}
            </button>
          )}
        </div>
      ) : null}
    </section>
  );
}
