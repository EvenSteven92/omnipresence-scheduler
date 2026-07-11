import type { Platform, PublishedPost } from "@/lib/mock-data";
import type { PostDetailSource } from "@/lib/post-detail";
import { isPublishedPost } from "@/lib/post-detail";
import { inferMediaKind } from "@/lib/scheduled-post-display";
import type { WorkspaceProfile } from "@/lib/workspaces/types";

export function platformTitle(post: PostDetailSource, platform: Platform): string {
  const o =
    "platformTitles" in post
      ? (post as { platformTitles?: Partial<Record<Platform, string>> }).platformTitles?.[
          platform
        ]
      : undefined;
  return o?.trim() || post.title;
}

export function platformCaption(post: PostDetailSource, platform: Platform): string {
  const o =
    "platformCaptions" in post
      ? (post as { platformCaptions?: Partial<Record<Platform, string>> }).platformCaptions?.[
          platform
        ]
      : undefined;
  return o?.trim() || cardCaption(post);
}

export function platformHashtags(post: PostDetailSource, platform: Platform): string {
  const o =
    "platformHashtags" in post
      ? (post as { platformHashtags?: Partial<Record<Platform, string>> }).platformHashtags?.[
          platform
        ]
      : undefined;
  return o?.trim() || post.hashtags?.trim() || "";
}

export function findWorkspaceCard(
  workspace: WorkspaceProfile,
  cardId: string,
): PostDetailSource | undefined {
  const scheduled = workspace.scheduledPosts.find((p) => p.id === cardId);
  if (scheduled) return scheduled;
  return workspace.publishedPosts.find((p) => p.id === cardId);
}

export function cardCaption(post: PostDetailSource): string {
  return post.caption?.trim() || post.title;
}

export function cardHashtagList(post: PostDetailSource): string[] {
  if (post.hashtags?.trim()) {
    return post.hashtags
      .trim()
      .split(/\s+/)
      .filter((tag) => tag.startsWith("#"));
  }
  return ["#torcc", "#sundayservice", "#worship"];
}

function inferDimensions(title: string, mediaKind: "image" | "video"): string {
  const t = title.toLowerCase();
  if (t.includes("story") || t.includes("reel") || t.includes("short") || t.includes("portrait")) {
    return "1080×1920";
  }
  if (t.includes("quote") || t.includes("carousel") || t.includes("photo")) return "1080×1080";
  return mediaKind === "video" ? "1920×1080" : "1080×1080";
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type SourceFileRow = { key: string; value: string };

export function cardSourceFileRows(post: PostDetailSource): SourceFileRow[] {
  const mediaKind = inferMediaKind(post.title);
  const dimensions = post.dimensions ?? inferDimensions(post.title, mediaKind);
  const sizeMB = post.sizeMB ?? (mediaKind === "video" ? 24.1 : 1.8);
  const created = post.createdAt ?? post.date;

  const rows: SourceFileRow[] = [{ key: "DIMENSIONS", value: dimensions }];

  if (mediaKind === "video") {
    const durationSec = post.durationSec ?? 58;
    rows.push({ key: "DURATION", value: formatDuration(durationSec) });
  } else {
    rows.push({ key: "TYPE", value: "PNG" });
  }

  rows.push(
    { key: "SIZE", value: `${sizeMB.toFixed(1)} MB` },
    {
      key: "CREATED",
      value: new Date(created).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    },
  );

  if (post.dropboxUrl) {
    rows.push({ key: "DROPBOX", value: post.dropboxUrl });
  }

  return rows;
}

export function formatPublishWhen(iso: string): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${weekday}, ${date} · ${time}`;
}

export function cardPerformance(post: PostDetailSource) {
  if (!isPublishedPost(post)) {
    return {
      published: false as const,
      views: "—",
      engagement: "—",
      likes: "—",
      shares: "—",
    };
  }
  const pub = post as PublishedPost;
  return {
    published: true as const,
    views: pub.views.toLocaleString(),
    engagement: `${(pub.engagementRate * 100).toFixed(1)}%`,
    likes: pub.likes.toLocaleString(),
    shares: pub.shares.toLocaleString(),
  };
}
