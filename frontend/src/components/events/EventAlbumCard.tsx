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
  const cells = [
    { label: "Cards", value: String(mediaCount) },
    { label: "Live", value: String(publishedCount) },
    { label: "Views", value: totalViews > 0 ? fmtCompact(totalViews) : "—", accent: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border-[1.5px] border-foreground bg-foreground">
      {cells.map(({ label, value, accent }) => (
        <div key={label} className="bg-card px-3 py-2.5 text-center">
          <div
            className={`font-display text-lg font-bold leading-none ${accent ? "text-accent" : "text-foreground"}`}
          >
            {value}
          </div>
          <div className="mt-1 font-mono text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </div>
        </div>
      ))}
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
      thumbnail={
        <CardThumbnail
          src={cover.src}
          alt={cover.alt}
          layout="block"
          aspect="video"
          badge={
            <span className="rounded-[5px] border-[1.5px] border-foreground bg-background px-2 py-0.5 font-mono text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-foreground">
              {eventKindLabel(event.kind)}
            </span>
          }
        />
      }
      eyebrow={
        <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em] text-accent">
          {formatEventTime(event.date)} · {formatEventDate(event.date, "medium")}
        </p>
      }
      title={
        <Link
          to="/events/$eventId"
          params={{ eventId: event.id }}
          className="font-display text-xl font-bold leading-snug text-foreground transition-colors hover:text-accent"
        >
          {event.title}
        </Link>
      }
      platforms={
        event.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
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
          <div className="flex items-center justify-between gap-2 border-t-[1.5px] border-foreground px-5 py-3">
            <Link
              to="/events/$eventId"
              params={{ eventId: event.id }}
              className="btn-action-primary btn-action"
            >
              Open album <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="/calendar"
              search={{ event: event.id }}
              data-testid={`event-view-calendar-${event.id}`}
              className="inline-flex items-center gap-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
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