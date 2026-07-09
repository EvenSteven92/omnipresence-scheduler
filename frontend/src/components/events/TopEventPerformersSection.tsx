import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CardStats } from "@/components/ui/CardStats";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { useWorkspace } from "@/lib/workspace-context";
import {
  eventPerformerToCardPost,
  formatEventMeta,
  rankEventPerformers,
  type RankedEventPerformer,
} from "@/lib/events/display";
import { inferCardMediaType } from "@/lib/card-display";
import { TOP_PERFORMERS_DISPLAY_LIMIT } from "@/components/post/TopPerformerCard";
import { timeframeLabel, type Timeframe } from "@/lib/timeframe";

function EventPerformerStreamCard({ row, rank }: { row: RankedEventPerformer; rank: number }) {
  const { event, perf } = row;
  const cardPost = eventPerformerToCardPost(row);
  const mediaType = inferCardMediaType(cardPost.title);

  return (
    <Link
      to="/events"
      search={{ event: event.id }}
      data-testid={`top-event-${event.id}`}
      className="group block"
    >
      <ContentCard
        size="stream"
        fullWidth
        className="card-pop card-pop-interactive"
        eyebrow={formatEventMeta(event.date, event.kind)}
        title={event.title}
        meta={`${perf.mediaCount} file${perf.mediaCount === 1 ? "" : "s"}`}
        thumbnail={
          <div className="flex items-center gap-3.5">
            <span className="w-6 text-center font-display text-[1.375rem] font-extrabold text-muted-foreground">
              {rank}
            </span>
            <CardThumbnail
              post={cardPost}
              alt={cardPost.title}
              layout="square"
              mediaType={mediaType}
            />
          </div>
        }
        trailing={
          <CardStats
            views={perf.totalViews}
            likes={perf.totalLikes}
            engagementRate={perf.avgEngagement}
          />
        }
      />
    </Link>
  );
}

export function TopEventPerformersSection({
  timeframe,
  emptyLabel = "No events with live media in this range",
  className = "section-block",
}: {
  timeframe: Timeframe;
  emptyLabel?: string;
  className?: string;
}) {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const { resolveEventId } = useEventAssociations(workspaceId);

  const topEvents = useMemo(() => {
    const events = mergeWorkspaceEvents(workspace.events, customEvents);
    return rankEventPerformers(workspace, events, { timeframe, resolveEventId }).slice(
      0,
      TOP_PERFORMERS_DISPLAY_LIMIT,
    );
  }, [workspace, customEvents, timeframe, resolveEventId]);

  return (
    <section className={className} data-testid="top-event-performers">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-foreground pb-3">
        <div>
          <p className="page-kicker">Events</p>
          <h2 className="mt-1 font-display text-xl font-bold text-foreground">
            Top event performers
          </h2>
          <p className="mt-1 text-body-sm text-muted-foreground">
            Ranked by event engagement — {timeframeLabel(timeframe)}.
          </p>
        </div>
        <Link to="/events" className="btn-action btn-action-secondary">
          All events <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {topEvents.length === 0 ? (
        <div className="rounded-md border border-foreground bg-card px-5 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {topEvents.map((row, i) => (
            <EventPerformerStreamCard key={row.event.id} row={row} rank={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
