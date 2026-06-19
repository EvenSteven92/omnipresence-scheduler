import { useEffect, useMemo, useState } from "react";
import {
  Save,
  Sparkles,
  X,
  FileVideo,
  Image as ImageIcon,
  Cloud,
  Loader2,
  GripVertical,
  AlertTriangle,
} from "lucide-react";
import { PLATFORMS, PLATFORMS_BY_SHORT, FORMAT_META, type PostFormat } from "@/lib/platforms";
import { aiGenerate, type AiKind } from "@/lib/ai-client";
import type { Platform } from "@/lib/mock-data";
import { CharCounters } from "./CharCounters";
import { PlatformPreview } from "./PlatformPreview";
import { ContentPublishSchedule } from "./ContentPublishSchedule";
import { PlatformSelectChip } from "./PlatformChip";
import { CollapsibleSection } from "./CollapsibleSection";
import { detectConflicts } from "@/lib/conflicts";
import { useWorkspace } from "@/lib/workspace-context";
import { EventAssociationPicker } from "@/components/events/EventAssociationPicker";
import { useCreateEventFlow } from "@/hooks/useCreateEventFlow";
import { mergeWorkspaceEvents, useCustomEvents } from "@/hooks/useCustomEvents";
import { formatEventTime, getEventById } from "@/lib/events/display";

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
}

export function ComposerCard({
  post,
  index,
  onChange,
  onRemove,
  onSaveDraft,
  expanded,
  focused = false,
  hidePreview = false,
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
  /** When true, preview is rendered by the parent (e.g. scheduler side pane). */
  hidePreview?: boolean;
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
    return detectConflicts(
      workspace.scheduledPosts,
      new Date(earliestProposed),
      post.platforms,
      post.id,
    );
  }, [earliestProposed, post.platforms, post.id, workspace.scheduledPosts]);

  function toggleFormat(f: PostFormat) {
    // Auto-drop platforms that don't accept the new format
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

  const linkedEvent = post.eventId ? getEventById(workspaceEvents, post.eventId) : undefined;

  return (
    <article
      data-testid={`composer-card-${post.id}`}
      {...(dragHandlers ?? {})}
      className={`flex flex-col overflow-hidden rounded-sm border border-border bg-surface transition-opacity ${
        isDragging ? "opacity-40" : "opacity-100"
      }`}
    >
      {/* Header — one file = one content piece */}
      <div className={`border-b border-border ${focused ? "px-5 py-3" : "px-5 py-4"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            {!focused && dragHandlers && (
              <span
                title="Drag to reorder"
                data-testid="drag-handle"
                className="mt-1 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4" strokeWidth={1.5} />
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span data-testid={`card-index-${post.id}`} className="text-eyebrow">
                  {focused ? "Editing" : `Content ${index}`}
                </span>
                {linkedEvent ? (
                  <span className="rounded-sm border border-accent/50 bg-accent/10 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent">
                    {linkedEvent.title} · {formatEventTime(linkedEvent.date)}
                  </span>
                ) : null}
              </div>
              <h2
                className={`break-words font-semibold leading-snug text-foreground ${
                  focused ? "mt-1 text-base" : "mt-2 text-sm"
                }`}
              >
                {post.filename}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
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
            aria-label="remove card"
            className="shrink-0 rounded-sm border border-border bg-background/60 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            data-testid="composer-remove-btn"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <CollapsibleSection
        title="Media & format"
        subtitle="Local upload or Dropbox link (coming soon)"
        defaultOpen
      >
        <div
          className={`mb-4 flex items-center justify-center rounded-sm border border-dashed border-border bg-background/40 ${
            post.format === "landscape" ? "aspect-video max-h-44" : "aspect-[4/5] max-h-52"
          }`}
        >
          <div className="flex flex-col items-center gap-3 px-4 text-center text-muted-foreground">
            {post.mediaKind === "video" ? (
              <FileVideo className="h-6 w-6" strokeWidth={1.4} />
            ) : (
              <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
            )}
            <span className="max-w-full truncate font-mono text-[0.65rem] text-foreground/80">
              {post.filename}
            </span>
            <button
              type="button"
              disabled
              data-testid="add-from-dropbox-btn"
              title="Dropbox picker — coming soon"
              aria-label="Add from Dropbox (coming soon)"
              className="flex items-center gap-2 rounded-sm border border-border bg-surface px-4 py-2.5 text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Cloud className="h-3.5 w-3.5" strokeWidth={1.75} />
              Add from Dropbox
            </button>
            <span className="text-body-sm text-muted-foreground/60">Coming soon</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-0 overflow-hidden rounded-sm border border-border">
          {(Object.keys(FORMAT_META) as PostFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFormat(f)}
              data-testid={`format-${f}`}
              className={`px-4 py-3 text-center text-[0.6rem] uppercase tracking-[0.14em] transition-colors ${
                post.format === f
                  ? "bg-foreground text-background"
                  : "bg-background/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              {FORMAT_META[f].label}
            </button>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Platforms"
        subtitle="Where this file will publish"
        defaultOpen
        badge={
          <span className="rounded-sm border border-border px-2 py-0.5 text-[0.55rem] text-foreground">
            {post.platforms.length}
          </span>
        }
      >
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Event album"
        subtitle="Associate this file with a ministry event"
        defaultOpen={!!post.eventId}
        badge={
          post.eventId ? (
            <span className="rounded-sm border border-accent/50 bg-accent/10 px-2 py-0.5 text-[0.55rem] text-accent">
              linked
            </span>
          ) : undefined
        }
      >
        <EventAssociationPicker
          events={workspaceEvents}
          value={post.eventId}
          onChange={(eventId) => onChange({ ...post, eventId })}
          onCreateEvent={() => createEventFlow.openCreateEvent()}
        />
        {createEventFlow.modal}
      </CollapsibleSection>

      <CollapsibleSection
        title="Publish times"
        subtitle="One date and time per selected platform"
        defaultOpen={!focused}
        badge={
          post.platforms.length > 0 ? (
            <span className="rounded-sm border border-border px-2 py-0.5 text-[0.55rem] text-foreground">
              {post.platforms.length}
            </span>
          ) : undefined
        }
      >
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
      </CollapsibleSection>

      <CollapsibleSection title="Caption & copy" defaultOpen>
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
              className={`rounded-sm px-2.5 py-1 text-body-sm ${
                captionPlatform === "all" ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              All platforms
            </button>
            {post.platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCaptionPlatform(p)}
                className={`rounded-sm px-2.5 py-1 text-body-sm ${
                  captionPlatform === p ? "bg-secondary text-foreground" : "text-muted-foreground"
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
          className="w-full resize-y rounded-sm border border-border bg-background/60 px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
        />
        <CharCounters
          text={
            captionPlatform === "all"
              ? post.caption
              : (post.platformCaptions?.[captionPlatform] ?? post.caption)
          }
          platforms={captionPlatform === "all" ? post.platforms : [captionPlatform]}
        />
        <textarea
          value={post.hashtags}
          onChange={(e) => onChange({ ...post, hashtags: e.target.value })}
          placeholder="Hashtags (optional)"
          data-testid={`hashtags-input-${post.id}`}
          rows={2}
          className="mt-3 w-full resize-y rounded-sm border border-border bg-background/60 px-4 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Transcript & AI context"
        subtitle="Optional — powers AI caption buttons"
        defaultOpen={false}
      >
        <textarea
          value={post.transcript}
          onChange={(e) => onChange({ ...post, transcript: e.target.value })}
          placeholder="Paste transcript or talking points…"
          data-testid={`transcript-input-${post.id}`}
          rows={3}
          className="w-full resize-y rounded-sm border border-border bg-background/60 px-4 py-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-accent focus:outline-none"
        />
      </CollapsibleSection>

      {error && (
        <div className="composer-section rounded-sm border border-danger/60 bg-danger/10 px-4 py-3 text-[0.65rem] leading-relaxed text-danger">
          {error}
        </div>
      )}

      {/* Conflict warnings (post auto-schedule) */}
      {conflicts.length > 0 && (
        <div
          data-testid={`conflict-banner-${post.id}`}
          className="composer-section rounded-sm border border-warning/60 bg-warning/10 px-4 py-3 text-[0.65rem] leading-relaxed text-warning"
        >
          <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="h-3 w-3" strokeWidth={2} />
            Schedule conflict{conflicts.length === 1 ? "" : "s"} ({conflicts.length})
          </div>
          {conflicts.map((c) => (
            <div key={c.withId} className="leading-snug">
              · {c.sharedPlatforms.join(", ")} overlaps with “{c.withTitle}” (±{c.deltaMinutes} min)
            </div>
          ))}
        </div>
      )}

      {!hidePreview ? (
        <div className="pb-2">
          <PlatformPreview
            platforms={post.platforms}
            caption={post.caption}
            platformCaptions={post.platformCaptions}
            hashtags={post.hashtags}
            filename={post.filename}
            format={post.format}
            defaultOpen={focused}
          />
        </div>
      ) : null}

      {!hideFooterActions ? (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={onSaveDraft}
            data-testid={`save-draft-${post.id}`}
            className="flex w-full items-center justify-center gap-2 bg-surface px-5 py-4 text-body-sm font-medium text-foreground transition-colors hover:bg-secondary"
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
      className="flex items-center gap-1.5 rounded-sm border border-border bg-background/60 px-2.5 py-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
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
