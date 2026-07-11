import { useCallback, useRef, useState, type ReactNode } from "react";
import { clampZoom } from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

/**
 * Pan / zoom board surface. TORCC paper-2 + grey dots (not neon grid).
 */
export function StudioCanvas({
  children,
  onBackgroundClick,
  onDropFiles,
  className,
}: {
  children: ReactNode;
  onBackgroundClick?: () => void;
  onDropFiles?: (files: FileList) => void;
  className?: string;
}) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const spaceRef = useRef(false);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => clampZoom(z - e.deltaY * 0.001));
    }
  }, []);

  return (
    <div
      data-testid="studio-canvas"
      className={cn(
        "relative min-h-0 flex-1 overflow-hidden bg-paper-2",
        "bg-[radial-gradient(circle,_#d6d6d6_1px,_transparent_1px)] bg-[size:20px_20px]",
        className,
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
      onPointerDown={(e) => {
        if (e.button === 1 || spaceRef.current || e.target === e.currentTarget) {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setDragging(true);
          dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            originX: pan.x,
            originY: pan.y,
          };
        }
      }}
      onPointerMove={(e) => {
        if (!dragRef.current) return;
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        setPan({
          x: dragRef.current.originX + dx,
          y: dragRef.current.originY + dy,
        });
      }}
      onPointerUp={(e) => {
        dragRef.current = null;
        setDragging(false);
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackgroundClick?.();
      }}
      onKeyDown={(e) => {
        if (e.code === "Space") spaceRef.current = true;
      }}
      onKeyUp={(e) => {
        if (e.code === "Space") spaceRef.current = false;
      }}
      role="application"
      aria-label="Studio whiteboard"
    >
      <div
        className={cn(
          "absolute left-0 top-0 origin-top-left will-change-transform",
          dragging ? "cursor-grabbing" : "cursor-default",
        )}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* large hit area so empty space pans/clicks */}
        <div className="relative h-[4000px] w-[4000px]">{children}</div>
      </div>

      <div className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-line bg-card/95 px-2 py-1 text-caption font-medium text-muted-foreground shadow-[var(--shadow-card)] backdrop-blur">
        <span>{Math.round(zoom * 100)}%</span>
        <span className="text-line">·</span>
        <span>Scroll+⌘ zoom · drag empty to pan</span>
      </div>
    </div>
  );
}
