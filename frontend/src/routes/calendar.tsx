import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  X as XIcon,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { scheduledPosts, type Platform } from "@/lib/mock-data";
import { PostCard, type DisplayPost } from "@/components/post/PostCard";
import { PlatformRow, type PlatformEntry } from "@/components/post/PlatformRow";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — TORCC OmniSocial" },
      { name: "description", content: "Month view of every scheduled post across all platforms." },
    ],
  }),
  component: CalendarPage,
});

const DOW = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// "Today" anchor for the demo — matches the mock data window
const TODAY = new Date(2026, 4, 13);
const INITIAL_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

function CalendarPage() {
  const [showAgenda, setShowAgenda] = useState(true);
  const [detailPost, setDetailPost] = useState<(typeof scheduledPosts)[number] | null>(null);
  const [viewMonth, setViewMonth] = useState<Date>(INITIAL_MONTH);
  const [selectedDay, setSelectedDay] = useState<number>(TODAY.getDate());

  function shiftMonth(delta: number) {
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }
  function jumpToday() {
    setViewMonth(INITIAL_MONTH);
    setSelectedDay(TODAY.getDate());
  }

  const focusYear = viewMonth.getFullYear();
  const focusMonth = viewMonth.getMonth();

  // Build month grid (Mon-start). Pads with prev/next month days so it's always 6 rows of 7.
  const cells = useMemo(() => {
    const arr: { d: number; muted: boolean; key: string; date: Date }[] = [];
    const first = new Date(focusYear, focusMonth, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(focusYear, focusMonth + 1, 0).getDate();
    const daysInPrev = new Date(focusYear, focusMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = daysInPrev - i;
      arr.push({ d, muted: true, key: `p${d}`, date: new Date(focusYear, focusMonth - 1, d) });
    }
    for (let d = 1; d <= daysInMonth; d++) arr.push({ d, muted: false, key: `m${d}`, date: new Date(focusYear, focusMonth, d) });
    let n = 1;
    while (arr.length % 7 !== 0) {
      arr.push({ d: n, muted: true, key: `n${n}`, date: new Date(focusYear, focusMonth + 1, n) });
      n++;
    }
    return arr;
  }, [focusYear, focusMonth]);

  const byDay = useMemo(() => {
    const map = new Map<number, typeof scheduledPosts>();
    scheduledPosts.forEach((p) => {
      const dt = new Date(p.date);
      if (dt.getFullYear() === focusYear && dt.getMonth() === focusMonth) {
        const arr = map.get(dt.getDate()) ?? [];
        arr.push(p);
        map.set(dt.getDate(), arr);
      }
    });
    return map;
  }, [focusYear, focusMonth]);

  const monthHasPosts = byDay.size > 0;
  const isCurrentMonth = focusYear === TODAY.getFullYear() && focusMonth === TODAY.getMonth();

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-20">
        <PageHeader
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
                  {showAgenda ? "Hide_Agenda" : "Show_Agenda"}
                </span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-3 w-3" /> New_Post
              </button>
            </>
          }
        />

        <div className="px-10 pt-8">
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
              <span className="display-mono px-1 text-sm uppercase tracking-[0.06em]">
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
                <span className="ml-2 label-mono text-muted-foreground/60">no_posts_this_month</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Legend swatch="bg-accent" label="today" />
              <Legend swatch="bg-foreground" label="scheduled" />
              <Legend swatch="bg-muted-foreground/30" label="outside_month" />
            </div>
          </div>

          {/* Month grid */}
          <div className="mt-4 overflow-hidden rounded-sm border border-border bg-border">
            <div className="grid grid-cols-7 gap-px">
              {DOW.map((d) => (
                <div key={d} className="bg-surface py-2 text-center label-mono">
                  {d}
                </div>
              ))}
              {cells.map((c) => {
                const posts = !c.muted ? byDay.get(c.d) : undefined;
                const isToday = isCurrentMonth && !c.muted && c.d === TODAY.getDate();
                const isSelected = !c.muted && c.d === selectedDay;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => !c.muted && setSelectedDay(c.d)}
                    data-testid={c.muted ? undefined : `cal-day-${c.d}`}
                    className={`group relative flex min-h-[120px] cursor-pointer flex-col gap-1.5 bg-surface p-2 text-left transition-colors ${
                      c.muted
                        ? "text-muted-foreground/40"
                        : isSelected
                          ? "ring-1 ring-inset ring-accent"
                          : "hover:bg-secondary/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 text-[0.65rem] font-mono ${
                          isToday
                            ? "bg-accent text-accent-foreground font-semibold"
                            : c.muted
                              ? "text-muted-foreground/40"
                              : "text-foreground"
                        }`}
                      >
                        {c.d}
                      </span>
                      {posts && posts.length > 0 && (
                        <span className="label-mono text-[0.5rem] text-muted-foreground/70">
                          {posts.length}_post{posts.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    {posts && (
                      <div className="mt-0.5 flex flex-col gap-1">
                        {posts.map((p) => {
                          const entries: PlatformEntry[] = p.platforms.slice(0, 5).map((pl) => ({
                            platform: pl,
                            state: "scheduled" as const,
                          }));
                          return (
                            <span
                              key={p.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailPost(p);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDetailPost(p);
                                }
                              }}
                              className="flex flex-col gap-1 rounded-sm border border-border bg-background/60 p-1.5 text-left transition-colors hover:border-accent"
                            >
                              <span className="line-clamp-2 text-[0.6rem] leading-tight text-foreground">
                                {p.title}
                              </span>
                              <PlatformRow entries={entries} size="sm" compact />
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AgendaSidebar
        open={showAgenda}
        focusYear={focusYear}
        focusMonth={focusMonth}
        onSelectPost={setDetailPost}
      />

      {detailPost && <PostDetailModal post={detailPost} onClose={() => setDetailPost(null)} />}
    </div>
  );
}

// ─── Small bits ─────────────────────────────────────────────────────────────

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

// ─── Post detail modal ──────────────────────────────────────────────────────

function PostDetailModal({
  post,
  onClose,
}: {
  post: (typeof scheduledPosts)[number];
  onClose: () => void;
}) {
  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const base = new Date(post.date);
  const entries: PlatformEntry[] = post.platforms.map((pl) => {
    const meta = PLATFORMS_BY_SHORT[pl];
    const peak = meta?.peakTimes[0] ?? base.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return { platform: pl, state: "scheduled" as const, at: peak };
  });

  return (
    <div
      onClick={onClose}
      data-testid="post-detail-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-sm border border-accent px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent">
                {post.status}
              </span>
              <div className="label-mono">
                {base.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
            <div className="mt-2 text-base text-foreground">{post.title}</div>
          </div>
          <button
            onClick={onClose}
            data-testid="post-detail-close"
            className="rounded-sm border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="close"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="flex aspect-video items-center justify-center border-b border-border bg-background/60">
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-6 w-6" strokeWidth={1.25} />
            <span className="label-mono text-[0.55rem]">no_media_preview</span>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <div className="label-mono mb-2">platforms · peak_optimised</div>
            <div className="space-y-1.5">
              {post.platforms.map((pl, idx) => {
                const meta = PLATFORMS_BY_SHORT[pl];
                const Icon = meta?.Icon ?? ImageIcon;
                const peak = meta?.peakTimes[idx % (meta?.peakTimes.length || 1)] ?? "—:—";
                return (
                  <div
                    key={pl}
                    className="flex items-center justify-between rounded-sm border border-border bg-background/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
                        <Icon className="h-3 w-3" strokeWidth={2} />
                      </span>
                      <div>
                        <div className="text-xs text-foreground">{meta?.full ?? pl}</div>
                        <div className="label-mono text-[0.55rem]">peak_window</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-accent">{peak}</div>
                      <div className="label-mono text-[0.55rem]">
                        {base.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <PlatformRow entries={entries} size="sm" compact />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-sm border border-border bg-surface px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
            >
              <ExternalLink className="h-3 w-3" />
              Open_in_calendar
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-sm bg-primary px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Pencil className="h-3 w-3" />
              Edit_Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agenda sidebar ──────────────────────────────────────────────────────────

type AgendaPost = (typeof scheduledPosts)[number];

function AgendaSidebar({
  open,
  focusYear,
  focusMonth,
  onSelectPost,
}: {
  open: boolean;
  focusYear: number;
  focusMonth: number;
  onSelectPost: (p: AgendaPost) => void;
}) {
  // Bounded range: focus month ±6 months (13 months total). No infinite scroll.
  const RANGE_BACK = 6;
  const RANGE_FWD = 6;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didInitialScroll = useRef(false);

  // Scroll-edge fade state — show top fade when not at top, bottom fade when not at bottom.
  const [fade, setFade] = useState({ top: false, bottom: true });

  // Group posts by year-month for fast lookup.
  const postsByMonth = useMemo(() => {
    const map = new Map<string, AgendaPost[]>();
    scheduledPosts.forEach((p) => {
      const dt = new Date(p.date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    });
    // sort each bucket chronologically
    map.forEach((arr) => arr.sort((a, b) => +new Date(a.date) - +new Date(b.date)));
    return map;
  }, []);

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

  // Scroll the focus month into view on first paint.
  useEffect(() => {
    if (didInitialScroll.current) return;
    const root = scrollRef.current;
    if (!root) return;
    const focus = root.querySelector<HTMLElement>("[data-focus='true']");
    if (focus) {
      focus.scrollIntoView({ block: "start" });
      didInitialScroll.current = true;
    }
  }, []);

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
    <aside
      data-testid="agenda-sidebar"
      aria-hidden={!open}
      className={`relative hidden h-full shrink-0 overflow-hidden border-l border-border bg-surface transition-[width,opacity] duration-300 ease-out lg:block ${
        open ? "w-[360px] opacity-100" : "pointer-events-none w-0 opacity-0"
      }`}
    >
      <div className="flex h-full w-[360px] flex-col">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="label-mono">agenda</div>
          <span className="rounded-sm border border-dashed border-border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
            {RANGE_BACK + RANGE_FWD + 1}_months
          </span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div ref={scrollRef} className="absolute inset-0 overflow-y-auto">
            {months.map((m) => {
              const monthPosts = postsByMonth.get(m.key) ?? [];
              return (
                <MonthBlock
                  key={m.key}
                  year={m.year}
                  month={m.month}
                  posts={monthPosts}
                  muted={!m.isFocus}
                  isFocus={m.isFocus}
                  onSelectPost={onSelectPost}
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
  );
}

function MonthBlock({
  year,
  month,
  posts,
  muted,
  isFocus,
  onSelectPost,
}: {
  year: number;
  month: number;
  posts: AgendaPost[];
  muted: boolean;
  isFocus: boolean;
  onSelectPost: (p: AgendaPost) => void;
}) {
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  // Group posts by day
  const byDay = new Map<number, AgendaPost[]>();
  posts.forEach((p) => {
    const day = new Date(p.date).getDate();
    const arr = byDay.get(day) ?? [];
    arr.push(p);
    byDay.set(day, arr);
  });
  const days = Array.from(byDay.keys()).sort((a, b) => a - b);

  return (
    <section
      data-focus={isFocus ? "true" : "false"}
      className={muted ? "opacity-40" : "opacity-100"}
    >
      <div
        className={`sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-2 ${
          isFocus ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        <span className="display-mono text-xs uppercase tracking-[0.14em]">{monthLabel}</span>
        <span className="label-mono">{posts.length}_posts</span>
      </div>

      {days.length === 0 ? (
        <div className="px-5 py-6 text-center label-mono text-muted-foreground/60">
          no_scheduled_posts
        </div>
      ) : (
        <div className="divide-y divide-border">
          {days.map((day) => (
            <div key={day} className="flex gap-3 px-5 py-3">
              <div className="w-10 shrink-0 text-center">
                <div className="display-mono text-lg leading-none">{day}</div>
                <div className="label-mono mt-1 text-[0.55rem]">
                  {new Date(year, month, day).toLocaleDateString(undefined, { weekday: "short" })}
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {byDay.get(day)!.map((p) => {
                  const display: DisplayPost = {
                    id: p.id,
                    title: p.title,
                    status: p.status,
                    when: new Date(p.date).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    }),
                    platforms: p.platforms.map((pl) => ({
                      platform: pl,
                      state: "scheduled" as const,
                    })),
                  };
                  return (
                    <PostCard
                      key={p.id}
                      post={display}
                      variant="compact"
                      onClick={() => onSelectPost(p)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// silence unused-import warning: Platform type kept for future shared usage
export type _PlatformAlias = Platform;
