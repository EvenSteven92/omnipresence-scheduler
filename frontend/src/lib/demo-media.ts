import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEventKind } from "@/lib/workspaces/types";

/** Local copies of torcc.org marketing/media art — refresh via `npm run fetch-demo-media`. */
const POSTS_DIR = "/demo-media/posts";
const TORCC_DIR = "/demo-media/torcc";

/** TORCC fallback art — each file sourced from torcc.org CDN. */
export const TORCC_ART = {
  sermon: `${TORCC_DIR}/sermon.jpg`,
  worshipNight: `${TORCC_DIR}/worship-night.jpg`,
  youth: `${TORCC_DIR}/youth.jpg`,
  conference: `${TORCC_DIR}/conference.jpg`,
  campaign: `${TORCC_DIR}/campaign.jpg`,
  quote: `${TORCC_DIR}/quote.jpg`,
  baptism: `${TORCC_DIR}/baptism.jpg`,
  testimony: `${TORCC_DIR}/testimony.jpg`,
  communion: `${TORCC_DIR}/communion.jpg`,
  production: `${TORCC_DIR}/production.jpg`,
  firstLove: `${TORCC_DIR}/first-love.jpg`,
  podcast: `${TORCC_DIR}/podcast.jpg`,
  highlight: `${TORCC_DIR}/highlight.jpg`,
  nycCampus: `${TORCC_DIR}/nyc-campus.jpg`,
  resSunday: `${TORCC_DIR}/res-sunday.jpg`,
} as const;

/** Demo thumbnails that exist under public/demo-media/posts. */
const KNOWN_POST_PREVIEW_IDS = new Set([
  "ctv-1",
  "ctv-2",
  "ctv-p1",
  "kz-1",
  "kz-p1",
  "oe-1",
  "oe-2",
  "oe-p1",
  "torcc-1",
  "torcc-2",
  "torcc-3",
  "torcc-4",
  "torcc-5",
  "torcc-6",
  "torcc-7",
  "torcc-8",
  "torcc-p1",
  "torcc-p10",
  "torcc-p11",
  "torcc-p2",
  "torcc-p3",
  "torcc-p4",
  "torcc-p5",
  "torcc-p6",
  "torcc-p7",
  "torcc-p8",
  "torcc-p9",
  "torcc-s17-1",
  "torcc-wn-2",
  "torcc-yt-2",
]);

const EVENT_KIND_COVERS: Record<ContentEventKind, string> = {
  sunday_sermon: TORCC_ART.sermon,
  worship_night: TORCC_ART.worshipNight,
  youth: TORCC_ART.youth,
  campaign: TORCC_ART.campaign,
  conference: TORCC_ART.conference,
  other: TORCC_ART.firstLove,
};

/** Title-based TORCC art when no per-id thumbnail exists. */
export function demoStockForContent(
  title: string,
  mediaKind?: "image" | "video",
): string {
  const t = title.toLowerCase();

  if (t.includes("quote") || t.includes("carousel") || t.includes("photo")) {
    return TORCC_ART.quote;
  }
  if (t.includes("worship")) return TORCC_ART.worshipNight;
  if (t.includes("youth") || t.includes("game") || t.includes("takeover")) {
    return TORCC_ART.youth;
  }
  if (t.includes("baptism") || t.includes("dipping")) return TORCC_ART.baptism;
  if (t.includes("testimony")) return TORCC_ART.testimony;
  if (t.includes("communion") || t.includes("passover")) return TORCC_ART.communion;
  if (t.includes("soundcheck") || t.includes("vlog") || t.includes("production")) {
    return TORCC_ART.production;
  }
  if (t.includes("open eyes") || t.includes("episode") || t.includes("ep.")) {
    return TORCC_ART.podcast;
  }
  if (t.includes("first love") || t.includes("podcast")) return TORCC_ART.firstLove;
  if (t.includes("sermon") || t.includes("service") || t.includes("message")) {
    return TORCC_ART.sermon;
  }
  if (
    t.includes("conference") ||
    t.includes("campaign") ||
    t.includes("annual") ||
    t.includes("registration") ||
    t.includes("vision")
  ) {
    return t.includes("conference") ? TORCC_ART.conference : TORCC_ART.campaign;
  }
  if (t.includes("reel") || t.includes("highlight") || t.includes("recap")) {
    return TORCC_ART.highlight;
  }

  return mediaKind === "image" ? TORCC_ART.quote : TORCC_ART.highlight;
}

/** Per-post thumbnail — known ids use post art; others use TORCC title fallbacks. */
export function demoPreviewForPost(
  post: Pick<ScheduledPost, "id" | "title"> & { mediaKind?: "image" | "video" },
): string {
  if (KNOWN_POST_PREVIEW_IDS.has(post.id)) {
    return `${POSTS_DIR}/${post.id}.jpg`;
  }
  return demoStockForContent(post.title, post.mediaKind);
}

/** Fallback album cover when an event has no associated media yet. */
export function demoCoverForEventKind(kind: ContentEventKind): string {
  return EVENT_KIND_COVERS[kind];
}