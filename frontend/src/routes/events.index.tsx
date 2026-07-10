import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { AlbumCardsModal } from "@/components/events/AlbumCardsModal";
import { EventAlbumCard } from "@/components/events/EventAlbumCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventKindLabel, getEventById } from "@/lib/events/display";
import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { CREATE } from "@/lib/create-actions";

const CATEGORY_FILTERS: { id: ContentEventKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sunday_sermon", label: "Sunday sermon" },
  { id: "worship_night", label: "Worship night" },
  { id: "youth", label: "Youth" },
  { id: "campaign", label: "Campaign" },
  { id: "conference", label: "Conference" },
  { id: "other", label: "Other" },
];

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
  const [kindFilter, setKindFilter] = useState<ContentEventKind | "all">("all");
  const [modalEvent, setModalEvent] = useState<ContentEvent | null>(null);

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const filtered = useMemo(
    () => (kindFilter === "all" ? events : events.filter((e) => e.kind === kindFilter)),
    [events, kindFilter],
  );

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
        <div
          data-testid="event-category-filter"
          className="mb-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Filter by event type"
        >
          {CATEGORY_FILTERS.map((filter) => {
            const count =
              filter.id === "all"
                ? events.length
                : events.filter((e) => e.kind === filter.id).length;
            const active = kindFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setKindFilter(filter.id)}
                data-testid={`event-filter-${filter.id}`}
                className={cn(
                  "rounded-md border px-3 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.06em] transition-colors",
                  active
                    ? "border-primary bg-primary text-background"
                    : "border-line bg-card text-muted-foreground hover:bg-secondary",
                )}
              >
                {filter.label}
                <span className="ml-1.5 opacity-80">{count}</span>
              </button>
            );
          })}
        </div>

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
            title={`No ${eventKindLabel(kindFilter as ContentEventKind).toLowerCase()} events`}
            description="Try another category or create a new event."
            action={
              <button type="button" onClick={() => setKindFilter("all")} className="btn-action">
                Show all events
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
      {/* createEventFlow.modal is rendered by NewEventPostActions */}
    </>
  );
}
