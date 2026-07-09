import {
  draftDisplayTitle,
  draftToPreviewPost,
  type DraftPost,
} from "@/lib/composer-draft";
import { inferCardMediaType, streamCardGradient } from "@/lib/card-display";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { StreamContentCard } from "@/components/ui/StreamContentCard";
import { cn } from "@/lib/utils";

function igHandle(slug: string): string {
  return `@${slug.replace(/-/g, "_")}`;
}

export function ComposerPreviewRail({
  draft,
  workspaceSlug,
  workspaceInitials,
}: {
  draft: DraftPost;
  workspaceSlug: string;
  workspaceInitials: string;
}) {
  const previewPost = draftToPreviewPost(draft);
  const mediaType = inferCardMediaType(draft.filename, draft.mediaKind);
  const handle = igHandle(workspaceSlug);
  const caption = draft.caption.trim();
  const hashtags = draft.hashtags.trim();
  const gradient = streamCardGradient({ id: draft.id, title: draft.filename });

  return (
    <div data-testid="composer-preview-rail" className="flex flex-col gap-5">
      <div>
        <div className="font-mono text-caption font-bold tracking-[0.08em] text-muted-foreground">
          Live preview · the card
        </div>
        <div className="mt-3">
          <StreamContentCard post={previewPost} testId="composer-stream-preview" />
        </div>
      </div>

      <div>
        <div className="font-mono text-caption font-bold tracking-[0.08em] text-muted-foreground">
          Feed preview
        </div>
        <div
          className="mt-3 overflow-hidden rounded-lg border border-foreground bg-card"
          data-testid="composer-feed-preview"
        >
          <div className="flex items-center gap-2.5 border-b border-foreground/15 px-3 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground bg-accent font-display text-xs font-bold text-foreground">
              {workspaceInitials.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate font-display text-sm font-semibold text-foreground">
                {handle}
              </div>
              <div className="font-mono text-caption font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Instagram
              </div>
            </div>
          </div>
          <div className="relative aspect-square w-full bg-background">
            {draft.previewUrl ? (
              <CardThumbnail
                src={draft.previewUrl}
                post={{
                  id: draft.id,
                  title: draftDisplayTitle(draft),
                  mediaKind: draft.mediaKind,
                }}
                alt={draft.filename}
                kind={draft.mediaKind}
                layout="fixed"
                mediaType={mediaType}
              />
            ) : (
              <div className="h-full w-full" style={{ background: gradient }} />
            )}
          </div>
          <div className="px-3 py-3 text-sm leading-relaxed text-foreground">
            <span className="font-semibold">{handle} </span>
            {caption ? <span>{caption} </span> : null}
            {hashtags ? <span className={cn(hashtags && "text-accent")}>{hashtags}</span> : null}
            {!caption && !hashtags ? (
              <span className="text-muted-foreground">Caption preview…</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
