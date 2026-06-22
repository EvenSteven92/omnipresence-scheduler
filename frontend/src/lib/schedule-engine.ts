import type { DraftPost } from "@/components/post/ComposerCard";
import type { Platform, ScheduledPost } from "@/lib/mock-data";
import { detectConflicts } from "@/lib/conflicts";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { todayStart } from "@/lib/demo-clock";

export interface ScheduleConstraints {
  maxPostsPerDayPerPlatform?: number;
  minGapMinutes?: number;
  skipWeekends?: boolean;
}

export interface BulkScheduleSlot {
  fileId: string;
  filename: string;
  platform: Platform;
  iso: string;
  reason: string;
}

export interface BulkScheduleResult {
  byFile: Record<string, Partial<Record<Platform, string>>>;
  slots: BulkScheduleSlot[];
}

export type CadenceUnit = "minutes" | "hours" | "days";

export interface FixedCadenceInput {
  startIso: string;
  interval: number;
  unit: CadenceUnit;
}

const DEFAULT_CONSTRAINTS: Required<ScheduleConstraints> = {
  maxPostsPerDayPerPlatform: 4,
  minGapMinutes: 45,
  skipWeekends: false,
};

export function startOfWeek(date: Date, weekStartsOn: "sun" | "mon" = "sun"): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const offset = weekStartsOn === "sun" ? dow : dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - offset);
  return d;
}

export function buildWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function eachDayInRange(start: Date, end: Date, constraints?: ScheduleConstraints): Date[] {
  const c = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const days: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor.getTime() <= last.getTime()) {
    const dow = cursor.getDay();
    if (!c.skipWeekends || (dow !== 0 && dow !== 6)) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function atLocalTime(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeInputValue(iso: string | undefined, fallback = "12:00"): string {
  if (!iso) return fallback;
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

export function combineDateAndTime(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  return new Date(y!, mo! - 1, d, h, mi, 0, 0).toISOString();
}

/** Values shown in the platform row before the user commits them. */
export function displayedSlotForPlatform(
  platform: Platform,
  selectedDay: Date,
  proposedTimes?: Partial<Record<Platform, string>>,
): { dateValue: string; timeValue: string; iso: string } {
  const meta = PLATFORMS_BY_SHORT[platform];
  const iso = proposedTimes?.[platform];
  const dateValue = iso ? toDateInputValue(new Date(iso)) : toDateInputValue(selectedDay);
  const timeValue = toTimeInputValue(iso, meta?.peakTimes[0] ?? "12:00");
  return {
    dateValue,
    timeValue,
    iso: combineDateAndTime(dateValue, timeValue),
  };
}

function cadenceToMs(interval: number, unit: CadenceUnit): number {
  if (unit === "minutes") return interval * 60_000;
  if (unit === "hours") return interval * 3_600_000;
  return interval * 86_400_000;
}

/** Per-brand posting times override the global platform peakTimes when present. */
export type PostingTimes = Partial<Record<Platform, string[]>>;

function platformPeaks(platform: Platform, overrides?: PostingTimes): string[] {
  const override = overrides?.[platform];
  if (override && override.length > 0) return override;
  return PLATFORMS_BY_SHORT[platform]?.peakTimes ?? ["12:00"];
}

function hasConflict(
  iso: string,
  platform: Platform,
  scheduledPosts: ScheduledPost[],
  assigned: BulkScheduleSlot[],
  fileId?: string,
): boolean {
  const dt = new Date(iso);
  if (detectConflicts(scheduledPosts, dt, [platform], fileId).length > 0) {
    return true;
  }
  const minGap = DEFAULT_CONSTRAINTS.minGapMinutes * 60_000;
  for (const slot of assigned) {
    if (slot.platform !== platform) continue;
    if (Math.abs(new Date(slot.iso).getTime() - dt.getTime()) < minGap) return true;
  }
  return false;
}

function countOnDayPlatform(assigned: BulkScheduleSlot[], day: Date, platform: Platform): number {
  const key = calendarDayKey(day);
  return assigned.filter((s) => s.platform === platform && calendarDayKey(new Date(s.iso)) === key)
    .length;
}

function pickBestTime(
  platform: Platform,
  day: Date,
  scheduledPosts: ScheduledPost[],
  assigned: BulkScheduleSlot[],
  fileId: string,
  peakIndex: number,
  constraints: Required<ScheduleConstraints>,
  overrides?: PostingTimes,
): { iso: string; reason: string } | null {
  const peaks = platformPeaks(platform, overrides);
  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[(peakIndex + i) % peaks.length]!;
    const candidate = atLocalTime(day, peak);
    if (candidate.getTime() < todayStart().getTime()) continue;
    const iso = candidate.toISOString();
    if (countOnDayPlatform(assigned, day, platform) >= constraints.maxPostsPerDayPerPlatform) {
      continue;
    }
    if (!hasConflict(iso, platform, scheduledPosts, assigned, fileId)) {
      return {
        iso,
        reason: `${PLATFORMS_BY_SHORT[platform]?.full ?? platform} peak · ${peak}`,
      };
    }
  }
  return null;
}

/** Suggest optimal per-platform times for one file within a single selected day. */
export function suggestTimesForDay(
  post: Pick<DraftPost, "id" | "platforms">,
  day: Date,
  scheduledPosts: ScheduledPost[],
  existingAssigned: BulkScheduleSlot[] = [],
  postingTimes?: PostingTimes,
): Partial<Record<Platform, string>> {
  const constraints = DEFAULT_CONSTRAINTS;
  const assigned = [...existingAssigned];
  const out: Partial<Record<Platform, string>> = {};

  post.platforms.forEach((platform, idx) => {
    const pick = pickBestTime(
      platform,
      day,
      scheduledPosts,
      assigned,
      post.id,
      idx,
      constraints,
      postingTimes,
    );
    if (pick) {
      out[platform] = pick.iso;
      assigned.push({
        fileId: post.id,
        filename: "",
        platform,
        iso: pick.iso,
        reason: pick.reason,
      });
    }
  });

  return out;
}

/** AI-style smart distribute: spread files across a date range with per-platform peaks. */
export function smartDistributeBulk(
  files: DraftPost[],
  rangeStart: Date,
  rangeEnd: Date,
  scheduledPosts: ScheduledPost[],
  constraints?: ScheduleConstraints,
  postingTimes?: PostingTimes,
): BulkScheduleResult {
  const c = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const days = eachDayInRange(rangeStart, rangeEnd, c);
  if (days.length === 0 || files.length === 0) {
    return { byFile: {}, slots: [] };
  }

  const assigned: BulkScheduleSlot[] = [];
  const byFile: Record<string, Partial<Record<Platform, string>>> = {};

  files.forEach((file, fileIdx) => {
    const day = days[fileIdx % days.length]!;
    const times: Partial<Record<Platform, string>> = {};
    const reasons: Partial<Record<Platform, string>> = {};

    file.platforms.forEach((platform, platformIdx) => {
      let pick = pickBestTime(
        platform,
        day,
        scheduledPosts,
        assigned,
        file.id,
        platformIdx + fileIdx,
        c,
        postingTimes,
      );

      if (!pick) {
        for (const altDay of days) {
          pick = pickBestTime(
            platform,
            altDay,
            scheduledPosts,
            assigned,
            file.id,
            platformIdx + fileIdx,
            c,
            postingTimes,
          );
          if (pick) break;
        }
      }

      if (pick) {
        times[platform] = pick.iso;
        const slot: BulkScheduleSlot = {
          fileId: file.id,
          filename: file.filename,
          platform,
          iso: pick.iso,
          reason: pick.reason,
        };
        assigned.push(slot);
        reasons[platform] = pick.reason;
      }
    });

    byFile[file.id] = times;
    void reasons;
  });

  return { byFile, slots: assigned.sort((a, b) => +new Date(a.iso) - +new Date(b.iso)) };
}

/** Opus-style fixed cadence: each file advances by interval from start. */
export function fixedCadenceBulk(
  files: DraftPost[],
  input: FixedCadenceInput,
  scheduledPosts: ScheduledPost[],
  postingTimes?: PostingTimes,
): BulkScheduleResult {
  const stepMs = cadenceToMs(input.interval, input.unit);
  const startMs = new Date(input.startIso).getTime();
  const assigned: BulkScheduleSlot[] = [];
  const byFile: Record<string, Partial<Record<Platform, string>>> = {};

  files.forEach((file, fileIdx) => {
    const anchor = new Date(startMs + fileIdx * stepMs);
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
    const times: Partial<Record<Platform, string>> = {};

    file.platforms.forEach((platform, platformIdx) => {
      const peaks = platformPeaks(platform, postingTimes);
      const peak = peaks[platformIdx % peaks.length]!;
      let candidate = atLocalTime(day, peak);
      if (fileIdx === 0 && platformIdx === 0) {
        candidate = new Date(input.startIso);
      } else if (fileIdx > 0) {
        candidate = new Date(startMs + fileIdx * stepMs);
        const base = atLocalTime(candidate, peak);
        if (Math.abs(base.getTime() - candidate.getTime()) > 3_600_000) {
          candidate = base;
        }
      }

      let iso = candidate.toISOString();
      let attempts = 0;
      while (hasConflict(iso, platform, scheduledPosts, assigned, file.id) && attempts < 8) {
        candidate = new Date(candidate.getTime() + 15 * 60_000);
        iso = candidate.toISOString();
        attempts++;
      }

      times[platform] = iso;
      assigned.push({
        fileId: file.id,
        filename: file.filename,
        platform,
        iso,
        reason: `Cadence +${input.interval} ${input.unit}`,
      });
    });

    byFile[file.id] = times;
  });

  return { byFile, slots: assigned.sort((a, b) => +new Date(a.iso) - +new Date(b.iso)) };
}

export function defaultBulkRange(): { start: Date; end: Date } {
  const start = todayStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

export function calendarDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** All committed proposed times across the potential-posts queue. */
export function pendingSlotsFromQueue(queue: DraftPost[]): BulkScheduleSlot[] {
  const slots: BulkScheduleSlot[] = [];
  queue.forEach((file) => {
    if (!file.proposedTimes) return;
    Object.entries(file.proposedTimes).forEach(([platform, iso]) => {
      if (!iso) return;
      slots.push({
        fileId: file.id,
        filename: file.filename,
        platform: platform as Platform,
        iso,
        reason: "pending",
      });
    });
  });
  return slots.sort((a, b) => +new Date(a.iso) - +new Date(b.iso));
}

export function slotCountsForWeek(
  slots: BulkScheduleSlot[],
  weekStart: Date,
): Record<string, number> {
  const days = buildWeekDays(weekStart);
  const weekKeys = new Set(days.map(calendarDayKey));
  const counts: Record<string, number> = {};
  slots.forEach((slot) => {
    const key = calendarDayKey(new Date(slot.iso));
    if (!weekKeys.has(key)) return;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}
