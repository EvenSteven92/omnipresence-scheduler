import { useMemo } from "react";
import { Check } from "lucide-react";
import type { PublishedPost, ScheduledPost } from "@/lib/mock-data";
import { demoPreviewForPost } from "@/lib/demo-media";

type AssociatablePost = Pick<ScheduledPost, "id" | "title" | "eventId"> & {
  status?: ScheduledPost["status"];
};

function inferMediaKind(title: string): "image" | "video" {
  const t = title.toLowerCase();
  if (t.includes("quote") || t.includes("carousel") || t.includes("photo")) return "image";
  return "video";
}

/** Pick posts that aren’t already on another event — used inside “Link posts”. */
export function UnassignedMediaPicker({
  scheduledPosts,
  publishedPosts,
  isAssociated,
  selectedIds,
  onToggle,
}: {
  scheduledPosts: ScheduledPost[];
  publishedPosts: PublishedPost[];
  isAssociated: (post: Pick<ScheduledPost, "id" | "eventId">) => boolean;
  selectedIds: Set<string>;
  onToggle: (postId: string) => void;
}) {
  const available = useMemo(() => {
    const items: AssociatablePost[] = [];
    scheduledPosts.forEach((post) => {
      if (!isAssociated(post)) items.push(post);
    });
    publishedPosts.forEach((post) => {
      if (!isAssociated(post)) items.push({ ...post, status: "published" });
    });
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }, [scheduledPosts, publishedPosts, isAssociated]);

  if (available.length === 0) {
    return (
      <div
        data-testid="unassigned-media-empty"
        className="rounded-md border border-dashed border-foreground/50 bg-background px-3 py-4 text-center"
      >
        <p className="text-body-sm text-muted-foreground">No free posts to link</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Every post is already on an event — or create posts later and link them then.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="unassigned-media-picker" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : `${available.length} available`}
        </span>
      </div>
      <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {available.map((post) => {
          const selected = selectedIds.has(post.id);
          const mediaKind = inferMediaKind(post.title);
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onToggle(post.id)}
              data-testid={`unassigned-media-${post.id}`}
              className={`group relative overflow-hidden rounded-md border text-left transition-colors ${
                selected
                  ? "border-foreground bg-accent/15"
                  : "border-foreground bg-card hover:bg-secondary"
              }`}
            >
              <div className="relative aspect-video overflow-hidden bg-background">
                <img
                  src={demoPreviewForPost({ id: post.id, title: post.title, mediaKind })}
                  alt={post.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span
                  className={`absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-sm border transition-colors ${
                    selected
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border/80 bg-card text-transparent group-hover:border-accent/60"
                  }`}
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
              </div>
              <div className="space-y-0.5 px-2 py-2">
                <p className="line-clamp-2 text-[0.65rem] font-medium leading-snug text-foreground">
                  {post.title}
                </p>
                {post.status ? (
                  <p className="label-mono text-[0.45rem] text-muted-foreground">{post.status}</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
