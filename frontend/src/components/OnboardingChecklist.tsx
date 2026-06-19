import { Link } from "@tanstack/react-router";
import { Check, Circle, Link2, BarChart3, FilePlus } from "lucide-react";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { useWorkspace } from "@/lib/workspace-context";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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
      description: "Link YouTube, Facebook, or Instagram to pull live metrics.",
      href: "/workspaces",
      hash: "connect-platform",
      cta: "Connect accounts",
    },
    {
      id: "post",
      done: hasPosts,
      icon: FilePlus,
      title: "Create your first post",
      description: "Upload media, pick platforms, and set publish times.",
      href: "/scheduler",
      cta: "New post",
    },
    {
      id: "analytics",
      done: hasChannel,
      icon: BarChart3,
      title: "See your analytics",
      description: "Review performance once a channel is connected.",
      href: "/analytics",
      cta: "View analytics",
    },
  ] as const;

  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card className={className} elevated>
      <CardHeader
        title="Getting started"
        description={`${doneCount} of ${steps.length} complete — follow these steps to set up ${workspace.name}.`}
        action={<Badge tone="accent">Setup</Badge>}
      />
      <CardBody className="space-y-3 pt-0">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.id}
              className="flex items-start gap-3 rounded-sm border border-border bg-background/40 px-4 py-3"
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  step.done ? "bg-success/15 text-success" : "border border-border text-muted-foreground"
                }`}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                  <span className="text-sm font-medium text-foreground">{step.title}</span>
                </div>
                <p className="mt-1 text-body-sm text-muted-foreground">{step.description}</p>
                {!step.done ? (
                  <Link
                    to={step.href}
                    hash={"hash" in step ? step.hash : undefined}
                    className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
                  >
                    {step.cta} →
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}