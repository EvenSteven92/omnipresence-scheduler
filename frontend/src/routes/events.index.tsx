import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { AlbumCardsModal } from "@/components/events/AlbumCardsModal";
import { EventAlbumCard } from "@/components/events/EventAlbumCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { getEventById } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";
import { Layers } from "lucide-react";
import { CREATE } from "@/lib/create-actions";

type EventsSearch = {
  /** Deep-link to open an event modal. Accepts legacy `album` query. */
  event?: string;
};

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Ministry events group related media — sermons, reels, clips — with combined performance.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): EventsSearch => {
    const event =
      (typeof search.event === "string" && search.event.length > 0 && search.event) ||
      (typeof search.album === "string" && search.album.length > 0 && search.album) ||
      undefined;
    return { event };
  },
  component: EventsIndexPage,
});

function EventsIndexPage() {
  const { event: eventId } = Route.useSearch();
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const createEventFlow = useCreateEventFlow();
  const [query, setQuery] = useState("");
  const [modalEvent, setModalEvent] = useState<ContentEvent | null>(null);

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const hay = `${e.title} ${e.description ?? ""} ${e.date} ${e.kind}`.toLowerCase();
      return hay.includes(q);
    });
  }, [events, query]);

  useEffect(() => {
    if (!eventId) {
      setModalEvent(null);
      return;
    }
    const event = getEventById(events, eventId);
    if (event) setModalEvent(event);
  }, [eventId, events]);

  function openEvent(event: ContentEvent) {
    setModalEvent(event);
    navigate({ to: "/events", search: { event: event.id }, replace: true });
  }

  function closeEventModal() {
    setModalEvent(null);
    navigate({ to: "/events", search: {}, replace: true });
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="text-[0.625rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Media library
          </span>
        }
        title="Events"
        description="Every event is a ministry moment. Open one to see its cards."
        actions={<NewEventPostActions flow={createEventFlow} />}
      />

      <div className="page-content">
        <label className="relative mb-6 block max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events…"
            className="w-full rounded-md border border-line bg-card py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
            data-testid="events-search"
          />
        </label>

        {events.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No events yet"
            description="Create your first event to group sermon reels, clips, and quote cards."
            action={
              <button
                type="button"
                onClick={() => createEventFlow.openCreateEvent()}
                data-testid="events-empty-new-event"
                className="btn-action-primary btn-action"
              >
                {CREATE.event}
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No events match"
            description="Try a different search, or clear the field to see all events."
            action={
              <button
                type="button"
                onClick={() => setQuery("")}
                className="btn-action"
              >
                Clear search
              </button>
            }
          />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))" }}
          >
            {filtered.map((event) => (
              <EventAlbumCard
                key={event.id}
                event={event}
                workspace={workspace}
                workspaceId={workspaceId}
                onOpen={openEvent}
              />
            ))}
          </div>
        )}
      </div>

      {modalEvent ? (
        <AlbumCardsModal
          event={modalEvent}
          workspace={workspace}
          workspaceId={workspaceId}
          onClose={closeEventModal}
        />
      ) : null}

      {createEventFlow.modal}
    </>
  );
}
