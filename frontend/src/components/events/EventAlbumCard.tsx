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
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";

function AlbumCountsTrailing({
  mediaCount,
  publishedCount,
  totalViews,
}: {
  mediaCount: number;
  publishedCount: number;
  totalViews: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 border-t border-border px-5 py-3 text-center">
      <div>
        <div className="font-mono text-sm text-foreground">{mediaCount}</div>
        <div className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">Files</div>
      </div>
      <div>
        <div className="font-mono text-sm text-foreground">{publishedCount}</div>
        <div className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">Live</div>
      </div>
      <div>
        <div className="font-mono text-sm text-accent">
          {totalViews > 0 ? fmtCompact(totalViews) : "—"}
        </div>
        <div className="text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">Views</div>
      </div>
    </div>
  );
}

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
    <ContentCard
      size="md"
      orientation="stacked"
      testId={`event-album-${event.id}`}
      className="transition-colors hover:border-accent/40"
      thumbnail={
        <CardThumbnail
          src={cover.src}
          alt={cover.alt}
          layout="block"
          aspect="video"
          badge={
            <span className="rounded-sm border border-border/80 bg-background/80 px-2 py-0.5 text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-sm">
              {eventKindLabel(event.kind)}
            </span>
          }
        />
      }
      eyebrow={
        <p className="text-lg font-semibold leading-none text-foreground">
          {formatEventTime(event.date)}
        </p>
      }
      title={
        <Link
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="text-sm font-medium leading-snug text-foreground transition-colors hover:text-accent"
        >
          {event.title}
        </Link>
      }
      meta={formatEventDate(event.date, "medium")}
      platforms={
        event.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        ) : null
      }
      trailing={
        <>
          <AlbumCountsTrailing
            mediaCount={media.length}
            publishedCount={perf.publishedCount}
            totalViews={perf.totalViews}
          />
          <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
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
        </>
      }
    />
  );
}