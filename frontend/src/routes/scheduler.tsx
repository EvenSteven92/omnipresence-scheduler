import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  Wand2,
  Save,
  Clock,
  Calendar as CalIcon,
  ChevronLeft,
  ChevronRight,
  X,
  FileVideo,
  Image as ImageIcon,
} from "lucide-react";
import { ComposerCard, type DraftPost } from "@/components/post/ComposerCard";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";

export const Route = createFileRoute("/scheduler")({
  head: () => ({
    meta: [
      { title: "New Post — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Bulk-upload, compose, and let AI auto-schedule posts at peak engagement windows per platform.",
      },
    ],
  }),
  component: SchedulerPage,
});

const SPREAD_OPTIONS = ["spread_7d", "spread_14d", "spread_30d"] as const;
type Spread = (typeof SPREAD_OPTIONS)[number];

// ────────────────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function detectFormat(filename: string): "landscape" | "portrait" | "story" {
  const lower = filename.toLowerCase();
  if (lower.includes("story") || lower.includes("ig_story") || lower.includes("fb_story")) return "story";
  if (lower.includes("reel") || lower.includes("short") || lower.includes("tiktok") || lower.includes("portrait")) return "portrait";
  return "landscape";
}

function detectMediaKind(filename: string): "image" | "video" {
  const lower = filename.toLowerCase();
  return /\.(mp4|mov|webm|m4v|avi|mkv)$/.test(lower) ? "video" : "image";
}

function defaultDraftFromFile(file: { name: string; sizeBytes: number }): DraftPost {
  const fmt = detectFormat(file.name);
  const mediaKind = detectMediaKind(file.name);
  // Default platform set based on format
  const platforms =
    fmt === "story"
      ? (["IG STORY", "FB STORY"] as const)
      : fmt === "portrait"
        ? (["IG", "TIKTOK", "YT"] as const)
        : (["YT", "FB", "X"] as const);
  return {
    id: uid(),
    filename: file.name,
    sizeMB: file.sizeBytes / (1024 * 1024),
    mediaKind,
    format: fmt,
    autoFormat: fmt,
    platforms: [...platforms],
    caption: "",
    hashtags: "",
    transcript: "",
  };
}

// ────────────────────────────────────────────────────────────────────────────

function SchedulerPage() {
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [spread, setSpread] = useState<Spread>("spread_14d");
  const [scheduleDate, setScheduleDate] = useState<Date>(() => new Date(2026, 4, 13));
  const [scheduleTime, setScheduleTime] = useState<string>("12:00");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const savedCount = useMemo(() => drafts.filter((d) => d.caption.trim() && d.platforms.length > 0).length, [drafts]);
  const autoCount = drafts.length - savedCount;

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).map((f) => ({ name: f.name, sizeBytes: f.size }));
    setDrafts((cur) => [...cur, ...arr.map(defaultDraftFromFile)]);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, []);

  function updateDraft(id: string, next: DraftPost) {
    setDrafts((cur) => cur.map((d) => (d.id === id ? next : d)));
  }
  function removeDraft(id: string) {
    setDrafts((cur) => cur.filter((d) => d.id !== id));
  }
  function clearAll() {
    setDrafts([]);
  }
  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    setDrafts((cur) => {
      const from = cur.findIndex((d) => d.id === fromId);
      const to = cur.findIndex((d) => d.id === toId);
      if (from === -1 || to === -1) return cur;
      const next = cur.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // Generate proposed schedule across the chosen spread (7/14/30 days),
  // slotting each draft into the next peak window of its primary platform.
  function generateSchedule() {
    if (drafts.length === 0) return;
    const days = spread === "spread_7d" ? 7 : spread === "spread_14d" ? 14 : 30;
    const start = new Date(scheduleDate);
    const next = drafts.map((d, idx) => {
      const dayOffset = Math.round((idx * days) / Math.max(drafts.length, 1));
      const slot = new Date(start);
      slot.setDate(slot.getDate() + dayOffset);
      // Pick first peak time of primary platform
      const primary = d.platforms[0];
      const meta = primary ? PLATFORMS_BY_SHORT[primary] : undefined;
      const peak = meta?.peakTimes[idx % (meta?.peakTimes.length ?? 1)] ?? scheduleTime;
      const [hh, mm] = peak.split(":").map((s) => parseInt(s, 10));
      slot.setHours(hh, mm, 0, 0);
      return { ...d, proposedDate: slot.toISOString() };
    });
    setDrafts(next);
  }

  function autoScheduleSingle(id: string) {
    setDrafts((cur) => {
      const d = cur.find((x) => x.id === id);
      if (!d) return cur;
      const primary = d.platforms[0];
      const meta = primary ? PLATFORMS_BY_SHORT[primary] : undefined;
      const peak = meta?.peakTimes[0] ?? scheduleTime;
      const slot = new Date(scheduleDate);
      const [hh, mm] = peak.split(":").map((s) => parseInt(s, 10));
      slot.setHours(hh, mm, 0, 0);
      return cur.map((x) => (x.id === id ? { ...x, proposedDate: slot.toISOString() } : x));
    });
  }
  function addDemoSet() {
    const demo: { name: string; sizeBytes: number }[] = [
      { name: "service_recap_w18.mp4", sizeBytes: 56 * 1024 * 1024 },
      { name: "worship_clip_03.mp4", sizeBytes: 41 * 1024 * 1024 },
      { name: "qa_segment_a.mp4", sizeBytes: 125 * 1024 * 1024 },
      { name: "quote_card_set.png", sizeBytes: 4.4 * 1024 * 1024 },
    ];
    setDrafts((cur) => [...cur, ...demo.map(defaultDraftFromFile)]);
  }

  const single = drafts.length === 1;
  const empty = drafts.length === 0;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main column */}
      <div className="flex-1 overflow-y-auto pb-20">
        <PageHeader
          title="New Post"
          actions={
            <>
              <span
                className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground"
                data-testid="status-pill"
              >
                Status: {savedCount > 0 ? "Mixed" : empty ? "Empty" : "Draft"}
              </span>
              <button
                type="button"
                data-testid="save-all-drafts-btn"
                disabled={empty}
                className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] hover:bg-secondary disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> Save_All_Drafts
              </button>
              <button
                type="button"
                data-testid="schedule-all-btn"
                disabled={empty}
                onClick={generateSchedule}
                className="flex items-center gap-2 rounded-sm bg-primary px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Wand2 className="h-3 w-3" /> Schedule_All
              </button>
            </>
          }
        />

        <div className="px-10 pt-8">
          {/* Breadcrumb */}
          <div className="label-mono mb-3">
            bulk_upload · {drafts.length}_files · {savedCount}_saved · {autoCount}_for_auto
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            data-testid="dropzone"
            className={`flex cursor-pointer items-center justify-between rounded-sm border border-dashed bg-surface px-5 py-4 transition-colors ${
              isDragging ? "border-accent bg-accent/5" : "border-border hover:bg-secondary/30"
            }`}
          >
            <div className="flex items-center gap-3 text-muted-foreground">
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              <span className="label-mono">drop_or_select_files</span>
              <span className="font-mono text-[0.6rem] uppercase tracking-wide">mp4 · mov · jpg · png</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  addDemoSet();
                }}
                data-testid="add-demo-set-btn"
                className="rounded-sm border border-border bg-background/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
              >
                Add_Demo_Set
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
                }}
                data-testid="clear-all-btn"
                disabled={empty}
                className="rounded-sm border border-border bg-background/60 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary disabled:opacity-50"
              >
                Clear
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* Cards grid */}
          {empty ? (
            <EmptyState onAddDemo={addDemoSet} />
          ) : (
            <div
              className={`mt-6 grid gap-6 ${
                single ? "grid-cols-1 max-w-3xl" : "grid-cols-1 xl:grid-cols-2"
              }`}
            >
              {drafts.map((d) => (
                <ComposerCard
                  key={d.id}
                  post={d}
                  onChange={(next) => updateDraft(d.id, next)}
                  onRemove={() => removeDraft(d.id)}
                  onSaveDraft={() => {/* placeholder — persistence not wired */}}
                  onAutoSchedule={() => autoScheduleSingle(d.id)}
                  expanded={single}
                  isDragging={draggingId === d.id}
                  dragHandlers={
                    single
                      ? undefined
                      : {
                          draggable: true,
                          onDragStart: (e) => {
                            setDraggingId(d.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", d.id);
                          },
                          onDragOver: (e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                          },
                          onDragEnd: () => setDraggingId(null),
                          onDrop: (e) => {
                            e.preventDefault();
                            const fromId = e.dataTransfer.getData("text/plain");
                            if (fromId) reorder(fromId, d.id);
                            setDraggingId(null);
                          },
                        }
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right rail */}
      <aside
        data-testid="schedule-rail"
        className="hidden h-screen w-[360px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface lg:flex"
      >
        <div className="border-b border-border px-5 py-4">
          <div className="label-mono mb-2">ai_auto_schedule</div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            AI scans recent engagement, audience timezone, and platform-specific peak windows to slot every asset into the calendar.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-0 overflow-hidden rounded-sm border border-border">
            {SPREAD_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpread(s)}
                data-testid={`spread-${s}`}
                className={`px-3 py-2 text-center text-[0.6rem] uppercase tracking-[0.14em] transition-colors ${
                  spread === s
                    ? "bg-foreground text-background"
                    : "bg-background/60 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={empty}
            onClick={generateSchedule}
            data-testid="generate-schedule-btn"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-3 py-3 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Wand2 className="h-3 w-3" /> Generate_Posting_Schedule
          </button>
        </div>

        {/* Queue */}
        <div className="border-b border-border px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="label-mono">auto_schedule_queue</span>
            <span className="font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground">
              {drafts.length}_posts
            </span>
          </div>
          {drafts.length === 0 ? (
            <div className="label-mono text-muted-foreground/60">queue_empty</div>
          ) : (
            <div className="space-y-1.5">
              {drafts.map((d) => (
                <div
                  key={d.id}
                  data-testid={`queue-row-${d.id}`}
                  className="flex items-center justify-between gap-2 rounded-sm border border-border bg-background/60 px-2.5 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[0.65rem] text-foreground">{d.filename}</div>
                    {d.proposedDate && (
                      <div className="label-mono mt-0.5 text-[0.5rem] text-accent">
                        {new Date(d.proposedDate).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {d.platforms.slice(0, 4).map((p, i) => {
                      const Icon = PLATFORMS_BY_SHORT[p]?.Icon;
                      return Icon ? (
                        <span
                          key={`${d.id}-${p}-${i}`}
                          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background"
                          title={p}
                        >
                          <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak windows */}
        <div className="border-b border-border px-5 py-4">
          <div className="label-mono mb-3">peak_windows_(local)</div>
          {(["FB", "IG"] as const).map((p) => {
            const meta = PLATFORMS_BY_SHORT[p];
            const Icon = meta.Icon;
            return (
              <div key={p} className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background">
                    <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                  </span>
                  <span className="text-xs text-foreground">{p}</span>
                </div>
                <div className="flex gap-1">
                  {meta.peakTimes.map((t) => (
                    <span
                      key={t}
                      className="rounded-sm border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[0.6rem] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar */}
        <div className="px-5 py-4">
          <div className="label-mono mb-3">schedule_date_time</div>
          <MiniMonth value={scheduleDate} onChange={setScheduleDate} />
          <div className="mt-3 flex items-center gap-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              data-testid="schedule-time-input"
              className="rounded-sm border border-border bg-background/60 px-2 py-1 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
            />
            <span className="label-mono">local_tz</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function EmptyState({ onAddDemo }: { onAddDemo: () => void }) {
  return (
    <div
      data-testid="scheduler-empty"
      className="mt-10 flex flex-col items-center justify-center gap-4 rounded-sm border border-dashed border-border bg-surface/40 px-6 py-16 text-center"
    >
      <div className="flex gap-2 text-muted-foreground">
        <ImageIcon className="h-6 w-6" strokeWidth={1.3} />
        <FileVideo className="h-6 w-6" strokeWidth={1.3} />
      </div>
      <div className="display-mono text-lg text-foreground">No assets yet</div>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        Drop one or many files above. Single post or 50, the editor scales — each asset becomes its own card, AI suggests captions &amp; hashtags, and the schedule rail slots them at peak windows.
      </p>
      <button
        type="button"
        onClick={onAddDemo}
        data-testid="empty-add-demo-btn"
        className="rounded-sm border border-border bg-background/60 px-4 py-2 text-[0.65rem] uppercase tracking-[0.14em] text-foreground hover:bg-secondary"
      >
        + Add_Demo_Set
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function MiniMonth({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const dow = ["m", "t", "w", "t", "f", "s", "s"];
  const cells: { d: number; muted: boolean; date: Date }[] = [];
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const daysInPrev = new Date(view.getFullYear(), view.getMonth(), 0).getDate();
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ d: daysInPrev - i, muted: true, date: new Date(view.getFullYear(), view.getMonth() - 1, daysInPrev - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ d, muted: false, date: new Date(view.getFullYear(), view.getMonth(), d) });
  while (cells.length % 7 !== 0) {
    const n = cells.length - daysInMonth - startDow + 1;
    cells.push({ d: n, muted: true, date: new Date(view.getFullYear(), view.getMonth() + 1, n) });
  }

  function shift(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }

  const isSel = (d: Date) =>
    d.getFullYear() === value.getFullYear() && d.getMonth() === value.getMonth() && d.getDate() === value.getDate();

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          aria-label="prev month"
          onClick={() => shift(-1)}
          className="rounded-sm border border-border p-1 hover:bg-secondary"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="display-mono text-xs">
          {view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          aria-label="next month"
          onClick={() => shift(1)}
          className="rounded-sm border border-border p-1 hover:bg-secondary"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground">
        {dow.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => !c.muted && onChange(c.date)}
            data-testid={c.muted ? undefined : `cal-day-${c.d}`}
            className={`aspect-square rounded-sm text-[0.6rem] transition-colors ${
              c.muted
                ? "text-muted-foreground/30"
                : isSel(c.date)
                  ? "border border-accent text-accent"
                  : "text-foreground hover:bg-secondary"
            }`}
          >
            {c.d}
          </button>
        ))}
      </div>
    </div>
  );
}
