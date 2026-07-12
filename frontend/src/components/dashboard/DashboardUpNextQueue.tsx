import { Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { ScheduledPost } from "@/lib/mock-data";
import { EmptyState } from "@/components/ui/EmptyState";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { useWorkspace } from "@/lib/workspace-context";
import { todayStart } from "@/lib/demo-clock";
import { openCardDestination } from "@/lib/card-navigation";
import {
  contentCardAnchorDate,
  getAgendaContentCards,
  groupAgendaByDay,
  type AgendaBand,
} from "@/lib/scheduled-post-display";
import { cn } from "@/lib/utils";

function bandLabel(band: AgendaBand): string {
  switch (band) {
    case "past":
      return "Past";
    case "now":
      return "Now";
    case "later":
      return "Later";
  }
}

function mergeAgendaPosts(
  scheduled: ScheduledPost[],
  published: {
    id: string;
    title: string;
    platforms: ScheduledPost["platforms"];
    date: string;
    platformTimes?: ScheduledPost["platformTimes"];
    eventId?: string;
    caption?: string;
    hashtags?: string;
  }[],
): ScheduledPost[] {
  const byId = new Map<string, ScheduledPost>();
  for (const p of published) {
    byId.set(p.id, {
      id: p.id,
      title: p.title,
      platforms: p.platforms,
      date: p.date,
      platformTimes: p.platformTimes,
      status: "published",
      eventId: p.eventId,
      caption: p.caption,
      hashtags: p.hashtags,
    });
  }
  for (const p of scheduled) {
    byId.set(p.id, p);
  }
  return getAgendaContentCards(Array.from(byId.values()));
}

export function DashboardUpNextQueue() {
  const navigate = useNavigate();
  const { workspace, workspaceId } = useWorkspace();
  const todayRef = useRef<HTMLElement | null>(null);

  const agenda = useMemo(
    () =>
      mergeAgendaPosts(
        workspace.scheduledPosts,
        workspace.publishedPosts ?? [],
      ),
    [workspace.scheduledPosts, workspace.publishedPosts],
  );

  const dayGroups = useMemo(
    () => groupAgendaByDay(agenda, todayStart()),
    [agenda],
  );

  useEffect(() => {
    // Scroll so today / first "now" group is in view (past above)
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
    }
  }, [dayGroups.length]);

  function openCard(cardId: string) {
    openCardDestination(workspaceId, cardId, navigate);
  }

  let lastBand: AgendaBand | null = null;

  return (
    <section data-testid="dashboard-up-next" className="min-w-0">
      {agenda.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing on the agenda yet"
          description="Scheduled and published posts appear here as a full timeline — scroll back for history."
          action={
            <Link to="/studio" className="btn-action-primary btn-action">
              Create a card
            </Link>
          }
          className="border border-line bg-card py-10"
        />
      ) : (
        <div className="space-y-7">
          {dayGroups.map((group) => {
            const showBandHeader = group.band !== lastBand;
            lastBand = group.band;
            const publishCount = group.posts.reduce(
              (sum, p) => sum + p.platforms.length,
              0,
            );
            const weekday = group.date.toLocaleDateString(undefined, {
              weekday: "long",
            });
            const dateLabel = group.date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });
            return (
              <section
                key={group.date.toISOString()}
                ref={group.isToday || (group.band === "now" && showBandHeader) ? todayRef : undefined}
                className={cn(group.band === "past" && "opacity-70")}
                data-agenda-band={group.band}
              >
                {showBandHeader ? (
                  <div
                    className={cn(
                      "mb-4 flex items-center gap-3 border-t-2 pt-4",
                      group.band === "past" && "border-line",
                      group.band === "now" && "border-foreground",
                      group.band === "later" && "border-line",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em]",
                        group.band === "now"
                          ? "bg-foreground text-white"
                          : "border border-line bg-paper-2 text-muted-foreground",
                      )}
                    >
                      {bandLabel(group.band)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {group.band === "past"
                        ? "Earlier posts"
                        : group.band === "now"
                          ? "Today through the next few days"
                          : "Further out"}
                    </span>
                  </div>
                ) : null}
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="font-display text-xl font-bold text-foreground">
                    {dateLabel}
                  </span>
                  <span className="font-mono text-[0.625rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {weekday}
                    {group.isToday ? " · Today" : ""}
                  </span>
                  <span className="h-px flex-1 bg-line" />
                  <span className="font-mono text-[0.625rem] font-semibold text-muted-foreground">
                    {group.posts.length} card
                    {group.posts.length === 1 ? "" : "s"} · {publishCount}{" "}
                    publish{publishCount === 1 ? "" : "es"}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {group.posts.map((post) => (
                    <StreamContentCard
                      key={post.id}
                      post={post}
                      testId={`up-next-${post.id}`}
                      onOpen={() => openCard(post.id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
