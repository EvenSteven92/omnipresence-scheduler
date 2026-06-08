import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";

const newEventClass =
  "flex items-center gap-2 rounded-sm border border-dashed border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:border-accent/60 hover:bg-accent/5";

const newPostClass =
  "flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90";

type CreateEventFlow = ReturnType<typeof useCreateEventFlow>;

/** Shared header pair — New Event (modal) + New Post (scheduler). */
export function NewEventPostActions({
  eventDate,
  flow,
  postLabel = "New_Post",
  postTestId = "new-post-btn",
  eventTestId = "new-event-btn",
  showPostLink = true,
}: {
  eventDate?: Date;
  /** Share one modal instance when the page also opens create-event from elsewhere. */
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
      <button
        type="button"
        onClick={() => openCreateEvent(eventDate)}
        data-testid={eventTestId}
        className={newEventClass}
      >
        <Plus className="h-3 w-3" /> New_Event
      </button>
      {showPostLink ? (
        <Link to="/scheduler" data-testid={postTestId} className={newPostClass}>
          <Plus className="h-3 w-3" /> {postLabel}
        </Link>
      ) : null}
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
        aria-label="New Event"
        className="group relative flex h-11 w-full items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground transition-colors hover:border-accent/60 hover:bg-accent/5 hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-sm border border-border bg-surface px-2.5 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          New Event
        </span>
      </button>
      {modal}
    </>
  );
}