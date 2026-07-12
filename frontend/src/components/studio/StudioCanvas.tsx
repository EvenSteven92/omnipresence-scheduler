import {
  CalendarClock,
  CalendarPlus,
  Hand,
  Layers,
  MousePointer2,
  Minus,
  Plus,
  Scan,
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

/** Marquee corners in board/world space */
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

function isUiChrome(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest(
      "[data-studio-card], [data-studio-layers], [data-testid^='studio-toolbar'], [data-testid='studio-group-menu'], [data-testid='studio-schedule-shelf'], button, input, textarea, select, a",
    ),
  );
}

/**
 * Pan/zoom canvas + viewport-level marquee (works at any pan/zoom).
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
  layersOpen,
  onToggleLayers,
  onOpenSchedule,
  onNewEvent,
  scheduleDisabled,
  /** When set, pan so this world-space point (card top-left) is centered. */
  focusWorld,
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
  onMarqueeStart?: (world: { x: number; y: number }) => void;
  onMarqueeMove?: (world: { x: number; y: number }) => void;
  onMarqueeEnd?: () => void;
  emptyOverlay?: ReactNode;
  shelfWidth?: number;
  layersOpen?: boolean;
  onToggleLayers?: () => void;
  onOpenSchedule?: () => void;
  onNewEvent?: () => void;
  scheduleDisabled?: boolean;
  focusWorld?: { x: number; y: number; key?: string } | null;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const didFit = useRef(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const [marqueeLive, setMarqueeLive] = useState(false);
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const marqueeActive = useRef(false);
  /** Suppress background click that follows marquee pointerup. */
  const suppressClickRef = useRef(false);
  const vpRef = useRef<Viewport>({ panX: 0, panY: 0, zoom: 1 });

  const effectiveHand = mode === "hand" || spaceHeld;

  useEffect(() => {
    const vp = { panX: pan.x, panY: pan.y, zoom };
    vpRef.current = vp;
    onViewportChange?.(vp);
  }, [pan.x, pan.y, zoom, onViewportChange]);

  // Center viewport on a focused card (deep link / library open)
  useEffect(() => {
    if (!focusWorld) return;
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const z = Math.max(zoom, 0.85);
    // Card ~320×~420; center media-ish region in view
    const cx = focusWorld.x + 160;
    const cy = focusWorld.y + 200;
    setZoom(z);
    setPan({
      x: rect.width / 2 - cx * z,
      y: rect.height / 2 - cy * z,
    });
  }, [focusWorld?.key, focusWorld?.x, focusWorld?.y]); // eslint-disable-line react-hooks/exhaustive-deps

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

  function worldFromClient(clientX: number, clientY: number) {
    const el = rootRef.current;
    if (!el) return { x: 0, y: 0 };
    const vp = vpRef.current;
    return clientToWorld(clientX, clientY, el.getBoundingClientRect(), vp);
  }

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

  function onPointerDown(e: React.PointerEvent) {
    const middle = e.button === 1;
    const right = e.button === 2;
    const primary = e.button === 0;

    if (middle || right || (primary && effectiveHand)) {
      if (right) e.preventDefault();
      beginPan(e);
      return;
    }

    // Viewport-level marquee: any empty primary drag in select mode
    if (primary && mode === "select" && !isUiChrome(e.target)) {
      e.preventDefault();
      rootRef.current?.setPointerCapture(e.pointerId);
      marqueeActive.current = true;
      setMarqueeLive(true);
      onMarqueeStart?.(worldFromClient(e.clientX, e.clientY));
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (panRef.current) {
      setPan({
        x: panRef.current.originX + (e.clientX - panRef.current.startX),
        y: panRef.current.originY + (e.clientY - panRef.current.startY),
      });
      return;
    }
    if (marqueeActive.current) {
      onMarqueeMove?.(worldFromClient(e.clientX, e.clientY));
    }
  }

  function endGesture(e: React.PointerEvent) {
    if (marqueeActive.current) {
      marqueeActive.current = false;
      setMarqueeLive(false);
      suppressClickRef.current = true;
      onMarqueeEnd?.();
      // Clear suppress after the synthetic click that follows pointerup
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
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
    marquee != null ? normalizeRect(marquee.start, marquee.current) : null;

  // Shelf only — layers inset is handled by Studio page padding, not HUD shift
  const hudShift = shelfWidth > 0 ? shelfWidth / 2 : 0;

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
          marqueeLive && "cursor-crosshair",
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
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onContextMenu={(e) => {
          if (panning || effectiveHand) e.preventDefault();
        }}
        onClick={(e) => {
          if (suppressClickRef.current || marquee || marqueeLive) return;
          if (!isUiChrome(e.target)) onBackgroundClick?.(e);
        }}
        role="application"
        aria-label="Studio whiteboard"
      >
        <div
          className="absolute left-0 top-0 h-[4000px] w-[4000px] origin-top-left will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          {children}
          {marqueeBox && marqueeBox.w + marqueeBox.h > 2 ? (
            <div
              data-testid="studio-marquee"
              className="pointer-events-none absolute border border-brand bg-brand-soft/40"
              style={{
                left: marqueeBox.x,
                top: marqueeBox.y,
                width: marqueeBox.w,
                height: marqueeBox.h,
              }}
            />
          ) : null}
        </div>

        {emptyOverlay ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
            <div className="pointer-events-auto">{emptyOverlay}</div>
          </div>
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex flex-wrap items-center justify-center gap-2 transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(calc(-50% - ${hudShift}px))`,
        }}
      >
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-card p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            title="Select (V) — marquee + move"
            data-testid="canvas-mode-select"
            onClick={() => onModeChange("select")}
            className={cn(
              "rounded-md p-2 transition-colors duration-150",
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
              "rounded-md p-2 transition-colors duration-150",
              mode === "hand"
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Hand className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Layers"
            data-testid="canvas-layers"
            onClick={onToggleLayers}
            className={cn(
              "rounded-md p-2 transition-colors duration-150",
              layersOpen
                ? "bg-primary text-white"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <Layers className="h-4 w-4" />
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
            className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <CalendarClock className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="New event on board"
            data-testid="canvas-new-event"
            onClick={onNewEvent}
            className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            <CalendarPlus className="h-4 w-4" />
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
