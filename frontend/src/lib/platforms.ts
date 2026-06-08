import {
  X,
  Facebook,
  Instagram,
  Youtube,
  CirclePlay,
  Music2,
  type LucideIcon,
} from "lucide-react";
import type { Platform } from "@/lib/mock-data";

export interface PlatformMeta {
  short: Platform;
  full: string;
  Icon: LucideIcon;
  /** Official brand color for quick visual identification in icons. */
  brandColor: string;
  /** Default peak windows (HH:mm, local TZ) for this audience. */
  peakTimes: string[];
  /** Which formats this platform accepts. */
  formats: ReadonlyArray<"landscape" | "portrait" | "story">;
}

export const PLATFORMS: readonly PlatformMeta[] = [
  { short: "X",         full: "X / Twitter",       Icon: X,            brandColor: "#E7E9EA", peakTimes: ["08:15", "12:40", "18:05"], formats: ["landscape", "portrait"] },
  { short: "FB",        full: "Facebook",          Icon: Facebook,   brandColor: "#1877F2", peakTimes: ["09:00", "13:30", "20:00"], formats: ["landscape", "portrait"] },
  { short: "IG",        full: "Instagram",         Icon: Instagram,  brandColor: "#E4405F", peakTimes: ["11:00", "17:30", "21:15"], formats: ["landscape", "portrait"] },
  { short: "YT",        full: "YouTube",           Icon: Youtube,    brandColor: "#FF0000", peakTimes: ["15:00", "20:30"],          formats: ["landscape", "portrait"] },
  { short: "RUMBLE",    full: "Rumble",            Icon: CirclePlay, brandColor: "#85C742", peakTimes: ["14:00", "19:30", "21:45"], formats: ["landscape", "portrait"] },
  { short: "YT SHORTS", full: "YouTube Shorts",    Icon: Youtube,    brandColor: "#FF0000", peakTimes: ["12:00", "17:00", "21:00"], formats: ["portrait"] },
  { short: "TIKTOK",    full: "TikTok",            Icon: Music2,     brandColor: "#FE2C55", peakTimes: ["07:45", "19:00", "22:30"], formats: ["portrait"] },
  { short: "IG STORY",  full: "Instagram Story",   Icon: Instagram,  brandColor: "#E4405F", peakTimes: ["09:30", "19:45"],          formats: ["story"] },
  { short: "FB STORY",  full: "Facebook Story",    Icon: Facebook,   brandColor: "#1877F2", peakTimes: ["10:00", "18:30"],          formats: ["story"] },
] as const;

export const PLATFORMS_BY_SHORT: Record<string, PlatformMeta> = Object.fromEntries(
  PLATFORMS.map((p) => [p.short, p]),
);

export type PostFormat = "landscape" | "portrait" | "story";

export const FORMAT_META: Record<PostFormat, { label: string; aspect: string; sub: string }> = {
  landscape: { label: "Landscape", aspect: "16:9", sub: "YT, Rumble, FB, X" },
  portrait:  { label: "Portrait",  aspect: "9:16", sub: "TT, Reels, Shorts" },
  story:     { label: "Story",     aspect: "9:16", sub: "FB & IG Stories" },
};
