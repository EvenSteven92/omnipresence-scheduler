import { useMemo, useState } from "react";
import { Wand2, Save, Sparkles, X, FileVideo, Image as ImageIcon, Loader2, GripVertical, AlertTriangle } from "lucide-react";
import { PLATFORMS, FORMAT_META, type PostFormat } from "@/lib/platforms";
import { aiGenerate, type AiKind } from "@/lib/ai-client";
import type { Platform } from "@/lib/mock-data";
import { PlatformRow } from "./PlatformRow";
import { CharCounters } from "./CharCounters";
import { PlatformPreview } from "./PlatformPreview";
import { detectConflicts } from "@/lib/conflicts";

export interface DraftPost {
  id: string;
  filename: string;
  sizeMB?: number;
  mediaKind: "image" | "video";
  format: PostFormat;
  /** Format auto-detected from media — used to badge AUTO·{format} */
  autoFormat: PostFormat;
  platforms: Platform[];
  caption: string;
  hashtags: string;
  transcript: string;
  /** Proposed scheduled time once auto-schedule has run. */
  proposedDate?: string;
}

const PLATFORM_CHIP_BASE =
  "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em] transition-colors";

export function ComposerCard({
  post,
  onChange,
  onRemove,
  onSaveDraft,
  onAutoSchedule,
  expanded,
  dragHandlers,
  isDragging,
}: {
  post: DraftPost;
  onChange: (next: DraftPost) => void;
  onRemove: () => void;
  onSaveDraft: () => void;
  onAutoSchedule: () => void;
  expanded: boolean;
  /** Native HTML5 drag handlers passed from the parent grid. */
  dragHandlers?: {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  isDragging?: boolean;
}) {
  const [busy, setBusy] = useState<AiKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const incompatiblePlatforms = useMemo(
    () =>
      new Set(
        PLATFORMS.filter((p) => !p.formats.includes(post.format)).map((p) => p.short),
      ),
    [post.format],
  );

  // Conflict detection — only runs once a proposed date is set
  const conflicts = useMemo(() => {
    if (!post.proposedDate) return [];
    return detectConflicts(new Date(post.proposedDate), post.platforms, post.id);
  }, [post.proposedDate, post.platforms, post.id]);

  function toggleFormat(f: PostFormat) {
    // Auto-drop platforms that don't accept the new format
    const allowed = new Set(PLATFORMS.filter((p) => p.formats.includes(f)).map((p) => p.short));
    onChange({
      ...post,
      format: f,
      platforms: post.platforms.filter((p) => allowed.has(p)),
    });
  }

  function togglePlatform(p: Platform) {
    const has = post.platforms.includes(p);
    onChange({ ...post, platforms: has ? post.platforms.filter((x) => x !== p) : [...post.platforms, p] });
  }

  async function runAi(kind: AiKind) {
    setBusy(kind);
    setError(null);
    try {
      const brief = post.transcript?.trim() || post.caption?.trim() || post.filename;
      const text = await aiGenerate({
        kind,
        brief,
        title: post.filename,
        platforms: post.platforms,
      });
      if (kind === "caption") onChange({ ...post, caption: text });
      else if (kind === "hashtags") onChange({ ...post, hashtags: text });
      else if (kind === "yt_desc") onChange({ ...post, caption: text });
    } catch (e) {
      setError((e as Error).message || "AI request failed");
    } finally {
      setBusy(null);
    }
  }

  const platformEntries = post.platforms.map((p) => ({
    platform: p,
    state: "pending" as const,
    at: post.proposedDate
      ? new Date(post.proposedDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
      : undefined,
  }));

  return (
    <article
      data-testid={`composer-card-${post.id}`}
      {...(dragHandlers ?? {})}
      className={`flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {dragHandlers && (
            <span
              title="Drag to reorder"
              data-testid="drag-handle"
              className="cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" strokeWidth={1.5} />
            </span>
          )}
          <span className="rounded-sm border border-border bg-background/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground">
            {FORMAT_META[post.format].label}
          </span>
          <span className="rounded-sm border border-accent/60 bg-accent/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent">
            auto · {post.autoFormat}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="remove card"
          className="rounded-sm border border-border bg-background/60 p-1 text-muted-foreground transition-colors hover:text-foreground"
          data-testid="composer-remove-btn"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Preview */}
      <div
        className={`flex items-center justify-center border-b border-border bg-background/40 ${
          post.format === "landscape" ? "aspect-video" : expanded ? "aspect-[3/4]" : "aspect-square"
        }`}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          {post.mediaKind === "video" ? (
            <FileVideo className="h-6 w-6" strokeWidth={1.4} />
          ) : (
            <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
          )}
          <span className="label-mono text-[0.55rem]">preview_placeholder</span>
        </div>
      </div>

      {/* Filename + size */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <span className="truncate text-xs text-foreground">{post.filename}</span>
        {post.sizeMB != null && (
          <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-wide text-muted-foreground">
            {post.sizeMB.toFixed(1)} MB
          </span>
        )}
      </div>

      {/* Format spec */}
      <div className="px-4 pt-3">
        <div className="label-mono mb-2">format_spec</div>
        <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-sm border border-border">
          {(Object.keys(FORMAT_META) as PostFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFormat(f)}
              data-testid={`format-${f}`}
              className={`px-3 py-2 text-center text-[0.6rem] uppercase tracking-[0.14em] transition-colors ${
                post.format === f
                  ? "bg-foreground text-background"
                  : "bg-background/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {FORMAT_META[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* Target platforms */}
      <div className="px-4 pt-4">
        <div className="label-mono mb-2">target_platforms</div>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((meta) => {
            const active = post.platforms.includes(meta.short);
            const disabled = incompatiblePlatforms.has(meta.short);
            const { Icon } = meta;
            return (
              <button
                key={meta.short}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && togglePlatform(meta.short)}
                data-testid={`platform-${meta.short.replace(/\s+/g, "-")}`}
                title={disabled ? `${meta.full} doesn't support ${post.format}` : meta.full}
                className={`${PLATFORM_CHIP_BASE} ${
                  disabled
                    ? "cursor-not-allowed border-border/40 bg-background/30 text-muted-foreground/40"
                    : active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background/60 text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3 w-3" strokeWidth={2} />
                {meta.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="label-mono">caption</span>
          <div className="flex items-center gap-1">
            <AiButton
              label="caption"
              busy={busy === "caption"}
              onClick={() => runAi("caption")}
              testid={`ai-caption-${post.id}`}
            />
            <AiButton
              label="yt_desc"
              busy={busy === "yt_desc"}
              onClick={() => runAi("yt_desc")}
              testid={`ai-yt-desc-${post.id}`}
            />
          </div>
        </div>
        <textarea
          value={post.caption}
          onChange={(e) => onChange({ ...post, caption: e.target.value })}
          placeholder="caption / description…"
          data-testid={`caption-input-${post.id}`}
          rows={3}
          className="w-full resize-y rounded-sm border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
        />
        <CharCounters text={post.caption} platforms={post.platforms} />
      </div>

      {/* Hashtags */}
      <div className="px-4 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label-mono">hashtags</span>
          <AiButton
            label="hashtags"
            busy={busy === "hashtags"}
            onClick={() => runAi("hashtags")}
            testid={`ai-hashtags-${post.id}`}
          />
        </div>
        <textarea
          value={post.hashtags}
          onChange={(e) => onChange({ ...post, hashtags: e.target.value })}
          placeholder="#tag #tag"
          data-testid={`hashtags-input-${post.id}`}
          rows={2}
          className="w-full resize-y rounded-sm border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
        />
      </div>

      {/* Transcript */}
      <div className="px-4 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="label-mono">transcript</span>
          <span className="label-mono text-muted-foreground/60">
            paste to power AI generation
          </span>
        </div>
        <textarea
          value={post.transcript}
          onChange={(e) => onChange({ ...post, transcript: e.target.value })}
          placeholder="auto-transcribe or paste…"
          data-testid={`transcript-input-${post.id}`}
          rows={2}
          className="w-full resize-y rounded-sm border border-border bg-background/60 px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-sm border border-danger/60 bg-danger/10 px-3 py-2 text-[0.65rem] text-danger">
          {error}
        </div>
      )}

      {/* Conflict warnings (post auto-schedule) */}
      {conflicts.length > 0 && (
        <div
          data-testid={`conflict-banner-${post.id}`}
          className="mx-4 mt-3 rounded-sm border border-warning/60 bg-warning/10 px-3 py-2 text-[0.65rem] text-warning"
        >
          <div className="mb-1 flex items-center gap-1.5 font-mono uppercase tracking-[0.14em]">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            schedule_conflict · {conflicts.length}
          </div>
          {conflicts.map((c) => (
            <div key={c.withId} className="leading-snug">
              · {c.sharedPlatforms.join("/")} overlap with “{c.withTitle}” (±{c.deltaMinutes}min)
            </div>
          ))}
        </div>
      )}

      {/* Selected platform row preview */}
      {post.platforms.length > 0 && (
        <div className="mt-4 px-4">
          <div className="label-mono mb-2">
            {post.proposedDate ? "scheduled_to" : "will_post_to"}
          </div>
          <PlatformRow entries={platformEntries} size="sm" compact />
        </div>
      )}

      {/* Live platform previews (collapsible) */}
      <div className="mt-4">
        <PlatformPreview
          platforms={post.platforms}
          caption={post.caption}
          hashtags={post.hashtags}
          filename={post.filename}
          format={post.format}
        />
      </div>

      {/* Footer actions */}
      <div className="grid grid-cols-2 border-t border-border">
        <button
          type="button"
          onClick={onSaveDraft}
          data-testid={`save-draft-${post.id}`}
          className="flex items-center justify-center gap-2 border-r border-border bg-surface px-4 py-3 text-[0.65rem] uppercase tracking-[0.14em] text-foreground transition-colors hover:bg-secondary"
        >
          <Save className="h-3 w-3" strokeWidth={2} />
          Save_Draft
        </button>
        <button
          type="button"
          onClick={onAutoSchedule}
          data-testid={`auto-schedule-${post.id}`}
          className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Wand2 className="h-3 w-3" strokeWidth={2} />
          AI_Auto_Schedule
        </button>
      </div>
    </article>
  );
}

function AiButton({
  label,
  busy,
  onClick,
  testid,
}: {
  label: string;
  busy: boolean;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      data-testid={testid}
      className="flex items-center gap-1 rounded-sm border border-border bg-background/60 px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <Sparkles className="h-2.5 w-2.5" />
      )}
      {label}
    </button>
  );
}
