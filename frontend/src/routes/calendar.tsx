import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown } from "lucide-react";

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
  const { resolveEventId, associate } = useEventAssociations(workspaceId);
  const [draggingPostId, setDraggingPostId] = useState<string | null>(null);
  const [eventPostsModal, setEventPostsModal] = useState<ContentEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

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

  const [jumpOpen, setJumpOpen] = useState(false);

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function jumpToday() {
    const now = today();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
  }

  function jumpToMonth(year: number, monthIndex: number) {
    setViewMonth(new Date(year, monthIndex, 1));
    setJumpOpen(false);
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

  const now = today();
  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekCount = weeks.length;

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        eyebrow={<WorkspaceEyebrow />}
        title="Calendar"
        description="Plan the month. Nest cards under events — drag to associate."
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

      <div className="page-content mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col pb-6">
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
          <div className="relative flex items-center gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              data-testid="prev-month-btn"
              aria-label="Previous month"
              className="rounded-lg border border-line bg-card p-2 hover:bg-secondary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setJumpOpen((o) => !o)}
              className="inline-flex min-w-[10rem] items-center justify-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 font-display text-xl font-bold text-foreground hover:bg-secondary sm:min-w-[14rem]"
              data-testid="calendar-month-jump"
              aria-expanded={jumpOpen}
            >
              {monthLabel}
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              data-testid="next-month-btn"
              aria-label="Next month"
              className="rounded-lg border border-line bg-card p-2 hover:bg-secondary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {jumpOpen ? (
              <div
                className="absolute left-1/2 top-full z-30 mt-2 w-[min(20rem,90vw)] -translate-x-1/2 rounded-lg border border-line bg-card p-3 shadow-[var(--shadow-card)]"
                data-testid="calendar-jump-popover"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-1 text-xs font-semibold"
                    onClick={() =>
                      setViewMonth(
                        (m) => new Date(m.getFullYear() - 1, m.getMonth(), 1),
                      )
                    }
                  >
                    ◀ Year
                  </button>
                  <span className="font-mono text-sm font-bold">
                    {focusYear}
                  </span>
                  <button
                    type="button"
                    className="rounded border border-line px-2 py-1 text-xs font-semibold"
                    onClick={() =>
                      setViewMonth(
                        (m) => new Date(m.getFullYear() + 1, m.getMonth(), 1),
                      )
                    }
                  >
                    Year ▶
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => {
                    const label = new Date(focusYear, i, 1).toLocaleDateString(
                      undefined,
                      { month: "short" },
                    );
                    const active = i === focusMonth;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => jumpToMonth(focusYear, i)}
                        className={cn(
                          "rounded-md px-2 py-2 text-xs font-semibold",
                          active
                            ? "bg-foreground text-white"
                            : "bg-paper-2 text-foreground hover:bg-secondary",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {draggingPostId ? (
              <span className="text-body-sm font-medium text-accent">
                Drop on a day to reschedule · or onto an event in the panel to nest
              </span>
            ) : (
              <span className="hidden text-body-sm text-muted-foreground lg:inline">
                Click a day · drag cards to reschedule or nest under events
              </span>
            )}
          </div>
        </div>

        {/* Split: tall month + day panel fills viewport */}
        <div
          className="grid min-h-[calc(100dvh-14rem)] flex-1 items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]"
          data-testid="calendar-split"
        >
          <div
            data-testid="calendar-month-grid"
            className="flex min-h-[32rem] min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-foreground shadow-[var(--shadow-card)]"
            onDragEnd={() => setDraggingPostId(null)}
          >
            <div
              className="grid min-h-0 flex-1 gap-px bg-foreground"
              style={{
                gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                gridTemplateRows: `auto repeat(${weekCount}, minmax(0, 1fr))`,
              }}
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

                  return (
                    <CalendarDayCell
                      key={c.key}
                      day={c.d}
                      date={c.date}
                      muted={c.muted}
                      isToday={isToday}
                      isSelected={isSelected}
                      events={dayEvents}
                      posts={posts}
                      dropActive={Boolean(draggingPostId && !c.muted)}
                      onDropPost={handleRescheduleDrop}
                      onSelect={() => setSelectedDate(c.date)}
                      fillHeight
                    />
                  );
                }),
              )}
            </div>
          </div>

          <div className="min-h-[28rem] xl:min-h-0 xl:h-full">
            <CalendarDayPanel
              date={selectedInView ? selectedDate : null}
              events={panelEvents}
              posts={panelPosts}
              resolveEventId={resolveEventId}
              onClose={() => setSelectedDate(null)}
              onOpenPost={(post) => selectFromGrid(post)}
              onOpenEvent={(event) => setEventPostsModal(event)}
              onAssociateToEvent={(postId, eventId) => {
                associate(postId, eventId);
                const ev = events.find((e) => e.id === eventId);
                showToast(
                  ev
                    ? `Added to ${ev.title}`
                    : "Card nested under event",
                );
              }}
              onCreateEvent={() => {
                if (selectedDate) createEventFlow.openCreateEvent(selectedDate);
                else createEventFlow.openCreateEvent();
              }}
              onCardDragState={setDraggingPostId}
            />
          </div>
        </div>
      </div>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-foreground px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-card)] md:bottom-8"
        >
          {toast}
        </div>
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
