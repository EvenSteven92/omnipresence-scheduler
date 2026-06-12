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
  formatEventDate,
  formatEventTime,
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
        <span className="absolute right-2 top-2 rounded-sm border border-border/80 bg-background/80 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-sm">
          {eventKindLabel(event.kind)}
        </span>
      </div>

      <div className="flex flex-col gap-4 px-5 py-5">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-none text-foreground">
            {formatEventTime(event.date)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{formatEventDate(event.date, "medium")}</p>
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="mt-2 block text-sm font-medium leading-snug text-foreground transition-colors hover:text-accent"
          >
            {event.title}
          </Link>
          {event.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
          <div>
            <div className="font-mono text-sm text-foreground">{media.length}</div>
            <div className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">Files</div>
          </div>
          <div>
            <div className="font-mono text-sm text-foreground">{perf.publishedCount}</div>
            <div className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">Live</div>
          </div>
          <div>
            <div className="font-mono text-sm text-accent">
              {perf.totalViews > 0 ? fmtCompact(perf.totalViews) : "—"}
            </div>
            <div className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">Views</div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            to="/events/$eventId"
            params={{ eventId: event.id }}
            className="inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open album <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/calendar"
            search={{ event: event.id }}
            data-testid={`event-view-calendar-${event.id}`}
            className="inline-flex items-center gap-1 text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <CalendarDays className="h-3 w-3" strokeWidth={1.75} />
            View on calendar
          </Link>
        </div>
      </div>
    </article>
  );
}