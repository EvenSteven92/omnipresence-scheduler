import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { EventAlbumCard } from "@/components/events/EventAlbumCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { eventKindLabel } from "@/lib/events/display";
import type { ContentEventKind } from "@/lib/workspaces/types";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS: { id: ContentEventKind | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "sunday_sermon", label: "Sunday sermon" },
  { id: "worship_night", label: "Worship night" },
  { id: "youth", label: "Youth" },
  { id: "campaign", label: "Campaign" },
  { id: "conference", label: "Conference" },
  { id: "other", label: "Other" },
];

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Event albums group related media — sermons, reels, clips — with combined performance.",
      },
    ],
  }),
  component: EventsIndexPage,
});

function EventsIndexPage() {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const createEventFlow = useCreateEventFlow();
  const [kindFilter, setKindFilter] = useState<ContentEventKind | "all">("all");

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  const filtered = useMemo(
    () => (kindFilter === "all" ? events : events.filter((e) => e.kind === kindFilter)),
    [events, kindFilter],
  );

  return (
    <>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Events"
        actions={<NewEventPostActions flow={createEventFlow} />}
      />

      <div className="page-content">
        <div className="panel mb-6 p-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-background/60">
              <Layers className="h-5 w-5 text-accent" strokeWidth={1.5} />
            </div>
            <div className="max-w-2xl">
              <h2 className="text-title">Event albums</h2>
              <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
                Each album is a ministry moment — like a Sunday sermon — with every related file
                associated to it. Link media from the composer or associate posts on the calendar.
              </p>
            </div>
          </div>
        </div>

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
                  "rounded-sm border px-3 py-1.5 text-body-sm font-medium transition-colors",
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {filter.label}
                <span className="ml-1.5 font-data text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No events yet"
            description="Create your first event album to group sermon reels, clips, and quote cards."
            action={
              <button
                type="button"
                onClick={() => createEventFlow.openCreateEvent()}
                data-testid="events-empty-new-event"
                className="btn-action-primary btn-action"
              >
                New event
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={`No ${eventKindLabel(kindFilter as ContentEventKind).toLowerCase()} events`}
            description="Try another category or create a new event album."
            action={
              <button type="button" onClick={() => setKindFilter("all")} className="btn-action">
                Show all events
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((event) => (
              <EventAlbumCard
                key={event.id}
                event={event}
                workspace={workspace}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        )}
      </div>

      {createEventFlow.modal}
    </>
  );
}
