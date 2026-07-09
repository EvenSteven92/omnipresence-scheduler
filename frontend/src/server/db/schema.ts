import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

// ─── App content (posts / events) ────────────────────────────────────────────

/** Atomic content card — one upload / creative unit. */
export const posts = pgTable("posts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  caption: text("caption").notNull().default(""),
  hashtags: text("hashtags").notNull().default(""),
  transcript: text("transcript").notNull().default(""),
  mediaKind: text("media_kind").notNull().default("video"),
  format: text("format").notNull().default("portrait"),
  status: text("status").notNull().default("scheduled"),
  eventId: text("event_id"),
  dropboxUrl: text("dropbox_url"),
  previewUrl: text("preview_url"),
  /** Earliest platform publish time (ISO-aligned). */
  primaryAt: timestamp("primary_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Per-platform publish slot for a card. */
export const postTargets = pgTable(
  "post_targets",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull(),
    platform: text("platform").notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("scheduled"),
    externalPostId: text("external_post_id"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("post_targets_post_platform_uidx").on(table.postId, table.platform)],
);

/** Ministry events (sermon, worship night, etc.). */
export const contentEvents = pgTable("content_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  kind: text("kind").notNull().default("other"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    platform: text("platform").notNull(),
    externalAccountId: text("external_account_id"),
    accountLabel: text("account_label"),
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("connected_accounts_workspace_platform_uidx").on(table.workspaceId, table.platform),
  ],
);

export const youtubeChannelSnapshots = pgTable("youtube_channel_snapshots", {
  workspaceId: text("workspace_id").primaryKey(),
  channelId: text("channel_id").notNull(),
  channelTitle: text("channel_title").notNull(),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  videoCount: integer("video_count").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const youtubeVideos = pgTable("youtube_videos", {
  videoId: text("video_id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  channelId: text("channel_id").notNull(),
  title: text("title").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facebookPageSnapshots = pgTable("facebook_page_snapshots", {
  workspaceId: text("workspace_id").primaryKey(),
  pageId: text("page_id").notNull(),
  pageName: text("page_name").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  fanCount: integer("fan_count").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facebookPosts = pgTable("facebook_posts", {
  postId: text("post_id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  pageId: text("page_id").notNull(),
  message: text("message").notNull().default(""),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instagramAccountSnapshots = pgTable("instagram_account_snapshots", {
  workspaceId: text("workspace_id").primaryKey(),
  igUserId: text("ig_user_id").notNull(),
  username: text("username").notNull(),
  followerCount: integer("follower_count").notNull().default(0),
  mediaCount: integer("media_count").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const instagramMedia = pgTable("instagram_media", {
  mediaId: text("media_id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  igUserId: text("ig_user_id").notNull(),
  caption: text("caption").notNull().default(""),
  mediaType: text("media_type").notNull().default("UNKNOWN"),
  permalink: text("permalink"),
  thumbnailUrl: text("thumbnail_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});
