import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { Platform } from "@/lib/mock-data";
import { combineDateAndTime } from "@/lib/schedule-engine";
import { STUDIO_CARD_WIDTH, studioStage } from "@/lib/studio-layout";
import { cn } from "@/lib/utils";
import { StudioCaptionSection } from "./StudioCaptionSection";
import { StudioCardMedia } from "./StudioCardMedia";
import { StudioCardToolbar, type StudioTool } from "./StudioCardToolbar";
import { StudioCtaSection } from "./StudioCtaSection";
import { StudioScheduleSection } from "./StudioScheduleSection";
import { StudioTitleSection } from "./StudioTitleSection";
import { StudioTranscriptSection } from "./StudioTranscriptSection";

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
  workspacePlatforms,
  canCommit,
  onSelect,
  onChange,
  onTool,
  onGenerateTranscript,
  onGenerateCaption,
  onBestTimes,
  onCommit,
  onDragStart,
}: {
  draft: DraftPost;
  selected: boolean;
  multiSelected: boolean;
  busy?: StudioTool | null;
  canDrag: boolean;
  liveOffset?: { x: number; y: number } | null;
  workspacePlatforms: Platform[];
  canCommit: boolean;
  onSelect: (e: React.MouseEvent | React.PointerEvent) => void;
  onChange: (updater: (d: DraftPost) => DraftPost) => void;
  onTool: (tool: StudioTool) => void;
  onGenerateTranscript: () => void;
  onGenerateCaption: () => void;
  onBestTimes: () => void;
  onCommit: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  const stage = studioStage(draft);
  const open = draft.studioOpen ?? {};
  const ox = liveOffset?.x ?? 0;
  const oy = liveOffset?.y ?? 0;

  function patchOpen(key: keyof NonNullable<DraftPost["studioOpen"]>, value: boolean) {
    onChange((d) => ({
      ...d,
      studioOpen: { ...d.studioOpen, [key]: value },
    }));
  }

  return (
    <div
      data-testid={`studio-card-${draft.id}`}
      data-stage={stage}
      data-studio-card={draft.id}
      className={cn("absolute will-change-transform", multiSelected && "z-30")}
      style={{
        left: draft.canvasX ?? 48,
        top: draft.canvasY ?? 48,
        width: STUDIO_CARD_WIDTH,
        transform:
          ox !== 0 || oy !== 0 ? `translate3d(${ox}px, ${oy}px, 0)` : undefined,
      }}
    >
      {selected ? (
        <StudioCardToolbar draft={draft} busy={busy} onTool={onTool} />
      ) : null}

      <article
        className={cn(
          "overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-150 select-none",
          multiSelected
            ? "border-brand ring-2 ring-brand ring-offset-2 ring-offset-paper-2"
            : "border-line hover:border-foreground/30",
        )}
      >
        <div
          className={cn(
            "touch-none",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onPointerDown={(e) => {
            if (!canDrag) return;
            if (isEditableTarget(e.target)) return;
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            onDragStart(e);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
          }}
        >
          <StudioCardMedia draft={draft} />
        </div>

        <div
          className="border-b border-line px-3 py-2.5"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(e);
          }}
        >
          <p className="truncate font-display text-sm font-semibold text-foreground">
            {draftDisplayTitle(draft)}
          </p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {stage === "caption"
              ? "Caption ready — schedule when set"
              : stage === "script"
                ? "Script started — generate caption"
                : "New reel — transcript & CTA"}
          </p>
        </div>

        {selected || open.transcript ? (
          <StudioTranscriptSection
            open={Boolean(open.transcript)}
            value={draft.transcript}
            busy={busy === "transcript"}
            onToggle={() => patchOpen("transcript", !open.transcript)}
            onChange={(transcript) => onChange((d) => ({ ...d, transcript }))}
            onGenerate={onGenerateTranscript}
          />
        ) : null}

        {selected || open.cta ? (
          <StudioCtaSection
            open={Boolean(open.cta)}
            value={draft.callToAction ?? ""}
            onToggle={() => patchOpen("cta", !open.cta)}
            onChange={(callToAction) => onChange((d) => ({ ...d, callToAction }))}
          />
        ) : null}

        {selected || open.title || open.caption ? (
          <StudioTitleSection
            open={Boolean(open.title ?? open.caption)}
            value={draft.title ?? ""}
            onToggle={() =>
              patchOpen("title", !(open.title ?? open.caption))
            }
            onChange={(title) => onChange((d) => ({ ...d, title }))}
          />
        ) : null}

        {selected || open.caption ? (
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

        {selected || open.schedule ? (
          <StudioScheduleSection
            open={Boolean(open.schedule)}
            draft={draft}
            workspacePlatforms={workspacePlatforms}
            busy={busy === "schedule"}
            canCommit={canCommit}
            onToggle={() => patchOpen("schedule", !open.schedule)}
            onPlatforms={(platforms) => onChange((d) => ({ ...d, platforms }))}
            onTime={(platform, dateStr, timeStr) => {
              const iso = combineDateAndTime(dateStr, timeStr);
              onChange((d) => ({
                ...d,
                proposedTimes: { ...(d.proposedTimes ?? {}), [platform]: iso },
              }));
            }}
            onBestTimes={onBestTimes}
            onCommit={onCommit}
          />
        ) : null}
      </article>
    </div>
  );
}
