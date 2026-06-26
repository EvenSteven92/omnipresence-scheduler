import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useMemo } from "react";

import { DashboardUpNextQueue } from "@/components/dashboard/DashboardUpNextQueue";
import { QueueCalendarToggle } from "@/components/dashboard/QueueCalendarToggle";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Queue — TORCC OmniSocial" },
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
          + New card
        </Link>
      </>
    ),
    [],
  );

  return (
    <div>
      <PageHeader eyebrow="Content queue" title="Up next" actions={headerActions} />

      <div className="page-content mx-auto max-w-[1320px]">
        <DashboardUpNextQueue />
      </div>
    </div>
  );
}
