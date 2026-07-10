import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { DRAG_POST_TYPE } from "@/components/calendar/CalendarQueueView";
import { QueueCalendarToggle } from "@/components/dashboard/QueueCalendarToggle";
import { parseCalendarDateSearch } from "@/lib/calendar-day-click";
import { reschedulePostToDay } from "@/lib/reschedule-post";
import { AlbumCardsModal } from "@/components/events/AlbumCardsModal";
import { CalendarDayCell } from "@/components/calendar/CalendarDayCell";
import { CalendarDayPanel } from "@/components/calendar/CalendarDayPanel";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { EventAssociateModal } from "@/components/events/EventAssociateModal";
import { groupEventsByCalendarDay } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import type { ScheduledPost } from "@/lib/mock-data";
import { useCalendarPostSelection } from "@/hooks/useCalendarPostSelection";
import { isSameCalendarDay, today, todayStart } from "@/lib/demo-clock";
import { buildMonthWeeks, CALENDAR_DOW } from "@/lib/calendar-grid";
import { groupContentCardsByDay } from "@/lib/scheduled-post-display";
import { cn } from "@/lib/utils";

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
      { title: "Calendar — TORCC OmniPresence" },
      {
        name: "description",
        content:
          "Month view of scheduled cards and events — link uploads from the day panel.",
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
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false);
  const [associateTarget, setAssociateTarget] = useState<ScheduledPost | null>(null);
  const [eventPostsModal, setEventPostsModal] = useState<ContentEvent | null>(null);

  const { selectFromGrid } = useCalendarPostSelection();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = todayStart();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => today());

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
    setSelectedDate(dt);
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
    setSelectedDate(dt);
    setDeepLinkNotice(null);
    navigate({ to: "/calendar", replace: true });
  }, [focusDateParam, navigate]);

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function jumpToday() {
    const now = today();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  function handleRescheduleDrop(e: React.DragEvent, targetDate: Date) {
    const postId = e.dataTransfer.getData(DRAG_POST_TYPE) || e.dataTransfer.getData("text/plain");
    if (!postId) return;
    const post = scheduledPosts.find((p) => p.id === postId);
    if (!post) return;
    upsertScheduledPost(reschedulePostToDay(post, targetDate));
    setDraggingPostId(null);
    setSelectedDate(targetDate);
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

  const selectedDayKey = selectedDate?.getDate();
  const selectedInView =
    selectedDate &&
    selectedDate.getFullYear() === focusYear &&
    selectedDate.getMonth() === focusMonth;

  const panelEvents = selectedInView && selectedDayKey != null
    ? (eventsByDay.get(selectedDayKey) ?? [])
    : [];
  const panelPosts = selectedInView && selectedDayKey != null
    ? (byDay.get(selectedDayKey) ?? [])
    : [];

  const monthPosts = useMemo(() => {
    const all: ScheduledPost[] = [];
    byDay.forEach((arr) => all.push(...arr));
    return all;
  }, [byDay]);

  const unassociatedCount = useMemo(
    () => monthPosts.filter((p) => !isAssociated(p)).length,
    [monthPosts, isAssociated],
  );

  const now = today();
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Calendar"
        description="Plan the month. Open a day to link cards to events."
        actions={
          <>
            <QueueCalendarToggle active="calendar" />
            <button type="button" onClick={jumpToday} data-testid="today-btn" className="btn-action">
              Today
            </button>
            <NewEventPostActions
              flow={createEventFlow}
              eventDate={selectedDate ?? new Date(focusYear, focusMonth, now.getDate())}
            />
          </>
        }
      />

      <div className="page-content mx-auto max-w-[1440px]">
        {deepLinkNotice ? (
          <p
            data-testid="calendar-deep-link-notice"
            className="mb-4 rounded-md border border-warning bg-warning/10 px-3 py-2 text-body-sm text-foreground"
          >
            {deepLinkNotice}
          </p>
        ) : null}

        {/* Toolbar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              data-testid="prev-month-btn"
              aria-label="Previous month"
              className="rounded-lg border border-line bg-card p-2 hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h2 className="min-w-[10rem] text-center font-display text-xl font-bold text-foreground sm:min-w-[14rem]">
              {monthLabel}
            </h2>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              data-testid="next-month-btn"
              aria-label="Next month"
              className="rounded-lg border border-line bg-card p-2 hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="filter-unlinked-toggle"
              onClick={() => setShowUnlinkedOnly((v) => !v)}
              className={cn(
                "rounded-lg border border-line px-3 py-2 text-body-sm font-semibold transition-colors",
                showUnlinkedOnly
                  ? "bg-warning/20 text-foreground "
                  : "bg-card text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              Unlinked only
              {unassociatedCount > 0 ? (
                <span className="ml-1.5 font-data">({unassociatedCount})</span>
              ) : null}
            </button>
            {draggingPostId ? (
              <span className="text-body-sm font-medium text-accent">Drop on a day to reschedule</span>
            ) : (
              <span className="hidden text-body-sm text-muted-foreground lg:inline">
                Click a day · drag cards to move
              </span>
            )}
          </div>
        </div>

        {/* Split: clean month + day panel */}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div
            data-testid="calendar-month-grid"
            className="min-w-0 overflow-hidden rounded-lg border border-line bg-foreground shadow-[var(--shadow-card)]"
            onDragEnd={() => setDraggingPostId(null)}
          >
            {/* minmax(0,1fr) — default minmax(auto) lets thumb content blow out the grid */}
            <div
              className="grid gap-px bg-foreground"
              style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}
            >
              {CALENDAR_DOW.map((d) => (
                <div
                  key={d}
                  className="min-w-0 bg-paper-2 py-2 text-center font-mono text-[0.65rem] font-bold uppercase tracking-[0.06em] text-muted-foreground sm:py-2.5 sm:text-caption"
                >
                  {d}
                </div>
              ))}
              {weeks.flatMap((week) =>
                week.cells.map((c) => {
                  const posts = !c.muted ? byDay.get(c.d) : undefined;
                  const dayEvents = !c.muted ? eventsByDay.get(c.d) : undefined;
                  const isToday = isSameCalendarDay(c.date, now);
                  const isSelected =
                    !c.muted &&
                    selectedDate != null &&
                    isSameCalendarDay(c.date, selectedDate);
                  const visiblePosts =
                    showUnlinkedOnly && posts
                      ? posts.filter((p) => !isAssociated(p))
                      : posts;

                  return (
                    <CalendarDayCell
                      key={c.key}
                      day={c.d}
                      date={c.date}
                      muted={c.muted}
                      isToday={isToday}
                      isSelected={isSelected}
                      events={dayEvents}
                      posts={visiblePosts}
                      dropActive={Boolean(draggingPostId && !c.muted)}
                      onDropPost={handleRescheduleDrop}
                      onSelect={() => setSelectedDate(c.date)}
                    />
                  );
                }),
              )}
            </div>
          </div>

          <CalendarDayPanel
            date={selectedInView ? selectedDate : null}
            events={panelEvents}
            posts={panelPosts}
            resolveEventId={resolveEventId}
            showUnlinkedOnly={showUnlinkedOnly}
            onClose={() => setSelectedDate(null)}
            onOpenPost={(post) => selectFromGrid(post)}
            onOpenEvent={(event) => setEventPostsModal(event)}
            onAssociatePost={(post) => setAssociateTarget(post)}
            onCreateEvent={() => {
              if (selectedDate) createEventFlow.openCreateEvent(selectedDate);
              else createEventFlow.openCreateEvent();
            }}
          />
        </div>
      </div>

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
