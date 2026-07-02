import { useEventAssociations } from "@/hooks/useEventAssociations";
import type { ContentEvent } from "@/lib/workspaces/types";
import {
  collectEventMedia,
  computeEventPerformance,
  eventKindLabel,
  fmtCompact,
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

function albumDateEyebrow(iso: string): string {
  const d = new Date(iso);
  const day = d
    .toLocaleDateString(undefined, { month: "short", day: "numeric" })
    .toUpperCase();
  return `${formatEventTime(iso)} · ${day}`;
}

export function EventAlbumCard({
  event,
  workspace,
  workspaceId,
  onOpen,
}: {
  event: ContentEvent;
  workspace: WorkspaceProfile;
  workspaceId: WorkspaceProfile["id"];
  onOpen: (event: ContentEvent) => void;
}) {
  const { resolveEventId } = useEventAssociations(workspaceId);
  const media = collectEventMedia(workspace, event.id, { resolveEventId });
  const perf = computeEventPerformance(media);

  return (
    <ContentCard
      size="md"
      orientation="stacked"
      testId={`event-album-${event.id}`}
      className="card-pop card-pop-interactive w-full"
      onOpen={() => onOpen(event)}
      thumbnail={
        <CardThumbnail
          post={{ id: event.id, title: event.title, mediaKind: "video" }}
          alt={event.title}
          kind="video"
          layout="block"
          aspect="video"
          variant="gradient"
          badge={
            <span className="rounded-[5px] border-[1.5px] border-foreground bg-background px-2 py-0.5 font-mono text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-foreground">
              {eventKindLabel(event.kind)}
            </span>
          }
        />
      }
      eyebrow={
        <p className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em] text-accent">
          {albumDateEyebrow(event.date)}
        </p>
      }
      title={
        <span className="font-display text-xl font-bold leading-snug text-foreground">
          {event.title}
        </span>
      }
      platforms={
        <div className="space-y-3 px-5 pb-5">
          {event.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          ) : null}
          <AlbumCountsTrailing
            mediaCount={media.length}
            publishedCount={perf.publishedCount}
            totalViews={perf.totalViews}
          />
        </div>
      }
    />
  );
}