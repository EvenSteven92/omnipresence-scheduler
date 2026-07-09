import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";

type CreateEventFlow = ReturnType<typeof useCreateEventFlow>;

/** Shared header pair — New post (primary) + New event (secondary). */
export function NewEventPostActions({
  eventDate,
  flow,
  postLabel = "New post",
  postTestId = "new-post-btn",
  eventTestId = "new-event-btn",
  showPostLink = true,
}: {
  eventDate?: Date;
  flow?: CreateEventFlow;
  postLabel?: string;
  postTestId?: string;
  eventTestId?: string;
  showPostLink?: boolean;
}) {
  const internalFlow = useCreateEventFlow();
  const { openCreateEvent, modal } = flow ?? internalFlow;

  return (
    <>
      {showPostLink ? (
        <Link to="/scheduler" data-testid={postTestId} className="btn-action-primary btn-action">
          <Plus className="h-3.5 w-3.5" /> {postLabel}
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => openCreateEvent(eventDate)}
        data-testid={eventTestId}
        className="btn-action btn-action-secondary"
      >
        New event
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
        aria-label="New event"
        className="group relative flex h-11 w-full items-center justify-center rounded-md border-[1.5px] border-transparent text-muted-foreground transition-colors hover:border-foreground hover:bg-secondary hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border-[1.5px] border-foreground bg-card px-2.5 py-1.5 text-caption font-medium text-foreground opacity-0 shadow-[var(--shadow-card)] transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          New event
        </span>
      </button>
      {modal}
    </>
  );
}
