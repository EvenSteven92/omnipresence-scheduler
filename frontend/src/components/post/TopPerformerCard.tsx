import { TrendingUp } from "lucide-react";
import { ContentCardChip } from "@/components/post/ContentCardChip";
import { fmtCompact } from "@/components/PerformanceMetricCounters";
import type { PublishedPost } from "@/lib/mock-data";
import { publishedPostToCardPost } from "@/lib/scheduled-post-display";

export const TOP_PERFORMERS_DISPLAY_LIMIT = 4;

export function TopPerformerCard({
  post,
  isTop = false,
  onOpen,
}: {
  post: PublishedPost;
  isTop?: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      data-testid={`top-performer-${post.id}`}
      className="relative inline-flex w-fit max-w-full flex-col overflow-hidden rounded-sm border border-border bg-surface transition-colors hover:border-accent/50"
    >
      {isTop ? (
        <span className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-sm border border-success/60 bg-success/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-success">
          <TrendingUp className="h-2.5 w-2.5" /> top
        </span>
      ) : null}
      <ContentCardChip
        post={publishedPostToCardPost(post)}
        layout="rail"
        associated
        onOpen={onOpen}
        className="rounded-none border-0 bg-transparent"
      />
      <div className="grid grid-cols-3 gap-2 border-t border-border bg-background/40 px-3 py-2.5 text-center">
        <div>
          <div className="font-mono text-sm text-foreground">{fmtCompact(post.views)}</div>
          <div className="text-body-sm text-muted-foreground">Views</div>
        </div>
        <div>
          <div className="font-mono text-sm text-foreground">{fmtCompact(post.likes)}</div>
          <div className="text-body-sm text-muted-foreground">Likes</div>
        </div>
        <div>
          <div className="font-mono text-sm text-accent">
            {(post.engagementRate * 100).toFixed(1)}%
          </div>
          <div className="text-body-sm text-muted-foreground">Engagement</div>
        </div>
      </div>
    </article>
  );
}
