import { eq } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import {
  connectedAccounts,
  facebookPageSnapshots,
  facebookPosts,
  instagramAccountSnapshots,
  instagramMedia,
} from "@/server/db/schema";

import {
  fetchInstagramProfile,
  fetchManagedPages,
  fetchPageSnapshot,
  fetchRecentInstagramMedia,
  fetchRecentPagePosts,
} from "./api";
import {
  getMetaAccount,
  getMetaPageAccessToken,
  getMetaUserAccessToken,
  upsertMetaFacebookAccount,
  upsertMetaInstagramAccount,
} from "./accounts";
import { exchangeForLongLivedUserToken } from "./oauth";
import { DEFAULT_WORKSPACE_ID } from "./config";

export async function connectMetaWorkspaceFromCode(
  workspaceId: string,
  shortLivedUserToken: string,
  scopes?: string,
) {
  const longLived = await exchangeForLongLivedUserToken(shortLivedUserToken);
  const pages = await fetchManagedPages(longLived.access_token);
  if (pages.length === 0) {
    throw new Error("No Facebook Pages found. Connect a Page in Meta Business Manager first.");
  }

  const page = pages[0];
  await upsertMetaFacebookAccount({
    workspaceId,
    pageId: page.id,
    pageName: page.name,
    pageAccessToken: page.access_token,
    userAccessToken: longLived.access_token,
    userTokenExpiresIn: longLived.expires_in,
    scopes,
  });

  if (page.instagram_business_account?.id) {
    const igProfile = await fetchInstagramProfile(
      page.instagram_business_account.id,
      page.access_token,
    );
    await upsertMetaInstagramAccount({
      workspaceId,
      igUserId: igProfile.id,
      username: igProfile.username,
      pageAccessToken: page.access_token,
      userAccessToken: longLived.access_token,
      userTokenExpiresIn: longLived.expires_in,
      scopes,
    });
  }

  return syncMetaWorkspace(workspaceId);
}

export async function syncMetaWorkspace(workspaceId = DEFAULT_WORKSPACE_ID) {
  const pageToken = await getMetaPageAccessToken(workspaceId);
  const fbAccount = await getMetaAccount(workspaceId, "FB");
  if (!pageToken || !fbAccount?.externalAccountId) {
    throw new Error("Meta Facebook is not connected for this workspace");
  }

  const syncedAt = new Date();
  const pageId = fbAccount.externalAccountId;
  const page = await fetchPageSnapshot(pageId, pageToken);
  const posts = await fetchRecentPagePosts(pageId, pageToken, 25);
  const db = getDb();

  await db
    .insert(facebookPageSnapshots)
    .values({
      workspaceId,
      pageId,
      pageName: page.name,
      followerCount: page.followers_count ?? page.fan_count ?? 0,
      fanCount: page.fan_count ?? 0,
      syncedAt,
    })
    .onConflictDoUpdate({
      target: facebookPageSnapshots.workspaceId,
      set: {
        pageId,
        pageName: page.name,
        followerCount: page.followers_count ?? page.fan_count ?? 0,
        fanCount: page.fan_count ?? 0,
        syncedAt,
      },
    });

  for (const post of posts) {
    await db
      .insert(facebookPosts)
      .values({
        postId: post.id,
        workspaceId,
        pageId,
        message: post.message ?? "",
        publishedAt: new Date(post.created_time),
        likeCount: post.likes?.summary?.total_count ?? 0,
        commentCount: post.comments?.summary?.total_count ?? 0,
        shareCount: post.shares?.count ?? 0,
        syncedAt,
      })
      .onConflictDoUpdate({
        target: facebookPosts.postId,
        set: {
          message: post.message ?? "",
          publishedAt: new Date(post.created_time),
          likeCount: post.likes?.summary?.total_count ?? 0,
          commentCount: post.comments?.summary?.total_count ?? 0,
          shareCount: post.shares?.count ?? 0,
          syncedAt,
        },
      });
  }

  let igMediaCount = 0;
  const igAccount = await getMetaAccount(workspaceId, "IG");
  if (igAccount?.externalAccountId) {
    const igProfile = await fetchInstagramProfile(igAccount.externalAccountId, pageToken);
    const media = await fetchRecentInstagramMedia(igAccount.externalAccountId, pageToken, 25);
    igMediaCount = media.length;

    await db
      .insert(instagramAccountSnapshots)
      .values({
        workspaceId,
        igUserId: igProfile.id,
        username: igProfile.username,
        followerCount: igProfile.followers_count ?? 0,
        mediaCount: igProfile.media_count ?? media.length,
        syncedAt,
      })
      .onConflictDoUpdate({
        target: instagramAccountSnapshots.workspaceId,
        set: {
          igUserId: igProfile.id,
          username: igProfile.username,
          followerCount: igProfile.followers_count ?? 0,
          mediaCount: igProfile.media_count ?? media.length,
          syncedAt,
        },
      });

    for (const item of media) {
      await db
        .insert(instagramMedia)
        .values({
          mediaId: item.id,
          workspaceId,
          igUserId: igProfile.id,
          caption: item.caption ?? "",
          mediaType: item.media_type ?? "UNKNOWN",
          permalink: item.permalink,
          thumbnailUrl: item.thumbnail_url ?? item.media_url,
          publishedAt: new Date(item.timestamp),
          likeCount: item.like_count ?? 0,
          commentCount: item.comments_count ?? 0,
          syncedAt,
        })
        .onConflictDoUpdate({
          target: instagramMedia.mediaId,
          set: {
            caption: item.caption ?? "",
            mediaType: item.media_type ?? "UNKNOWN",
            permalink: item.permalink,
            thumbnailUrl: item.thumbnail_url ?? item.media_url,
            publishedAt: new Date(item.timestamp),
            likeCount: item.like_count ?? 0,
            commentCount: item.comments_count ?? 0,
            syncedAt,
          },
        });
    }
  }

  return {
    workspaceId,
    facebook: {
      pageId,
      pageName: page.name,
      postCount: posts.length,
    },
    instagram: igAccount
      ? {
          igUserId: igAccount.externalAccountId,
          username: igAccount.accountLabel,
          mediaCount: igMediaCount,
        }
      : null,
    syncedAt: syncedAt.toISOString(),
  };
}

export async function syncAllMetaWorkspaces() {
  const db = getDb();
  const rows = await db
    .select({ workspaceId: connectedAccounts.workspaceId })
    .from(connectedAccounts)
    .where(eq(connectedAccounts.platform, "FB"));

  const results: Array<
    | { workspaceId: string; syncedAt: string; pageName: string }
    | { workspaceId: string; error: string }
  > = [];

  for (const row of rows) {
    try {
      const userToken = await getMetaUserAccessToken(row.workspaceId);
      if (userToken) {
        const pages = await fetchManagedPages(userToken);
        const page = pages.find((p) => p.id);
        if (page) {
          await upsertMetaFacebookAccount({
            workspaceId: row.workspaceId,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            userAccessToken: userToken,
          });
        }
      }
      const result = await syncMetaWorkspace(row.workspaceId);
      results.push({
        workspaceId: row.workspaceId,
        syncedAt: result.syncedAt,
        pageName: result.facebook.pageName,
      });
    } catch (error) {
      results.push({
        workspaceId: row.workspaceId,
        error: error instanceof Error ? error.message : "Meta sync failed",
      });
    }
  }

  return { synced: results.filter((r) => !("error" in r)).length, results };
}

export async function getMetaMetrics(workspaceId = DEFAULT_WORKSPACE_ID) {
  const db = getDb();
  const [fbPage] = await db
    .select()
    .from(facebookPageSnapshots)
    .where(eq(facebookPageSnapshots.workspaceId, workspaceId))
    .limit(1);
  const [igAccount] = await db
    .select()
    .from(instagramAccountSnapshots)
    .where(eq(instagramAccountSnapshots.workspaceId, workspaceId))
    .limit(1);
  const fbPosts = await db
    .select()
    .from(facebookPosts)
    .where(eq(facebookPosts.workspaceId, workspaceId));
  const igMediaRows = await db
    .select()
    .from(instagramMedia)
    .where(eq(instagramMedia.workspaceId, workspaceId));

  return {
    facebook: {
      connected: Boolean(fbPage),
      page: fbPage
        ? {
            pageId: fbPage.pageId,
            pageName: fbPage.pageName,
            followerCount: fbPage.followerCount,
            fanCount: fbPage.fanCount,
            syncedAt: fbPage.syncedAt.toISOString(),
          }
        : null,
      posts: fbPosts
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .map((post) => ({
          id: post.postId,
          message: post.message,
          publishedAt: post.publishedAt.toISOString(),
          likes: post.likeCount,
          comments: post.commentCount,
          shares: post.shareCount,
          engagementRate:
            post.likeCount + post.commentCount + post.shareCount > 0
              ? (post.likeCount + post.commentCount) /
                Math.max(post.likeCount + post.commentCount + post.shareCount, 1)
              : 0,
        })),
    },
    instagram: {
      connected: Boolean(igAccount),
      account: igAccount
        ? {
            igUserId: igAccount.igUserId,
            username: igAccount.username,
            followerCount: igAccount.followerCount,
            mediaCount: igAccount.mediaCount,
            syncedAt: igAccount.syncedAt.toISOString(),
          }
        : null,
      media: igMediaRows
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .map((item) => ({
          id: item.mediaId,
          caption: item.caption,
          publishedAt: item.publishedAt.toISOString(),
          likes: item.likeCount,
          comments: item.commentCount,
          thumbnailUrl: item.thumbnailUrl,
          permalink: item.permalink,
          engagementRate:
            item.likeCount + item.commentCount > 0
              ? (item.likeCount + item.commentCount) /
                Math.max(item.likeCount + item.commentCount, 1)
              : 0,
        })),
    },
  };
}