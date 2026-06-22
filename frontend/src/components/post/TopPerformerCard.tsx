import { TrendingUp } from "lucide-react";
import { CardStats } from "@/components/ui/CardStats";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { ContentCard } from "@/components/ui/ContentCard";
import type { PublishedPost } from "@/lib/mock-data";
import { inferMediaKind, publishedPostToCardPost } from "@/lib/scheduled-post-display";

export const TOP_PERFORMERS_DISPLAY_LIMIT = 4;

function TopBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-success/60 bg-success/10 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-success">
      <TrendingUp className="h-2.5 w-2.5" /> Top
    </span>
  );
}

export function TopPerformerCard({
  post,
  isTop = false,
  onOpen,
}: {
  post: PublishedPost;
  isTop?: boolean;
  onOpen: () => void;
}) {
  const cardPost = publishedPostToCardPost(post);
  const mediaKind = inferMediaKind(post.title);

  return (
    <ContentCard
      size="sm"
      orientation="stacked"
      fullWidth
      testId={`top-performer-${post.id}`}
      title={post.title}
      onOpen={onOpen}
      thumbnail={
        <CardThumbnail
          post={cardPost}
          alt={post.title}
          kind={mediaKind}
          layout="block"
          aspect="video"
          badge={isTop ? <TopBadge /> : undefined}
        />
      }
      trailing={
        <CardStats views={post.views} likes={post.likes} engagementRate={post.engagementRate} />
      }
    />
  );
}
