import { Check, Layers, Upload } from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle, formatMediaMeta } from "@/lib/composer-draft";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { cn } from "@/lib/utils";
import { demoPreviewForPost } from "@/lib/demo-media";

/** Left rail — atomic cards in the batch queue. */
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
      className="composer-queue-pane flex flex-col border-r border-foreground bg-paper-2"
    >
      <div className="border-b border-foreground px-4 py-3">
        <p className="page-kicker">Batch queue</p>
        <h2 className="mt-1 font-display text-base font-bold text-foreground">
          {queue.length === 0 ? "No cards yet" : `${queue.length} card${queue.length === 1 ? "" : "s"}`}
        </h2>
        <p className="mt-0.5 text-caption text-muted-foreground">
          One upload = one atomic card
        </p>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 space-y-2 overflow-y-auto p-3",
          isDragging && "bg-accent/10",
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {queue.map((draft, i) => {
          const ready =
            draft.platforms.length > 0 &&
            draft.platforms.every((p) => Boolean(draft.proposedTimes?.[p])) &&
            Boolean(draft.caption.trim());
          const active = draft.id === activeId;
          return (
            <button
              key={draft.id}
              type="button"
              data-testid={`queue-card-${draft.id}`}
              onClick={() => onSelect(draft.id)}
              className={cn(
                "flex w-full gap-2.5 rounded-md border border-foreground p-2 text-left transition-colors",
                active
                  ? "bg-accent/20 "
                  : "bg-card hover:bg-secondary",
              )}
            >
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-foreground bg-background">
                {draft.previewUrl ? (
                  <CardThumbnail
                    src={draft.previewUrl}
                    post={{ id: draft.id, title: draft.filename, mediaKind: draft.mediaKind }}
                    alt=""
                    kind={draft.mediaKind}
                    layout="square"
                    className="!h-12 !w-12"
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
                  <span className="truncate font-display text-sm font-bold text-foreground">
                    {draftDisplayTitle(draft)}
                  </span>
                  {ready ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-success" strokeWidth={2.5} />
                  ) : (
                    <span className="font-data text-caption text-muted-foreground">{i + 1}</span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-caption text-muted-foreground">
                  {formatMediaMeta(draft)}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {draft.platforms.slice(0, 3).map((p) => (
                    <span
                      key={p}
                      className="rounded-sm border border-foreground/30 bg-paper-2 px-1 font-mono text-[0.6rem] font-semibold text-foreground"
                    >
                      {p}
                    </span>
                  ))}
                  {draft.eventId ? (
                    <Layers className="h-3 w-3 text-accent" strokeWidth={2} />
                  ) : null}
                </span>
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onAddClick}
          data-testid="queue-add-files"
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-foreground/50 bg-card px-3 py-6 text-body-sm font-semibold text-foreground transition-colors hover:border-foreground hover:bg-secondary"
        >
          <Upload className="h-5 w-5 text-accent" />
          Add files
          <span className="text-caption font-normal text-muted-foreground">
            Multi-select for batch
          </span>
        </button>
      </div>
    </aside>
  );
}
