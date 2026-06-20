import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp } from "lucide-react";
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
import { TOP_PERFORMERS_DISPLAY_LIMIT } from "@/components/post/TopPerformerCard";
import { timeframeLabel, type Timeframe } from "@/lib/timeframe";
import { PlatformRow } from "@/components/post/PlatformRow";

function TopBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-success/60 bg-success/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-success">
      <TrendingUp className="h-2.5 w-2.5" /> Top
    </span>
  );
}

function TopEventPerformerCard({ row, isTop }: { row: RankedEventPerformer; isTop: boolean }) {
  const { event, perf } = row;
  const cardPost = eventPerformerToCardPost(row);
  const entries = cardPost.platforms.map((platform) => ({
    platform,
    state: "published" as const,
  }));

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      data-testid={`top-event-${event.id}`}
      className="group inline-flex w-fit max-w-full"
    >
      <ContentCard
        size="sm"
        orientation="rail"
        title={cardPost.title}
        platforms={<PlatformRow entries={entries} size="sm" compact />}
        thumbnail={
          <CardThumbnail
            post={cardPost}
            alt={cardPost.title}
            layout="rail"
            height="md"
            badge={isTop ? <TopBadge /> : undefined}
          />
        }
        trailing={
          <>
            <CardStats
              views={perf.totalViews}
              likes={perf.totalLikes}
              engagementRate={perf.avgEngagement}
            />
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
              <p className="label-mono text-[0.45rem] text-muted-foreground">
                {formatEventMeta(event.date, event.kind)}
              </p>
              <span className="label-mono text-[0.5rem] text-muted-foreground group-hover:text-foreground">
                {perf.mediaCount} file{perf.mediaCount === 1 ? "" : "s"} · Open album
              </span>
            </div>
          </>
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
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Top event performers · {timeframeLabel(timeframe)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by album engagement — ministry moments with live associated media.
          </p>
        </div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
        >
          All events <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {topEvents.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-surface/40 px-5 py-10 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {topEvents.map((row, i) => (
            <TopEventPerformerCard key={row.event.id} row={row} isTop={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}