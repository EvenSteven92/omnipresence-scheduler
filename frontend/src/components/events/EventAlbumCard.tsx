import { Link } from "@tanstack/react-router";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import type { ContentEvent } from "@/lib/workspaces/types";
import {
  collectEventMedia,
  computeEventPerformance,
  eventAlbumCover,
  eventKindLabel,
  fmtCompact,
  formatEventDateTime,
} from "@/lib/events/display";
import type { WorkspaceProfile } from "@/lib/workspaces/types";

export function EventAlbumCard({
  event,
  workspace,
  workspaceId,
}: {
  event: ContentEvent;
  workspace: WorkspaceProfile;
  workspaceId: WorkspaceProfile["id"];
}) {
  const { resolveEventId } = useEventAssociations(workspaceId);
  const media = collectEventMedia(workspace, event.id, { resolveEventId });
  const perf = computeEventPerformance(media);
  const dateLabel = formatEventDateTime(event.date);
  const cover = eventAlbumCover(workspace, event, { resolveEventId });

  return (
    <article
      data-testid={`event-album-${event.id}`}
      className="kpi-card group flex flex-col overflow-hidden transition-colors hover:border-accent/50"
    >
      <div className="relative aspect-video overflow-hidden border-b border-border bg-background">
        <img
          src={cover.src}
          alt={cover.alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
        <span className="absolute right-2 top-2 rounded-sm border border-border/80 bg-background/80 px-2 py-0.5 label-mono text-[0.5rem] text-muted-foreground backdrop-blur-sm">
          {eventKindLabel(event.kind)}
        </span>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="min-w-0 flex-1">
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="text-sm font-semibold leading-snug text-foreground transition-colors hover:text-accent"
          >
            {event.title}
          </Link>
          <p className="mt-1.5 label-mono text-[0.55rem] text-muted-foreground">{dateLabel}</p>
          {event.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div>
            <div className="font-mono text-sm text-foreground">{media.length}</div>
            <div className="label-mono text-[0.5rem]">files</div>
          </div>
          <div>
            <div className="font-mono text-sm text-foreground">{perf.publishedCount}</div>
            <div className="label-mono text-[0.5rem]">live</div>
          </div>
          <div>
            <div className="font-mono text-sm text-accent">
              {perf.totalViews > 0 ? fmtCompact(perf.totalViews) : "—"}
            </div>
            <div className="label-mono text-[0.5rem]">views</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            to="/calendar"
            search={{ event: event.id }}
            data-testid={`event-view-calendar-${event.id}`}
            className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-background/40 px-2.5 py-1.5 label-mono text-[0.5rem] text-muted-foreground transition-colors hover:border-accent/50 hover:bg-accent/5 hover:text-accent"
          >
            <CalendarDays className="h-3 w-3" strokeWidth={1.75} />
            view_on_calendar
          </Link>
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="flex items-center gap-1 label-mono text-[0.5rem] text-muted-foreground transition-colors hover:text-foreground"
          >
            open_album <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}