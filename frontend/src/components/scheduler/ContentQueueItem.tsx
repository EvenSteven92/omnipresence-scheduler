import { FileVideo, GripVertical, Image as ImageIcon } from "lucide-react";
import type { DraftPost } from "@/components/post/ComposerCard";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";
import { PlatformChip } from "@/components/post/PlatformChip";
import { buildPlatformSlots, formatScheduleTimeShort } from "@/lib/schedule-display";

function formatSavedAt(savedAt?: number): string {
  if (!savedAt) return "";
  return new Date(savedAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ContentQueueItem({
  post,
  index,
  active,
  onSelect,
  dragHandlers,
  isDragging,
  variant = "queue",
  savedAt,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  post: DraftPost;
  index: number;
  active: boolean;
  onSelect: () => void;
  dragHandlers?: {
    draggable: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
  };
  isDragging?: boolean;
  variant?: "queue" | "draft";
  savedAt?: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const slots = buildPlatformSlots(post.platforms, post.proposedTimes);
  const hasSchedule = slots.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      data-testid={`queue-item-${index}`}
      {...(dragHandlers ?? {})}
      className={`group w-full cursor-pointer rounded-sm border text-left transition-colors ${
        active
          ? "border-accent bg-accent/10"
          : variant === "draft"
            ? "border-border bg-surface/80 hover:bg-secondary/40"
            : "border-border bg-background/40 hover:bg-secondary/40"
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
    >
      <div className="flex items-start gap-2 px-3 py-3">
        {selectable ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid={`queue-select-${index}`}
            className="mt-1 h-3 w-3 shrink-0 accent-accent"
          />
        ) : null}
        {dragHandlers ? (
          <span
            title={
              variant === "draft"
                ? "Drag to reorder or move to potential posts"
                : "Drag to reorder or move to drafts"
            }
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} />
          </span>
        ) : null}
        <span className="mt-0.5 shrink-0 text-muted-foreground">
          {post.mediaKind === "video" ? (
            <FileVideo className="h-3.5 w-3.5" strokeWidth={1.5} />
          ) : (
            <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate text-xs font-medium text-foreground">{post.filename}</span>
            {variant === "draft" ? (
              <span className="shrink-0 rounded-sm border border-border px-1 py-0.5 text-[0.45rem] uppercase tracking-[0.12em] text-muted-foreground">
                draft
              </span>
            ) : null}
          </div>
          {variant === "draft" && savedAt ? (
            <p className="mt-1 font-mono text-[0.5rem] text-muted-foreground/70">
              saved · {formatSavedAt(savedAt)}
            </p>
          ) : null}
          {post.platforms.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.platforms.map((p) => {
                const meta = PLATFORMS_BY_SHORT[p];
                return (
                  <PlatformChip key={p} platform={p} label={p} size="xs" title={meta?.full ?? p} />
                );
              })}
            </div>
          ) : (
            <p className="mt-1.5 text-[0.6rem] text-muted-foreground">No platforms yet</p>
          )}
          {hasSchedule ? (
            <ul className="mt-2 space-y-0.5 border-t border-border/50 pt-2">
              {slots.slice(0, 4).map((slot) => (
                <li
                  key={slot.platform}
                  className="flex items-center justify-between gap-2 font-mono text-[0.55rem] text-muted-foreground"
                >
                  <span className="truncate uppercase tracking-wide">{slot.platform}</span>
                  <span className="shrink-0 text-foreground/90">
                    {formatScheduleTimeShort(slot.iso)}
                  </span>
                </li>
              ))}
              {slots.length > 4 ? (
                <li className="font-mono text-[0.5rem] text-muted-foreground/70">
                  +{slots.length - 4} more
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mt-2 text-[0.6rem] text-muted-foreground/70">No times set</p>
          )}
        </div>
      </div>
    </div>
  );
}
