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
  const unassigned = useMemo(() => {
    const items: AssociatablePost[] = [];
    scheduledPosts.forEach((post) => {
      if (!isAssociated(post)) items.push(post);
    });
    publishedPosts.forEach((post) => {
      if (!isAssociated(post)) items.push({ ...post, status: "published" });
    });
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }, [scheduledPosts, publishedPosts, isAssociated]);

  if (unassigned.length === 0) {
    return (
      <div
        data-testid="unassigned-media-empty"
        className="rounded-md border-[1.5px] border-foreground bg-card px-4 py-6 text-center"
      >
        <p className="text-body-sm text-muted-foreground">All media is associated with events</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Every file is already linked to an event album. You can associate more later from New Post
          or the calendar day panel.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="unassigned-media-picker" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-eyebrow">Unassigned media</div>
        <span className="label-mono text-[0.5rem] text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : `${unassigned.length} files`}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Optional — select files to link to this album on create. You can always associate more
        after.
      </p>
      <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
        {unassigned.map((post) => {
          const selected = selectedIds.has(post.id);
          const mediaKind = inferMediaKind(post.title);
          return (
            <button
              key={post.id}
              type="button"
              onClick={() => onToggle(post.id)}
              data-testid={`unassigned-media-${post.id}`}
              className={`group relative overflow-hidden rounded-md border-[1.5px] text-left transition-colors ${
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
