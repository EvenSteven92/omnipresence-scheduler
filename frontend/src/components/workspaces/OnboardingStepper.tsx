import { Link } from "@tanstack/react-router";
import { Check, Circle, Link2, BarChart3, FilePlus } from "lucide-react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useWorkspace } from "@/lib/workspace-context";

export function OnboardingStepper() {
  const { workspace, workspaceId } = useWorkspace();
  const { data: connections } = usePlatformConnections(workspaceId);

  const hasChannel =
    (connections?.youtube.connected ?? false) ||
    (connections?.meta.facebook.connected ?? false) ||
    (connections?.meta.instagram.connected ?? false);

  const hasPosts = workspace.scheduledPosts.length > 0 || workspace.publishedPosts.length > 0;

  const steps = [
    {
      id: "connect",
      done: hasChannel,
      icon: Link2,
      title: "Connect",
      description: "Link YouTube, Facebook, or Instagram.",
      href: "/workspaces",
      hash: "connect-platform",
      cta: "Connect a channel",
    },
    {
      id: "create",
      done: hasPosts,
      icon: FilePlus,
      title: "Create",
      description: "Upload media and schedule your first post.",
      href: "/scheduler",
      cta: "Create a post",
    },
    {
      id: "analyze",
      done: hasChannel && hasPosts,
      icon: BarChart3,
      title: "Analyze",
      description: "Review performance across platforms.",
      href: "/analytics",
      cta: "View analytics",
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone && workspace.onboardingStatus === "complete") return null;

  return (
    <section
      data-testid="onboarding-stepper"
      className="rounded-md border border-border bg-surface-elevated p-6"
    >
      <h2 className="text-title">Getting started</h2>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {doneCount} of {steps.length} complete for {workspace.name}
      </p>

      <ol className="mt-6 space-y-3 text-left">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className="flex items-start gap-4 rounded-sm border border-border bg-background/40 px-5 py-4"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  step.done
                    ? "bg-success/15 text-success"
                    : "border border-border text-muted-foreground"
                }`}
              >
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-accent" strokeWidth={1.5} />
                  <span className="text-title text-sm">{step.title}</span>
                  {step.done ? (
                    <span className="text-body-sm text-success">Done</span>
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <p className="mt-1 text-body-sm text-muted-foreground">{step.description}</p>
                {!step.done ? (
                  <Link
                    to={step.href}
                    hash={"hash" in step ? step.hash : undefined}
                    className="btn-action-primary btn-action mt-3"
                  >
                    {step.cta}
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
