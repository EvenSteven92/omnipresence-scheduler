import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useMemo } from "react";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { DashboardUpNextQueue } from "@/components/dashboard/DashboardUpNextQueue";
import { DashboardQueueRail } from "@/components/dashboard/DashboardQueueRail";
import { QueueCalendarToggle } from "@/components/dashboard/QueueCalendarToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queue — TORCC OmniSocial" },
      {
        name: "description",
        content: "Upcoming content cards grouped by day — schedule and publish across every channel.",
      },
    ],
  }),
  component: QueuePage,
});

function QueuePage() {
  const headerActions = useMemo(
    () => (
      <>
        <QueueCalendarToggle active="queue" />
        <Link to="/scheduler" className="btn-action-primary btn-action">
          + New card
        </Link>
        <NewEventPostActions showPostLink={false} />
      </>
    ),
    [],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Content queue"
        title="Up next"
        actions={headerActions}
      />

      <div className="page-content">
        <OnboardingChecklist className="mb-6" />

        <div className="page-grid">
          <div className="page-grid-main">
            <DashboardUpNextQueue />
          </div>
          <DashboardQueueRail />
        </div>
      </div>
    </div>
  );
}