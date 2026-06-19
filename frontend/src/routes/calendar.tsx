import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { CalendarQueueView } from "@/components/calendar/CalendarQueueView";
import { cn } from "@/lib/utils";
import { useCustomEvents, mergeWorkspaceEvents } from "@/hooks/useCustomEvents";
import { useEventAssociations } from "@/hooks/useEventAssociations";
import { AgendaEventRow } from "@/components/calendar/AgendaEventRow";
import { CalendarDayEventsModal } from "@/components/calendar/CalendarDayEventsModal";
import { CalendarDayIntentModal } from "@/components/calendar/CalendarDayIntentModal";
import { CalendarDayMixedModal } from "@/components/calendar/CalendarDayMixedModal";
import { parseCalendarDateSearch, resolveCalendarDayClick } from "@/lib/calendar-day-click";
import { EventQueuedPostsModal } from "@/components/calendar/EventQueuedPostsModal";
import { CalendarLegendBar } from "@/components/calendar/CalendarLegendBar";
import { CalendarMonthDayCell } from "@/components/calendar/CalendarMonthDayCell";
import { NewEventPostActions } from "@/components/NewEventPostActions";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { EventAssociateModal } from "@/components/events/EventAssociateModal";
import { groupEventsByCalendarDay, queuedPostsForEvent } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";
import { WorkspaceEyebrow } from "@/components/WorkspaceSwitcher";
import { useWorkspace } from "@/lib/workspace-context";
import type { ScheduledPost } from "@/lib/mock-data";
import { CalendarPostModals } from "@/components/post/CalendarPostModals";
import { countPostsForEvent } from "@/components/post/CalendarDayPostContent";
import { DayPostCountChip } from "@/components/post/DayPostCountChip";
import { useCalendarPostSelection } from "@/hooks/useCalendarPostSelection";
import { isSameCalendarDay, today, todayStart } from "@/lib/demo-clock";
import { buildMonthWeeks, CALENDAR_DOW } from "@/lib/calendar-grid";
import { contentCardAnchorDate, groupContentCardsByDay } from "@/lib/scheduled-post-display";

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
  const { workspace, workspaceId } = useWorkspace();
  const scheduledPosts = workspace.scheduledPosts;
  const { customEvents } = useCustomEvents(workspaceId);
  const createEventFlow = useCreateEventFlow();
  const events = useMemo(
    () => mergeWorkspaceEvents(workspace.events, customEvents),
    [workspace.events, customEvents],
  );
  const { isAssociated, resolveEventId, associate } = useEventAssociations(workspaceId);
  const [showAgenda, setShowAgenda] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "queue">("calendar");
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [highlightUnassociated, setHighlightUnassociated] = useState(false);
  const [associateTarget, setAssociateTarget] = useState<ScheduledPost | null>(null);
  const [eventDayPicker, setEventDayPicker] = useState<{
    date: Date;
    events: ContentEvent[];
  } | null>(null);
  const [eventPostsModal, setEventPostsModal] = useState<ContentEvent | null>(null);
  const [dayIntentDate, setDayIntentDate] = useState<Date | null>(null);
  const [dayMixed, setDayMixed] = useState<{
    date: Date;
    events: ContentEvent[];
    posts: ScheduledPost[];
  } | null>(null);

  const {
    dayGrid,
    detailPost,
    openPosts,
    selectFromGrid,
    openDetailFromEvent,
    closeDayGrid,
    closeDetail,
  } = useCalendarPostSelection();
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
    setShowAgenda(true);
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

  function handleCloseDetail() {
    const restoreEvent = closeDetail();
    if (restoreEvent) setEventPostsModal(restoreEvent);
  }

  function applyDayClick(date: Date, dayEvents: ContentEvent[], dayPosts: ScheduledPost[]) {
    setSelectedDateKey(date.toDateString());
    const result = resolveCalendarDayClick(date, dayEvents, dayPosts);
    switch (result.action) {
      case "empty":
        setDayIntentDate(result.date);
        break;
      case "mixed":
        setDayMixed({
          date: result.date,
          events: result.events,
          posts: result.posts,
        });
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

  const eventQueuedPosts = useMemo(
    () =>
      eventPostsModal
        ? queuedPostsForEvent(scheduledPosts, eventPostsModal.id, resolveEventId)
        : [],
    [eventPostsModal, scheduledPosts, resolveEventId],
  );

  function handleDateClick(day: number, date: Date) {
    const dayEvents = eventsByDay.get(day) ?? [];
    const dayPosts = byDay.get(day) ?? [];
    applyDayClick(date, dayEvents, dayPosts);
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <PageHeader
          eyebrow={<WorkspaceEyebrow />}
          title="Calendar"
          actions={
            <>
              <button
                type="button"
                onClick={jumpToday}
                data-testid="today-btn"
                className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setShowAgenda((v) => !v)}
                data-testid="toggle-agenda-btn"
                className="overflow-hidden rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] transition-colors hover:bg-secondary"
              >
                <span
                  key={showAgenda ? "hide" : "show"}
                  className="inline-block animate-[fadeSwap_180ms_ease-out]"
                >
                  {showAgenda ? "Hide agenda" : "Show agenda"}
                </span>
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
          <div className="mb-6 flex gap-1 rounded-sm border border-border bg-surface p-1">
            <button
              type="button"
              data-testid="calendar-view-month"
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "calendar"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Month
            </button>
            <button
              type="button"
              data-testid="calendar-view-queue"
              onClick={() => setViewMode("queue")}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2 text-sm font-medium transition-colors",
                viewMode === "queue"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" />
              Queue
            </button>
          </div>

          {viewMode === "queue" ? (
            <CalendarQueueView
              posts={scheduledPosts}
              onSelectPost={(post) => openPosts([post], contentCardAnchorDate(post))}
            />
          ) : null}

          {deepLinkNotice ? (
            <p
              data-testid="calendar-deep-link-notice"
              className="mb-4 rounded-sm border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning"
            >
              {deepLinkNotice}
            </p>
          ) : null}
          {viewMode === "calendar" ? (
            <>
              {/* Month nav row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    data-testid="prev-month-btn"
                    aria-label="previous month"
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
                    aria-label="next month"
                    className="rounded-sm border border-border bg-surface p-1.5 text-foreground transition-colors hover:bg-secondary"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  {!monthHasPosts && (
                    <span className="ml-2 text-xs text-muted-foreground/60">
                      No posts this month
                    </span>
                  )}
                </div>
                <CalendarLegendBar
                  highlightUnassociated={highlightUnassociated}
                  onToggleHighlight={() => setHighlightUnassociated((v) => !v)}
                  unassociatedCount={unassociatedCount}
                />
              </div>

              {/* Month grid */}
              <div className="mt-4 overflow-x-auto">
                <div className="min-w-[48rem] overflow-hidden rounded-sm border border-border bg-border">
                  <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-px">
                    <div className="bg-surface py-2 text-center text-[0.6875rem] text-muted-foreground">
                      Wk
                    </div>
                    {CALENDAR_DOW.map((d) => (
                      <div
                        key={d}
                        className="bg-surface py-2 text-center text-[0.6875rem] font-medium text-muted-foreground"
                      >
                        {d}
                      </div>
                    ))}
                    {weeks.map((week) => (
                      <div
                        key={`week-${week.weekNumber}-${week.cells[0]!.key}`}
                        className="contents"
                      >
                        <div
                          data-testid={`cal-week-${week.weekNumber}`}
                          className="flex min-h-[168px] items-start justify-center bg-surface px-1 py-3"
                        >
                          <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
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
                              hoveredEventId={hoveredEventId}
                              resolveEventId={resolveEventId}
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
            </>
          ) : null}
        </div>
      </div>

      <AgendaSidebar
        open={showAgenda}
        onClose={() => setShowAgenda(false)}
        focusYear={focusYear}
        focusMonth={focusMonth}
        scheduledPosts={scheduledPosts}
        events={events}
        isAssociated={isAssociated}
        hoveredEventId={hoveredEventId}
        resolveEventId={resolveEventId}
        onEventHover={setHoveredEventId}
        onSelectEvent={openEventPosts}
        onOpenPosts={openPosts}
      />

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
            openEventPosts(event);
          }}
        />
      ) : null}

      {eventPostsModal ? (
        <EventQueuedPostsModal
          event={eventPostsModal}
          posts={eventQueuedPosts}
          onClose={() => setEventPostsModal(null)}
          onSelectPost={(post) => {
            setEventPostsModal(null);
            openDetailFromEvent(post, eventPostsModal);
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
    </div>
  );
}

// ─── Agenda sidebar ──────────────────────────────────────────────────────────

type AgendaPost = ScheduledPost;

function AgendaSidebar({
  open,
  onClose,
  focusYear,
  focusMonth,
  scheduledPosts,
  events,
  isAssociated,
  hoveredEventId,
  resolveEventId,
  onEventHover,
  onSelectEvent,
  onOpenPosts,
}: {
  open: boolean;
  onClose: () => void;
  focusYear: number;
  focusMonth: number;
  scheduledPosts: ScheduledPost[];
  events: ContentEvent[];
  isAssociated: (post: ScheduledPost) => boolean;
  hoveredEventId: string | null;
  resolveEventId: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onEventHover: (eventId: string | null) => void;
  onSelectEvent: (event: ContentEvent) => void;
  onOpenPosts: (posts: ScheduledPost[], date: Date) => void;
}) {
  // Bounded range: focus month ±6 months (13 months total). No infinite scroll.
  const RANGE_BACK = 6;
  const RANGE_FWD = 6;
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll-edge fade state — show top fade when not at top, bottom fade when not at bottom.
  const [fade, setFade] = useState({ top: false, bottom: true });

  // Group posts by year-month for fast lookup.
  const postsByMonth = useMemo(() => {
    const map = new Map<string, AgendaPost[]>();
    scheduledPosts.forEach((p) => {
      const dt = contentCardAnchorDate(p);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b)));
    return map;
  }, [scheduledPosts]);

  const eventsByMonth = useMemo(() => {
    const map = new Map<string, ContentEvent[]>();
    events.forEach((event) => {
      const dt = new Date(event.date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const arr = map.get(key) ?? [];
      arr.push(event);
      map.set(key, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => +new Date(a.date) - +new Date(b.date)));
    return map;
  }, [events]);

  const months = useMemo(() => {
    const out: { year: number; month: number; key: string; isFocus: boolean }[] = [];
    for (let off = -RANGE_BACK; off <= RANGE_FWD; off++) {
      const d = new Date(focusYear, focusMonth + off, 1);
      out.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        isFocus: off === 0,
      });
    }
    return out;
  }, [focusYear, focusMonth]);

  // Keep the focus month in view when navigating months.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const focus = root.querySelector<HTMLElement>("[data-focus='true']");
    if (focus) {
      focus.scrollIntoView({ block: "start" });
    }
  }, [focusYear, focusMonth]);

  // Track scroll position to drive top/bottom edge fades.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const onScroll = () => {
      const top = root.scrollTop > 4;
      const bottom = root.scrollTop + root.clientHeight < root.scrollHeight - 4;
      setFade((f) => (f.top === top && f.bottom === bottom ? f : { top, bottom }));
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    // ResizeObserver to refresh when content height changes (e.g., layout shifts)
    const ro = new ResizeObserver(onScroll);
    ro.observe(root);
    Array.from(root.children).forEach((c) => ro.observe(c as Element));
    return () => {
      root.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="close agenda"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-background/60 backdrop-blur-[1px] lg:hidden"
        />
      ) : null}
      <aside
        data-testid="agenda-sidebar"
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-40 flex h-full w-[min(360px,100vw)] shrink-0 flex-col overflow-hidden border-l border-border bg-surface transition-[transform,width,opacity] duration-300 ease-out lg:relative lg:z-0 lg:translate-x-0 ${
          open
            ? "translate-x-0 lg:w-[360px] lg:opacity-100"
            : "pointer-events-none translate-x-full lg:w-0 lg:opacity-0"
        }`}
      >
        <div className="flex h-full w-full flex-col lg:w-[360px]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Agenda
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-sm border border-dashed border-border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
                {RANGE_BACK + RANGE_FWD + 1} months
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm border border-border bg-background px-2 py-1 text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground lg:hidden"
              >
                Close
              </button>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
              {months.map((m) => {
                const monthPosts = postsByMonth.get(m.key) ?? [];
                const monthEvents = eventsByMonth.get(m.key) ?? [];
                return (
                  <MonthBlock
                    key={m.key}
                    year={m.year}
                    month={m.month}
                    posts={monthPosts}
                    events={monthEvents}
                    muted={!m.isFocus}
                    isFocus={m.isFocus}
                    isAssociated={isAssociated}
                    hoveredEventId={hoveredEventId}
                    resolveEventId={resolveEventId}
                    onEventHover={onEventHover}
                    onSelectEvent={onSelectEvent}
                    onOpenPosts={onOpenPosts}
                  />
                );
              })}
            </div>

            {/* Top edge fade */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-surface to-transparent transition-opacity duration-200 ${
                fade.top ? "opacity-100" : "opacity-0"
              }`}
            />
            {/* Bottom edge fade */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent transition-opacity duration-200 ${
                fade.bottom ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function MonthBlock({
  year,
  month,
  posts,
  events,
  muted,
  isFocus,
  isAssociated,
  hoveredEventId,
  resolveEventId,
  onEventHover,
  onSelectEvent,
  onOpenPosts,
}: {
  year: number;
  month: number;
  posts: AgendaPost[];
  events: ContentEvent[];
  muted: boolean;
  isFocus: boolean;
  isAssociated: (post: ScheduledPost) => boolean;
  hoveredEventId: string | null;
  resolveEventId: (post: Pick<ScheduledPost, "id" | "eventId">) => string | undefined;
  onEventHover: (eventId: string | null) => void;
  onSelectEvent: (event: ContentEvent) => void;
  onOpenPosts: (posts: ScheduledPost[], date: Date) => void;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const postsByDay = new Map<number, AgendaPost[]>();
  posts.forEach((p) => {
    const day = contentCardAnchorDate(p).getDate();
    const arr = postsByDay.get(day) ?? [];
    arr.push(p);
    postsByDay.set(day, arr);
  });

  const eventsByDay = new Map<number, ContentEvent[]>();
  events.forEach((event) => {
    const day = new Date(event.date).getDate();
    const arr = eventsByDay.get(day) ?? [];
    arr.push(event);
    eventsByDay.set(day, arr);
  });

  const days = Array.from(new Set([...postsByDay.keys(), ...eventsByDay.keys()])).sort(
    (a, b) => a - b,
  );

  const isEmpty = days.length === 0;
  const [expanded, setExpanded] = useState(isFocus || !isEmpty);
  const monthSummary = [
    posts.length > 0 ? `${posts.length} card${posts.length === 1 ? "" : "s"}` : null,
    events.length > 0 ? `${events.length} event${events.length === 1 ? "" : "s"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      data-focus={isFocus ? "true" : "false"}
      className={muted ? "opacity-40" : "opacity-100"}
    >
      <button
        type="button"
        onClick={() => isEmpty && setExpanded((v) => !v)}
        disabled={!isEmpty}
        className={`sticky top-0 z-10 flex w-full items-center justify-between border-b border-border bg-surface px-5 py-2 text-left ${
          isFocus ? "text-foreground" : "text-muted-foreground"
        } ${isEmpty ? "cursor-pointer hover:bg-secondary/30" : "cursor-default"}`}
      >
        <span className="display-mono text-xs uppercase tracking-[0.14em]">{monthLabel}</span>
        <span className="flex items-center gap-2 text-xs">
          {monthSummary ? (
            <span>{monthSummary}</span>
          ) : isEmpty ? (
            <span className="text-muted-foreground/70">No content</span>
          ) : null}
          {isEmpty ? (
            <span className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
              {expanded ? "Hide" : "Show"}
            </span>
          ) : null}
        </span>
      </button>

      {!expanded && isEmpty ? null : isEmpty ? (
        <div className="px-5 py-4 text-center text-xs text-muted-foreground/60">
          No posts or events this month
        </div>
      ) : (
        <div className="divide-y divide-border">
          {days.map((day) => {
            const dayPosts = [...(postsByDay.get(day) ?? [])].sort(
              (a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b),
            );
            const dayEvents = [...(eventsByDay.get(day) ?? [])].sort(
              (a, b) => +new Date(a.date) - +new Date(b.date),
            );
            const hasEvents = dayEvents.length > 0;

            return (
              <div key={day} className="flex gap-3 px-5 py-3">
                <div className="w-10 shrink-0 pt-0.5 text-center">
                  <div
                    className={`display-mono text-lg leading-none ${
                      hasEvents ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {day}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {dayEvents.map((event) => (
                    <AgendaEventRow
                      key={event.id}
                      event={event}
                      highlighted={hoveredEventId === event.id}
                      onHoverStart={() => onEventHover(event.id)}
                      onHoverEnd={() => onEventHover(null)}
                      onSelect={() => onSelectEvent(event)}
                    />
                  ))}
                  {dayPosts.length > 0 ? (
                    <DayPostCountChip
                      count={dayPosts.length}
                      dense
                      unassociatedCount={dayPosts.filter((post) => !isAssociated(post)).length}
                      eventHighlightCount={countPostsForEvent(
                        dayPosts,
                        hoveredEventId,
                        resolveEventId,
                      )}
                      onOpen={() => onOpenPosts(dayPosts, new Date(year, month, day))}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
