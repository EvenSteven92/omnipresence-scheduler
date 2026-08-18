import { Link } from "@tanstack/react-router";
import { LiveConnectionStrip } from "@/components/ConnectPlatformSection";
import { AddPlatformCard } from "@/components/AddPlatformCard";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { WorkspaceProfile } from "@/lib/workspaces/types";

export function DashboardChannelHealth({
  workspace,
  youtubeLive,
}: {
  workspace: WorkspaceProfile;
  youtubeLive: boolean;
}) {
  return (
    <Card elevated data-testid="dashboard-channel-health">
      <CardHeader
        title="Channel health"
        description={
          youtubeLive
            ? "YouTube is live. Connect more channels under Clients."
            : "Connect YouTube or Meta to replace sample metrics."
        }
        action={
          <Link to="/clients" hash="connect-platform" className="text-body-sm text-accent">
            Add channel
          </Link>
        }
      />
      <CardBody className="space-y-4 pt-0">
        <LiveConnectionStrip workspace={workspace} />
        <AddPlatformCard
          testId="dashboard-add-platform"
          variant="strip"
          description="Link YouTube first — Meta and X are next."
        />
      </CardBody>
    </Card>
  );
}
