/** Ease-in-out cubic — slow start, soft landing. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Smoothly scroll `container` so `target` sits near the top, with ease-in-out.
 * Falls back to an instant jump when the user prefers reduced motion.
 */
export function smoothScrollElementIntoView(
  target: HTMLElement,
  options?: {
    container?: HTMLElement | null;
    /** Total duration in ms (default 700). */
    durationMs?: number;
    /** Offset from container top in px (default 12). */
    offset?: number;
  },
): void {
  const container =
    options?.container ??
    (document.getElementById("app-scroll") as HTMLElement | null) ??
    null;
  const durationMs = options?.durationMs ?? 700;
  const offset = options?.offset ?? 12;

  if (!container) {
    target.scrollIntoView({
      block: "start",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const delta = targetRect.top - containerRect.top - offset;
  const start = container.scrollTop;
  const end = start + delta;

  if (Math.abs(delta) < 2) return;

  if (prefersReducedMotion() || durationMs <= 0) {
    container.scrollTop = end;
    return;
  }

  const startTime = performance.now();

  function frame(now: number) {
    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    container!.scrollTop = start + (end - start) * easeInOutCubic(t);
    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
