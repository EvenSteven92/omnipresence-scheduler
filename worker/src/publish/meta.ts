import { META_GRAPH_VERSION } from "../meta/config.js";
import { getMetaAccount, getMetaPageAccessToken } from "../meta/accounts.js";
import { guessMediaKind, toDropboxDirectUrl } from "../lib/dropbox.js";

async function graphPost<T>(
  path: string,
  accessToken: string,
  body: Record<string, string>,
): Promise<T> {
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
  const params = new URLSearchParams({ ...body, access_token: accessToken });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Meta publish failed (${res.status})`);
  }
  return data;
}

export type PublishInput = {
  clientId: string;
  platform: string;
  caption: string;
  dropboxUrl?: string | null;
  previewUrl?: string | null;
  title?: string;
};

export type PublishResult = {
  externalPostId: string;
  detail?: string;
};

function mediaUrl(input: PublishInput): string | null {
  const raw = input.dropboxUrl || input.previewUrl;
  if (!raw) return null;
  return toDropboxDirectUrl(raw) ?? (raw.startsWith("http") ? raw : null);
}

function composeMessage(input: PublishInput): string {
  const parts = [input.caption?.trim(), input.title?.trim()].filter(Boolean);
  return parts[0] ?? input.title ?? "";
}

/** Facebook Page feed / photo / video. */
export async function publishFacebook(input: PublishInput): Promise<PublishResult> {
  const token = getMetaPageAccessToken(input.clientId);
  const account = getMetaAccount(input.clientId, "FB");
  if (!token || !account?.external_id) {
    throw new Error("Facebook Page is not connected");
  }
  const pageId = account.external_id;
  const message = composeMessage(input);
  const url = mediaUrl(input);
  const kind = url ? guessMediaKind(url, input.title) : "unknown";

  if (url && kind === "image") {
    const data = await graphPost<{ id: string; post_id?: string }>(`/${pageId}/photos`, token, {
      url,
      caption: message,
    });
    return { externalPostId: data.post_id ?? data.id };
  }

  if (url && kind === "video") {
    const data = await graphPost<{ id: string }>(`/${pageId}/videos`, token, {
      file_url: url,
      description: message,
    });
    return { externalPostId: data.id };
  }

  if (url) {
    // Unknown media — try photo endpoint first
    try {
      const data = await graphPost<{ id: string; post_id?: string }>(`/${pageId}/photos`, token, {
        url,
        caption: message,
      });
      return { externalPostId: data.post_id ?? data.id };
    } catch {
      /* fall through to link post */
    }
  }

  const body: Record<string, string> = { message: message || "(scheduled post)" };
  if (url) body.link = url;
  const data = await graphPost<{ id: string }>(`/${pageId}/feed`, token, body);
  return { externalPostId: data.id };
}

async function waitForIgContainer(creationId: string, token: string, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${creationId}?fields=status_code&access_token=${encodeURIComponent(token)}`,
    );
    const data = (await res.json()) as { status_code?: string; error?: { message?: string } };
    if (!res.ok) throw new Error(data.error?.message ?? "IG container status failed");
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Instagram media container failed");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for Instagram media container");
}

/** Instagram professional account — image or video via Dropbox URL. */
export async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  const token = getMetaPageAccessToken(input.clientId);
  const ig = getMetaAccount(input.clientId, "IG");
  if (!token || !ig?.external_id) {
    throw new Error("Instagram is not connected");
  }
  const igUserId = ig.external_id;
  const url = mediaUrl(input);
  if (!url) {
    throw new Error("Instagram publish requires a Dropbox/public media URL");
  }
  const kind = guessMediaKind(url, input.title);
  const caption = composeMessage(input);

  const createBody: Record<string, string> = { caption };
  if (kind === "video") {
    createBody.media_type = "REELS";
    createBody.video_url = url;
  } else {
    createBody.image_url = url;
  }

  const created = await graphPost<{ id: string }>(`/${igUserId}/media`, token, createBody);
  if (kind === "video") {
    await waitForIgContainer(created.id, token);
  }

  const published = await graphPost<{ id: string }>(`/${igUserId}/media_publish`, token, {
    creation_id: created.id,
  });
  return { externalPostId: published.id };
}

export async function publishMetaTarget(input: PublishInput): Promise<PublishResult> {
  const p = input.platform.toUpperCase();
  if (p === "FB") return publishFacebook(input);
  if (p === "IG" || p === "IG STORY") {
    if (p === "IG STORY") {
      throw new Error("Instagram Stories auto-post is not supported yet — use IG feed/Reels");
    }
    return publishInstagram(input);
  }
  throw new Error(`Platform ${input.platform} is not handled by Meta publisher`);
}
