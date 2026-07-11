import type { DraftPost } from "@/lib/composer-draft";

export const STUDIO_CARD_WIDTH = 320;
export const STUDIO_CARD_GAP = 48;
export const STUDIO_CASCADE = 36;

/** Seed positions for cards missing canvas coordinates. */
export function ensureCanvasPositions(drafts: DraftPost[]): DraftPost[] {
  let col = 0;
  return drafts.map((d) => {
    if (d.canvasX != null && d.canvasY != null) return d;
    const x = 48 + (col % 3) * (STUDIO_CARD_WIDTH + STUDIO_CARD_GAP);
    const y = 48 + Math.floor(col / 3) * 420;
    col += 1;
    return { ...d, canvasX: x, canvasY: y };
  });
}

export function cascadePosition(existing: DraftPost[]): { x: number; y: number } {
  if (existing.length === 0) return { x: 48, y: 48 };
  const n = existing.length;
  return {
    x: 48 + (n % 4) * STUDIO_CASCADE,
    y: 48 + Math.floor(n / 4) * STUDIO_CASCADE + (n % 3) * 12,
  };
}

export function clampZoom(z: number): number {
  return Math.min(1.5, Math.max(0.4, z));
}

/** Prepare-only stages (schedule is a separate future flow). */
export type StudioStage = "media" | "script" | "caption";

export function studioStage(draft: DraftPost): StudioStage {
  const hasScript =
    Boolean(draft.transcript?.trim()) || Boolean(draft.callToAction?.trim());
  const hasCaption = Boolean(draft.caption?.trim());
  if (hasCaption) return "caption";
  if (hasScript) return "script";
  return "media";
}

export function hasScriptSource(draft: DraftPost): boolean {
  return Boolean(draft.transcript?.trim()) || Boolean(draft.callToAction?.trim());
}

/** Caption + hashtags ready → Schedule tool unlocks. */
export function isCaptionReady(draft: DraftPost): boolean {
  return Boolean(draft.caption?.trim()) && Boolean(draft.hashtags?.trim());
}

/** Per-field prepare progress for whiteboard chips. */
export type PrepareField = "transcript" | "cta" | "title" | "caption" | "hashtags";

export function prepareReadiness(draft: DraftPost): Record<PrepareField, boolean> {
  return {
    transcript: Boolean(draft.transcript?.trim()),
    cta: Boolean(draft.callToAction?.trim()),
    title: Boolean(draft.title?.trim()),
    caption: Boolean(draft.caption?.trim()),
    hashtags: Boolean(draft.hashtags?.trim()),
  };
}

/** Draft has platforms + a time for each selected destination. */
export function isScheduleTimed(draft: DraftPost): boolean {
  if (draft.platforms.length === 0) return false;
  const times = draft.proposedTimes ?? {};
  return draft.platforms.every((p) => Boolean(times[p]));
}

/** CSS aspect-ratio string from measured pixels or format heuristics. */
export function mediaAspectRatioCss(draft: DraftPost): string {
  if (draft.width && draft.height && draft.width > 0 && draft.height > 0) {
    return `${draft.width} / ${draft.height}`;
  }
  const bucket = draft.aspectBucket;
  const format = draft.format;
  if (
    bucket === "portrait_9_16" ||
    bucket === "portrait_4_5" ||
    format === "portrait" ||
    format === "story"
  ) {
    return bucket === "portrait_4_5" ? "4 / 5" : "9 / 16";
  }
  if (bucket === "square") {
    return "1 / 1";
  }
  if (bucket === "classic_4_3") {
    return "4 / 3";
  }
  if (bucket === "landscape_16_9" || format === "landscape") {
    return "16 / 9";
  }
  return draft.mediaKind === "video" ? "9 / 16" : "1 / 1";
}

export function cardsBoundingBox(drafts: DraftPost[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (drafts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const d of drafts) {
    const x = d.canvasX ?? 48;
    const y = d.canvasY ?? 48;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + STUDIO_CARD_WIDTH);
    maxY = Math.max(maxY, y + 480);
  }
  return { minX, minY, maxX, maxY };
}

export type Viewport = { panX: number; panY: number; zoom: number };

/** Client (screen) point → board/world coordinates. */
export function clientToWorld(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  vp: Viewport,
): { x: number; y: number } {
  return {
    x: (clientX - rect.left - vp.panX) / vp.zoom,
    y: (clientY - rect.top - vp.panY) / vp.zoom,
  };
}

export function normalizeRect(
  a: { x: number; y: number },
  b: { x: number; y: number },
): { x: number; y: number; w: number; h: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

export function rectsIntersect(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Approximate card height for hit-tests when DOM not measured. */
export function estimateCardHeight(draft: DraftPost): number {
  let h = 48 + 24; // header
  const open = draft.studioOpen ?? {};
  // media max-height 320 but aspect varies — use conservative default
  h += 280;
  if (open.transcript) h += 200;
  if (open.cta) h += 80;
  if (open.caption) h += 180;
  return h;
}

export function cardBounds(draft: DraftPost): {
  x: number;
  y: number;
  w: number;
  h: number;
} {
  return {
    x: draft.canvasX ?? 48,
    y: draft.canvasY ?? 48,
    w: STUDIO_CARD_WIDTH,
    h: estimateCardHeight(draft),
  };
}
