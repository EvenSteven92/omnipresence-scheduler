import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useMemo } from "react";

import { DashboardQueueRail } from "@/components/dashboard/DashboardQueueRail";
import { DashboardUpNextQueue } from "@/components/dashboard/DashboardUpNextQueue";
import { QueueCalendarToggle } from "@/components/dashboard/QueueCalendarToggle";
import { CREATE } from "@/lib/create-actions";
import { FilePlus } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queue — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Upcoming content cards grouped by day — schedule and publish across every channel.",
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
          <FilePlus className="h-3.5 w-3.5" strokeWidth={2} />
          {CREATE.card}
        </Link>
      </>
    ),
    [],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Queue"
        title="Up next"
        description="Your scheduled reels — open Calendar to plan the week."
        actions={headerActions}
      />

      <div className="page-content mx-auto max-w-[1320px]">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_296px]">
          <DashboardUpNextQueue />
          <DashboardQueueRail />
        </div>
      </div>
    </div>
  );
}
