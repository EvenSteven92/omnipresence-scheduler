export const CALENDAR_DOW = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type CalendarCell = {
  d: number;
  muted: boolean;
  key: string;
  date: Date;
};

/** Sun-start month grid — pads to full weeks like the main calendar page. */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const arr: CalendarCell[] = [];
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  for (let i = startDow - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    arr.push({ d, muted: true, key: `p${d}`, date: new Date(year, month - 1, d) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    arr.push({ d, muted: false, key: `m${d}`, date: new Date(year, month, d) });
  }
  let n = 1;
  while (arr.length % 7 !== 0) {
    arr.push({ d: n, muted: true, key: `n${n}`, date: new Date(year, month + 1, n) });
    n++;
  }
  return arr;
}

export function monthStartFromDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** ISO 8601 week number — uses the Thursday of the given week. */
export function isoWeekNumber(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const isoDay = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() + 4 - isoDay);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((d.getTime() - yearStart.getTime()) / 86_400_000 / 7 + 1);
}

export type CalendarWeek = {
  weekNumber: number;
  cells: CalendarCell[];
};

/** Month grid grouped into Sun–Sat rows with ISO week labels. */
export function buildMonthWeeks(year: number, month: number): CalendarWeek[] {
  const cells = buildMonthGrid(year, month);
  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    weeks.push({ weekNumber: isoWeekNumber(row[4]!.date), cells: row });
  }
  return weeks;
}