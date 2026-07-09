import { Link } from "@tanstack/react-router";
import { CalendarPlus, FilePlus } from "lucide-react";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { CREATE } from "@/lib/create-actions";

type CreateEventFlow = ReturnType<typeof useCreateEventFlow>;

/** Shared header pair — New card (primary) + New event (secondary). Same icons site-wide. */
export function NewEventPostActions({
  eventDate,
  flow,
  showCardLink = true,
}: {
  eventDate?: Date;
  flow?: CreateEventFlow;
  showCardLink?: boolean;
}) {
  const internalFlow = useCreateEventFlow();
  const { openCreateEvent, modal } = flow ?? internalFlow;

  return (
    <>
      {showCardLink ? (
        <Link
          to="/scheduler"
          data-testid="new-post-btn"
          className="btn-action btn-action-primary !text-white"
        >
          <FilePlus className="h-3.5 w-3.5 text-white" strokeWidth={2} />
          {CREATE.card}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => openCreateEvent(eventDate)}
        data-testid="new-event-btn"
        className="btn-action btn-action-secondary"
      >
        <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
        {CREATE.event}
      </button>
      {modal}
    </>
  );
}

export function NewEventSidebarButton({ testId = "sidebar-new-event-btn" }: { testId?: string }) {
  const { openCreateEvent, modal } = useCreateEventFlow();

  return (
    <>
      <button
        type="button"
        onClick={() => openCreateEvent()}
        data-testid={testId}
        aria-label={CREATE.event}
        className="group relative flex h-11 w-full items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-foreground hover:bg-secondary hover:text-foreground"
      >
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-foreground bg-card px-2.5 py-1.5 text-caption font-medium text-foreground opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {CREATE.event}
        </span>
      </button>
      {modal}
    </>
  );
}
