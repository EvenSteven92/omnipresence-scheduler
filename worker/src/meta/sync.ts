import { getDb } from "../db/client.js";
import {
  fetchInstagramProfile,
  fetchManagedPages,
  fetchPageSnapshot,
  fetchRecentInstagramMedia,
  fetchRecentPagePosts,
} from "./api.js";
import {
  getMetaAccount,
  getMetaPageAccessToken,
  refreshMetaPageAccessToken,
  upsertMetaFacebookAccount,
  upsertMetaInstagramAccount,
} from "./accounts.js";
import { exchangeForLongLivedUserToken } from "./oauth.js";

export async function connectMetaClientFromCode(
  clientId: string,
  shortLivedUserToken: string,
  scopes?: string,
) {
  const longLived = await exchangeForLongLivedUserToken(shortLivedUserToken);
  const pages = await fetchManagedPages(longLived.access_token);
  if (pages.length === 0) {
    throw new Error("No Facebook Pages found. Connect a Page in Meta Business Manager first.");
  }

  const page = pages[0]!;
  upsertMetaFacebookAccount({
    clientId,
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    userAccessToken: longLived.access_token,
    userTokenExpiresIn: longLived.expires_in,
    scopes,
  });

  if (page.instagram_business_account?.id) {
    try {
      const igProfile = await fetchInstagramProfile(
        page.instagram_business_account.id,
        page.access_token,
      );
      upsertMetaInstagramAccount({
        clientId,
        igUserId: igProfile.id,
        username: igProfile.username,
        pageAccessToken: page.access_token,
        userAccessToken: longLived.access_token,
        userTokenExpiresIn: longLived.expires_in,
        scopes,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Instagram link failed";
      const result = await syncMetaClient(clientId);
      return {
        ...result,
        warnings: [
          `Instagram not linked yet (${message}). Add instagram_basic to your Login for Business config and reconnect.`,
        ],
      };
    }
  }

  return syncMetaClient(clientId);
}

export async function syncMetaClient(clientId: string) {
  await refreshMetaPageAccessToken(clientId);
  const pageToken = getMetaPageAccessToken(clientId);
  const fbAccount = getMetaAccount(clientId, "FB");
  if (!pageToken || !fbAccount?.external_id) {
    throw new Error("Meta Facebook is not connected for this client");
  }

  const syncedAt = new Date().toISOString();
  const pageId = fbAccount.external_id;
  const page = await fetchPageSnapshot(pageId, pageToken);
  const warnings: string[] = [];
  let posts: Awaited<ReturnType<typeof fetchRecentPagePosts>> = [];

  try {
    posts = await fetchRecentPagePosts(pageId, pageToken, 25);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Facebook posts";
    warnings.push(
      message.includes("pages_read_engagement")
        ? "Facebook Page connected, but post metrics need pages_read_engagement."
        : `Facebook posts skipped: ${message}`,
    );
  }

  const db = getDb();
  db.prepare(
    `INSERT INTO facebook_page_snapshots (
      client_id, page_id, page_name, follower_count, fan_count, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET
      page_id = excluded.page_id,
      page_name = excluded.page_name,
      follower_count = excluded.follower_count,
      fan_count = excluded.fan_count,
      synced_at = excluded.synced_at`,
  ).run(
    clientId,
    pageId,
    page.name,
    page.followers_count ?? page.fan_count ?? 0,
    page.fan_count ?? 0,
    syncedAt,
  );

  const upsertPost = db.prepare(
    `INSERT INTO facebook_posts (
      post_id, client_id, page_id, message, published_at,
      like_count, comment_count, share_count, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(post_id) DO UPDATE SET
      message = excluded.message,
      published_at = excluded.published_at,
      like_count = excluded.like_count,
      comment_count = excluded.comment_count,
      share_count = excluded.share_count,
      synced_at = excluded.synced_at`,
  );

  for (const post of posts) {
    upsertPost.run(
      post.id,
      clientId,
      pageId,
      post.message ?? "",
      post.created_time,
      post.likes?.summary?.total_count ?? 0,
      post.comments?.summary?.total_count ?? 0,
      post.shares?.count ?? 0,
      syncedAt,
    );
  }

  let igMediaCount = 0;
  const igAccount = getMetaAccount(clientId, "IG");
  if (igAccount?.external_id) {
    try {
      const igProfile = await fetchInstagramProfile(igAccount.external_id, pageToken);
      const media = await fetchRecentInstagramMedia(igAccount.external_id, pageToken, 25);
      igMediaCount = media.length;

      db.prepare(
        `INSERT INTO instagram_account_snapshots (
          client_id, ig_user_id, username, follower_count, media_count, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(client_id) DO UPDATE SET
          ig_user_id = excluded.ig_user_id,
          username = excluded.username,
          follower_count = excluded.follower_count,
          media_count = excluded.media_count,
          synced_at = excluded.synced_at`,
      ).run(
        clientId,
        igProfile.id,
        igProfile.username,
        igProfile.followers_count ?? 0,
        igProfile.media_count ?? media.length,
        syncedAt,
      );

      const upsertMedia = db.prepare(
        `INSERT INTO instagram_media (
          media_id, client_id, ig_user_id, caption, media_type, permalink,
          thumbnail_url, published_at, like_count, comment_count, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(media_id) DO UPDATE SET
          caption = excluded.caption,
          media_type = excluded.media_type,
          permalink = excluded.permalink,
          thumbnail_url = excluded.thumbnail_url,
          published_at = excluded.published_at,
          like_count = excluded.like_count,
          comment_count = excluded.comment_count,
          synced_at = excluded.synced_at`,
      );

      for (const item of media) {
        upsertMedia.run(
          item.id,
          clientId,
          igProfile.id,
          item.caption ?? "",
          item.media_type ?? "UNKNOWN",
          item.permalink ?? null,
          item.thumbnail_url ?? item.media_url ?? null,
          item.timestamp,
          item.like_count ?? 0,
          item.comments_count ?? 0,
          syncedAt,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load Instagram media";
      warnings.push(
        message.includes("instagram")
          ? "Instagram metrics need instagram_basic / instagram_manage_insights."
          : `Instagram sync skipped: ${message}`,
      );
    }
  }

  db.prepare(
    `UPDATE connected_accounts SET synced_at = ?, updated_at = datetime('now')
     WHERE client_id = ? AND platform IN ('FB', 'IG')`,
  ).run(syncedAt, clientId);

  return {
    workspaceId: clientId,
    facebook: { pageId, pageName: page.name, postCount: posts.length },
    instagram: igAccount
      ? {
          igUserId: igAccount.external_id,
          username: igAccount.display_name,
          mediaCount: igMediaCount,
        }
      : null,
    syncedAt,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function getMetaMetrics(clientId: string) {
  const db = getDb();
  const fbPage = db
    .prepare(`SELECT * FROM facebook_page_snapshots WHERE client_id = ?`)
    .get(clientId) as
    | {
        page_id: string;
        page_name: string;
        follower_count: number;
        fan_count: number;
        synced_at: string;
      }
    | undefined;
  const igAccount = db
    .prepare(`SELECT * FROM instagram_account_snapshots WHERE client_id = ?`)
    .get(clientId) as
    | {
        ig_user_id: string;
        username: string;
        follower_count: number;
        media_count: number;
        synced_at: string;
      }
    | undefined;
  const fbPosts = db
    .prepare(`SELECT * FROM facebook_posts WHERE client_id = ?`)
    .all(clientId) as Array<{
    post_id: string;
    message: string;
    published_at: string;
    like_count: number;
    comment_count: number;
    share_count: number;
  }>;
  const igMediaRows = db
    .prepare(`SELECT * FROM instagram_media WHERE client_id = ?`)
    .all(clientId) as Array<{
    media_id: string;
    caption: string;
    published_at: string;
    like_count: number;
    comment_count: number;
    thumbnail_url: string | null;
    permalink: string | null;
  }>;

  return {
    facebook: {
      connected: Boolean(fbPage),
      page: fbPage
        ? {
            pageId: fbPage.page_id,
            pageName: fbPage.page_name,
            followerCount: fbPage.follower_count,
            fanCount: fbPage.fan_count,
            syncedAt: fbPage.synced_at,
          }
        : null,
      posts: fbPosts
        .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
        .map((post) => ({
          id: post.post_id,
          message: post.message,
          publishedAt: post.published_at,
          likes: post.like_count,
          comments: post.comment_count,
          shares: post.share_count,
          engagementRate:
            post.like_count + post.comment_count + post.share_count > 0
              ? (post.like_count + post.comment_count) /
                Math.max(post.like_count + post.comment_count + post.share_count, 1)
              : 0,
        })),
    },
    instagram: {
      connected: Boolean(igAccount),
      account: igAccount
        ? {
            igUserId: igAccount.ig_user_id,
            username: igAccount.username,
            followerCount: igAccount.follower_count,
            mediaCount: igAccount.media_count,
            syncedAt: igAccount.synced_at,
          }
        : null,
      media: igMediaRows
        .sort((a, b) => +new Date(b.published_at) - +new Date(a.published_at))
        .map((item) => ({
          id: item.media_id,
          caption: item.caption,
          publishedAt: item.published_at,
          likes: item.like_count,
          comments: item.comment_count,
          thumbnailUrl: item.thumbnail_url,
          permalink: item.permalink,
          engagementRate:
            item.like_count + item.comment_count > 0
              ? (item.like_count + item.comment_count) /
                Math.max(item.like_count + item.comment_count, 1)
              : 0,
        })),
    },
  };
}
