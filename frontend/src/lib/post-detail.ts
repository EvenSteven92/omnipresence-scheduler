import type { Platform, PublishedPost, ScheduledPost } from "@/lib/mock-data";

export type PostDetailSource = ScheduledPost | PublishedPost;

export function isPublishedPost(post: PostDetailSource): boolean {
  return "engagementRate" in post || post.status === "published";
}

/** Draft posts still need the calendar picker in the composer/detail flow. */
export function isSchedulingPost(post: PostDetailSource): boolean {
  return !isPublishedPost(post) && (post as ScheduledPost).status === "draft";
}

export function showPublishCalendar(post: PostDetailSource): boolean {
  return isSchedulingPost(post);
}

export function postDetailPlatforms(post: PostDetailSource): Platform[] {
  return post.platforms;
}

export function postDetailPlatformTimes(
  post: PostDetailSource,
): Partial<Record<Platform, string>> | undefined {
  return post.platformTimes;
}

export function postDetailFallbackIso(post: PostDetailSource): string {
  return post.date;
}