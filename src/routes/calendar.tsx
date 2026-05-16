import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { scheduledPosts, type Platform } from "@/lib/mock-data";

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

const PLATFORM_META_BY_SHORT: Record<string, { Icon: LucideIcon; full: string; peakTimes: string[] }> = {
  X: { Icon: Twitter, full: "X / Twitter", peakTimes: ["08:15", "12:40", "18:05"] },
  FB: { Icon: Facebook, full: "Facebook", peakTimes: ["09:00", "13:30", "20:00"] },
  IG: { Icon: Instagram, full: "Instagram", peakTimes: ["11:00", "17:30", "21:15"] },
  YT: { Icon: Youtube, full: "YouTube", peakTimes: ["15:00", "20:30"] },
  TIKTOK: { Icon: Music2, full: "TikTok", peakTimes: ["07:45", "19:00", "22:30"] },
  "IG STORY": { Icon: Instagram, full: "Instagram Story", peakTimes: ["09:30", "19:45"] },
  "FB STORY": { Icon: Facebook, full: "Facebook Story", peakTimes: ["10:00", "18:30"] },
};

// Current focus month for the grid (May 2026, matches the mock data).
const FOCUS_YEAR = 2026;
const FOCUS_MONTH = 4; // 0-indexed (May)

function CalendarPage() {
  const [showAgenda, setShowAgenda] = useState(true);
  const [detailPost, setDetailPost] = useState<(typeof scheduledPosts)[number] | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(14);

  // Build May 2026 grid (Mon-start). May 1, 2026 = Friday.
  const cells = useMemo(() => {
    const arr: { d: number; muted: boolean; key: string }[] = [];
    for (let i = 27; i <= 30; i++) arr.push({ d: i, muted: true, key: `p${i}` });
    for (let d = 1; d <= 31; d++) arr.push({ d, muted: false, key: `m${d}` });
    while (arr.length % 7 !== 0) {
      const n = arr.length - 34;
      arr.push({ d: n, muted: true, key: `n${n}` });
    }
    return arr;
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<number, typeof scheduledPosts>();
    scheduledPosts.forEach((p) => {
      const dt = new Date(p.date);
      if (dt.getFullYear() === FOCUS_YEAR && dt.getMonth() === FOCUS_MONTH) {
        const arr = map.get(dt.getDate()) ?? [];
        arr.push(p);
        map.set(dt.getDate(), arr);
      }
    });
    return map;
  }, []);

  return (
    <div className="flex">
      <div className="flex-1 pb-20">
        <PageHeader
          title="Calendar"
          actions={
            <>
              <button className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground">
                <Plus className="h-3 w-3" /> New_Post
              </button>
              <button
                onClick={() => setShowAgenda((v) => !v)}
                className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] hover:bg-secondary"
              >
                {showAgenda ? "Hide_Agenda" : "Show_Agenda"}
              </button>
            </>
          }
        />

        <div className="px-10 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="rounded-sm border border-border p-1.5 hover:bg-secondary">
                <ChevronLeft className="h-3 w-3" />
              </button>
              <span className="display-mono text-sm">May 2026</span>
              <button className="rounded-sm border border-border p-1.5 hover:bg-secondary">
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
            <div className="label-mono">month ⌄</div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-px border border-border bg-border">
            {DOW.map((d) => (
              <div key={d} className="bg-surface py-2 text-center label-mono">
                {d}
              </div>
            ))}
            {cells.map((c) => {
              const posts = !c.muted ? byDay.get(c.d) : undefined;
              const isSelected = !c.muted && c.d === selectedDay;
              return (
                <div
                  key={c.key}
                  onClick={() => !c.muted && setSelectedDay(c.d)}
                  className={`relative flex min-h-[120px] cursor-pointer flex-col gap-1.5 bg-surface p-2 text-left transition-colors ${
                    c.muted ? "text-muted-foreground/40" : "text-foreground hover:bg-secondary/40"
                  } ${isSelected ? "outline outline-1 outline-accent" : ""}`}
                >
                  <div className="text-xs">{c.d}</div>

                  {posts && (
                    <div className="mt-1 flex flex-col gap-1">
                      {posts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailPost(p);
                          }}
                          className="group flex flex-col gap-1 rounded-sm border border-border bg-background/60 p-1.5 text-left hover:border-accent"
                        >
                          <div className="line-clamp-2 text-[0.6rem] leading-tight">{p.title}</div>
                          <div className="flex flex-wrap gap-0.5">
                            {p.platforms.slice(0, 5).map((pl, i) => {
                              const meta = PLATFORM_META_BY_SHORT[pl];
                              const Icon = meta?.Icon ?? ImageIcon;
                              return (
                                <span
                                  key={`${p.id}-${i}`}
                                  title={pl}
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
                                >
                                  <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                                </span>
                              );
                            })}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="label-mono mt-3 text-right">
            (view) scheduled (solid) · current_month (highlighted in agenda)
          </div>
        </div>
      </div>

      {showAgenda && (
        <AgendaSidebar
          focusYear={FOCUS_YEAR}
          focusMonth={FOCUS_MONTH}
          onSelectPost={setDetailPost}
        />
      )}

      {detailPost && (
        <div
          onClick={() => setDetailPost(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <div className="label-mono mb-1">scheduled_post</div>
                <div className="display-mono text-base text-foreground">{detailPost.title}</div>
                <div className="label-mono mt-1">
                  {new Date(detailPost.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
              <button
                onClick={() => setDetailPost(null)}
                className="rounded-sm border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
                aria-label="close"
              >
                <span className="block h-3 w-3 text-center text-xs leading-3">×</span>
              </button>
            </div>

            <div className="flex aspect-video items-center justify-center border-b border-border bg-background/60">
              <ImageIcon className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
            </div>

            <div className="space-y-3 p-5">
              <div className="label-mono">platforms · scheduled_times</div>
              <div className="space-y-1.5">
                {detailPost.platforms.map((pl) => {
                  const meta = PLATFORM_META_BY_SHORT[pl];
                  const Icon = meta?.Icon ?? ImageIcon;
                  const base = new Date(detailPost.date);
                  const idx = detailPost.platforms.indexOf(pl);
                  const peak = meta?.peakTimes[idx % (meta?.peakTimes.length || 1)] ?? "—:—";
                  return (
                    <div
                      key={pl}
                      className="flex items-center justify-between border border-border bg-background/40 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background">
                          <Icon className="h-3 w-3" strokeWidth={2} />
                        </span>
                        <div>
                          <div className="text-xs text-foreground">{meta?.full ?? pl}</div>
                          <div className="label-mono text-[0.55rem]">peak_optimised</div>
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

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setDetailPost(null)}
                  className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] hover:bg-secondary"
                >
                  Close
                </button>
                <button className="rounded-sm bg-primary px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground">
                  Edit_Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agenda sidebar ──────────────────────────────────────────────────────────

type AgendaPost = (typeof scheduledPosts)[number];

function AgendaSidebar({
  focusYear,
  focusMonth,
  onSelectPost,
}: {
  focusYear: number;
  focusMonth: number;
  onSelectPost: (p: AgendaPost) => void;
}) {
  // Window of months relative to focus month, expands as user scrolls.
  const [range, setRange] = useState({ start: -2, end: 2 });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topSentinel = useRef<HTMLDivElement | null>(null);
  const bottomSentinel = useRef<HTMLDivElement | null>(null);
  const didInitialScroll = useRef(false);

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
    for (let off = range.start; off <= range.end; off++) {
      const d = new Date(focusYear, focusMonth + off, 1);
      out.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        key: `${d.getFullYear()}-${d.getMonth()}`,
        isFocus: off === 0,
      });
    }
    return out;
  }, [range, focusYear, focusMonth]);

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

  // Infinite scroll: extend range when sentinels enter view.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (e.target === topSentinel.current) {
            // preserve scroll position when prepending
            const prevHeight = root.scrollHeight;
            const prevTop = root.scrollTop;
            setRange((r) => ({ ...r, start: r.start - 2 }));
            requestAnimationFrame(() => {
              root.scrollTop = prevTop + (root.scrollHeight - prevHeight);
            });
          } else if (e.target === bottomSentinel.current) {
            setRange((r) => ({ ...r, end: r.end + 2 }));
          }
        }
      },
      { root, rootMargin: "200px" },
    );
    if (topSentinel.current) obs.observe(topSentinel.current);
    if (bottomSentinel.current) obs.observe(bottomSentinel.current);
    return () => obs.disconnect();
  }, [range]);

  return (
    <aside className="hidden w-[360px] shrink-0 flex-col border-l border-border bg-surface lg:flex">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="label-mono">agenda</div>
        <span className="rounded-sm border border-dashed border-border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
          scroll ↕ months
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div ref={topSentinel} className="h-1" />
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
        <div ref={bottomSentinel} className="h-1" />
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
                {byDay.get(day)!.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPost(p)}
                    className="block w-full rounded-sm border border-border bg-background/60 p-2 text-left hover:border-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="line-clamp-2 text-[0.7rem] leading-tight text-foreground">
                        {p.title}
                      </div>
                      <div className="font-mono text-[0.6rem] text-accent shrink-0">
                        {new Date(p.date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-0.5">
                      {p.platforms.map((pl, i) => {
                        const meta = PLATFORM_META_BY_SHORT[pl];
                        const Icon = meta?.Icon ?? ImageIcon;
                        return (
                          <span
                            key={`${p.id}-${i}`}
                            title={pl}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
                          >
                            <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                          </span>
                        );
                      })}
                    </div>
                  </button>
                ))}
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
