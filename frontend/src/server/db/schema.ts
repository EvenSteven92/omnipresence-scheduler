import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
    uniqueIndex("connected_accounts_workspace_platform_uidx").on(
      table.workspaceId,
      table.platform,
    ),
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