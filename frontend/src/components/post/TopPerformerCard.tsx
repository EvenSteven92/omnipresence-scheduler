import { CardStats } from "@/components/ui/CardStats";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import type { PublishedPost } from "@/lib/mock-data";
import {
  inferCardMediaType,
  publishEntriesForPost,
  resolveAlbumLabel,
} from "@/lib/card-display";
import { publishedPostToCardPost } from "@/lib/scheduled-post-display";
import { CardPublishChip } from "@/components/ui/CardPublishChip";
import type { ContentEvent } from "@/lib/workspaces/types";
import { fmtCompact } from "@/components/PerformanceMetricCounters";

export const TOP_PERFORMERS_DISPLAY_LIMIT = 4;

export function TopPerformerCard({
  post,
  rank,
  events = [],
  onOpen,
}: {
  post: PublishedPost;
  rank?: number;
  events?: ContentEvent[];
  onOpen: () => void;
}) {
  const cardPost = publishedPostToCardPost(post);
  const mediaType = inferCardMediaType(post.title);
  const publishes = publishEntriesForPost(cardPost);

  if (rank != null) {
    return (
      <ContentCard
        size="stream"
        testId={`top-performer-${post.id}`}
        onOpen={onOpen}
        eyebrow={resolveAlbumLabel(cardPost, events)}
        title={post.title}
        platforms={publishes.map((entry) => (
          <CardPublishChip key={entry.platform} label={entry.label} dotColor={entry.dotColor} />
        ))}
        thumbnail={
          <div className="flex items-center gap-3.5">
            <span className="w-6 text-center font-display text-[1.375rem] font-extrabold text-muted-foreground">
              {rank}
            </span>
            <CardThumbnail post={cardPost} alt={post.title} layout="square" mediaType={mediaType} />
          </div>
        }
        trailing={
          <div className="flex gap-5 text-right">
            <div>
              <div className="font-display text-lg font-bold leading-none">{fmtCompact(post.views)}</div>
              <div className="mt-1 font-mono text-[0.5rem] font-semibold uppercase text-muted-foreground">
                Views
              </div>
            </div>
            <div>
              <div className="font-display text-lg font-bold leading-none text-accent">
                {(post.engagementRate * 100).toFixed(1)}%
              </div>
              <div className="mt-1 font-mono text-[0.5rem] font-semibold uppercase text-muted-foreground">
                Eng
              </div>
            </div>
          </div>
        }
      />
    );
  }

  return (
    <article data-testid={`top-performer-${post.id}`} className="inline-flex w-fit max-w-full flex-col">
      <ContentCard
        size="sm"
        orientation="rail"
        title={post.title}
        platforms={publishes.map((entry) => (
          <CardPublishChip key={entry.platform} label={entry.label} dotColor={entry.dotColor} />
        ))}
        onOpen={onOpen}
        thumbnail={
          <CardThumbnail post={cardPost} alt={post.title} layout="square" mediaType={mediaType} />
        }
        trailing={
          <CardStats views={post.views} likes={post.likes} engagementRate={post.engagementRate} />
        }
      />
    </article>
  );
}