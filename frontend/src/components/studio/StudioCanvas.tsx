import { Hand, MousePointer2, Minus, Plus, Scan } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { cardsBoundingBox, clampZoom } from "@/lib/studio-layout";
import type { DraftPost } from "@/lib/composer-draft";
import { cn } from "@/lib/utils";

export type CanvasMode = "select" | "hand";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof Element)) return false;
  return Boolean(
    el.closest("input, textarea, select, [contenteditable='true']"),
  );
}

/**
 * Miro-class pan/zoom board.
 * - Select (V) / Hand (H)
 * - Space+drag temporary hand (when not typing)
 * - Wheel = pan; ⌘/Ctrl+wheel = zoom toward cursor
 * - Middle-click pan
 */
export function StudioCanvas({
  children,
  drafts,
  mode,
  onModeChange,
  onBackgroundClick,
  onDropFiles,
  className,
  viewportRef,
}: {
  children: ReactNode;
  drafts: DraftPost[];
  mode: CanvasMode;
  onModeChange: (m: CanvasMode) => void;
  onBackgroundClick?: () => void;
  onDropFiles?: (files: FileList) => void;
  className?: string;
  viewportRef?: RefObject<HTMLDivElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const effectiveHand = mode === "hand" || spaceHeld;

  // Window-level Space for temporary hand (ignore when typing)
  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.code !== "Space" || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setSpaceHeld(true);
    }
    function up(e: KeyboardEvent) {
      if (e.code === "Space") setSpaceHeld(false);
      if (e.key === "v" || e.key === "V") {
        if (!isTypingTarget(e.target)) onModeChange("select");
      }
      if (e.key === "h" || e.key === "H") {
        if (!isTypingTarget(e.target)) onModeChange("hand");
      }
    }
    window.addEventListener("keydown", down, { passive: false });
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [onModeChange]);

  const setZoomAtPoint = useCallback(
    (nextZoom: number, clientX: number, clientY: number) => {
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
        // Keep world point under cursor stable
        setPan((p) => {
          const worldX = (mx - p.x) / prevZ;
          const worldY = (my - p.y) / prevZ;
          return {
            x: mx - worldX * z,
            y: my - worldY * z,
          };
        });
        return z;
      });
    },
    [],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.002);
        setZoomAtPoint(zoom * factor, e.clientX, e.clientY);
      } else {
        setPan((p) => ({
          x: p.x - e.deltaX,
          y: p.y - e.deltaY,
        }));
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

  function onPointerDown(e: React.PointerEvent) {
    const middle = e.button === 1;
    const right = e.button === 2;
    const primary = e.button === 0;
    if (middle || right || (primary && effectiveHand)) {
      if (right) e.preventDefault();
      beginPan(e);
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setPan({
      x: panRef.current.originX + dx,
      y: panRef.current.originY + dy,
    });
  }

  function endPan(e: React.PointerEvent) {
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
      setPan({ x: 40, y: 40 });
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

  // Expose viewport for parent if needed
  useEffect(() => {
    if (viewportRef && rootRef.current) {
      (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current =
        rootRef.current;
    }
  }, [viewportRef]);

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
          if (e.target === e.currentTarget || (e.target as HTMLElement).dataset?.boardBg) {
            onBackgroundClick?.();
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
          {/* Full-board hit area under cards for hand-mode pan */}
          <div
            data-board-bg="true"
            className="absolute inset-0"
            onPointerDown={(e) => {
              if (effectiveHand || e.button === 1) {
                e.stopPropagation();
                beginPan(e);
              } else if (e.button === 0 && e.target === e.currentTarget) {
                onBackgroundClick?.();
              }
            }}
          />
          {children}
        </div>
      </div>

      {/* Nav HUD — Miro-style tools */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg border border-line bg-card p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            title="Select (V)"
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

      <p className="pointer-events-none absolute bottom-4 right-4 hidden rounded-md border border-line bg-card/90 px-2 py-1 text-[0.65rem] text-muted-foreground shadow-sm md:block">
        V select · H hand · Space pan · Scroll pan · ⌘ scroll zoom
      </p>
    </div>
  );
}
