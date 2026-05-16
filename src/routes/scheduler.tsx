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
  Check,
  Save,
  FileVideo,
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

type Orientation = "landscape" | "portrait" | "square";

const PLATFORM_REQS: Record<PlatformName, Orientation[]> = {
  "X / Twitter": ["landscape", "square", "portrait"],
  Facebook: ["landscape", "square", "portrait"],
  Instagram: ["square", "portrait"],
  TikTok: ["portrait"],
  YouTube: ["landscape"],
  "FB Story": ["portrait"],
  "IG Story": ["portrait"],
};

const formatToOrientation = (f: string): Orientation =>
  f === "Landscape" ? "landscape" : f === "Square" ? "square" : "portrait";

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

  // Distribute selected bulk assets across days when auto-scheduled
  const autoSelected = bulkAssets.filter((a) => a.selectedForAuto);
  const autoMap = new Map<number, number[]>(); // day -> queue index numbers (1-based)
  if (autoScheduled && mode === "bulk") {
    const span = spread === "7d" ? 7 : spread === "14d" ? 14 : 30;
    autoSelected.forEach((_, i) => {
      const day = ((selectedDay - 1 + Math.floor((i / Math.max(autoSelected.length, 1)) * span)) % 31) + 1;
      const arr = autoMap.get(day) ?? [];
      arr.push(i + 1);
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
              {autoScheduling ? "AI scanning peak windows…" : autoScheduled ? "Re-run generate_schedule" : "Generate_posting_schedule"}
            </button>

            {autoScheduled && (
              <div className="mt-3 border border-dashed border-accent/60 bg-background/40 p-2.5">
                <div className="label-mono mb-1.5 text-accent">scan_complete</div>
                <div className="text-[0.65rem] leading-relaxed text-muted-foreground">
                  Slotted <span className="text-foreground">{autoSelected.length}</span> selected assets across their per-card platforms over the next <span className="text-foreground">{spread}</span>.
                </div>
              </div>
            )}

            {mode === "bulk" && autoSelected.length > 0 && (
              <div className="mt-3 border border-border bg-background/40 p-2.5">
                <div className="label-mono mb-2 flex items-center justify-between">
                  <span>auto_schedule_queue</span>
                  <span className="text-accent">{autoSelected.length}_posts</span>
                </div>
                <ol className="space-y-1.5">
                  {autoSelected.map((a, i) => (
                    <li key={a.id} className="flex items-center gap-2 text-[0.65rem]">
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground">
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-foreground">{a.name}</span>
                      <div className="flex gap-0.5">
                        {a.platforms.slice(0, 4).map((p) => {
                          const { Icon } = PLATFORM_META[p];
                          return (
                            <span key={p} className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background">
                              <Icon className="h-2 w-2" strokeWidth={2.5} />
                            </span>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
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
                      <div className="absolute inset-x-0.5 bottom-0.5 flex flex-wrap justify-end gap-0.5">
                        {auto.map((n) => (
                          <span key={n} className="rounded-full bg-accent px-1 text-[0.5rem] font-bold text-accent-foreground">
                            #{n}
                          </span>
                        ))}
                      </div>
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
  const update = (id: string, patch: Partial<BulkAsset>) =>
    setAssets(assets.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => setAssets(assets.filter((a) => a.id !== id));

  const selectedCount = assets.filter((a) => a.selectedForAuto).length;
  const savedCount = assets.filter((a) => a.saved).length;

  return (
    <>
      <Block label={`bulk_upload  ·  ${assets.length}_files  ·  ${savedCount}_saved  ·  ${selectedCount}_for_auto`}>
        <div className="flex items-stretch gap-px bg-border">
          <button className="flex flex-1 items-center justify-center gap-2 border border-dashed border-border bg-background/40 py-3 text-muted-foreground hover:text-foreground">
            <Upload className="h-4 w-4" strokeWidth={1.5} />
            <span className="label-mono">drop_or_select_files</span>
            <span className="text-[0.55rem] text-muted-foreground">mp4 · mov · png · jpg</span>
          </button>
          <button
            onClick={() => setAssets(assets.map((a) => ({ ...a, selectedForAuto: true })))}
            className="bg-surface px-3 text-[0.6rem] uppercase tracking-[0.12em] hover:bg-secondary"
          >
            select_all
          </button>
          <button
            onClick={() => setAssets(assets.map((a) => ({ ...a, selectedForAuto: false })))}
            className="bg-surface px-3 text-[0.6rem] uppercase tracking-[0.12em] hover:bg-secondary"
          >
            clear
          </button>
        </div>
      </Block>

      <section className="bg-surface p-3">
        {assets.length === 0 ? (
          <div className="py-10 text-center label-mono">queue_empty</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {assets.map((a) => (
              <AssetCard key={a.id} asset={a} onChange={(p) => update(a.id, p)} onRemove={() => remove(a.id)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* ---------- per-asset card ---------- */

function AssetCard({
  asset,
  onChange,
  onRemove,
}: {
  asset: BulkAsset;
  onChange: (patch: Partial<BulkAsset>) => void;
  onRemove: () => void;
}) {
  const togglePlatform = (p: PlatformName) => {
    const exists = asset.platforms.includes(p);
    onChange({ platforms: exists ? asset.platforms.filter((x) => x !== p) : [...asset.platforms, p] });
  };

  const aiFill = (tool: string) => {
    if (tool === "caption") onChange({ caption: `${asset.name.replace(/\.[^.]+$/, "")} — auto-caption draft.` });
    if (tool === "hashtags") onChange({ hashtags: "#church #faith #shorts #reels" });
    if (tool === "transcript") onChange({ transcript: "[ai-transcript placeholder for " + asset.name + "]" });
    if (tool === "desc") onChange({ caption: (asset.caption || "") + "\n\nFull description generated by AI." });
  };

  const orientation = formatToOrientation(asset.format);
  const incompatible = asset.platforms.filter((p) => !PLATFORM_REQS[p].includes(orientation));

  return (
    <article className={`relative flex flex-col border bg-background/40 ${asset.selectedForAuto ? "border-accent/70" : "border-border"}`}>
      {/* thumbnail strip */}
      <div className="relative flex aspect-[16/6] items-center justify-center border-b border-border bg-background/60 text-muted-foreground">
        <FileVideo className="h-6 w-6" strokeWidth={1.25} />
        <button
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 rounded-sm border border-border bg-surface p-1 text-muted-foreground hover:text-destructive"
          aria-label="remove"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="absolute left-1.5 top-1.5 flex gap-1">
          <span className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em]">
            {asset.format}
          </span>
          <span className="rounded-sm border border-accent/60 bg-surface px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-accent">
            auto · {orientation}
          </span>
        </div>
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-foreground">{asset.name}</span>
          <span className="font-mono text-[0.6rem] text-muted-foreground">{asset.size}</span>
        </div>

        {/* format spec */}
        <div>
          <div className="label-mono mb-1">format_spec</div>
          <div className="grid grid-cols-3 gap-px bg-border">
            {FORMATS.map((f) => {
              const active = asset.format === f.name;
              return (
                <button
                  key={f.name}
                  onClick={() => onChange({ format: f.name })}
                  className={`px-1.5 py-1 text-[0.55rem] uppercase tracking-[0.1em] ${active ? "bg-foreground text-background" : "bg-surface hover:bg-secondary"}`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* platforms */}
        <div>
          <div className="label-mono mb-1">target_platforms</div>
          <div className="flex flex-wrap gap-1">
            {PLATFORMS.map((p) => {
              const active = asset.platforms.includes(p);
              const { Icon, short } = PLATFORM_META[p];
              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-1 text-[0.55rem] uppercase tracking-[0.1em] ${active ? "border-foreground bg-foreground text-background" : "border-border bg-surface hover:bg-secondary"}`}
                  title={p}
                >
                  <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                  {short}
                </button>
              );
            })}
          </div>
          {incompatible.length > 0 && (
            <div className="mt-1.5 flex items-start gap-1.5 border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[0.6rem] text-destructive">
              <span className="font-bold">!</span>
              <span>
                ratio_warning: <span className="font-mono">{orientation}</span> doesn't fit{" "}
                <span className="font-mono">{incompatible.join(", ")}</span>. consider re-cropping.
              </span>
            </div>
          )}
        </div>

        {/* caption */}
        <div>
          <div className="label-mono mb-1 flex items-center justify-between">
            <span>caption</span>
            <div className="flex gap-1">
              <AiChip onClick={() => aiFill("caption")}>caption</AiChip>
              <AiChip onClick={() => aiFill("desc")}>yt_desc</AiChip>
            </div>
          </div>
          <textarea
            rows={2}
            value={asset.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="caption / description…"
            className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
          />
        </div>

        {/* hashtags */}
        <div>
          <div className="label-mono mb-1 flex items-center justify-between">
            <span>hashtags</span>
            <AiChip onClick={() => aiFill("hashtags")}>hashtags</AiChip>
          </div>
          <input
            value={asset.hashtags}
            onChange={(e) => onChange({ hashtags: e.target.value })}
            placeholder="#tag #tag"
            className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
          />
        </div>

        {/* transcript */}
        <div>
          <div className="label-mono mb-1 flex items-center justify-between">
            <span>transcript</span>
            <AiChip onClick={() => aiFill("transcript")}>generate</AiChip>
          </div>
          <textarea
            rows={2}
            value={asset.transcript}
            onChange={(e) => onChange({ transcript: e.target.value })}
            placeholder="auto-transcribe or paste…"
            className="w-full rounded-sm border border-dashed border-border bg-background px-2 py-1.5 text-xs focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* footer actions */}
      <div className="mt-auto flex items-stretch gap-px border-t border-border bg-border">
        <button
          onClick={() => onChange({ saved: !asset.saved })}
          className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[0.6rem] uppercase tracking-[0.12em] ${asset.saved ? "bg-foreground text-background" : "bg-surface hover:bg-secondary"}`}
        >
          {asset.saved ? <Check className="h-3 w-3" /> : <Save className="h-3 w-3" />}
          {asset.saved ? "saved" : "save_draft"}
        </button>
        <button
          onClick={() => onChange({ selectedForAuto: !asset.selectedForAuto })}
          className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 text-[0.6rem] uppercase tracking-[0.12em] ${asset.selectedForAuto ? "bg-accent text-accent-foreground" : "bg-surface hover:bg-secondary"}`}
        >
          <span className={`flex h-3 w-3 items-center justify-center border ${asset.selectedForAuto ? "border-accent-foreground bg-accent-foreground/20" : "border-border"}`}>
            {asset.selectedForAuto && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </span>
          ai_auto_schedule
        </button>
      </div>
    </article>
  );
}

function AiChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.1em] text-muted-foreground hover:bg-secondary hover:text-foreground"
    >
      <Sparkles className="h-2.5 w-2.5" />
      {children}
    </button>
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
