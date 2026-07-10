import { useEventAssociations } from "@/hooks/useEventAssociations";
import type { ContentEvent } from "@/lib/workspaces/types";
import {
  collectEventMedia,
  computeEventPerformance,
  eventAlbumCover,
  eventKindLabel,
  fmtCompact,
  formatEventTime,
} from "@/lib/events/display";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import { cn } from "@/lib/utils";

function EventCountsTrailing({
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
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-foreground">
      {cells.map(({ label, value, accent }) => (
        <div key={label} className="bg-card px-3 py-2.5 text-center">
          <div
            className={`font-display text-lg font-semibold leading-none ${accent ? "text-success" : "text-foreground"}`}
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

function eventDateEyebrow(iso: string): string {
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
  const cover = eventAlbumCover(workspace, event, { resolveEventId });
  const notes = event.description?.trim() ?? "";

  return (
    <ContentCard
      size="md"
      orientation="stacked"
      testId={`event-album-${event.id}`}
      className="card-pop card-pop-interactive w-full"
      onOpen={() => onOpen(event)}
      thumbnail={
        <CardThumbnail
          src={cover.src}
          alt={cover.alt}
          post={{ id: event.id, title: event.title, mediaKind: "video" }}
          kind="video"
          layout="block"
          aspect="video"
          variant="media"
          badge={
            <span className="rounded-[5px] border border-line bg-background px-2 py-0.5 font-mono text-[0.5625rem] font-bold uppercase tracking-[0.06em] text-foreground">
              {eventKindLabel(event.kind)}
            </span>
          }
        />
      }
      eyebrow={
        <p className="text-[0.625rem] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {eventDateEyebrow(event.date)}
        </p>
      }
      title={
        <span className="font-display text-xl font-bold leading-snug text-foreground">
          {event.title}
        </span>
      }
      platforms={
        <div className="space-y-3 px-5 pb-5">
          {/* Always reserve two lines so new events match seed event card height */}
          <p
            className={cn(
              "line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed",
              notes ? "text-muted-foreground" : "text-muted-foreground/55",
            )}
          >
            {notes || "No notes yet — open this event to add cards and details."}
          </p>
          <EventCountsTrailing
            mediaCount={media.length}
            publishedCount={perf.publishedCount}
            totalViews={perf.totalViews}
          />
        </div>
      }
    />
  );
}
