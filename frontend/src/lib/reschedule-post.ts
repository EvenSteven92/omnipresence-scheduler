import type { Platform, ScheduledPost } from "@/lib/mock-data";

/** Shift all platform publish times to a new calendar day, preserving time-of-day. */
export function reschedulePostToDay(post: ScheduledPost, targetDay: Date): ScheduledPost {
  const times = post.platformTimes ?? {};
  const newTimes: Partial<Record<Platform, string>> = {};

  post.platforms.forEach((platform) => {
    const oldIso = times[platform] ?? post.date;
    const old = new Date(oldIso);
    const next = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      old.getHours(),
      old.getMinutes(),
      0,
      0,
    );
    newTimes[platform] = next.toISOString();
  });

  const isos = Object.values(newTimes).filter(Boolean).sort() as string[];
  return {
    ...post,
    date: isos[0] ?? post.date,
    platformTimes: newTimes,
  };
}