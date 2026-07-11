import {
  CalendarClock,
  Hand,
  MousePointer2,
  Minus,
  Plus,
  Scan,
  Sparkles,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DraftPost } from "@/lib/composer-draft";
import {
  cardsBoundingBox,
  clampZoom,
  clientToWorld,
  normalizeRect,
  type Viewport,
} from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

export type CanvasMode = "select" | "hand";

export type MarqueeWorld = {
  start: { x: number; y: number };
  current: { x: number; y: number };
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest("input, textarea, select, [contenteditable='true']"),
  );
}

/**
 * Miro-class pan/zoom + marquee host.
 * Viewport exposed via onViewportChange for drag/marquee math.
 */
export function StudioCanvas({
  children,
  drafts,
  mode,
  onModeChange,
  onBackgroundClick,
  onDropFiles,
  onViewportChange,
  marquee,
  onMarqueeStart,
  onMarqueeMove,
  onMarqueeEnd,
  emptyOverlay,
  shelfWidth = 0,
  onOpenSchedule,
  onNewEvent,
  scheduleDisabled,
  className,
}: {
  children: ReactNode;
  drafts: DraftPost[];
  mode: CanvasMode;
  onModeChange: (m: CanvasMode) => void;
  onBackgroundClick?: (e: React.MouseEvent) => void;
  onDropFiles?: (files: FileList) => void;
  onViewportChange?: (vp: Viewport) => void;
  marquee?: MarqueeWorld | null;
  onMarqueeStart?: (world: { x: number; y: number }, e: React.PointerEvent) => void;
  onMarqueeMove?: (world: { x: number; y: number }) => void;
  onMarqueeEnd?: () => void;
  /** Screen-space empty state (not affected by pan/zoom). */
  emptyOverlay?: ReactNode;
  /** Right shelf width when open — shifts bottom HUD left */
  shelfWidth?: number;
  onOpenSchedule?: () => void;
  onNewEvent?: () => void;
  scheduleDisabled?: boolean;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const didFit = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const marqueeActive = useRef(false);

  const effectiveHand = mode === "hand" || spaceHeld;
  const vp: Viewport = { panX: pan.x, panY: pan.y, zoom };

  useEffect(() => {
    onViewportChange?.(vp);
  }, [pan.x, pan.y, zoom, onViewportChange]);

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setSpaceHeld(true);
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
      if ((e.key === "v" || e.key === "V") && !isTypingTarget(e.target)) {
        onModeChange("select");
      }
      if ((e.key === "h" || e.key === "H") && !isTypingTarget(e.target)) {
        onModeChange("hand");
      }
    }
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onModeChange]);

  const setZoomAtPoint = useCallback((nextZoom: number, clientX: number, clientY: number) => {
    const el = rootRef.current;
    if (!el) {
      setZoom(clampZoom(nextZoom));
      return;
    }
    const rect = el.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    setZoom((prevZ) => {
      const z = clampZoom(nextZoom);
      setPan((p) => {
        const worldX = (mx - p.x) / prevZ;
        const worldY = (my - p.y) / prevZ;
        return { x: mx - worldX * z, y: my - worldY * z };
      });
      return z;
    });
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.002);
        setZoomAtPoint(zoom * factor, e.clientX, e.clientY);
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    },
    [setZoomAtPoint, zoom],
  );

  function beginPan(e: React.PointerEvent) {
    const el = rootRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    setPanning(true);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
  }

  function worldFromEvent(e: { clientX: number; clientY: number }) {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    return clientToWorld(e.clientX, e.clientY, el.getBoundingClientRect(), {
      panX: pan.x,
      panY: pan.y,
      zoom,
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    const middle = e.button === 1;
    const right = e.button === 2;
    const primary = e.button === 0;
    // Never pan with primary click in select mode (marquee uses hit layer)
    if (middle || right || (primary && effectiveHand)) {
      if (right) e.preventDefault();
      beginPan(e);
    }
  }

  function onBoardHitPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    if (effectiveHand) {
      beginPan(e);
      return;
    }
    if (mode !== "select") return;
    // Marquee: empty board only (this layer sits under cards)
    e.preventDefault();
    e.stopPropagation();
    rootRef.current?.setPointerCapture(e.pointerId);
    marqueeActive.current = true;
    const w = worldFromEvent(e);
    onMarqueeStart?.(w, e);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPan({
        x: panRef.current.originX + dx,
        y: panRef.current.originY + dy,
      });
      return;
    }
    if (marqueeActive.current) {
      onMarqueeMove?.(worldFromEvent(e));
    }
  }

  function endPan(e: React.PointerEvent) {
    if (marqueeActive.current) {
      marqueeActive.current = false;
      onMarqueeEnd?.();
    }
    panRef.current = null;
    setPanning(false);
    try {
      rootRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function fitToCards() {
    const box = cardsBoundingBox(drafts);
    const el = rootRef.current;
    if (!box || !el) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const pad = 64;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const bw = box.maxX - box.minX + pad * 2;
    const bh = box.maxY - box.minY + pad * 2;
    const z = clampZoom(Math.min(vw / bw, vh / bh, 1));
    setZoom(z);
    setPan({
      x: (vw - (box.minX + box.maxX) * z) / 2,
      y: (vh - (box.minY + box.maxY) * z) / 2,
    });
  }

  // Fit cards once when board loads with existing drafts
  useEffect(() => {
    if (didFit.current) return;
    if (drafts.length === 0) {
      setPan({ x: 0, y: 0 });
      setZoom(1);
      return;
    }
    const t = window.setTimeout(() => {
      fitToCards();
      didFit.current = true;
    }, 50);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drafts.length]);

  const marqueeBox =
    marquee != null
      ? normalizeRect(marquee.start, marquee.current)
      : null;

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      <div
        ref={rootRef}
        data-testid="studio-canvas"
        tabIndex={0}
        className={cn(
          "relative min-h-0 flex-1 touch-none overflow-hidden bg-paper-2 outline-none",
          "bg-[radial-gradient(circle,_#d6d6d6_1px,_transparent_1px)] bg-[size:20px_20px]",
          panning || effectiveHand ? "cursor-grab" : "cursor-default",
          panning && "cursor-grabbing",
          marqueeActive.current && "cursor-crosshair",
        )}
        onWheel={onWheel}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files?.length) onDropFiles?.(e.dataTransfer.files);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onContextMenu={(e) => {
          if (panning || effectiveHand) e.preventDefault();
        }}
        onClick={(e) => {
          if (marquee) return;
          const t = e.target as HTMLElement;
          if (t === e.currentTarget || t.dataset.boardBg) {
            onBackgroundClick?.(e);
          }
        }}
        role="application"
        aria-label="Studio whiteboard"
      >
        <div
          data-board-bg="true"
          className="absolute left-0 top-0 h-[4000px] w-[4000px] origin-top-left will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          {/* Under-card hit layer: marquee / pan empty board */}
          <div
            data-board-bg="true"
            data-testid="studio-board-hit"
            className="absolute inset-0 z-0"
            onPointerDown={onBoardHitPointerDown}
          />
          <div className="relative z-[1]">{children}</div>
          {marqueeBox && marqueeBox.w + marqueeBox.h > 0 ? (
            <div
              data-testid="studio-marquee"
              className="pointer-events-none absolute border border-brand bg-brand-soft"
              style={{
                left: marqueeBox.x,
                top: marqueeBox.y,
                width: marqueeBox.w,
                height: marqueeBox.h,
              }}
            />
          ) : null}
        </div>

        {/* Screen-space empty welcome — always centered in the viewport */}
        {emptyOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className="pointer-events-auto">{emptyOverlay}</div>
          </div>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 transition-transform duration-200 ease-out"
        style={{
          // Keep tools clear of the schedule shelf
          transform:
            shelfWidth > 0
              ? `translateX(calc(-50% - ${shelfWidth / 2}px))`
              : "translateX(-50%)",
        }}
      >
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-card p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            title="Select (V) — marquee + move cards"
            data-testid="canvas-mode-select"
            onClick={() => onModeChange("select")}
            className={cn(
              "rounded-md p-2 transition-colors",
              mode === "select"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <MousePointer2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Hand (H) — pan"
            data-testid="canvas-mode-hand"
            onClick={() => onModeChange("hand")}
            className={cn(
              "rounded-md p-2 transition-colors",
              mode === "hand"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Hand className="h-4 w-4" />
          </button>
          <button
            type="button"
            title={
              scheduleDisabled
                ? "Select caption-ready reels to schedule"
                : "Open schedule shelf"
            }
            data-testid="canvas-open-schedule"
            disabled={scheduleDisabled}
            onClick={onOpenSchedule}
            className={cn(
              "rounded-md p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <CalendarClock className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="New event card on board"
            data-testid="canvas-new-event"
            onClick={onNewEvent}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Sparkles className="h-4 w-4" />
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-card p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            title="Zoom out"
            onClick={() => setZoom((z) => clampZoom(z - 0.1))}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Reset zoom"
            onClick={() => setZoom(1)}
            className="min-w-[3rem] px-1 text-center text-caption font-semibold tabular-nums text-foreground"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            title="Zoom in"
            onClick={() => setZoom((z) => clampZoom(z + 0.1))}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Fit all cards"
            onClick={fitToCards}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Scan className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
