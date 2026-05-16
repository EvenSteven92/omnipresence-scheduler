import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useMemo, useState } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  Clock,
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

type ComposerPlatform =
  | "X / Twitter"
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "YouTube"
  | "FB Story"
  | "IG Story";

const PLATFORMS: ComposerPlatform[] = [
  "X / Twitter",
  "Facebook",
  "Instagram",
  "TikTok",
  "YouTube",
  "FB Story",
  "IG Story",
];

const PLATFORM_META: Record<ComposerPlatform, { short: string; Icon: LucideIcon }> = {
  "X / Twitter": { short: "X", Icon: Twitter },
  Facebook: { short: "FB", Icon: Facebook },
  Instagram: { short: "IG", Icon: Instagram },
  TikTok: { short: "TT", Icon: Music2 },
  YouTube: { short: "YT", Icon: Youtube },
  "FB Story": { short: "FBS", Icon: Facebook },
  "IG Story": { short: "IGS", Icon: Instagram },
};

const PLATFORM_META_BY_SHORT: Record<string, { Icon: LucideIcon; full: string; peakTimes: string[] }> = {
  X: { Icon: Twitter, full: "X / Twitter", peakTimes: ["08:15", "12:40", "18:05"] },
  FB: { Icon: Facebook, full: "Facebook", peakTimes: ["09:00", "13:30", "20:00"] },
  IG: { Icon: Instagram, full: "Instagram", peakTimes: ["11:00", "17:30", "21:15"] },
  YT: { Icon: Youtube, full: "YouTube", peakTimes: ["15:00", "20:30"] },
  TIKTOK: { Icon: Music2, full: "TikTok", peakTimes: ["07:45", "19:00", "22:30"] },
  "IG STORY": { Icon: Instagram, full: "Instagram Story", peakTimes: ["09:30", "19:45"] },
  "FB STORY": { Icon: Facebook, full: "Facebook Story", peakTimes: ["10:00", "18:30"] },
};

const FORMATS = [
  { name: "Landscape", spec: "16:9 — YouTube, Facebook, X", Icon: ImageIcon },
  { name: "Portrait", spec: "9:16 — TikTok, Reels, Shorts", Icon: ImageIcon },
  { name: "Story", spec: "9:16 — FB & IG Stories", Icon: ImageIcon },
] as const;

const AI_TOOLS = ["CAPTION", "SHORT", "YT_DESC", "YT_TITLE", "HASHTAGS"] as const;

function CalendarPage() {
  const [showEdit, setShowEdit] = useState(true);
  const [detailPost, setDetailPost] = useState<(typeof scheduledPosts)[number] | null>(null);

  // Composer (draft) state — drives the draft card on the calendar
  const [selectedDay, setSelectedDay] = useState<number>(14);
  const [title, setTitle] = useState("Sunday Service Highlights - Week 18");
  const [platforms, setPlatforms] = useState<ComposerPlatform[]>(["Facebook", "Instagram"]);
  const [format, setFormat] = useState<(typeof FORMATS)[number]["name"]>("Landscape");
  const [time, setTime] = useState("12:00");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [aiTool, setAiTool] = useState<(typeof AI_TOOLS)[number]>("CAPTION");

  const togglePlatform = (p: ComposerPlatform) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

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
      if (dt.getFullYear() === 2026 && dt.getMonth() === 4) {
        const arr = map.get(dt.getDate()) ?? [];
        arr.push(p);
        map.set(dt.getDate(), arr);
      }
    });
    return map;
  }, []);

  const draftHasContent =
    showEdit && (title.trim() || caption.trim() || platforms.length > 0);

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
                onClick={() => setShowEdit((v) => !v)}
                className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] hover:bg-secondary"
              >
                {showEdit ? "Hide" : "Show"}
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
              const hasDraft = !c.muted && draftHasContent && c.d === selectedDay;
              return (
                <div
                  key={c.key}
                  onClick={() => !c.muted && setSelectedDay(c.d)}
                  className={`relative flex min-h-[120px] cursor-pointer flex-col gap-1.5 bg-surface p-2 text-left transition-colors ${
                    c.muted ? "text-muted-foreground/40" : "text-foreground hover:bg-secondary/40"
                  } ${isSelected ? "outline outline-1 outline-accent" : ""}`}
                >
                  <div className="text-xs">{c.d}</div>

                  {hasDraft && <DraftCard title={title} platforms={platforms} time={time} />}

                  {posts && !hasDraft && (
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
            (view) scheduled (solid) · draft (dashed)
          </div>
        </div>
      </div>

      {showEdit && (
        <aside className="hidden w-[360px] shrink-0 overflow-y-auto border-l border-border bg-surface lg:block">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="label-mono">edit_post</div>
            <span className="rounded-sm border border-dashed border-border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
              draft → may {selectedDay}
            </span>
          </div>

          <div className="space-y-4 p-5">
            <Section label="post_title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Sunday Service Highlights"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </Section>

            <Section label="target_platforms">
              <div className="grid grid-cols-4 gap-px bg-border">
                {PLATFORMS.map((p) => {
                  const active = platforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-2 py-3 text-[0.6rem] uppercase tracking-[0.1em] transition-colors ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-surface text-foreground hover:bg-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <div className="bg-surface" />
              </div>
            </Section>

            <Section label="format_spec">
              <div className="grid grid-cols-3 gap-px bg-border">
                {FORMATS.map((f) => {
                  const active = format === f.name;
                  const Icon = f.Icon;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setFormat(f.name)}
                      className={`flex flex-col items-center gap-1.5 px-2 py-3 text-center transition-colors ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-surface text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]">
                        {f.name}
                      </span>
                      <span
                        className={`text-[0.55rem] leading-tight ${active ? "text-background/70" : "text-muted-foreground"}`}
                      >
                        {f.spec}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section label="schedule_time">
              <div className="flex items-center gap-3">
                <span className="label-mono">time:</span>
                <div className="flex items-center gap-2 rounded-sm border border-border bg-background px-3 py-2">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="bg-transparent text-sm focus:outline-none"
                  />
                  <Clock className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            </Section>

            <Section label="caption">
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Your social media caption…"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <div className="label-mono mt-1">{caption.length}_chars</div>
            </Section>

            <Section label="hashtags">
              <textarea
                rows={2}
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="#church #faith #sermon…"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-xs focus:border-accent focus:outline-none"
              />
            </Section>

            <Section label="transcript + ai">
              <textarea
                rows={3}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste transcript here…"
                className="w-full rounded-sm border border-dashed border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-px bg-border">
                {AI_TOOLS.map((t) => {
                  const active = aiTool === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setAiTool(t)}
                      className={`px-2.5 py-1.5 text-[0.6rem] uppercase tracking-[0.12em] ${
                        active
                          ? "bg-foreground text-background"
                          : "bg-surface text-foreground hover:bg-secondary"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <button className="mt-3 inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground">
                <Sparkles className="h-3 w-3" /> Generate
              </button>
            </Section>

            <Section label="internal_notes">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for your team…"
                className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </Section>
          </div>
        </aside>
      )}
    </div>
  );
}

function DraftCard({
  title,
  platforms,
  time,
}: {
  title: string;
  platforms: ComposerPlatform[];
  time: string;
}) {
  return (
    <div className="mt-1 flex flex-1 flex-col overflow-hidden rounded-sm border border-dashed border-accent bg-background/60">
      <div className="flex aspect-video items-center justify-center border-b border-dashed border-border bg-surface-elevated">
        <ImageIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex-1 px-1.5 py-1">
        <div className="line-clamp-2 text-[0.6rem] leading-tight text-foreground">
          {title || "untitled_draft"}
        </div>
        <div className="label-mono mt-0.5 text-[0.5rem] normal-case">{time}</div>
      </div>
      <div className="flex items-center gap-1 border-t border-border bg-background/60 px-1.5 py-1">
        {platforms.length === 0 ? (
          <span className="label-mono text-[0.5rem]">no_targets</span>
        ) : (
          platforms.map((p) => {
            const { Icon, short } = PLATFORM_META[p];
            return (
              <span
                key={p}
                title={p}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
              >
                <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                <span className="sr-only">{short}</span>
              </span>
            );
          })
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="label-mono mb-2">{label}</div>
      {children}
    </div>
  );
}

// silence unused-import warning: Platform type kept for future shared usage
export type _PlatformAlias = Platform;
