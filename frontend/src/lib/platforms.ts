import {
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  type LucideIcon,
} from "lucide-react";
import type { Platform } from "@/lib/mock-data";

export interface PlatformMeta {
  short: Platform;
  full: string;
  Icon: LucideIcon;
  /** Default peak windows (HH:mm, local TZ) for this audience. */
  peakTimes: string[];
  /** Which formats this platform accepts. */
  formats: ReadonlyArray<"landscape" | "portrait" | "story">;
}

export const PLATFORMS: readonly PlatformMeta[] = [
  { short: "X",        full: "X / Twitter",       Icon: Twitter,   peakTimes: ["08:15", "12:40", "18:05"], formats: ["landscape", "portrait"] },
  { short: "FB",       full: "Facebook",          Icon: Facebook,  peakTimes: ["09:00", "13:30", "20:00"], formats: ["landscape", "portrait"] },
  { short: "IG",       full: "Instagram",         Icon: Instagram, peakTimes: ["11:00", "17:30", "21:15"], formats: ["landscape", "portrait"] },
  { short: "YT",       full: "YouTube",           Icon: Youtube,   peakTimes: ["15:00", "20:30"],          formats: ["landscape", "portrait"] },
  { short: "TIKTOK",   full: "TikTok",            Icon: Music2,    peakTimes: ["07:45", "19:00", "22:30"], formats: ["portrait"] },
  { short: "IG STORY", full: "Instagram Story",   Icon: Instagram, peakTimes: ["09:30", "19:45"],          formats: ["story"] },
  { short: "FB STORY", full: "Facebook Story",    Icon: Facebook,  peakTimes: ["10:00", "18:30"],          formats: ["story"] },
] as const;

export const PLATFORMS_BY_SHORT: Record<string, PlatformMeta> = Object.fromEntries(
  PLATFORMS.map((p) => [p.short, p]),
);

export type PostFormat = "landscape" | "portrait" | "story";

export const FORMAT_META: Record<PostFormat, { label: string; aspect: string; sub: string }> = {
  landscape: { label: "Landscape", aspect: "16:9", sub: "YT, FB, X" },
  portrait:  { label: "Portrait",  aspect: "9:16", sub: "TT, Reels, Shorts" },
  story:     { label: "Story",     aspect: "9:16", sub: "FB & IG Stories" },
};
