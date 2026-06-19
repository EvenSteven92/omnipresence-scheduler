/** Real calendar "now" — today highlight, upcoming window, month navigation, analytics ranges. */
export function today(): Date {
  return new Date();
}

export function todayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Static seed anchor for mock post dates in workspaces/data.ts (May 13, 2026). */
const DEMO_DATA_ANCHOR = new Date(2026, 4, 13);

export function demoDataAnchorStart(): Date {
  return new Date(
    DEMO_DATA_ANCHOR.getFullYear(),
    DEMO_DATA_ANCHOR.getMonth(),
    DEMO_DATA_ANCHOR.getDate(),
  );
}

/** Offset to shift seeded mock ISO timestamps onto the real calendar. */
export function liveDateOffsetMs(): number {
  return todayStart().getTime() - demoDataAnchorStart().getTime();
}

export function shiftIsoByOffset(iso: string, offsetMs: number): string {
  return new Date(new Date(iso).getTime() + offsetMs).toISOString();
}

export function dayEndExclusive(from: Date, days: number): Date {
  const end = new Date(from);
  end.setDate(end.getDate() + days);
  return end;
}

/** @deprecated Use dayEndExclusive */
export const demoDayEndExclusive = dayEndExclusive;

/** Start of the day `days` before `from` (inclusive in past-day windows). */
export function daysAgoStart(days: number, from: Date = todayStart()): Date {
  const start = new Date(from);
  start.setDate(from.getDate() - days);
  return new Date(start.getFullYear(), start.getMonth(), start.getDate());
}

/** True when `iso` falls in [from - days, end of from] (local calendar days). */
export function isWithinPastDays(iso: string, days: number, from: Date = todayStart()): boolean {
  const t = new Date(iso).getTime();
  const start = daysAgoStart(days, from).getTime();
  const end = dayEndExclusive(from, 1).getTime();
  return t >= start && t < end;
}

export function isOnOrAfterDay(iso: string, fromDayStart: Date): boolean {
  return new Date(iso).getTime() >= fromDayStart.getTime();
}
