import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useWorkspace } from "@/lib/workspace-context";
import { EventAlbumCard } from "@/components/events/EventAlbumCard";
import { Layers } from "lucide-react";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Events — TORCC OmniSocial" },
      {
        name: "description",
        content: "Event albums group related media — sermons, reels, clips — with combined performance.",
      },
    ],
  }),
  component: EventsIndexPage,
});

function EventsIndexPage() {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const createEventFlow = useCreateEventFlow();

  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );

  return (
    <>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Events"
        actions={<NewEventPostActions flow={createEventFlow} />}
      />

      <div className="page-content">
        <div className="panel section-block p-8">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-border bg-background/60">
              <Layers className="h-5 w-5 text-accent" strokeWidth={1.5} />
            </div>
            <div className="max-w-2xl">
              <div className="text-sm font-medium text-foreground">Event albums</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Each album is a ministry moment — like a Sunday sermon — with every related file
                associated to it. Associate reels, quote cards, and long-form uploads from the file
                card in New Post; not tags, but grouped media under one event.
              </p>
            </div>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="mt-8 rounded-sm border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
            <p className="text-sm text-muted-foreground">No events yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Create your first event album to group sermon reels, clips, and quote cards.
            </p>
            <button
              type="button"
              onClick={() => createEventFlow.openCreateEvent()}
              data-testid="events-empty-new-event"
              className="mt-5 inline-flex items-center gap-1.5 rounded-sm border border-accent/60 bg-accent/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20"
            >
              New Event
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
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
    </>
  );
}