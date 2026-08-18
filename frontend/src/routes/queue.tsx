import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useMemo } from "react";

import { DashboardQueueRail } from "@/components/dashboard/DashboardQueueRail";
import { DashboardUpNextQueue } from "@/components/dashboard/DashboardUpNextQueue";
import { QueueCalendarToggle } from "@/components/dashboard/QueueCalendarToggle";
import { CREATE } from "@/lib/create-actions";
import { FilePlus } from "lucide-react";

export const Route = createFileRoute("/queue")({
  head: () => ({
    meta: [
      { title: "Queue — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Full agenda of past, present, and upcoming posts — scroll history and plan ahead.",
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
        <Link to="/studio" className="btn-action-primary btn-action">
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
        title="Agenda"
        description="Past, now, and later — scroll for history; open Calendar to jump by month."
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
