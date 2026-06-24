import type { DraftPost } from "@/components/post/ComposerCard";
import { CardPublishChip } from "@/components/ui/CardPublishChip";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import { PlatformPreview } from "@/components/post/PlatformPreview";
import type { ContentEvent } from "@/lib/workspaces/types";
import {
  inferCardMediaType,
  publishEntriesForPost,
  resolveAlbumLabel,
} from "@/lib/card-display";
import type { ScheduledPost } from "@/lib/mock-data";

function draftToPreviewPost(draft: DraftPost): ScheduledPost {
  const times = Object.values(draft.proposedTimes ?? {}).filter(Boolean) as string[];
  const earliest = times.sort()[0];
  const title =
    draft.caption.trim() ||
    draft.filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

  return {
    id: draft.id,
    title,
    platforms: draft.platforms,
    platformTimes: draft.proposedTimes,
    date: earliest ?? new Date().toISOString(),
    status: "draft",
    eventId: draft.eventId,
  };
}

export function ComposerPreviewPane({
  post,
  events,
  workspaceName,
}: {
  post: DraftPost;
  events: ContentEvent[];
  workspaceName: string;
}) {
  const previewPost = draftToPreviewPost(post);
  const mediaType = inferCardMediaType(post.filename, post.mediaKind);
  const publishes = publishEntriesForPost(previewPost);
  const album = resolveAlbumLabel(previewPost, events);

  return (
    <div className="sticky top-0 flex flex-col gap-4">
      <div className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
        LIVE PREVIEW · THE CARD
      </div>
      <ContentCard
        size="stream"
        className="shadow-[var(--shadow-card)]"
        eyebrow={album}
        title={previewPost.title}
        platforms={publishes.map((entry) => (
          <CardPublishChip key={entry.platform} label={entry.label} dotColor={entry.dotColor} />
        ))}
        thumbnail={
          <CardThumbnail
            src={post.previewUrl}
            post={previewPost}
            alt={post.filename}
            layout="square"
            mediaType={mediaType}
          />
        }
        trailing={
          <div className="text-right">
            <span className="font-display text-[1.375rem] font-bold leading-none text-foreground">
              {post.platforms.length}
            </span>{" "}
            <span className="font-mono text-[0.5625rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Pub
            </span>
          </div>
        }
      />

      <div className="font-mono text-[0.625rem] font-bold tracking-[0.1em] text-muted-foreground">
        FEED PREVIEW
      </div>
      <PlatformPreview
        variant="panel"
        platforms={post.platforms}
        caption={post.caption}
        platformCaptions={post.platformCaptions}
        hashtags={post.hashtags}
        filename={post.filename}
        format={post.format}
        defaultOpen
        workspaceLabel={workspaceName}
      />
    </div>
  );
}