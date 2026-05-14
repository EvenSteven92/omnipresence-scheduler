import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Layers,
  Clock,
  X,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "New Post — TORCC OmniSocial" },
      { name: "description", content: "Compose, bulk-upload, and let AI auto-schedule posts at peak engagement windows per platform." },
    ],
  }),
  component: SchedulerPage,
});

const PLATFORMS = ["X / Twitter", "Facebook", "Instagram", "TikTok", "YouTube", "FB Story", "IG Story"] as const;
type PlatformName = (typeof PLATFORMS)[number];

const PLATFORM_META: Record<PlatformName, { short: string; Icon: LucideIcon }> = {
  "X / Twitter": { short: "X", Icon: Twitter },
  Facebook: { short: "FB", Icon: Facebook },
  Instagram: { short: "IG", Icon: Instagram },
  TikTok: { short: "TT", Icon: Music2 },
  YouTube: { short: "YT", Icon: Youtube },
  "FB Story": { short: "FBS", Icon: Facebook },
  "IG Story": { short: "IGS", Icon: Instagram },
};

const FORMATS = [
  { name: "Landscape", spec: "16:9 — YT, FB, X" },
  { name: "Portrait", spec: "9:16 — TT, Reels, Shorts" },
  { name: "Story", spec: "9:16 — FB & IG Stories" },
] as const;

const AI_TOOLS = ["Caption", "Short", "YT_Desc", "YT_Title", "Hashtags"] as const;

// Mock AI-detected peak windows per platform (24h)
const PEAK_WINDOWS: Record<PlatformName, string[]> = {
  "X / Twitter": ["08:15", "12:40", "18:05"],
  Facebook: ["09:00", "13:30", "20:00"],
  Instagram: ["11:00", "17:30", "21:15"],
  TikTok: ["07:45", "19:00", "22:30"],
  YouTube: ["15:00", "20:30"],
  "FB Story": ["10:00", "18:30"],
  "IG Story": ["09:30", "19:45"],
};

type BulkAsset = {
  id: string;
  name: string;
  size: string;
  format: string;
  platforms: PlatformName[];
  caption: string;
  hashtags: string;
  transcript: string;
  saved: boolean;
  selectedForAuto: boolean;
};

const SAMPLE_BULK: BulkAsset[] = [
  { id: "a1", name: "service_recap_w18.mp4", size: "84.2 MB", format: "Portrait", platforms: ["Instagram", "TikTok"], caption: "", hashtags: "", transcript: "", saved: false, selectedForAuto: true },
  { id: "a2", name: "worship_clip_03.mp4", size: "62.1 MB", format: "Portrait", platforms: ["Instagram"], caption: "", hashtags: "", transcript: "", saved: false, selectedForAuto: true },
  { id: "a3", name: "qa_segment_a.mp4", size: "120.8 MB", format: "Landscape", platforms: ["YouTube", "Facebook"], caption: "", hashtags: "", transcript: "", saved: false, selectedForAuto: true },
  { id: "a4", name: "quote_card_set.png", size: "4.4 MB", format: "Story", platforms: ["IG Story", "FB Story"], caption: "", hashtags: "", transcript: "", saved: false, selectedForAuto: false },
];

export function SchedulerPage() {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [activePlatforms, setActivePlatforms] = useState<PlatformName[]>(["Facebook", "Instagram"]);
  const [format, setFormat] = useState<string>("Landscape");
  const [aiTool, setAiTool] = useState<(typeof AI_TOOLS)[number]>("Caption");
  const [selectedDay, setSelectedDay] = useState(13);
  const [time, setTime] = useState("12:00");
  const [bulkAssets, setBulkAssets] = useState<BulkAsset[]>(SAMPLE_BULK);
  const [autoScheduling, setAutoScheduling] = useState(false);
  const [autoScheduled, setAutoScheduled] = useState(false);
  const [spread, setSpread] = useState<"7d" | "14d" | "30d">("14d");

  const togglePlatform = (p: PlatformName) =>
    setActivePlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const runAutoSchedule = () => {
    setAutoScheduling(true);
    setAutoScheduled(false);
    setTimeout(() => {
      setAutoScheduling(false);
      setAutoScheduled(true);
    }, 1400);
  };

  // Build May 2026 calendar (Mon-start). May 1, 2026 = Friday.
  const cells: { d: number; muted: boolean; key: string }[] = [];
  for (let i = 27; i <= 30; i++) cells.push({ d: i, muted: true, key: `p${i}` });
  for (let d = 1; d <= 31; d++) cells.push({ d, muted: false, key: `m${d}` });
  while (cells.length % 7 !== 0) {
    const n = cells.length - 34;
    cells.push({ d: n, muted: true, key: `n${n}` });
  }

  // Distribute bulk assets across days when auto-scheduled
  const autoMap = new Map<number, BulkAsset[]>();
  if (autoScheduled && mode === "bulk") {
    const span = spread === "7d" ? 7 : spread === "14d" ? 14 : 30;
    bulkAssets.forEach((a, i) => {
      const day = ((selectedDay - 1 + Math.floor((i / Math.max(bulkAssets.length, 1)) * span)) % 31) + 1;
      const arr = autoMap.get(day) ?? [];
      arr.push(a);
      autoMap.set(day, arr);
    });
  }

  return (
    <div className="pb-12">
      <PageHeader
        title="New Post"
        actions={
          <>
            <div className="flex gap-px overflow-hidden rounded-sm border border-border bg-border">
              <button
                onClick={() => setMode("single")}
                className={`px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] ${mode === "single" ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground"}`}
              >
                Single
              </button>
              <button
                onClick={() => setMode("bulk")}
                className={`flex items-center gap-1.5 px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] ${mode === "bulk" ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground"}`}
              >
                <Layers className="h-3 w-3" /> Bulk
              </button>
            </div>
            <span className="rounded-sm border border-border bg-surface px-2.5 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
              status: <span className="text-foreground">draft</span>
            </span>
            <button className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] hover:bg-secondary">
              Save_Draft
            </button>
            <button className="rounded-sm bg-primary px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90">
              {mode === "bulk" ? "Schedule_All" : "Schedule_Post"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-px bg-border">
        {/* LEFT — composer / bulk upload */}
        <div className="col-span-12 space-y-px bg-border lg:col-span-7 xl:col-span-8">
          {mode === "single" ? <SingleComposer
            activePlatforms={activePlatforms}
            togglePlatform={togglePlatform}
            format={format}
            setFormat={setFormat}
            aiTool={aiTool}
            setAiTool={setAiTool}
          /> : <BulkUploader assets={bulkAssets} setAssets={setBulkAssets} />}
        </div>

        {/* RIGHT — schedule + AI auto-populate */}
        <aside className="col-span-12 space-y-px bg-border lg:col-span-5 xl:col-span-4">
          <Block label="ai_auto_schedule" accent>
            <p className="text-xs leading-relaxed text-muted-foreground">
              AI scans recent engagement, audience timezone, and platform-specific peak windows to slot every asset into the calendar.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-px bg-border">
              {(["7d", "14d", "30d"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSpread(s)}
                  className={`py-2 text-[0.6rem] uppercase tracking-[0.14em] ${spread === s ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-secondary"}`}
                >
                  spread_{s}
                </button>
              ))}
            </div>

            <button
              onClick={runAutoSchedule}
              disabled={autoScheduling}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-3 py-2.5 text-[0.65rem] uppercase tracking-[0.14em] text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {autoScheduling ? "AI scanning peak windows…" : autoScheduled ? "Re-run auto_schedule" : "Auto_populate_calendar"}
            </button>

            {autoScheduled && (
              <div className="mt-3 border border-dashed border-accent/60 bg-background/40 p-2.5">
                <div className="label-mono mb-1.5 text-accent">scan_complete</div>
                <div className="text-[0.65rem] leading-relaxed text-muted-foreground">
                  Slotted <span className="text-foreground">{bulkAssets.length}</span> assets across <span className="text-foreground">{activePlatforms.length}</span> platforms over the next <span className="text-foreground">{spread}</span>.
                </div>
              </div>
            )}
          </Block>

          <Block label="peak_windows_(local)">
            <div className="space-y-1.5">
              {activePlatforms.length === 0 && (
                <div className="label-mono">select_platforms_to_view</div>
              )}
              {activePlatforms.map((p) => {
                const { Icon, short } = PLATFORM_META[p];
                return (
                  <div key={p} className="flex items-center justify-between gap-2 border-b border-border/40 py-1 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                        <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                      </span>
                      <span className="text-[0.65rem] uppercase tracking-[0.12em]">{short}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {PEAK_WINDOWS[p].map((t) => (
                        <span key={t} className="rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[0.6rem]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Block>

          <Block label="schedule_date_time">
            <div className="flex items-center justify-between">
              <span className="display-mono text-xs">May 2026</span>
              <div className="flex items-center gap-1">
                <button className="rounded-sm border border-border p-1 hover:bg-secondary"><ChevronLeft className="h-3 w-3" /></button>
                <button className="rounded-sm border border-border p-1 hover:bg-secondary"><ChevronRight className="h-3 w-3" /></button>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-7 gap-px border border-border bg-border">
              {["m","t","w","t","f","s","s"].map((d, i) => (
                <div key={i} className="bg-surface py-1 text-center label-mono text-[0.55rem]">{d}</div>
              ))}
              {cells.map((c, i) => {
                const auto = autoMap.get(c.d);
                const sel = !c.muted && selectedDay === c.d;
                return (
                  <button
                    key={i}
                    onClick={() => !c.muted && setSelectedDay(c.d)}
                    className={`relative aspect-square bg-surface p-1 text-left text-[0.6rem] ${c.muted ? "text-muted-foreground/40" : "text-foreground hover:bg-secondary"} ${sel ? "outline outline-1 outline-accent" : ""}`}
                  >
                    {c.d}
                    {auto && auto.length > 0 && (
                      <span className="absolute bottom-0.5 right-0.5 rounded-full bg-accent px-1 text-[0.5rem] font-bold text-accent-foreground">
                        {auto.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-sm border border-border bg-background px-2 py-1 text-xs focus:border-accent focus:outline-none"
              />
              <span className="label-mono">local_tz</span>
            </div>
          </Block>
        </aside>
      </div>
    </div>
  );
}

/* ---------- single composer (denser) ---------- */

function SingleComposer({
  activePlatforms,
  togglePlatform,
  format,
  setFormat,
  aiTool,
  setAiTool,
}: {
  activePlatforms: PlatformName[];
  togglePlatform: (p: PlatformName) => void;
  format: string;
  setFormat: (f: string) => void;
  aiTool: (typeof AI_TOOLS)[number];
  setAiTool: (t: (typeof AI_TOOLS)[number]) => void;
}) {
  return (
    <>
      <Block label="post_title">
        <input
          placeholder="e.g., Sunday Service Highlights"
          className="w-full rounded-sm border border-border bg-background px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </Block>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Block label="target_platforms">
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => {
              const active = activePlatforms.includes(p);
              const { Icon } = PLATFORM_META[p];
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em] transition-colors ${active ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-secondary"}`}
                >
                  <Icon className="h-3 w-3" strokeWidth={2} />
                  {p}
                </button>
              );
            })}
          </div>
        </Block>

        <Block label="format_spec">
          <div className="grid grid-cols-3 gap-px bg-border">
            {FORMATS.map((f) => {
              const active = format === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => setFormat(f.name)}
                  className={`px-2 py-2 text-left ${active ? "bg-foreground text-background" : "bg-surface hover:bg-secondary"}`}
                >
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]">{f.name}</div>
                  <div className={`mt-0.5 text-[0.55rem] ${active ? "text-background/70" : "text-muted-foreground"}`}>{f.spec}</div>
                </button>
              );
            })}
          </div>
        </Block>
      </div>

      <Block label="media_assets">
        <button className="flex w-full items-center justify-center gap-2 border border-dashed border-border bg-background/40 py-6 text-muted-foreground hover:text-foreground">
          <Upload className="h-4 w-4" strokeWidth={1.5} />
          <span className="label-mono">drop_or_upload</span>
        </button>
        <div className="mt-3 flex aspect-video items-center justify-center border border-dashed border-border bg-background/40 text-muted-foreground">
          <ImageIcon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </Block>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Block label="caption">
          <textarea rows={3} placeholder="Your social media caption…" className="w-full rounded-sm border border-border bg-background px-2.5 py-2 text-sm focus:border-accent focus:outline-none" />
        </Block>
        <Block label="hashtags">
          <textarea rows={3} placeholder="#church #faith #sermon…" className="w-full rounded-sm border border-border bg-background px-2.5 py-2 text-sm focus:border-accent focus:outline-none" />
        </Block>
      </div>

      <Block label="transcript + ai_generator">
        <textarea rows={3} placeholder="Paste sermon or content transcript…" className="w-full rounded-sm border border-dashed border-border bg-background px-2.5 py-2 text-sm focus:border-accent focus:outline-none" />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {AI_TOOLS.map((t) => (
            <button
              key={t}
              onClick={() => setAiTool(t)}
              className={`rounded-sm border px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em] ${aiTool === t ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-secondary"}`}
            >
              {t}
            </button>
          ))}
          <button className="ml-auto inline-flex items-center gap-1.5 rounded-sm bg-primary px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-primary-foreground">
            <Sparkles className="h-3 w-3" /> Generate
          </button>
        </div>
      </Block>

      <Block label="internal_notes">
        <textarea rows={2} placeholder="Notes for your team…" className="w-full rounded-sm border border-border bg-background px-2.5 py-2 text-sm focus:border-accent focus:outline-none" />
      </Block>
    </>
  );
}

/* ---------- bulk uploader ---------- */

function BulkUploader({
  assets,
  setAssets,
}: {
  assets: BulkAsset[];
  setAssets: (a: BulkAsset[]) => void;
}) {
  const remove = (id: string) => setAssets(assets.filter((a) => a.id !== id));
  return (
    <>
      <Block label="bulk_upload">
        <button className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-border bg-background/40 py-10 text-muted-foreground hover:text-foreground">
          <Upload className="h-6 w-6" strokeWidth={1.5} />
          <span className="label-mono">drop_folder_or_select_files</span>
          <span className="text-[0.6rem] text-muted-foreground">mp4, mov, png, jpg · up to 200 files</span>
        </button>
      </Block>

      <Block label={`asset_queue (${assets.length})`}>
        <div className="grid grid-cols-[2fr_auto_auto_auto] items-center gap-x-3 gap-y-1 text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">
          <span>file</span><span>format</span><span>size</span><span></span>
        </div>
        <div className="mt-1 divide-y divide-border/60">
          {assets.map((a) => (
            <div key={a.id} className="grid grid-cols-[2fr_auto_auto_auto] items-center gap-x-3 py-2 text-xs">
              <span className="truncate text-foreground">{a.name}</span>
              <span className="rounded-sm border border-border bg-background px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em]">{a.format}</span>
              <span className="font-mono text-[0.65rem] text-muted-foreground">{a.size}</span>
              <button onClick={() => remove(a.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {assets.length === 0 && (
            <div className="py-6 text-center label-mono">queue_empty</div>
          )}
        </div>
      </Block>

      <Block label="caption_template (applied_to_batch)">
        <textarea
          rows={2}
          defaultValue="{{title}} — {{hook}} · #ToreccSocial"
          className="w-full rounded-sm border border-border bg-background px-2.5 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="label-mono mt-1">tokens: title · hook · platform · date</div>
      </Block>
    </>
  );
}

/* ---------- shared block ---------- */

function Block({
  label,
  children,
  accent = false,
}: {
  label: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <section className={`bg-surface p-4 ${accent ? "border-l-2 border-accent" : ""}`}>
      <div className="label-mono mb-2.5">{label}</div>
      {children}
    </section>
  );
}
