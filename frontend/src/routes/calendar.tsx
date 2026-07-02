import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { CalendarDayDrawer } from "@/components/calendar/CalendarDayDrawer";
import { DRAG_POST_TYPE } from "@/components/calendar/CalendarQueueView";
import { QueueCalendarToggle } from "@/components/dashboard/QueueCalendarToggle";
import { parseCalendarDateSearch } from "@/lib/calendar-day-click";
import { reschedulePostToDay } from "@/lib/reschedule-post";
import { AlbumCardsModal } from "@/components/events/AlbumCardsModal";
import { CalendarLegendBar } from "@/components/calendar/CalendarLegendBar";
import { CalendarMonthDayCell } from "@/components/calendar/CalendarMonthDayCell";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { EventAssociateModal } from "@/components/events/EventAssociateModal";
import { groupEventsByCalendarDay } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import type { ScheduledPost } from "@/lib/mock-data";
import { CalendarPostModals } from "@/components/post/CalendarPostModals";

import { useCalendarPostSelection } from "@/hooks/useCalendarPostSelection";
import { isSameCalendarDay, today, todayStart } from "@/lib/demo-clock";
import { buildMonthWeeks, CALENDAR_DOW } from "@/lib/calendar-grid";
import { groupContentCardsByDay } from "@/lib/scheduled-post-display";

type CalendarSearch = {
  event?: string;
  date?: string;
};

export const Route = createFileRoute("/calendar")({
  validateSearch: (search: Record<string, unknown>): CalendarSearch => ({
    event: typeof search.event === "string" && search.event.length > 0 ? search.event : undefined,
    date: typeof search.date === "string" && search.date.length > 0 ? search.date : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Calendar — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Month view of unique content cards — one per file, with per-platform publish times.",
      },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const navigate = useNavigate();
  const { event: focusEventId, date: focusDateParam } = Route.useSearch();
  const [deepLinkNotice, setDeepLinkNotice] = useState<string | null>(null);
  const { workspace, workspaceId, upsertScheduledPost } = useWorkspace();
  const scheduledPosts = workspace.scheduledPosts;
  const { customEvents } = useCustomEvents(workspaceId);
  const createEventFlow = useCreateEventFlow();
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const { isAssociated, resolveEventId, associate } = useEventAssociations(workspaceId);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [dayDrawer, setDayDrawer] = useState<{
    date: Date;
    events: ContentEvent[];
    posts: ScheduledPost[];
  } | null>(null);
  const [highlightUnassociated, setHighlightUnassociated] = useState(false);
  const [associateTarget, setAssociateTarget] = useState<ScheduledPost | null>(null);
  const [eventPostsModal, setEventPostsModal] = useState<ContentEvent | null>(null);

  const { dayGrid, openPosts, selectFromGrid, closeDayGrid } =
    useCalendarPostSelection();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = todayStart();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(() =>
    today().toDateString(),
  );

  useEffect(() => {
    if (!focusEventId) return;
    const target = events.find((e) => e.id === focusEventId);
    if (!target) {
      setDeepLinkNotice("Event not found — link cleared");
      navigate({ to: "/calendar", replace: true });
      return;
    }

    const dt = new Date(target.date);
    setViewMonth(new Date(dt.getFullYear(), dt.getMonth(), 1));
    setSelectedDateKey(dt.toDateString());

    setEventPostsModal(target);
    setDeepLinkNotice(null);
    navigate({ to: "/calendar", replace: true });
  }, [focusEventId, events, navigate]);

  useEffect(() => {
    if (!focusDateParam) return;
    const dt = parseCalendarDateSearch(focusDateParam);
    if (!dt) {
      setDeepLinkNotice("Invalid date — link cleared");
      navigate({ to: "/calendar", replace: true });
      return;
    }
    setViewMonth(new Date(dt.getFullYear(), dt.getMonth(), 1));
    setSelectedDateKey(dt.toDateString());
    setDeepLinkNotice(null);
    navigate({ to: "/calendar", replace: true });
  }, [focusDateParam, navigate]);

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
    setSelectedDateKey(null);
  }
  function jumpToday() {
    const now = today();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(now.toDateString());
  }

  function openDayDrawer(date: Date, dayEvents: ContentEvent[], dayPosts: ScheduledPost[]) {
    setSelectedDateKey(date.toDateString());
    setDayDrawer({ date, events: dayEvents, posts: dayPosts });
  }

  function handleRescheduleDrop(e: React.DragEvent, targetDate: Date) {
    const postId = e.dataTransfer.getData(DRAG_POST_TYPE) || e.dataTransfer.getData("text/plain");
    if (!postId) return;
    const post = scheduledPosts.find((p) => p.id === postId);
    if (!post) return;
    upsertScheduledPost(reschedulePostToDay(post, targetDate));
    setDraggingPostId(null);
  }

  const focusYear = viewMonth.getFullYear();
  const focusMonth = viewMonth.getMonth();

  const weeks = useMemo(() => buildMonthWeeks(focusYear, focusMonth), [focusYear, focusMonth]);

  const byDay = useMemo(
    () => groupContentCardsByDay(scheduledPosts, focusYear, focusMonth),
    [scheduledPosts, focusYear, focusMonth],
  );

  const eventsByDay = useMemo(
    () => groupEventsByCalendarDay(events, focusYear, focusMonth),
    [events, focusYear, focusMonth],
  );

  const monthHasPosts = byDay.size > 0;
  const now = today();

  const monthPosts = useMemo(() => {
    const all: ScheduledPost[] = [];
    byDay.forEach((arr) => all.push(...arr));
    return all;
  }, [byDay]);

  const unassociatedCount = useMemo(
    () => monthPosts.filter((p) => !isAssociated(p)).length,
    [monthPosts, isAssociated],
  );

  function openAssociate(post: ScheduledPost, e: React.MouseEvent) {
    e.stopPropagation();
    setAssociateTarget(post);
  }

  function openEventPosts(event: ContentEvent) {
    setEventPostsModal(event);
  }

  function handleDateClick(day: number, date: Date) {
    const dayEvents = eventsByDay.get(day) ?? [];
    const dayPosts = byDay.get(day) ?? [];
    openDayDrawer(date, dayEvents, dayPosts);
  }

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Calendar"
        actions={
          <>
            <QueueCalendarToggle active="calendar" />
            <button
              type="button"
              onClick={jumpToday}
              data-testid="today-btn"
              className="btn-action"
            >
              Today
            </button>
            <NewEventPostActions
              flow={createEventFlow}
              eventDate={
                selectedDateKey
                  ? new Date(selectedDateKey)
                  : new Date(focusYear, focusMonth, today().getDate())
              }
            />
          </>
        }
      />

      <div className="page-content">
        {deepLinkNotice ? (
          <p
            data-testid="calendar-deep-link-notice"
            className="mb-4 rounded-sm border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning"
          >
            {deepLinkNotice}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              data-testid="prev-month-btn"
              aria-label="Previous month"
              className="rounded-sm border border-border bg-surface p-1.5 text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="px-1 text-title">
              {viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              data-testid="next-month-btn"
              aria-label="Next month"
              className="rounded-sm border border-border bg-surface p-1.5 text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            {!monthHasPosts ? (
              <span className="ml-2 text-body-sm text-muted-foreground">No posts this month</span>
            ) : null}
          </div>
          <CalendarLegendBar
            highlightUnassociated={highlightUnassociated}
            onToggleHighlight={() => setHighlightUnassociated((v) => !v)}
            unassociatedCount={unassociatedCount}
          />
        </div>

        {draggingPostId ? (
          <p className="mt-3 text-body-sm text-accent">Drop a post onto a day to reschedule</p>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[48rem] overflow-hidden rounded-lg border-[1.5px] border-foreground bg-foreground">
            <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-[1.5px]">
              <div className="bg-paper-2 py-2.5 text-center font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Wk
              </div>
              {CALENDAR_DOW.map((d) => (
                <div
                  key={d}
                  className="bg-paper-2 py-2.5 text-center font-mono text-[0.625rem] font-bold uppercase tracking-[0.08em] text-muted-foreground"
                >
                  {d}
                </div>
              ))}
              {weeks.map((week) => (
                <div key={`week-${week.weekNumber}-${week.cells[0]!.key}`} className="contents">
                  <div
                    data-testid={`cal-week-${week.weekNumber}`}
                    className="flex min-h-[168px] items-start justify-center bg-card px-1 py-3"
                  >
                    <span className="font-data text-[0.65rem] text-muted-foreground">
                      {week.weekNumber}
                    </span>
                  </div>
                  {week.cells.map((c) => {
                    const posts = !c.muted ? byDay.get(c.d) : undefined;
                    const dayEvents = !c.muted ? eventsByDay.get(c.d) : undefined;
                    const isToday = isSameCalendarDay(c.date, now);
                    const isSelected = !c.muted && selectedDateKey === c.date.toDateString();
                    return (
                      <CalendarMonthDayCell
                        key={c.key}
                        day={c.d}
                        date={c.date}
                        muted={c.muted}
                        isToday={isToday}
                        isSelected={isSelected}
                        events={dayEvents}
                        posts={posts}
                        isAssociated={isAssociated}
                        resolveEventId={resolveEventId}
                        dropActive={Boolean(draggingPostId && !c.muted)}
                        onDropPost={handleRescheduleDrop}
                        onDateClick={() => handleDateClick(c.d, c.date)}
                        onOpenPosts={openPosts}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {dayDrawer ? (
        <CalendarDayDrawer
          date={dayDrawer.date}
          events={dayDrawer.events}
          posts={dayDrawer.posts}
          resolveEventId={resolveEventId}
          highlightUnassociated={highlightUnassociated}
          isAssociated={isAssociated}
          onClose={() => setDayDrawer(null)}
          onSelectPost={(post) => {
            setDayDrawer(null);
            selectFromGrid(post);
          }}
          onAssociatePost={openAssociate}
          onSelectEvent={(event) => {
            setDayDrawer(null);
            openEventPosts(event);
          }}
          onCreateEvent={() => {
            const date = dayDrawer.date;
            setDayDrawer(null);
            createEventFlow.openCreateEvent(date);
          }}
        />
      ) : null}

      <CalendarPostModals
        dayGrid={dayGrid}
        events={events}
        resolveEventId={resolveEventId}
        onCloseDayGrid={closeDayGrid}
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

      {eventPostsModal ? (
        <AlbumCardsModal
          event={eventPostsModal}
          workspace={workspace}
          workspaceId={workspaceId}
          onClose={() => setEventPostsModal(null)}
        />
      ) : null}

      {createEventFlow.modal}
    </div>
  );
}
