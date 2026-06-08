import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, TrendingUp } from "lucide-react";
import { ContentCardChip } from "@/components/post/ContentCardChip";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { useWorkspace } from "@/lib/workspace-context";
import {
  eventPerformerToCardPost,
  fmtCompact,
  formatEventMeta,
  rankEventPerformers,
  type RankedEventPerformer,
} from "@/lib/events/display";
import { timeframeLabel, type Timeframe } from "@/lib/timeframe";

function TopEventPerformerCard({
  row,
  isTop,
}: {
  row: RankedEventPerformer;
  isTop: boolean;
}) {
  const { event, perf } = row;

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      data-testid={`top-event-${event.id}`}
      className="group inline-flex w-fit max-w-full"
    >
      <article className="relative inline-flex w-fit max-w-full flex-col overflow-hidden rounded-sm border border-border bg-surface transition-colors group-hover:border-accent/50">
        {isTop ? (
          <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-sm border border-success/60 bg-success/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-success">
            <TrendingUp className="h-2.5 w-2.5" /> top
          </span>
        ) : null}
        <ContentCardChip
          post={eventPerformerToCardPost(row)}
          layout="rail"
          showSchedule={false}
          associated
          className="rounded-none border-0 bg-transparent"
        />
        <div className="grid grid-cols-3 gap-2 border-t border-border bg-background/40 px-3 py-2.5 text-center">
          <div>
            <div className="font-mono text-sm text-foreground">{fmtCompact(perf.totalViews)}</div>
            <div className="label-mono text-[0.55rem]">views</div>
          </div>
          <div>
            <div className="font-mono text-sm text-foreground">{fmtCompact(perf.totalLikes)}</div>
            <div className="label-mono text-[0.55rem]">likes</div>
          </div>
          <div>
            <div className="font-mono text-sm text-accent">
              {(perf.avgEngagement * 100).toFixed(1)}%
            </div>
            <div className="label-mono text-[0.55rem]">eng</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <p className="label-mono text-[0.45rem] text-muted-foreground">
            {formatEventMeta(event.date, event.kind)}
          </p>
          <span className="label-mono text-[0.5rem] text-muted-foreground group-hover:text-foreground">
            {perf.mediaCount} file{perf.mediaCount === 1 ? "" : "s"} · open_album
          </span>
        </div>
      </article>
    </Link>
  );
}

export function TopEventPerformersSection({
  timeframe,
  emptyLabel = "no_events_with_live_media_in_range",
}: {
  timeframe: Timeframe;
  emptyLabel?: string;
}) {
  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const { resolveEventId } = useEventAssociations(workspaceId);

  const topEvents = useMemo(() => {
    const events = mergeWorkspaceEvents(workspace.events, customEvents);
    return rankEventPerformers(workspace, events, { timeframe, resolveEventId });
  }, [workspace, customEvents, timeframe, resolveEventId]);

  return (
    <section className="section-block" data-testid="top-event-performers">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-mono">top_event_performers · {timeframeLabel(timeframe)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by album engagement — ministry moments with live associated media.
          </p>
        </div>
        <Link
          to="/events"
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
        >
          All_Events <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {topEvents.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-surface/40 px-5 py-10 text-center label-mono">
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