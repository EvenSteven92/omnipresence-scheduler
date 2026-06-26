import { useEffect, useMemo, useState } from "react";
import { Save, Sparkles, X, Loader2, GripVertical, AlertTriangle } from "lucide-react";
import { CardThumbnail, type CardThumbnailAspect } from "@/components/ui/CardThumbnail";
import { PLATFORMS, FORMAT_META, type PostFormat } from "@/lib/platforms";
import { aiGenerate, type AiKind } from "@/lib/ai-client";
import type { Platform } from "@/lib/mock-data";
import { CHAR_LIMITS } from "./CharCounters";
import { ContentPublishSchedule } from "./ContentPublishSchedule";
import { PlatformSelectChip } from "./PlatformChip";
import { detectConflicts } from "@/lib/conflicts";
import { useWorkspace } from "@/lib/workspace-context";
import { EventAssociationPicker } from "@/components/events/EventAssociationPicker";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { mergeWorkspaceEvents, useCustomEvents } from "@/hooks/useCustomEvents";
import { formatEventTime, getEventById } from "@/lib/events/display";
import { platformDotColor } from "@/lib/card-display";

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
  /** Per-platform caption overrides — falls back to `caption` when unset. */
  platformCaptions?: Partial<Record<Platform, string>>;
  hashtags: string;
  transcript: string;
  /** Per-platform proposed times (ISO). Populated by Suggest_times. */
  proposedTimes?: Partial<Record<Platform, string>>;
  /** Unix ms when the user saved this card to the draft dropzone. */
  savedAt?: number;
  /** Associated event album — groups this file with related ministry media. */
  eventId?: string;
  /** Object URL for the uploaded file — set in scheduler addFiles. */
  previewUrl?: string;
}

function ComposerSectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="mb-3.5 font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
      {n} · {title}
    </div>
  );
}

const inputClass =
  "w-full resize-y rounded-md border-[1.5px] border-foreground bg-background px-3.5 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent/40";

export function ComposerCard({
  post,
  index,
  onChange,
  onRemove,
  onSaveDraft,
  expanded,
  focused = false,
  hideFooterActions = false,
  dragHandlers,
  isDragging,
}: {
  post: DraftPost;
  /** 1-based position in the bulk grid — shown as #N badge in header. */
  index: number;
  onChange: (next: DraftPost) => void;
  onRemove: () => void;
  onSaveDraft: () => void;
  expanded: boolean;
  /** Master–detail editor: slimmer chrome, sections tuned for one card at a time. */
  focused?: boolean;
  /** When true, save-draft footer is omitted (parent provides footer actions). */
  hideFooterActions?: boolean;
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

  const { workspace, workspaceId } = useWorkspace();
  const { customEvents } = useCustomEvents(workspaceId);
  const createEventFlow = useCreateEventFlow();
  const workspaceEvents = mergeWorkspaceEvents(workspace.events, customEvents);
  const [captionPlatform, setCaptionPlatform] = useState<Platform | "all">("all");

  useEffect(() => {
    if (captionPlatform !== "all" && !post.platforms.includes(captionPlatform)) {
      setCaptionPlatform("all");
    }
  }, [captionPlatform, post.platforms]);

  const availablePlatforms = useMemo(
    () => PLATFORMS.filter((p) => workspace.platforms.includes(p.short)),
    [workspace.platforms],
  );

  const incompatiblePlatforms = useMemo(
    () =>
      new Set(
        availablePlatforms.filter((p) => !p.formats.includes(post.format)).map((p) => p.short),
      ),
    [post.format, availablePlatforms],
  );

  const earliestProposed = useMemo(() => {
    if (!post.proposedTimes) return undefined;
    const times = Object.values(post.proposedTimes).filter(Boolean) as string[];
    if (times.length === 0) return undefined;
    return times.sort()[0];
  }, [post.proposedTimes]);

  const conflicts = useMemo(() => {
    if (!earliestProposed) return [];
    return detectConflicts(
      workspace.scheduledPosts,
      new Date(earliestProposed),
      post.platforms,
      post.id,
    );
  }, [earliestProposed, post.platforms, post.id, workspace.scheduledPosts]);

  const linkedEvent = post.eventId ? getEventById(workspaceEvents, post.eventId) : undefined;
  const thumbAspect: CardThumbnailAspect =
    post.format === "portrait" || post.format === "story" ? "portrait" : "video";
  const hashtagCount = post.hashtags.trim()
    ? post.hashtags
        .trim()
        .split(/\s+/)
        .filter((h) => h.startsWith("#")).length
    : 0;

  function toggleFormat(f: PostFormat) {
    const allowed = new Set(
      availablePlatforms.filter((p) => p.formats.includes(f)).map((p) => p.short),
    );
    onChange({
      ...post,
      format: f,
      platforms: post.platforms.filter((p) => allowed.has(p)),
    });
  }

  function togglePlatform(p: Platform) {
    const has = post.platforms.includes(p);
    onChange({
      ...post,
      platforms: has ? post.platforms.filter((x) => x !== p) : [...post.platforms, p],
    });
  }

  async function runAi(kind: AiKind) {
    setBusy(kind);
    setError(null);
    try {
      const eventContext = linkedEvent
        ? `This post is part of the event "${linkedEvent.title}". `
        : "";
      const brief = `${eventContext}${post.transcript?.trim() || post.caption?.trim() || post.filename}`;
      const text = await aiGenerate({
        kind,
        brief,
        title: post.filename,
        platforms: post.platforms,
        tone: workspace.voice,
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

  if (focused) {
    return (
      <div data-testid={`composer-card-${post.id}`} className="flex flex-col gap-4">
        <section className="panel p-[18px]">
          <ComposerSectionLabel n="01" title="MEDIA" />
          <div className="flex items-center gap-4 rounded-md border-[1.5px] border-dashed border-foreground bg-background px-5 py-5">
            <CardThumbnail
              src={post.previewUrl}
              post={{ id: post.id, title: post.filename, mediaKind: post.mediaKind }}
              alt={post.filename}
              kind={post.mediaKind}
              aspect={thumbAspect}
              layout="square"
              className="!h-[74px] !w-[74px]"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-[0.9375rem] font-semibold text-foreground">
                {post.filename}
              </div>
              <div className="mt-1 font-mono text-[0.6875rem] font-medium text-muted-foreground">
                {post.mediaKind === "video" ? "Video" : "Image"} · {FORMAT_META[post.format].label}
                {post.sizeMB != null ? ` · ${post.sizeMB.toFixed(1)} MB` : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove card"
              data-testid="composer-remove-btn"
              className="shrink-0 rounded-md border-[1.5px] border-foreground bg-card px-3 py-2 font-mono text-[0.6875rem] font-semibold uppercase transition-colors hover:bg-secondary"
            >
              Remove
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-0 overflow-hidden rounded-md border-[1.5px] border-foreground">
            {(Object.keys(FORMAT_META) as PostFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFormat(f)}
                data-testid={`format-${f}`}
                className={`px-2 py-2.5 text-center font-mono text-[0.55rem] uppercase tracking-[0.14em] transition-colors ${
                  post.format === f
                    ? "bg-foreground text-background"
                    : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                {FORMAT_META[f].label}
              </button>
            ))}
          </div>
        </section>

        <section className="panel p-[18px]">
          <ComposerSectionLabel n="02" title="CAPTION" />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <AiButton
              label="Caption"
              busy={busy === "caption"}
              onClick={() => runAi("caption")}
              testid={`ai-caption-${post.id}`}
            />
            <AiButton
              label="Hashtags"
              busy={busy === "hashtags"}
              onClick={() => runAi("hashtags")}
              testid={`ai-hashtags-${post.id}`}
            />
            <AiButton
              label="YouTube desc"
              busy={busy === "yt_desc"}
              onClick={() => runAi("yt_desc")}
              testid={`ai-yt-desc-${post.id}`}
            />
          </div>
          {post.platforms.length > 1 ? (
            <div className="mb-3 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCaptionPlatform("all")}
                className={`rounded-sm px-2.5 py-1 font-mono text-[0.6875rem] uppercase ${
                  captionPlatform === "all"
                    ? "border-[1.5px] border-foreground bg-accent text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                All platforms
              </button>
              {post.platforms.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCaptionPlatform(p)}
                  className={`rounded-sm px-2.5 py-1 font-mono text-[0.6875rem] uppercase ${
                    captionPlatform === p
                      ? "border-[1.5px] border-foreground bg-accent text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            value={
              captionPlatform === "all"
                ? post.caption
                : (post.platformCaptions?.[captionPlatform] ?? post.caption)
            }
            onChange={(e) => {
              if (captionPlatform === "all") {
                onChange({ ...post, caption: e.target.value });
              } else {
                onChange({
                  ...post,
                  platformCaptions: {
                    ...(post.platformCaptions ?? {}),
                    [captionPlatform]: e.target.value,
                  },
                });
              }
            }}
            placeholder="Write your caption — customize per platform with the tabs above."
            data-testid={`caption-input-${post.id}`}
            rows={4}
            className={inputClass}
          />
          <div className="mt-2 flex justify-between font-mono text-[0.6875rem] font-medium text-muted-foreground">
            <span>HASHTAGS · {hashtagCount}</span>
            <span>
              {(() => {
                const text =
                  captionPlatform === "all"
                    ? post.caption
                    : (post.platformCaptions?.[captionPlatform] ?? post.caption);
                const platforms = captionPlatform === "all" ? post.platforms : [captionPlatform];
                const limit =
                  platforms.length > 0 ? Math.min(...platforms.map((p) => CHAR_LIMITS[p])) : 2200;
                return `${text.length} / ${limit}`;
              })()}
            </span>
          </div>
          <textarea
            value={post.hashtags}
            onChange={(e) => onChange({ ...post, hashtags: e.target.value })}
            placeholder="#holyspirit #sundayservice #worship"
            data-testid={`hashtags-input-${post.id}`}
            rows={2}
            className={`${inputClass} mt-3 font-mono text-xs`}
          />
        </section>

        <section className="panel p-[18px]">
          <ComposerSectionLabel n="03" title="PLATFORMS" />
          <div className="flex flex-wrap gap-2.5">
            {availablePlatforms.map((meta) => {
              const active = post.platforms.includes(meta.short);
              const disabled = incompatiblePlatforms.has(meta.short);
              return (
                <button
                  key={meta.short}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && togglePlatform(meta.short)}
                  title={disabled ? `${meta.full} doesn't support ${post.format}` : meta.full}
                  data-testid={`platform-${meta.short.replace(/\s+/g, "-")}`}
                  className={`inline-flex items-center gap-2 rounded-md border-[1.5px] border-foreground px-3 py-2.5 text-[0.8125rem] font-semibold transition-colors ${
                    disabled
                      ? "cursor-not-allowed opacity-40"
                      : active
                        ? "bg-accent text-foreground"
                        : "bg-card text-foreground hover:bg-secondary"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: platformDotColor(meta.short) }}
                  />
                  {meta.full}
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel p-[18px]">
          <ComposerSectionLabel n="04" title="SCHEDULE" />
          <ContentPublishSchedule
            fileId={post.id}
            platforms={post.platforms}
            proposedTimes={post.proposedTimes}
            scheduledPosts={workspace.scheduledPosts}
            editable
            onSuggestTimes={(times) => {
              onChange({
                ...post,
                proposedTimes: { ...(post.proposedTimes ?? {}), ...times },
              });
            }}
            onApplyTimes={(times) => {
              onChange({
                ...post,
                proposedTimes: { ...(post.proposedTimes ?? {}), ...times },
              });
            }}
          />
        </section>

        <section className="panel p-[18px]">
          <ComposerSectionLabel n="05" title="ADD TO ALBUM" />
          <EventAssociationPicker
            events={workspaceEvents}
            value={post.eventId}
            onChange={(eventId) => onChange({ ...post, eventId })}
            onCreateEvent={() => createEventFlow.openCreateEvent()}
          />
          {createEventFlow.modal}
        </section>

        <section className="panel p-[18px]">
          <ComposerSectionLabel n="06" title="ADVANCED" />
          <textarea
            value={post.transcript}
            onChange={(e) => onChange({ ...post, transcript: e.target.value })}
            placeholder="Paste transcript or talking points for AI context…"
            data-testid={`transcript-input-${post.id}`}
            rows={3}
            className={`${inputClass} font-mono text-xs`}
          />
        </section>

        {error ? (
          <div className="rounded-md border border-danger/60 bg-danger/10 px-4 py-3 text-[0.65rem] leading-relaxed text-danger">
            {error}
          </div>
        ) : null}

        {conflicts.length > 0 ? (
          <div
            data-testid={`conflict-banner-${post.id}`}
            className="rounded-md border border-warning/60 bg-warning/10 px-4 py-3 text-[0.65rem] leading-relaxed text-warning"
          >
            <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangle className="h-3 w-3" strokeWidth={2} />
              Schedule conflict{conflicts.length === 1 ? "" : "s"} ({conflicts.length})
            </div>
            {conflicts.map((c) => (
              <div key={c.withId} className="leading-snug">
                · {c.sharedPlatforms.join(", ")} overlaps with “{c.withTitle}” (±{c.deltaMinutes}{" "}
                min)
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <article
      data-testid={`composer-card-${post.id}`}
      {...(dragHandlers ?? {})}
      className={`panel flex flex-col overflow-hidden transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      <div className="border-b-[1.5px] border-foreground px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {dragHandlers ? (
              <span
                title="Drag to reorder"
                data-testid="drag-handle"
                className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" strokeWidth={1.5} />
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span data-testid={`card-index-${post.id}`} className="text-eyebrow">
                  Content {index} · {post.filename}
                </span>
                {linkedEvent ? (
                  <span className="rounded-sm border border-accent/50 bg-accent/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent">
                    {linkedEvent.title} · {formatEventTime(linkedEvent.date)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {post.mediaKind === "video" ? "Video" : "Image"} · {FORMAT_META[post.format].label}
                {post.sizeMB != null ? ` · ${post.sizeMB.toFixed(1)} MB` : ""}
                {post.platforms.length > 0
                  ? ` · ${post.platforms.length} platform${post.platforms.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove card"
            className="shrink-0 rounded-sm border-[1.5px] border-foreground bg-card p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            data-testid="composer-remove-btn"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-4 p-5">
          <CardThumbnail
            src={post.previewUrl}
            post={{ id: post.id, title: post.filename, mediaKind: post.mediaKind }}
            alt={post.filename}
            kind={post.mediaKind}
            aspect={thumbAspect}
            layout="block"
          />
          <div className="flex flex-wrap gap-2">
            {availablePlatforms.map((meta) => {
              const active = post.platforms.includes(meta.short);
              const disabled = incompatiblePlatforms.has(meta.short);
              return (
                <PlatformSelectChip
                  key={meta.short}
                  platform={meta.short}
                  active={active}
                  disabled={disabled}
                  onClick={() => !disabled && togglePlatform(meta.short)}
                  title={disabled ? `${meta.full} doesn't support ${post.format}` : meta.full}
                  data-testid={`platform-${meta.short.replace(/\s+/g, "-")}`}
                />
              );
            })}
          </div>
        </div>
      ) : null}

      {!hideFooterActions ? (
        <div className="border-t-[1.5px] border-foreground">
          <button
            type="button"
            onClick={onSaveDraft}
            data-testid={`save-draft-${post.id}`}
            className="flex w-full items-center justify-center gap-2 bg-card px-5 py-4 text-body-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Save className="h-3 w-3" strokeWidth={2} />
            Save draft
          </button>
        </div>
      ) : null}
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
      className="flex items-center gap-1.5 rounded-md border-[1.5px] border-foreground bg-card px-2.5 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
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
