import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { useWorkspace } from "@/lib/workspace-context";
import { EventPerformanceStrip } from "@/components/events/EventPerformanceStrip";
import { EventMediaMatrix } from "@/components/events/EventMediaMatrix";
import {
  collectEventMedia,
  computeEventPerformance,
  eventAlbumCover,
  eventKindLabel,
  formatEventDateTime,
  getEventById,
} from "@/lib/events/display";
import { ArrowLeft } from "lucide-react";
import { CardThumbnail } from "@/components/ui/CardThumbnail";

export const Route = createFileRoute("/events/$eventId")({
  head: () => ({
    meta: [{ title: "Event Album — TORCC OmniSocial" }],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const { resolveEventId } = useEventAssociations(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const event = getEventById(events, eventId);

  if (!event) {
    return (
      <div className="page-content">
        <div className="rounded-sm border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">Event not found</p>
          <Link
            to="/events"
            className="btn-action mt-4"
          >
            <ArrowLeft className="h-3 w-3" /> Back to events
          </Link>
        </div>
      </div>
    );
  }

  const media = collectEventMedia(workspace, event.id, { resolveEventId });
  const perf = computeEventPerformance(media);
  const dateLabel = formatEventDateTime(event.date, "long");
  const cover = eventAlbumCover(workspace, event, { resolveEventId });

  return (
    <>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title={event.title}
        actions={
          <>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="h-3 w-3" /> All events
            </Link>
            <NewEventPostActions />
          </>
        }
      />

      <div className="page-content space-y-8">
        <div className="panel section-block overflow-hidden p-0">
          <CardThumbnail
            src={cover.src}
            alt={cover.alt}
            layout="block"
            aspect="video"
            badge={
              <span className="rounded-sm border border-border/80 bg-background/80 px-2 py-0.5 text-eyebrow backdrop-blur-sm">
                {eventKindLabel(event.kind)}
              </span>
            }
          />

          <div className="p-8">
            <p className="text-body-sm text-muted-foreground">{dateLabel}</p>
            {event.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {event.description}
              </p>
            ) : null}
            <p className="mt-3 label-mono text-[0.55rem] text-muted-foreground/80">
              {perf.mediaCount} associated file{perf.mediaCount === 1 ? "" : "s"} ·{" "}
              {perf.scheduledCount} queued · {perf.publishedCount} live
              {perf.draftCount > 0 ? ` · ${perf.draftCount} draft` : ""}
            </p>
          </div>
        </div>

        <section>
          <div className="mb-4 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Album performance
          </div>
          <EventPerformanceStrip perf={perf} />
        </section>

        <section className="panel section-block p-8">
          <EventMediaMatrix items={media} workspace={workspace} />
        </section>
      </div>
    </>
  );
}
