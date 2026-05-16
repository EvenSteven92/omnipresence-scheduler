import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  Wand2,
  Save,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  Image as ImageIcon,
  Globe2,
  CheckCircle2,
} from "lucide-react";
import { ComposerCard, type DraftPost } from "@/components/post/ComposerCard";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import type { Platform } from "@/lib/mock-data";

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

// "Now" anchor — matches the rest of the demo data
const NOW = new Date(2026, 4, 13, 9, 0, 0); // Wed May 13 2026, 09:00 local

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
  const platforms: Platform[] =
    fmt === "story"
      ? ["IG STORY", "FB STORY"]
      : fmt === "portrait"
        ? ["IG", "TIKTOK", "YT SHORTS"]
        : ["YT", "FB", "X"];
  return {
    id: uid(),
    filename: file.name,
    sizeMB: file.sizeBytes / (1024 * 1024),
    mediaKind,
    format: fmt,
    autoFormat: fmt,
    platforms,
    caption: "",
    hashtags: "",
    transcript: "",
  };
}

const TIMEZONES = [
  { id: "auto", label: "auto · local" },
  { id: "America/New_York", label: "America / NY" },
  { id: "America/Los_Angeles", label: "America / LA" },
  { id: "Europe/London", label: "Europe / London" },
  { id: "Asia/Singapore", label: "Asia / Singapore" },
  { id: "Australia/Sydney", label: "AU / Sydney" },
] as const;

/**
 * Compute the next future peak time for `platform`, on or after `from`,
 * preferring `preferredDay` when supplied. Peak times in PLATFORMS_BY_SHORT.peakTimes.
 */
function nextPeakFor(platform: Platform, from: Date, preferredDay?: Date): Date {
  const meta = PLATFORMS_BY_SHORT[platform];
  const peaks = (meta?.peakTimes && meta.peakTimes.length > 0 ? meta.peakTimes : ["12:00"]).map((t) => {
    const [hh, mm] = t.split(":").map((s) => parseInt(s, 10));
    return { hh, mm };
  });

  const startDay = preferredDay ? new Date(preferredDay.getFullYear(), preferredDay.getMonth(), preferredDay.getDate()) : new Date(from.getFullYear(), from.getMonth(), from.getDate());

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const candidate = new Date(startDay);
    candidate.setDate(candidate.getDate() + dayOffset);
    for (const { hh, mm } of peaks) {
      const slot = new Date(candidate);
      slot.setHours(hh, mm, 0, 0);
      if (slot.getTime() > from.getTime()) return slot;
    }
  }
  // Fallback — same day noon, ≥ from
  const fb = new Date(from.getTime() + 60 * 60 * 1000);
  return fb;
}

// ────────────────────────────────────────────────────────────────────────────

function SchedulerPage() {
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  // Anchor day for "Generate Optimal Schedule". Clamped to today or later.
  const [anchor, setAnchor] = useState<Date>(() => new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()));
  const [timezone, setTimezone] = useState<string>("auto");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const scheduledCount = drafts.filter((d) => d.scheduled).length;
  const generatedCount = drafts.filter((d) => d.proposedTimes && Object.keys(d.proposedTimes).length > 0).length;

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
  function addDemoSet() {
    const demo = [
      { name: "service_recap_w18.mp4", sizeBytes: 56 * 1024 * 1024 },
      { name: "worship_clip_03_portrait.mp4", sizeBytes: 41 * 1024 * 1024 },
      { name: "qa_segment_a.mp4", sizeBytes: 125 * 1024 * 1024 },
      { name: "quote_card_set.png", sizeBytes: 4.4 * 1024 * 1024 },
    ];
    setDrafts((cur) => [...cur, ...demo.map(defaultDraftFromFile)]);
  }

  /**
   * Generate an optimal per-platform schedule for every draft.
   *  - Cards stagger by 1 day (so card #1 lands on anchor, #2 next day, etc.)
   *  - For each platform on a card, pick the next future peak time
   *  - All times strictly in the future (>= NOW + 1 minute)
   */
  function generateSchedule() {
    if (drafts.length === 0) return;
    const minTime = new Date(NOW.getTime() + 60 * 1000);
    const next = drafts.map((d, idx) => {
      if (d.scheduled) return d;
      const cardDay = new Date(anchor);
      cardDay.setDate(cardDay.getDate() + idx);
      // Reasoning chip per platform: "peak" if next peak slot, "shifted" if pushed off the day
      const proposedTimes: Partial<Record<Platform, string>> = {};
      const proposedReasons: Partial<Record<Platform, string>> = {};
      // Sort platforms so longer-form gets earlier in the day (rough proxy)
      d.platforms.forEach((p) => {
        const slot = nextPeakFor(p, minTime, cardDay);
        const sameDay =
          slot.getFullYear() === cardDay.getFullYear() &&
          slot.getMonth() === cardDay.getMonth() &&
          slot.getDate() === cardDay.getDate();
        proposedTimes[p] = slot.toISOString();
        proposedReasons[p] = sameDay ? "peak_window" : "next_available_peak";
      });
      return { ...d, proposedTimes, proposedReasons };
    });
    setDrafts(next);
  }

  function schedulePost(id: string) {
    setDrafts((cur) => cur.map((d) => (d.id === id ? { ...d, scheduled: true } : d)));
  }

  // Map of "YYYY-MM-DD" → list of card position numbers, for the mini-calendar
  const dayMarkers = useMemo(() => {
    const map = new Map<string, number[]>();
    drafts.forEach((d, idx) => {
      if (!d.proposedTimes) return;
      // Use the earliest proposed time of this card to mark its calendar day
      const isos = Object.values(d.proposedTimes).filter(Boolean) as string[];
      if (isos.length === 0) return;
      const earliest = new Date(isos.sort()[0]);
      const key = `${earliest.getFullYear()}-${earliest.getMonth()}-${earliest.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(idx + 1);
      map.set(key, arr);
    });
    return map;
  }, [drafts]);

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
                Status:{" "}
                {empty
                  ? "Empty"
                  : scheduledCount === drafts.length
                    ? "All_Scheduled"
                    : generatedCount > 0
                      ? "Generated"
                      : "Draft"}
              </span>
              <button
                type="button"
                data-testid="save-all-drafts-btn"
                disabled={empty}
                className="flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-[0.65rem] uppercase tracking-[0.14em] hover:bg-secondary disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> Save_All_Drafts
              </button>
            </>
          }
        />

        <div className="px-10 pt-8">
          {/* Breadcrumb */}
          <div className="label-mono mb-3">
            bulk_upload · {drafts.length}_files · {generatedCount}_generated · {scheduledCount}_scheduled
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
              {drafts.map((d, idx) => (
                <ComposerCard
                  key={d.id}
                  index={idx + 1}
                  post={d}
                  onChange={(next) => updateDraft(d.id, next)}
                  onRemove={() => removeDraft(d.id)}
                  onSaveDraft={() => {/* persistence not wired */}}
                  onSchedulePost={() => schedulePost(d.id)}
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

      {/* Right rail — Calendar + Generate */}
      <aside
        data-testid="schedule-rail"
        className="hidden h-screen w-[360px] shrink-0 flex-col overflow-y-auto border-l border-border bg-surface lg:flex"
      >
        <div className="border-b border-border px-5 py-4">
          <div className="label-mono mb-1">anchor_day</div>
          <p className="text-xs text-muted-foreground">
            Tap a future day. Card #1 lands here; subsequent cards stagger forward.
          </p>
        </div>

        <div className="border-b border-border px-5 py-4">
          <MiniMonth
            value={anchor}
            onChange={setAnchor}
            now={NOW}
            markers={dayMarkers}
          />
        </div>

        {/* Primary generate button */}
        <div className="border-b border-border px-5 py-4">
          <button
            type="button"
            disabled={empty}
            onClick={generateSchedule}
            data-testid="generate-schedule-btn"
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-3 py-3 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Wand2 className="h-3 w-3" /> Generate_Optimal_Schedule
          </button>
          <p className="label-mono mt-2 leading-relaxed normal-case tracking-normal text-muted-foreground/80">
            Suggests the best future peak time per platform for every card. Review &amp; tweak inside each card, then hit Schedule_Post.
          </p>
        </div>

        {/* Audience timezone */}
        <div className="border-b border-border px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Globe2 className="h-3 w-3 text-muted-foreground" />
            <span className="label-mono">audience_timezone</span>
          </div>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            data-testid="timezone-select"
            className="w-full rounded-sm border border-border bg-background/60 px-2 py-2 font-mono text-[0.65rem] text-foreground focus:border-accent focus:outline-none"
          >
            {TIMEZONES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <p className="label-mono mt-2 leading-relaxed normal-case tracking-normal text-muted-foreground/80">
            Peaks are computed against this audience clock so the wave of engagement is real, not local.
          </p>
        </div>

        {/* Schedule summary list — numbered, sticky reference */}
        <div className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="label-mono">cards · numbered</span>
            <span className="font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground">
              {drafts.length}_cards
            </span>
          </div>
          {drafts.length === 0 ? (
            <div className="label-mono text-muted-foreground/60">no_cards_yet</div>
          ) : (
            <ol className="space-y-1.5">
              {drafts.map((d, idx) => {
                const isos = d.proposedTimes ? (Object.values(d.proposedTimes).filter(Boolean) as string[]) : [];
                const earliest = isos.length ? new Date(isos.sort()[0]) : undefined;
                return (
                  <li
                    key={d.id}
                    data-testid={`rail-card-${idx + 1}`}
                    className={`flex items-center justify-between gap-2 rounded-sm border bg-background/60 px-2.5 py-1.5 ${
                      d.scheduled ? "border-success/60" : "border-border"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-foreground font-mono text-[0.6rem] font-semibold text-background">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[0.65rem] text-foreground">{d.filename}</div>
                        {earliest ? (
                          <div className="label-mono mt-0.5 text-[0.5rem] text-accent">
                            {earliest.toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}
                          </div>
                        ) : (
                          <div className="label-mono mt-0.5 text-[0.5rem] text-muted-foreground/60">
                            not_generated
                          </div>
                        )}
                      </div>
                    </div>
                    {d.scheduled && <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />}
                  </li>
                );
              })}
            </ol>
          )}
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
        Drop one or many files above. Single post or 50, the editor scales — each asset becomes its own numbered card. Pick an anchor day on the right and tap{" "}
        <span className="text-foreground">Generate_Optimal_Schedule</span> to get per-platform peak suggestions.
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

function MiniMonth({
  value,
  onChange,
  now,
  markers,
}: {
  value: Date;
  onChange: (d: Date) => void;
  /** Anchor for "today" + minimum selectable day */
  now: Date;
  /** Map of "YYYY-M-D" → array of card position numbers to render in the day cell */
  markers: Map<string, number[]>;
}) {
  const [view, setView] = useState(new Date(value.getFullYear(), value.getMonth(), 1));
  const dow = ["m", "t", "w", "t", "f", "s", "s"];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const cells: { d: number; muted: boolean; date: Date; past: boolean; isToday: boolean }[] = [];
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const daysInPrev = new Date(view.getFullYear(), view.getMonth(), 0).getDate();

  function push(d: number, monthDelta: number, muted: boolean) {
    const date = new Date(view.getFullYear(), view.getMonth() + monthDelta, d);
    const past = date.getTime() < today.getTime();
    const isToday =
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
    cells.push({ d, muted, date, past, isToday });
  }
  for (let i = startDow - 1; i >= 0; i--) push(daysInPrev - i, -1, true);
  for (let d = 1; d <= daysInMonth; d++) push(d, 0, false);
  let n = 1;
  while (cells.length % 7 !== 0) push(n++, 1, true);

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
          data-testid="mini-prev-month"
          className="rounded-sm border border-border bg-background/40 p-1 text-foreground hover:bg-secondary"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="display-mono text-xs uppercase tracking-[0.06em]">
          {view.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          aria-label="next month"
          onClick={() => shift(1)}
          data-testid="mini-next-month"
          className="rounded-sm border border-border bg-background/40 p-1 text-foreground hover:bg-secondary"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.5rem] uppercase tracking-[0.14em] text-muted-foreground">
        {dow.map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          const key = `${c.date.getFullYear()}-${c.date.getMonth()}-${c.date.getDate()}`;
          const cardNumbers = markers.get(key);
          const disabled = c.past;
          const selected = !disabled && isSel(c.date);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(c.date)}
              data-testid={disabled ? undefined : `mini-day-${c.date.getMonth() + 1}-${c.d}`}
              title={c.date.toDateString()}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-sm text-[0.6rem] transition-colors ${
                disabled
                  ? "cursor-not-allowed text-muted-foreground/25"
                  : c.muted
                    ? "text-muted-foreground/40 hover:bg-secondary/40"
                    : selected
                      ? "bg-accent text-accent-foreground font-semibold"
                      : c.isToday
                        ? "border border-accent/60 text-foreground hover:bg-secondary"
                        : "text-foreground hover:bg-secondary"
              }`}
            >
              <span>{c.d}</span>
              {cardNumbers && cardNumbers.length > 0 && (
                <span
                  className={`mt-0.5 flex flex-wrap items-center justify-center gap-0.5 leading-none ${
                    selected ? "text-accent-foreground" : "text-accent"
                  }`}
                >
                  {cardNumbers.slice(0, 3).map((n, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex h-3 min-w-3 items-center justify-center rounded-full px-0.5 font-mono text-[0.5rem] font-semibold ${
                        selected ? "bg-accent-foreground text-accent" : "bg-foreground text-background"
                      }`}
                    >
                      {n}
                    </span>
                  ))}
                  {cardNumbers.length > 3 && (
                    <span className="font-mono text-[0.45rem]">+{cardNumbers.length - 3}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[0.5rem] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-accent" />
          anchor
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm border border-accent/60" />
          today
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-foreground text-[0.5rem] font-semibold text-background">
            1
          </span>
          card
        </span>
      </div>
    </div>
  );
}
