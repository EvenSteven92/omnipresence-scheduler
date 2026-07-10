import { Check, Plus, Upload } from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { cn } from "@/lib/utils";
import { demoPreviewForPost } from "@/lib/demo-media";

/**
 * Batch filmstrip — Opus/Later style card rail.
 * One upload = one atomic reel card.
 */
export function ComposerQueueRail({
  queue,
  activeId,
  onSelect,
  onAddClick,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  queue: DraftPost[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAddClick: () => void;
  isDragging?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  return (
    <aside
      data-testid="composer-queue-rail"
      className="composer-queue-pane flex flex-col border-r border-line bg-paper-2"
    >
      <div className="border-b border-line px-4 py-4">
        <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Your reels
        </p>
        <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
          {queue.length === 0
            ? "Drop to start"
            : `${queue.length} reel${queue.length === 1 ? "" : "s"}`}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Each file is its own card — caption, platforms, times
        </p>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto p-3",
          isDragging && "bg-secondary",
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {queue.map((draft, i) => {
          const ready =
            draft.platforms.length > 0 &&
            draft.platforms.every((p) => Boolean(draft.proposedTimes?.[p]));
          const active = draft.id === activeId;
          return (
            <button
              key={draft.id}
              type="button"
              data-testid={`queue-card-${draft.id}`}
              onClick={() => onSelect(draft.id)}
              className={cn(
                "flex w-full gap-3 rounded-lg border p-2 text-left transition-colors",
                active
                  ? "border-brand bg-brand-soft text-foreground shadow-[var(--shadow-card)]"
                  : "border-line bg-card text-foreground hover:bg-secondary",
              )}
            >
              <span
                className={cn(
                  "h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-background",
                  active ? "border-brand/30" : "border-line",
                )}
              >
                {draft.previewUrl ? (
                  <CardThumbnail
                    src={draft.previewUrl}
                    post={{ id: draft.id, title: draft.filename, mediaKind: draft.mediaKind }}
                    alt=""
                    kind={draft.mediaKind}
                    layout="square"
                    className="!h-14 !w-14"
                  />
                ) : (
                  <img
                    src={demoPreviewForPost({ id: draft.id, title: draft.filename })}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-1">
                  <span className="line-clamp-2 font-display text-sm font-semibold leading-snug text-foreground">
                    {draftDisplayTitle(draft)}
                  </span>
                  {ready ? (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-success"
                      strokeWidth={2.5}
                    />
                  ) : (
                    <span className="font-data text-caption text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </span>
                <span className="mt-1 block truncate text-caption text-muted-foreground">
                  {draft.aspectLabel ? `${draft.aspectLabel} · ` : ""}
                  {draft.caption.trim() ? "captioned" : "needs caption"}
                  {draft.dropboxUrl ? " · Dropbox" : ""}
                </span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddClick}
          data-testid="queue-add-files"
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line bg-card px-3 py-5 text-body-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-secondary"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          Add reels
          <span className="text-caption font-normal text-muted-foreground">
            Multi-select or Dropbox
          </span>
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="border-t border-line p-4">
          <div className="flex items-start gap-2 rounded-md border border-line bg-card p-3">
            <Upload className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Drop Sunday’s reels here. AI captions + peak times in one pass.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
