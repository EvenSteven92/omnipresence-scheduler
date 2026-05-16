import { useMemo, useState } from "react";
import {
  Wand2,
  Save,
  Sparkles,
  X,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  GripVertical,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { PLATFORMS, PLATFORMS_BY_SHORT, FORMAT_META, type PostFormat } from "@/lib/platforms";
import { aiGenerate, type AiKind } from "@/lib/ai-client";
import type { Platform } from "@/lib/mock-data";
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
  /** Per-platform proposed times (ISO). Populated by Generate_Optimal_Schedule. */
  proposedTimes?: Partial<Record<Platform, string>>;
  /** Per-platform reason chip text. */
  proposedReasons?: Partial<Record<Platform, string>>;
  /** True once user has clicked Schedule_Post on this card. */
  scheduled?: boolean;
}

const PLATFORM_CHIP_BASE =
  "flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em] transition-colors";

export function ComposerCard({
  post,
  index,
  onChange,
  onRemove,
  onSaveDraft,
  onSchedulePost,
  expanded,
  dragHandlers,
  isDragging,
}: {
  post: DraftPost;
  /** 1-based position in the bulk grid — shown as #N badge in header. */
  index: number;
  onChange: (next: DraftPost) => void;
  onRemove: () => void;
  onSaveDraft: () => void;
  onSchedulePost: () => void;
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

  const hasProposedTimes = !!post.proposedTimes && Object.keys(post.proposedTimes).length > 0;

  // Earliest proposed datetime across platforms (used by conflict detection).
  const earliestProposed = useMemo(() => {
    if (!post.proposedTimes) return undefined;
    const times = Object.values(post.proposedTimes).filter(Boolean) as string[];
    if (times.length === 0) return undefined;
    return times.sort()[0];
  }, [post.proposedTimes]);

  // Conflict detection — uses the earliest proposed slot
  const conflicts = useMemo(() => {
    if (!earliestProposed) return [];
    return detectConflicts(new Date(earliestProposed), post.platforms, post.id);
  }, [earliestProposed, post.platforms, post.id]);

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

  // (per-platform display now lives inside <SuggestedTimes /> below)


  return (
    <article
      data-testid={`composer-card-${post.id}`}
      {...(dragHandlers ?? {})}
      className={`flex flex-col overflow-hidden rounded-sm border bg-surface transition-opacity ${
        post.scheduled ? "border-success/60" : "border-border"
      } ${isDragging ? "opacity-40" : "opacity-100"}`}
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
          <span
            data-testid={`card-index-${post.id}`}
            className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-foreground px-1.5 font-mono text-[0.6rem] font-semibold text-background"
            title={`Card position ${index}`}
          >
            #{index}
          </span>
          <span className="rounded-sm border border-border bg-background/60 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.14em] text-foreground">
            {FORMAT_META[post.format].label}
          </span>
          <span className="rounded-sm border border-accent/60 bg-accent/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent">
            auto · {post.autoFormat}
          </span>
          {post.scheduled && (
            <span className="rounded-sm border border-success/60 bg-success/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-success">
              scheduled
            </span>
          )}
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

      {/* Suggested times (per platform, editable) */}
      <SuggestedTimes
        post={post}
        onChangeTime={(platform, isoLocal) => {
          const next = { ...(post.proposedTimes ?? {}) } as Partial<Record<Platform, string>>;
          next[platform] = isoLocal;
          onChange({ ...post, proposedTimes: next });
        }}
      />

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
          onClick={onSchedulePost}
          disabled={!hasProposedTimes || post.platforms.length === 0 || post.scheduled}
          data-testid={`schedule-post-${post.id}`}
          title={
            post.scheduled
              ? "Already scheduled"
              : !hasProposedTimes
                ? "Generate optimal schedule first"
                : "Commit this card to the schedule"
          }
          className="flex items-center justify-center gap-2 bg-primary px-4 py-3 text-[0.65rem] uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
        >
          {post.scheduled ? (
            <>
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
              Scheduled
            </>
          ) : (
            <>
              <Wand2 className="h-3 w-3" strokeWidth={2} />
              Schedule_Post
            </>
          )}
        </button>
      </div>
    </article>
  );
}

// ─── Suggested times sub-section ────────────────────────────────────────────

function SuggestedTimes({
  post,
  onChangeTime,
}: {
  post: DraftPost;
  onChangeTime: (platform: Platform, isoLocal: string) => void;
}) {
  if (post.platforms.length === 0) return null;
  const hasTimes = !!post.proposedTimes && Object.keys(post.proposedTimes).length > 0;

  return (
    <section className="mt-4 px-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="label-mono">suggested_times_per_platform</span>
        {!hasTimes && (
          <span className="label-mono text-muted-foreground/70">
            click_generate_in_sidebar
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-sm border border-border bg-background/40">
        {post.platforms.map((p, i) => {
          const meta = PLATFORMS_BY_SHORT[p];
          const Icon = meta?.Icon;
          const iso = post.proposedTimes?.[p];
          const reason = post.proposedReasons?.[p];
          return (
            <div
              key={p}
              data-testid={`slot-${post.id}-${p.replace(/\s+/g, "-")}`}
              className={`flex items-center gap-3 px-3 py-2 ${
                i > 0 ? "border-t border-border/60" : ""
              }`}
            >
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs text-foreground">{meta?.full ?? p}</div>
                {iso ? (
                  <div className="label-mono mt-0.5 text-[0.55rem] text-muted-foreground/80">
                    {reason ?? "peak_window"}
                  </div>
                ) : (
                  <div className="label-mono mt-0.5 text-[0.55rem] text-muted-foreground/50">
                    not_yet_generated
                  </div>
                )}
              </div>
              {iso ? (
                <input
                  type="datetime-local"
                  value={toLocalInput(iso)}
                  onChange={(e) => onChangeTime(p, fromLocalInput(e.target.value))}
                  data-testid={`slot-input-${post.id}-${p.replace(/\s+/g, "-")}`}
                  className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-[0.6rem] text-foreground focus:border-accent focus:outline-none"
                />
              ) : (
                <span className="rounded-sm border border-dashed border-border px-2 py-1 font-mono text-[0.6rem] text-muted-foreground/60">
                  --
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Convert ISO string to value compatible with <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}
function fromLocalInput(local: string): string {
  // Treat input as local time → ISO
  return new Date(local).toISOString();
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
