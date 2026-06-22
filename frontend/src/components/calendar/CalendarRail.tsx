import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import { CalendarQueueView } from "@/components/calendar/CalendarQueueView";
import { AgendaEventRow } from "@/components/calendar/AgendaEventRow";
import { contentCardAnchorDate } from "@/lib/scheduled-post-display";
import { todayStart } from "@/lib/demo-clock";
import { getUpcomingContentCards, UPCOMING_WINDOW_DAYS } from "@/lib/scheduled-post-display";

export function CalendarRail({
  scheduledPosts,
  events,
  focusYear,
  focusMonth,
  onSelectPost,
  onSelectEvent,
  hoveredEventId,
  onHoverEvent,
}: {
  scheduledPosts: ScheduledPost[];
  events: ContentEvent[];
  focusYear: number;
  focusMonth: number;
  onSelectPost: (post: ScheduledPost) => void;
  onSelectEvent: (event: ContentEvent) => void;
  hoveredEventId?: string | null;
  onHoverEvent?: (eventId: string | null) => void;
}) {
  const [agendaOpen, setAgendaOpen] = useState(true);

  const upNext = useMemo(
    () => getUpcomingContentCards(scheduledPosts, todayStart(), UPCOMING_WINDOW_DAYS),
    [scheduledPosts],
  );

  const monthEvents = useMemo(() => {
    return events
      .filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === focusYear && d.getMonth() === focusMonth;
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [events, focusYear, focusMonth]);

  const monthPosts = useMemo(() => {
    return scheduledPosts
      .filter((p) => {
        const d = contentCardAnchorDate(p);
        return d.getFullYear() === focusYear && d.getMonth() === focusMonth;
      })
      .sort((a, b) => +contentCardAnchorDate(a) - +contentCardAnchorDate(b));
  }, [scheduledPosts, focusYear, focusMonth]);

  return (
    <aside data-testid="calendar-rail" className="page-grid-rail space-y-4">
      <section className="panel overflow-hidden">
        <header className="border-b border-border px-4 py-3">
          <h2 className="text-title text-sm">Up next</h2>
          <p className="mt-0.5 text-body-sm text-muted-foreground">Next {UPCOMING_WINDOW_DAYS} days</p>
        </header>
        <div className="max-h-64 overflow-y-auto p-3">
          <CalendarQueueView
            posts={upNext}
            onSelectPost={onSelectPost}
            compact
          />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <button
          type="button"
          onClick={() => setAgendaOpen((o) => !o)}
          className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left"
        >
          <div>
            <h2 className="text-title text-sm">Agenda</h2>
            <p className="mt-0.5 text-body-sm text-muted-foreground">
              {focusMonth + 1}/{focusYear}
            </p>
          </div>
          {agendaOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {agendaOpen ? (
          <div className="max-h-80 overflow-y-auto p-3 space-y-4">
            {monthEvents.length === 0 && monthPosts.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">Nothing this month</p>
            ) : (
              <>
                {monthEvents.map((event) => (
                  <AgendaEventRow
                    key={event.id}
                    event={event}
                    onSelect={() => onSelectEvent(event)}
                    highlighted={hoveredEventId === event.id}
                    onHoverStart={() => onHoverEvent?.(event.id)}
                    onHoverEnd={() => onHoverEvent?.(null)}
                  />
                ))}
                {monthPosts.slice(0, 8).map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => onSelectPost(post)}
                    className="block w-full truncate rounded-sm border border-border px-3 py-2 text-left text-body-sm text-foreground hover:bg-secondary/30"
                  >
                    {post.title}
                  </button>
                ))}
              </>
            )}
          </div>
        ) : null}
      </section>
    </aside>
  );
}