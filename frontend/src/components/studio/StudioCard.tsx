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
import { StudioTranscriptSection } from "./StudioTranscriptSection";

export function StudioCard({
  draft,
  selected,
  busy,
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
  busy?: StudioTool | null;
  workspacePlatforms: Platform[];
  canCommit: boolean;
  onSelect: () => void;
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
      className={cn(
        "absolute touch-none select-none",
        selected && "z-30",
      )}
      style={{
        left: draft.canvasX ?? 48,
        top: draft.canvasY ?? 48,
        width: STUDIO_CARD_WIDTH,
      }}
    >
      {selected ? (
        <StudioCardToolbar draft={draft} busy={busy} onTool={onTool} />
      ) : null}

      <article
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className={cn(
          "overflow-hidden rounded-lg border bg-card shadow-[var(--shadow-card)] transition-[box-shadow,border-color,ring-color] duration-200",
          selected
            ? "border-brand ring-2 ring-brand ring-offset-2 ring-offset-paper-2"
            : "border-line hover:border-foreground/30",
        )}
      >
        <div
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={onDragStart}
        >
          <StudioCardMedia draft={draft} />
        </div>

        <div className="border-b border-line px-3 py-2.5">
          <p className="truncate font-display text-sm font-semibold text-foreground">
            {draftDisplayTitle(draft)}
          </p>
          <p className="mt-0.5 text-caption text-muted-foreground">
            {stage === "ready"
              ? "Ready to schedule"
              : stage === "schedule"
                ? "Set destinations"
                : stage === "caption" || draft.caption
                  ? "Caption set"
                  : stage === "script"
                    ? "Script started"
                    : "New reel"}
            {draft.platforms.length > 0
              ? ` · ${draft.platforms.length} platforms`
              : ""}
          </p>
        </div>

        {(open.transcript || selected) && (
          <StudioTranscriptSection
            open={Boolean(open.transcript)}
            value={draft.transcript}
            busy={busy === "transcript"}
            onToggle={() => patchOpen("transcript", !open.transcript)}
            onChange={(transcript) => onChange((d) => ({ ...d, transcript }))}
            onGenerate={onGenerateTranscript}
          />
        )}

        {(open.cta || selected) && (
          <StudioCtaSection
            open={Boolean(open.cta)}
            value={draft.callToAction ?? ""}
            onToggle={() => patchOpen("cta", !open.cta)}
            onChange={(callToAction) => onChange((d) => ({ ...d, callToAction }))}
          />
        )}

        {(open.caption || selected) && (
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
        )}

        {(open.schedule || selected) && (
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
        )}
      </article>
    </div>
  );
}
