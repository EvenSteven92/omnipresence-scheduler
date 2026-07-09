import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { AlbumCardsModal } from "@/components/events/AlbumCardsModal";
import { EventAlbumCard } from "@/components/events/EventAlbumCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventKindLabel, getEventById } from "@/lib/events/display";
import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";
import { FilePlus, Layers } from "lucide-react";
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
  album?: string;
};

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Albums — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Event albums group related media — sermons, reels, clips — with combined performance.",
      },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): EventsSearch => ({
    album: typeof search.album === "string" && search.album.length > 0 ? search.album : undefined,
  }),
  component: EventsIndexPage,
});

function EventsIndexPage() {
  const { album: albumId } = Route.useSearch();
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
    if (!albumId) {
      setModalEvent(null);
      return;
    }
    const event = getEventById(events, albumId);
    if (event) setModalEvent(event);
  }, [albumId, events]);

  function openAlbum(event: ContentEvent) {
    setModalEvent(event);
    navigate({ to: "/events", search: { album: event.id }, replace: true });
  }

  function closeAlbumModal() {
    setModalEvent(null);
    navigate({ to: "/events", search: {}, replace: true });
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em] text-accent">
            Media library
          </span>
        }
        title="Albums"
        description="Every album is a ministry moment. Open one to see its cards."
        actions={
          <Link to="/scheduler" className="btn-action-primary btn-action">
            <FilePlus className="h-3.5 w-3.5" strokeWidth={2} />
            {CREATE.card}
          </Link>
        }
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
                  "rounded-md border-[1.5px] px-3 py-1.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.06em] transition-colors",
                  active
                    ? "border-foreground bg-accent text-foreground"
                    : "border-foreground bg-card text-muted-foreground hover:bg-secondary",
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
            title="No albums yet"
            description="Create your first event album to group sermon reels, clips, and quote cards."
            action={
              <button
                type="button"
                onClick={() => createEventFlow.openCreateEvent()}
                data-testid="events-empty-new-event"
                className="btn-action-primary btn-action"
              >
                New album
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={`No ${eventKindLabel(kindFilter as ContentEventKind).toLowerCase()} albums`}
            description="Try another category or create a new album."
            action={
              <button type="button" onClick={() => setKindFilter("all")} className="btn-action">
                Show all albums
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
                onOpen={openAlbum}
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
          onClose={closeAlbumModal}
        />
      ) : null}

      {createEventFlow.modal}
    </>
  );
}