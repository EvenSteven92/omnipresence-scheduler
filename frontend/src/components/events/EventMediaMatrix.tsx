import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CircleCheck, Clock, FilePen, Plus } from "lucide-react";
import { ContentCard } from "@/components/ui/ContentCard";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { PostDetailModal } from "@/components/post/PostDetailModal";
import { PlatformRow } from "@/components/post/PlatformRow";
import { fmtCompact } from "@/components/PerformanceMetricCounters";
import { eventMediaToCardPost, type EventMediaItem } from "@/lib/events/display";
import { inferMediaKind } from "@/lib/scheduled-post-display";
import type { PostDetailSource } from "@/lib/post-detail";
import type { WorkspaceProfile } from "@/lib/workspaces/types";

type AlbumMediaGroup = {
  key: "published" | "scheduled" | "draft";
  label: string;
  countLabel: string;
  items: EventMediaItem[];
};

const GROUP_META: Record<
  AlbumMediaGroup["key"],
  { icon: typeof CircleCheck; headerClass: string; iconClass: string }
> = {
  published: {
    icon: CircleCheck,
    headerClass: "border-success/30",
    iconClass: "border-success/40 bg-success/10 text-success",
  },
  scheduled: {
    icon: Clock,
    headerClass: "border-accent/30",
    iconClass: "border-accent/30 bg-accent/5 text-accent",
  },
  draft: {
    icon: FilePen,
    headerClass: "border-border",
    iconClass: "border-border bg-background/60 text-muted-foreground",
  },
};

function groupAlbumMedia(items: EventMediaItem[]): AlbumMediaGroup[] {
  const buckets: Record<AlbumMediaGroup["key"], EventMediaItem[]> = {
    published: [],
    scheduled: [],
    draft: [],
  };

  for (const item of items) {
    buckets[item.status].push(item);
  }

  return (
    [
      { key: "scheduled" as const, label: "Queued", countLabel: "card" },
      { key: "published" as const, label: "Live", countLabel: "card" },
      { key: "draft" as const, label: "Drafts", countLabel: "file" },
    ] as const
  )
    .filter(({ key }) => buckets[key].length > 0)
    .map(({ key, label, countLabel }) => {
      const count = buckets[key].length;
      return {
        key,
        label,
        countLabel: `${count} ${countLabel}${count === 1 ? "" : "s"}`,
        items: buckets[key],
      };
    });
}

function AlbumMediaGroupHeader({ group }: { group: AlbumMediaGroup }) {
  const meta = GROUP_META[group.key];
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-2.5 border-b-[1.5px] border-foreground pb-2">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-[1.5px] border-foreground ${meta.iconClass}`}
      >
        <Icon className="h-3 w-3" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-mono text-[0.625rem] uppercase tracking-[0.12em] text-foreground">
          {group.label}
        </h3>
      </div>
      <span className="shrink-0 font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted-foreground">
        {group.countLabel}
      </span>
    </div>
  );
}

function AlbumMediaMetricsFooter({
  item,
  max,
}: {
  item: EventMediaItem;
  max: { views: number; likes: number; shares: number };
}) {
  const metrics = [
    { key: "views", label: "Views", value: item.views ?? 0 },
    { key: "likes", label: "Likes", value: item.likes ?? 0 },
    { key: "shares", label: "Shares", value: item.shares ?? 0 },
  ] as const;

  return (
    <div
      data-testid={`album-media-metrics-${item.id}`}
      className="grid grid-cols-2 gap-1.5 border-t border-border bg-background/40 px-3 py-2 sm:grid-cols-4 sm:gap-2 sm:px-4 sm:py-2.5"
    >
      {metrics.map(({ key, label, value }) => {
        const sharePct = max[key] > 0 ? (value / max[key]) * 100 : 0;
        return (
          <div key={key} className="min-w-0 text-center">
            <div className="label-mono text-[0.45rem] text-muted-foreground">{label}</div>
            <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
              {fmtCompact(value)}
            </div>
            {max[key] > 0 ? (
              <div className="mt-0.5 font-mono text-[0.45rem] text-muted-foreground/80">
                {sharePct.toFixed(0)}%
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="min-w-0 text-center">
        <div className="text-[0.45rem] uppercase tracking-[0.12em] text-muted-foreground">
          Eng. rate
        </div>
        <div className="mt-1 font-mono text-sm font-semibold tabular-nums text-accent">
          {((item.engagementRate ?? 0) * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function AlbumMediaCard({
  item,
  maxMetrics,
  onOpen,
}: {
  item: EventMediaItem;
  maxMetrics?: { views: number; likes: number; shares: number };
  onOpen: () => void;
}) {
  const cardPost = eventMediaToCardPost(item);
  const mediaKind = inferMediaKind(item.title);
  const publishCount = item.platforms.length;
  const isPublished = item.status === "published";
  const entries = cardPost.platforms.map((platform) => ({
    platform,
    state:
      item.status === "published"
        ? ("published" as const)
        : item.status === "scheduled"
          ? ("scheduled" as const)
          : ("pending" as const),
  }));

  return (
    <ContentCard
      size="sm"
      orientation="rail"
      testId={`album-media-${item.id}`}
      title={item.title}
      eyebrow={
        <span className="label-mono text-[0.5rem] text-muted-foreground/80">
          1 card · {publishCount} publish{publishCount === 1 ? "" : "es"}
        </span>
      }
      platforms={<PlatformRow entries={entries} size="sm" compact />}
      onOpen={onOpen}
      thumbnail={
        <CardThumbnail post={cardPost} alt={item.title} kind={mediaKind} layout="rail" height="md" />
      }
      trailing={
        isPublished && maxMetrics ? (
          <AlbumMediaMetricsFooter item={item} max={maxMetrics} />
        ) : (
          <div className="border-t border-border bg-background/30 px-4 py-2">
            <p className="label-mono text-[0.5rem] text-muted-foreground">
              {item.status === "scheduled" ? "Queued · not live yet" : "Draft · not published"}
            </p>
          </div>
        )
      }
    />
  );
}

export function EventMediaMatrix({
  items,
  workspace,
}: {
  items: EventMediaItem[];
  workspace: WorkspaceProfile;
}) {
  const [detail, setDetail] = useState<PostDetailSource | null>(null);

  const groups = useMemo(() => groupAlbumMedia(items), [items]);

  const publishedMax = useMemo(() => {
    const published = items.filter((item) => item.status === "published");
    return {
      views: Math.max(0, ...published.map((item) => item.views ?? 0)),
      likes: Math.max(0, ...published.map((item) => item.likes ?? 0)),
      shares: Math.max(0, ...published.map((item) => item.shares ?? 0)),
    };
  }, [items]);

  function openItem(item: EventMediaItem) {
    const scheduled = workspace.scheduledPosts.find((p) => p.id === item.id);
    if (scheduled) {
      setDetail(scheduled);
      return;
    }
    const publishedPost = workspace.publishedPosts.find((p) => p.id === item.id);
    if (publishedPost) setDetail(publishedPost);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">No associated media</p>
        <p className="mt-2 text-xs text-muted-foreground/70">
          Associate files from New Post to add them to this album.
        </p>
        <Link
          to="/scheduler"
          data-testid="album-empty-new-post"
          className="mt-5 inline-flex items-center gap-1.5 rounded-sm border border-accent/60 bg-accent/10 px-4 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/20"
        >
          <Plus className="h-3 w-3" />
          New post
        </Link>
      </div>
    );
  }

  return (
    <>
      <div data-testid="event-media-matrix">
        <div className="max-w-2xl">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Associated media
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            One file per card — reels, sermons, quote sets. Live files include per-file totals;
            share % is relative to the top performer in this album.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {groups.map((group) => (
            <section
              key={group.key}
              data-testid={`album-media-group-${group.key}`}
              className="space-y-2.5"
            >
              <AlbumMediaGroupHeader group={group} />
              <div className="flex flex-wrap gap-3">
                {group.items.map((item) => (
                  <AlbumMediaCard
                    key={item.id}
                    item={item}
                    maxMetrics={group.key === "published" ? publishedMax : undefined}
                    onOpen={() => openItem(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {detail ? <PostDetailModal post={detail} onClose={() => setDetail(null)} /> : null}
    </>
  );
}