import { Link2 } from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import {
  cardStatusLabel,
  type CardLifecycleStatus,
} from "@/lib/card-display";
import { TrafficLight } from "@/components/ui/TrafficLight";
import { STUDIO_CARD_WIDTH, studioStage } from "@/lib/studio-layout";
import { cn } from "@/lib/utils";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { StudioCaptionSection } from "./StudioCaptionSection";
import { StudioCardMedia } from "./StudioCardMedia";
import { StudioCardToolbar, type StudioTool } from "./StudioCardToolbar";
import { StudioCommittedScheduleSection } from "./StudioCommittedScheduleSection";
import { StudioCtaSection } from "./StudioCtaSection";
import { StudioPerformanceSection } from "./StudioPerformanceSection";
import { StudioPrepareChips } from "./StudioPrepareChips";
import { StudioTitleSection } from "./StudioTitleSection";
import { StudioTranscriptSection } from "./StudioTranscriptSection";

function statusBorderClass(status: CardLifecycleStatus, multiSelected: boolean): string {
  // Keep lifecycle color; selection adds brand inset so status never "disappears".
  const base = (() => {
    switch (status) {
      case "SCHEDULED":
        return "border-2 border-warning shadow-[0_0_0_1px_color-mix(in_oklab,var(--warning)_25%,transparent)]";
      case "LIVE":
        return "border-2 border-success shadow-[0_0_0_1px_color-mix(in_oklab,var(--success)_25%,transparent)]";
      case "FAILED":
        return "border-2 border-destructive shadow-[0_0_0_1px_color-mix(in_oklab,var(--destructive)_25%,transparent)]";
      default:
        return "border border-line hover:border-foreground/25";
    }
  })();
  if (multiSelected) {
    return cn(
      base,
      "ring-2 ring-brand ring-offset-1 ring-offset-card",
    );
  }
  return base;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, button, [contenteditable='true']"),
  );
}

export function StudioCard({
  draft,
  selected,
  multiSelected,
  busy,
  canDrag,
  liveOffset,
  eventTitle,
  lifecycleStatus = "IDLE",
  sequenceNumber,
  committedPost,
  stackFront,
  onSelect,
  onChange,
  onTool,
  onGenerateTranscript,
  onGenerateCaption,
  onDragStart,
  onRaise,
  onReschedule,
}: {
  draft: DraftPost;
  selected: boolean;
  multiSelected: boolean;
  busy?: StudioTool | null;
  canDrag: boolean;
  liveOffset?: { x: number; y: number } | null;
  eventTitle?: string;
  lifecycleStatus?: CardLifecycleStatus;
  /** 1-based post order on this board; omit when unscheduled. */
  sequenceNumber?: number | null;
  /** Workspace scheduled/published post for this draft id. */
  committedPost?: ScheduledPost | PublishedPost | null;
  /** Miro-style: card is above others in the stack */
  stackFront?: boolean;
  onSelect: (e: React.MouseEvent | React.PointerEvent) => void;
  onChange: (updater: (d: DraftPost) => DraftPost) => void;
  onTool: (tool: StudioTool) => void;
  onGenerateTranscript: () => void;
  onGenerateCaption: () => void;
  onDragStart: (e: React.PointerEvent) => void;
  onRaise?: () => void;
  onReschedule?: () => void;
}) {
  const stage = studioStage(draft);
  const open = draft.studioOpen ?? {};
  const ox = liveOffset?.x ?? 0;
  const oy = liveOffset?.y ?? 0;
  const dragging = ox !== 0 || oy !== 0;

  const hasTranscript = Boolean(draft.transcript?.trim());
  const hasCta = Boolean(draft.callToAction?.trim());
  const hasTitle = Boolean(draft.title?.trim());
  const hasCaption =
    Boolean(draft.caption?.trim()) || Boolean(draft.hashtags?.trim());
  const showSchedule =
    lifecycleStatus === "SCHEDULED" ||
    lifecycleStatus === "LIVE" ||
    lifecycleStatus === "FAILED" ||
    Boolean(committedPost);
  const showPerformance = lifecycleStatus === "LIVE";

  // Keep section chrome visible when content exists; tools expand body
  const showTranscript = Boolean(open.transcript) || hasTranscript;
  const showCta = Boolean(open.cta) || hasCta;
  const showTitle = Boolean(open.title) || hasTitle;
  const showCaption = Boolean(open.caption) || hasCaption;

  function patchOpen(key: keyof NonNullable<DraftPost["studioOpen"]>, value: boolean) {
    onChange((d) => ({
      ...d,
      studioOpen: { ...d.studioOpen, [key]: value },
    }));
  }

  function beginGrab(e: React.PointerEvent) {
    if (!canDrag) return;
    if (isEditableTarget(e.target)) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onRaise?.();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    onDragStart(e);
  }

  const zIndex = multiSelected || selected || stackFront ? 40 : 1;

  return (
    <div
      data-testid={`studio-card-${draft.id}`}
      data-stage={stage}
      data-studio-card={draft.id}
      className="absolute will-change-transform"
      data-dragging={dragging ? "true" : "false"}
      style={{
        left: draft.canvasX ?? 48,
        top: draft.canvasY ?? 48,
        width: STUDIO_CARD_WIDTH,
        zIndex,
        transform:
          ox !== 0 || oy !== 0 ? `translate3d(${ox}px, ${oy}px, 0)` : undefined,
        transition: dragging ? "none" : undefined,
      }}
    >
      <article
        className={cn(
          "overflow-hidden rounded-lg bg-card shadow-[var(--shadow-card)] select-none",
          !dragging &&
            "transition-[border-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-inout-lux)]",
          statusBorderClass(lifecycleStatus, multiSelected),
          selected && !dragging && "scale-[1.01]",
        )}
        onPointerDown={(e) => {
          // Raise on any interaction so buried cards become reachable (Miro)
          if (e.button === 0) onRaise?.();
        }}
      >
        {/* Media drag surface */}
        <div
          className={cn(
            "relative touch-none",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={beginGrab}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
          }}
        >
          <StudioCardMedia draft={draft} />
          {sequenceNumber != null && sequenceNumber > 0 ? (
            <span
              className="absolute left-1.5 top-1.5 z-10 flex h-6 min-w-6 items-center justify-center rounded-md border border-line bg-card/95 px-1.5 font-mono text-[0.65rem] font-bold tabular-nums text-foreground shadow-sm"
              data-testid="studio-card-sequence"
              title={`Post order ${sequenceNumber}`}
            >
              {String(sequenceNumber).padStart(2, "0")}
            </span>
          ) : null}
          {selected ? (
            <div className="absolute inset-x-1.5 bottom-1.5 z-10">
              <StudioCardToolbar draft={draft} busy={busy} onTool={onTool} />
            </div>
          ) : null}
        </div>

        {/* Title chrome — also a grab zone */}
        <div
          className={cn(
            "border-b border-line px-3 py-2.5 touch-none",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={beginGrab}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate font-display text-sm font-semibold text-foreground">
              {draftDisplayTitle(draft)}
            </p>
            <TrafficLight
              status={lifecycleStatus}
              size="sm"
              showLabel={lifecycleStatus !== "IDLE"}
              title={cardStatusLabel(lifecycleStatus)}
            />
          </div>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {stage === "caption"
              ? "Caption ready"
              : stage === "script"
                ? "Script started"
                : "New reel"}
          </p>
          <StudioPrepareChips draft={draft} className="mt-2" />
          {eventTitle ? (
            <p className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded border border-line bg-paper-2 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground">
              <Link2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{eventTitle}</span>
            </p>
          ) : null}
        </div>

        {/* Sections stay mounted when they have content; body expands with animation */}
        {showTranscript ? (
          <StudioTranscriptSection
            open={Boolean(open.transcript)}
            value={draft.transcript}
            busy={busy === "transcript"}
            onToggle={() => patchOpen("transcript", !open.transcript)}
            onChange={(transcript) => onChange((d) => ({ ...d, transcript }))}
            onGenerate={onGenerateTranscript}
          />
        ) : null}

        {showCta ? (
          <StudioCtaSection
            open={Boolean(open.cta)}
            value={draft.callToAction ?? ""}
            onToggle={() => patchOpen("cta", !open.cta)}
            onChange={(callToAction) => onChange((d) => ({ ...d, callToAction }))}
          />
        ) : null}

        {showTitle ? (
          <StudioTitleSection
            open={Boolean(open.title)}
            value={draft.title ?? ""}
            onToggle={() => patchOpen("title", !open.title)}
            onChange={(title) => onChange((d) => ({ ...d, title }))}
          />
        ) : null}

        {showCaption ? (
          <StudioCaptionSection
            open={Boolean(open.caption)}
            caption={draft.caption}
            hashtags={draft.hashtags}
            busy={busy === "caption"}
            onToggle={() => patchOpen("caption", !open.caption)}
            onCaption={(caption) => onChange((d) => ({ ...d, caption }))}
            onHashtags={(hashtags) => onChange((d) => ({ ...d, hashtags }))}
            onGenerate={onGenerateCaption}
          />
        ) : null}

        {showSchedule ? (
          <StudioCommittedScheduleSection
            open={Boolean(open.schedule)}
            draft={draft}
            post={committedPost}
            onToggle={() => patchOpen("schedule", !open.schedule)}
            onReschedule={
              lifecycleStatus !== "LIVE" ? onReschedule : undefined
            }
          />
        ) : null}

        {showPerformance ? (
          <StudioPerformanceSection
            open={Boolean(open.performance)}
            post={committedPost}
            onToggle={() => patchOpen("performance", !open.performance)}
          />
        ) : null}
      </article>
    </div>
  );
}
