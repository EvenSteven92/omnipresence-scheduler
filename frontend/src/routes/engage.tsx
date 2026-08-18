import { createFileRoute, Link } from "@tanstack/react-router";
import { Inbox, MessageCircle, MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/lib/workspace-context";
import { EmptyState } from "@/components/ui/EmptyState";

export const Route = createFileRoute("/engage")({
  head: () => ({
    meta: [
      { title: "Engage — OmniPresence" },
      {
        name: "description",
        content: "Comments, replies, and messages across connected social accounts.",
      },
    ],
  }),
  component: EngagePage,
});

function EngagePage() {
  const { workspace } = useWorkspace();

  return (
    <div>
      <PageHeader
        eyebrow="Engage"
        title="Inbox"
        description={`Comments, replies, and messages for ${workspace.name}. Live sync arrives with connected accounts (Phase 3).`}
        actions={
          <Link to="/clients" className="btn-action-primary btn-action">
            Connect channels
          </Link>
        }
      />

      <div className="page-content mx-auto max-w-[1320px] space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <EngageStat icon={MessageCircle} label="Comments" value="—" hint="YouTube · FB · IG" />
          <EngageStat icon={MessagesSquare} label="Messages" value="—" hint="Page / IG inbox" />
          <EngageStat icon={Inbox} label="Unread" value="—" hint="Needs your reply" />
        </div>

        <EmptyState
          icon={Inbox}
          title="Engage hub is ready for wiring"
          description="Once YouTube and Meta are connected on this Mac, this page will list comments and messages so you can reply without leaving OmniPresence."
          action={
            <Link to="/clients" hash="connect-platform" className="btn-action-primary btn-action">
              Open Clients
            </Link>
          }
          className="border border-line bg-card py-12"
        />
      </div>
    </div>
  );
}

function EngageStat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Inbox;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="font-mono text-[0.55rem] font-bold uppercase tracking-[0.1em]">
          {label}
        </span>
      </div>
      <div className="mt-1 font-display text-2xl font-bold text-foreground">{value}</div>
      <p className="text-[0.7rem] text-muted-foreground">{hint}</p>
    </div>
  );
}
