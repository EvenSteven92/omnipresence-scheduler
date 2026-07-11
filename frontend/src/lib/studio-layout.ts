import type { DraftPost } from "@/lib/composer-draft";

export const STUDIO_CARD_WIDTH = 320;
export const STUDIO_CARD_GAP = 48;
export const STUDIO_CASCADE = 36;

/** Seed positions for cards missing canvas coordinates. */
export function ensureCanvasPositions(drafts: DraftPost[]): DraftPost[] {
  let nextX = 48;
  let nextY = 48;
  let col = 0;
  return drafts.map((d, i) => {
    if (d.canvasX != null && d.canvasY != null) {
      nextX = Math.max(nextX, d.canvasX + STUDIO_CARD_WIDTH + STUDIO_CARD_GAP);
      return d;
    }
    const x = 48 + (col % 3) * (STUDIO_CARD_WIDTH + STUDIO_CARD_GAP);
    const y = 48 + Math.floor(col / 3) * 420 + (i % 3) * 8;
    col += 1;
    nextX = x + STUDIO_CARD_WIDTH + STUDIO_CARD_GAP;
    nextY = y;
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

/** Derive progressive stage for toolbar primacy. */
export type StudioStage = "media" | "script" | "caption" | "schedule" | "ready";

export function studioStage(draft: DraftPost): StudioStage {
  const hasScript =
    Boolean(draft.transcript?.trim()) || Boolean(draft.callToAction?.trim());
  const hasCaption = Boolean(draft.caption?.trim());
  const hasPlatforms = draft.platforms.length > 0;
  const times = draft.proposedTimes ?? {};
  const hasTimes =
    hasPlatforms && draft.platforms.every((p) => Boolean(times[p]));

  if (hasTimes) return "ready";
  if (hasPlatforms) return "schedule";
  if (hasCaption) return "caption";
  if (hasScript) return "script";
  return "media";
}
