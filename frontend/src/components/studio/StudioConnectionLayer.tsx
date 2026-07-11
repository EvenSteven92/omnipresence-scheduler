import type { DraftPost } from "@/lib/composer-draft";
import type { EventLayoutMap } from "@/lib/studio-event-layout";

/**
 * SVG strings event → reel. Endpoints include live drag offsets so lines
 * track cards while moving (not only after pointerup).
 */
export function StudioConnectionLayer({
  drafts,
  eventLayout,
  liveDrag,
}: {
  drafts: DraftPost[];
  eventLayout: EventLayoutMap;
  liveDrag: { ids: string[]; dx: number; dy: number } | null;
}) {
  function offsetFor(id: string, isEvent: boolean) {
    if (!liveDrag) return { x: 0, y: 0 };
    const key = isEvent ? `event:${id}` : id;
    if (!liveDrag.ids.includes(key)) return { x: 0, y: 0 };
    return { x: liveDrag.dx, y: liveDrag.dy };
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-[4000px] w-[4000px] overflow-visible"
      aria-hidden
    >
      {drafts.map((d) => {
        if (!d.eventId) return null;
        const ep = eventLayout[d.eventId];
        if (!ep) return null;
        const eOff = offsetFor(d.eventId, true);
        const rOff = offsetFor(d.id, false);
        const x1 = ep.x + 140 + eOff.x;
        const y1 = ep.y + 60 + eOff.y;
        const x2 = (d.canvasX ?? 48) + 160 + rOff.x;
        const y2 = (d.canvasY ?? 48) + 40 + rOff.y;
        return (
          <line
            key={`str-${d.id}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            className="text-foreground/25"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        );
      })}
    </svg>
  );
}
