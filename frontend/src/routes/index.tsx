import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { CalendarDayEventsModal } from "@/components/calendar/CalendarDayEventsModal";
import { CalendarDayIntentModal } from "@/components/calendar/CalendarDayIntentModal";
import { CalendarDayMixedModal } from "@/components/calendar/CalendarDayMixedModal";
import { resolveCalendarDayClick } from "@/lib/calendar-day-click";
import { EventQueuedPostsModal } from "@/components/calendar/EventQueuedPostsModal";
import { CalendarLegendBar } from "@/components/calendar/CalendarLegendBar";
import { CalendarMonthDayCell } from "@/components/calendar/CalendarMonthDayCell";
import { CalendarPostModals } from "@/components/post/CalendarPostModals";
import { EventAssociateModal } from "@/components/events/EventAssociateModal";
import { PostDetailModal } from "@/components/post/PostDetailModal";
import { useCalendarPostSelection } from "@/hooks/useCalendarPostSelection";
import { mergeWorkspaceEvents, useCustomEvents } from "@/hooks/useCustomEvents";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { getEventsOnCalendarDay, queuedPostsForEvent } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";
import { todayStart } from "@/lib/demo-clock";
import {
  getQuietDaysInUpcomingWindow,
  getUpcomingContentCards,
  getUpcomingDaySlots,
  UPCOMING_WINDOW_DAYS,
} from "@/lib/scheduled-post-display";
import {
  Eye,
  Heart,
  Share2,
  Activity,
  Link2,
  Users,
  UserCheck,
  Plus,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { TopPerformerCard } from "@/components/post/TopPerformerCard";
import { useMemo, useState } from "react";
import { useYouTubeMetrics, youtubeVideosToPublishedPosts } from "@/hooks/useYouTubeMetrics";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { LiveConnectionStrip } from "@/components/ConnectPlatformSection";
import { AddPlatformStencilCard } from "@/components/AddPlatformStencilCard";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { TopEventPerformersSection } from "@/components/events/TopEventPerformersSection";
import { GrowthMatrixChart } from "@/components/GrowthMatrixChart";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import {
  filterPublishedInTimeframe,
  getGrowthMatrixForTimeframe,
  getMetrics,
  isAllTime,
  timeframeLabel,
  type Timeframe,
} from "@/lib/timeframe";

const metricIcons = [UserCheck, Eye, Heart, Share2, Activity, Link2, Users];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TORCC OmniSocial" },
      { name: "description", content: "Cross-platform performance, scheduled queue, and draft pipeline at a glance." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { workspace } = useWorkspace();
  const [timeframe, setTimeframe] = useState<Timeframe>({ kind: "preset", preset: "1m" });
  const { scheduledPosts, publishedPosts } = workspace;
  const { data: youtubeMetrics } = useYouTubeMetrics(workspace.id);
  const { data: accountStatus } = usePlatformConnections(workspace.id);
  const metrics = useMemo(() => getMetrics(timeframe, workspace), [timeframe, workspace]);
  const growthRows = useMemo(() => {
    const rows = getGrowthMatrixForTimeframe(timeframe, workspace);
    if (!youtubeMetrics?.connected || youtubeMetrics.videos.length === 0) return rows;
    const views = youtubeMetrics.videos.reduce((sum, v) => sum + v.views, 0);
    const likes = youtubeMetrics.videos.reduce((sum, v) => sum + v.likes, 0);
    const shares = youtubeMetrics.videos.reduce((sum, v) => sum + v.comments, 0);
    return rows.map((row) =>
      row.platform === "YT" ? { ...row, views, likes, shares } : row,
    );
  }, [timeframe, workspace, youtubeMetrics]);
  const livePublishedPosts = useMemo(() => {
    if (!youtubeMetrics?.connected || youtubeMetrics.videos.length === 0) {
      return publishedPosts;
    }
    const liveYt = youtubeVideosToPublishedPosts(youtubeMetrics.videos);
    const mockNonYt = publishedPosts.filter((p) => !p.platforms.includes("YT"));
    return [...liveYt, ...mockNonYt];
  }, [publishedPosts, youtubeMetrics]);
  const allTime = isAllTime(timeframe);

  return (
    <div>
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Core Performance"
        actions={
          <>
            <Link to="/analytics" className="btn-action">Analytics</Link>
            <NewEventPostActions />
          </>
        }
      />

      <div className="page-content">
        {/* Range selector — drives KPI row + growth matrix below */}
        <div id="dashboard-timeframe">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
        <p className="label-mono mt-4">
          {allTime
            ? "lifetime totals · no period comparison"
            : `vs prior ${timeframeLabel(timeframe)} · % change reflects same-length prior window`}
          {youtubeMetrics?.connected ? " · YouTube row + top performers use live synced data" : ""}
        </p>

        {/* Metric cards */}
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
          {metrics.map((m, i) => {
            const Icon = metricIcons[i];
            return (
              <div key={m.label} data-testid={`metric-${m.key}`} className="kpi-card metric-cell">
                <div className="flex items-start justify-between">
                  <div className="label-mono">{m.label.replace(/ /g, "_")}</div>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="mt-5 text-3xl font-semibold tracking-tight text-foreground">{m.value}</div>
                {m.delta && (
                  <div
                    className={`mt-2.5 text-xs ${
                      m.trend === "up" ? "text-success" : m.trend === "down" ? "text-danger" : "text-muted-foreground"
                    }`}
                  >
                    {m.delta}
                  </div>
                )}
                {m.note && <p className="label-mono mt-3 leading-relaxed normal-case tracking-normal">{m.note}</p>}
              </div>
            );
          })}
        </div>

        {/* Growth matrix */}
        <div className="panel section-block p-8">
          <GrowthMatrixChart rows={growthRows} timeframe={timeframe} />
        </div>

        {/* Upcoming this week */}
        <UpcomingSection />

        {/* Top performers */}
        <TopPerformersSection publishedPosts={livePublishedPosts} timeframe={timeframe} />

        <TopEventPerformersSection timeframe={timeframe} />

        {/* Connection health */}
        <HealthStrip workspace={workspace} youtubeLive={accountStatus?.youtube.connected ?? false} />
      </div>
    </div>
  );
}

// ─── Upcoming this week ─────────────────────────────────────────────────────

function UpcomingSection() {
  const { workspace, workspaceId } = useWorkspace();
  const scheduledPosts = workspace.scheduledPosts;
  const { customEvents } = useCustomEvents(workspaceId);
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const { isAssociated, resolveEventId, associate } = useEventAssociations(workspaceId);
  const createEventFlow = useCreateEventFlow();
  const [highlightUnassociated, setHighlightUnassociated] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [eventDayPicker, setEventDayPicker] = useState<{
    date: Date;
    events: ContentEvent[];
  } | null>(null);
  const [eventPostsModal, setEventPostsModal] = useState<ContentEvent | null>(null);
  const [associateTarget, setAssociateTarget] = useState<ScheduledPost | null>(null);
  const [dayIntentDate, setDayIntentDate] = useState<Date | null>(null);
  const [dayMixed, setDayMixed] = useState<{
    date: Date;
    events: ContentEvent[];
    posts: ScheduledPost[];
  } | null>(null);
  const upcoming = useMemo(
    () => getUpcomingContentCards(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );
  const daySlots = useMemo(
    () => getUpcomingDaySlots(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );
  const gapWarning = useMemo(
    () => getQuietDaysInUpcomingWindow(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );
  const unassociatedCount = useMemo(
    () => daySlots.flatMap((slot) => slot.posts).filter((post) => !isAssociated(post)).length,
    [daySlots, isAssociated],
  );
  const {
    dayGrid,
    detailPost,
    openPosts,
    selectFromGrid,
    openDetailFromEvent,
    closeDayGrid,
    closeDetail,
  } = useCalendarPostSelection();

  function handleCloseDetail() {
    const restoreEvent = closeDetail();
    if (restoreEvent) setEventPostsModal(restoreEvent);
  }

  function openAssociate(post: ScheduledPost, e: React.MouseEvent) {
    e.stopPropagation();
    setAssociateTarget(post);
  }

  const eventQueuedPosts = useMemo(
    () =>
      eventPostsModal
        ? queuedPostsForEvent(scheduledPosts, eventPostsModal.id, resolveEventId)
        : [],
    [eventPostsModal, scheduledPosts, resolveEventId],
  );

  function handleDateClick(date: Date) {
    setSelectedDateKey(date.toDateString());
    const dayEvents = getEventsOnCalendarDay(events, date);
    const dayPosts =
      daySlots.find((slot) => slot.date.toDateString() === date.toDateString())?.posts ?? [];
    const result = resolveCalendarDayClick(date, dayEvents, dayPosts);
    switch (result.action) {
      case "empty":
        setDayIntentDate(result.date);
        break;
      case "mixed":
        setDayMixed({ date: result.date, events: result.events, posts: result.posts });
        break;
      case "posts":
        openPosts(result.posts, result.date);
        break;
      case "singleEvent":
        setEventPostsModal(result.event);
        break;
      case "multiEvent":
        setEventDayPicker({ date: result.date, events: result.events });
        break;
    }
  }

  return (
    <section className="section-block">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono">upcoming · next_7d</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {upcoming.length === 0
              ? "Nothing in the queue — drop assets in New Post to fill the next week."
              : `${upcoming.length} content card${upcoming.length === 1 ? "" : "s"} in the next ${UPCOMING_WINDOW_DAYS} days — same interactions as Calendar.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {gapWarning.length > 0 && upcoming.length > 0 ? (
            <span
              data-testid="queue-gap-warning"
              className="inline-flex items-center gap-1.5 rounded-sm border border-warning/60 bg-warning/10 px-2 py-1 text-[0.6rem] uppercase tracking-[0.14em] text-warning"
            >
              <AlertTriangle className="h-3 w-3" />
              {gapWarning.length}_gap{gapWarning.length === 1 ? "" : "s"}_in_queue: {gapWarning.join("·")}
            </span>
          ) : null}
          <Link
            to="/calendar"
            className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
          >
            View_Calendar <ArrowRight className="h-3 w-3" />
          </Link>
          <NewEventPostActions flow={createEventFlow} />
        </div>
      </div>

      <div className="mb-4">
        <CalendarLegendBar
          highlightUnassociated={highlightUnassociated}
          onToggleHighlight={() => setHighlightUnassociated((value) => !value)}
          unassociatedCount={unassociatedCount}
        />
      </div>

      <div className="overflow-x-auto">
        <div
          data-testid="upcoming-week-row"
          className="grid min-w-[56rem] grid-cols-7 gap-px overflow-hidden rounded-sm border border-border bg-border"
        >
          {daySlots.map((slot) => {
            const dayEvents = getEventsOnCalendarDay(events, slot.date);
            const posts = slot.posts.length > 0 ? slot.posts : undefined;
            const dateKey = slot.date.toDateString();

            const isQuietDay = slot.posts.length === 0;

            return (
              <CalendarMonthDayCell
                key={dateKey}
                day={slot.date.getDate()}
                date={slot.date}
                muted={false}
                isToday={slot.isToday}
                isSelected={selectedDateKey === dateKey}
                isQuietDay={isQuietDay}
                events={dayEvents.length > 0 ? dayEvents : undefined}
                posts={posts}
                isAssociated={isAssociated}
                resolveEventId={resolveEventId}
                onDateClick={() => handleDateClick(slot.date)}
                onOpenPosts={openPosts}
              />
            );
          })}
        </div>
      </div>

      <CalendarPostModals
        dayGrid={dayGrid}
        detailPost={detailPost}
        events={events}
        resolveEventId={resolveEventId}
        onCloseDayGrid={closeDayGrid}
        onCloseDetail={handleCloseDetail}
        onSelectFromGrid={selectFromGrid}
        highlightUnassociated={highlightUnassociated}
        isAssociated={isAssociated}
        onAssociatePost={openAssociate}
      />

      {associateTarget ? (
        <EventAssociateModal
          post={associateTarget}
          events={events}
          currentEventId={resolveEventId(associateTarget)}
          onAssociate={(eventId) => associate(associateTarget.id, eventId)}
          onClose={() => setAssociateTarget(null)}
        />
      ) : null}

      {eventDayPicker ? (
        <CalendarDayEventsModal
          date={eventDayPicker.date}
          events={eventDayPicker.events}
          onClose={() => setEventDayPicker(null)}
          onScheduleEvent={() => {
            const date = eventDayPicker.date;
            setEventDayPicker(null);
            createEventFlow.openCreateEvent(date);
          }}
          onSelectEvent={(event) => {
            setEventDayPicker(null);
            setEventPostsModal(event);
          }}
        />
      ) : null}

      {eventPostsModal ? (
        <EventQueuedPostsModal
          event={eventPostsModal}
          posts={eventQueuedPosts}
          onClose={() => setEventPostsModal(null)}
          onSelectPost={(post) => {
            const event = eventPostsModal;
            setEventPostsModal(null);
            if (event) openDetailFromEvent(post, event);
          }}
        />
      ) : null}

      {dayIntentDate ? (
        <CalendarDayIntentModal
          date={dayIntentDate}
          onClose={() => setDayIntentDate(null)}
          onCreateEvent={() => createEventFlow.openCreateEvent(dayIntentDate)}
        />
      ) : null}

      {dayMixed ? (
        <CalendarDayMixedModal
          date={dayMixed.date}
          events={dayMixed.events}
          posts={dayMixed.posts}
          onClose={() => setDayMixed(null)}
          onViewPosts={() => openPosts(dayMixed.posts, dayMixed.date)}
          onViewEvents={() => {
            if (dayMixed.events.length === 1) {
              setEventPostsModal(dayMixed.events[0]!);
            } else {
              setEventDayPicker({ date: dayMixed.date, events: dayMixed.events });
            }
          }}
        />
      ) : null}
    </section>
  );
}

// ─── Top performing posts ────────────────────────────────────────────────────

function TopPerformersSection({
  publishedPosts,
  timeframe,
}: {
  publishedPosts: PublishedPost[];
  timeframe: Timeframe;
}) {
  const [detailPost, setDetailPost] = useState<PublishedPost | null>(null);
  const top = useMemo(() => {
    const recent = filterPublishedInTimeframe(publishedPosts, timeframe);
    return [...recent].sort((a, b) => b.engagementRate - a.engagementRate);
  }, [publishedPosts, timeframe]);

  return (
    <section className="section-block">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-mono">top_performers · {timeframeLabel(timeframe)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ranked by engagement rate — pull insights into your next campaign.
          </p>
        </div>
        <Link
          to="/analytics"
          className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
        >
          Full_Analytics <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="rounded-sm border border-dashed border-border bg-surface/40 px-5 py-10 text-center label-mono">
          no_published_posts_in_range
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {top.map((p, i) => (
            <TopPerformerCard
              key={p.id}
              post={p}
              isTop={i === 0}
              onOpen={() => setDetailPost(p)}
            />
          ))}
        </div>
      )}

      {detailPost ? (
        <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />
      ) : null}
    </section>
  );
}

// ─── Connection health strip ────────────────────────────────────────────────

function HealthStrip({
  workspace,
  youtubeLive,
}: {
  workspace: import("@/lib/workspaces/types").WorkspaceProfile;
  youtubeLive: boolean;
}) {
  return (
    <section className="section-block">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono">platform_connections</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {youtubeLive
              ? "YouTube uses live OAuth data. Other platforms still show demo metrics until connected."
              : "Connect YouTube on Workspaces to replace demo social data one platform at a time."}
          </p>
        </div>
        <Link
          to="/workspaces"
          hash="connect-platform"
          className="label-mono text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          connect accounts →
        </Link>
      </div>
      <LiveConnectionStrip workspace={workspace} />
      <div className="mt-4">
        <AddPlatformStencilCard
          testId="connections-add-platform"
          variant="strip"
          description="Link YouTube first — Meta and X are next."
        />
      </div>
    </section>
  );
}


