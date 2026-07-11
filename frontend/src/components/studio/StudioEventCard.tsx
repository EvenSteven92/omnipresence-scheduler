import { useRef } from "react";
import { CalendarDays, ImagePlus, Link2, X } from "lucide-react";
import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";
import { TrafficLight } from "@/components/ui/TrafficLight";
import type { CardLifecycleStatus } from "@/lib/card-display";
import { cn } from "@/lib/utils";

const KINDS: Array<{ value: ContentEventKind; label: string }> = [
  { value: "sunday_sermon", label: "Sunday sermon" },
  { value: "worship_night", label: "Worship night" },
  { value: "youth", label: "Youth" },
  { value: "campaign", label: "Campaign" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
];

/**
 * Event as a board card — editable when selected (fields + cover graphic).
 */
export function StudioEventCard({
  event,
  x,
  y,
  selected,
  linkedCount,
  trafficStatus = "IDLE",
  canDrag,
  liveOffset,
  onSelect,
  onDragStart,
  onAssignSelected,
  onChange,
}: {
  event: ContentEvent;
  x: number;
  y: number;
  selected: boolean;
  linkedCount: number;
  trafficStatus?: CardLifecycleStatus;
  canDrag: boolean;
  liveOffset?: { x: number; y: number } | null;
  onSelect: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onAssignSelected?: () => void;
  onChange?: (patch: Partial<ContentEvent>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const ox = liveOffset?.x ?? 0;
  const oy = liveOffset?.y ?? 0;
  const dateLabel = new Date(event.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const dateInput = event.date.slice(0, 10);
  const cover = event.coverUrl?.trim() || null;

  function onPickCover(file: File | null) {
    if (!onChange || !file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) onChange({ coverUrl: result });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      data-testid={`studio-event-${event.id}`}
      data-studio-card={event.id}
      data-studio-event="true"
      className={cn("absolute will-change-transform", selected && "z-30")}
      style={{
        left: x,
        top: y,
        width: 280,
        transform:
          ox !== 0 || oy !== 0 ? `translate3d(${ox}px, ${oy}px, 0)` : undefined,
      }}
    >
      <article
        className={cn(
          "overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-card)] select-none",
          "transition-[border-color,box-shadow,transform] duration-150 ease-out",
          selected
            ? "scale-[1.01] border-brand shadow-[0_0_0_2px_color-mix(in_oklab,var(--brand)_35%,transparent)]"
            : "border-line hover:border-foreground/30",
        )}
      >
        {cover ? (
          <div
            className="relative h-28 w-full border-b border-line bg-paper-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            <span className="absolute right-2 top-2">
              <TrafficLight status={trafficStatus} size="sm" />
            </span>
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-start gap-3 border-b border-line bg-paper-2 px-3 py-3 touch-none",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={(e) => {
            if (!canDrag || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onDragStart(e);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {!cover ? (
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-card">
              <CalendarDays className="h-4 w-4 text-foreground" strokeWidth={1.75} />
              <span className="absolute -right-1 -top-1">
                <TrafficLight status={trafficStatus} size="sm" />
              </span>
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Event
            </p>
            <p className="mt-0.5 truncate font-display text-sm font-bold text-foreground">
              {event.title}
            </p>
            <p className="mt-0.5 text-caption text-muted-foreground">{dateLabel}</p>
          </div>
        </div>

        {selected && onChange ? (
          <div
            className="space-y-2 border-b border-line px-3 py-3 animate-slide-in-up"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Graphic
              </span>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-line bg-paper-2">
                  {cover ? (
                    <img src={cover} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImagePlus className="h-4 w-4" />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-md border border-line bg-card px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-secondary"
                  >
                    {cover ? "Change graphic" : "Add graphic"}
                  </button>
                  {cover ? (
                    <button
                      type="button"
                      onClick={() => onChange({ coverUrl: "" })}
                      className="inline-flex items-center gap-1 text-[0.65rem] font-medium text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </button>
                  ) : (
                    <span className="text-[0.6rem] text-muted-foreground">
                      Sermon art helps spot events on the board
                    </span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    onPickCover(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <label className="block">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Title
              </span>
              <input
                type="text"
                value={event.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="mt-1 w-full rounded-md border border-line bg-card px-2 py-1.5 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
              />
            </label>
            <label className="block">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Date
              </span>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  onChange({ date: new Date(v + "T12:00:00").toISOString() });
                }}
                className="mt-1 w-full rounded-md border border-line bg-card px-2 py-1.5 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
              />
            </label>
            <label className="block">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Kind
              </span>
              <select
                value={event.kind}
                onChange={(e) =>
                  onChange({ kind: e.target.value as ContentEventKind })
                }
                className="mt-1 w-full rounded-md border border-line bg-card px-2 py-1.5 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
              >
                {KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Description
              </span>
              <textarea
                value={event.description ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={2}
                placeholder="Optional context for AI & team"
                className="mt-1 w-full resize-none rounded-md border border-line bg-card px-2 py-1.5 text-sm focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/15"
              />
            </label>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <span className="text-xs text-muted-foreground">
            {linkedCount} reel{linkedCount === 1 ? "" : "s"} linked
          </span>
          {onAssignSelected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAssignSelected();
              }}
              className="inline-flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-caption font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              <Link2 className="h-3 w-3" />
              Attach selection
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
}
