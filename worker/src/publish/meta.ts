import { readFileSync } from "node:fs";
import { META_GRAPH_VERSION } from "../meta/config.js";
import { getMetaAccount, getMetaPageAccessToken } from "../meta/accounts.js";
import { guessMediaKind, toDropboxDirectUrl } from "../lib/dropbox.js";
import { getMediaAsset } from "../media/store.js";

async function graphPostForm<T>(
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

async function graphPostMultipart<T>(
  path: string,
  accessToken: string,
  fields: Record<string, string>,
  file?: { field: string; filename: string; mime: string; bytes: Buffer },
): Promise<T> {
  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}${path}`;
  const form = new FormData();
  form.set("access_token", accessToken);
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  if (file) {
    form.set(
      file.field,
      new Blob([new Uint8Array(file.bytes)], { type: file.mime }),
      file.filename,
    );
  }
  const res = await fetch(url, { method: "POST", body: form });
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Meta upload failed (${res.status})`);
  }
  return data;
}

export type PublishInput = {
  clientId: string;
  platform: string;
  caption: string;
  dropboxUrl?: string | null;
  previewUrl?: string | null;
  localMediaId?: string | null;
  title?: string;
};

export type PublishResult = {
  externalPostId: string;
  detail?: string;
};

function composeMessage(input: PublishInput): string {
  const parts = [input.caption?.trim(), input.title?.trim()].filter(Boolean);
  return parts[0] ?? input.title ?? "";
}

function remoteUrl(input: PublishInput): string | null {
  const raw = input.dropboxUrl || input.previewUrl;
  if (!raw || raw.startsWith("blob:") || raw.startsWith("/api/media/")) return null;
  return toDropboxDirectUrl(raw) ?? (raw.startsWith("http") ? raw : null);
}

function localFile(input: PublishInput) {
  if (!input.localMediaId) return null;
  const asset = getMediaAsset(input.localMediaId);
  if (!asset) throw new Error(`Local media missing: ${input.localMediaId}`);
  return {
    bytes: readFileSync(asset.path),
    filename: asset.filename,
    mime: asset.mime,
    kind: asset.kind === "unknown" ? guessMediaKind(asset.filename, input.title) : asset.kind,
  };
}

/** Facebook Page — prefers local file upload, else remote URL. */
export async function publishFacebook(input: PublishInput): Promise<PublishResult> {
  const token = getMetaPageAccessToken(input.clientId);
  const account = getMetaAccount(input.clientId, "FB");
  if (!token || !account?.external_id) {
    throw new Error("Facebook Page is not connected");
  }
  const pageId = account.external_id;
  const message = composeMessage(input);
  const file = localFile(input);
  const url = remoteUrl(input);

  if (file) {
    if (file.kind === "video") {
      const data = await graphPostMultipart<{ id: string }>(
        `/${pageId}/videos`,
        token,
        { description: message },
        { field: "source", filename: file.filename, mime: file.mime, bytes: file.bytes },
      );
      return { externalPostId: data.id, detail: "Uploaded local video to Facebook" };
    }
    const data = await graphPostMultipart<{ id: string; post_id?: string }>(
      `/${pageId}/photos`,
      token,
      { caption: message },
      { field: "source", filename: file.filename, mime: file.mime, bytes: file.bytes },
    );
    return {
      externalPostId: data.post_id ?? data.id,
      detail: "Uploaded local photo to Facebook",
    };
  }

  if (url) {
    const kind = guessMediaKind(url, input.title);
    if (kind === "image") {
      const data = await graphPostForm<{ id: string; post_id?: string }>(`/${pageId}/photos`, token, {
        url,
        caption: message,
      });
      return { externalPostId: data.post_id ?? data.id };
    }
    if (kind === "video") {
      const data = await graphPostForm<{ id: string }>(`/${pageId}/videos`, token, {
        file_url: url,
        description: message,
      });
      return { externalPostId: data.id };
    }
    const body: Record<string, string> = { message: message || "(scheduled post)", link: url };
    const data = await graphPostForm<{ id: string }>(`/${pageId}/feed`, token, body);
    return { externalPostId: data.id };
  }

  const data = await graphPostForm<{ id: string }>(`/${pageId}/feed`, token, {
    message: message || "(scheduled post)",
  });
  return { externalPostId: data.id };
}

async function waitForIgContainer(creationId: string, token: string, attempts = 30) {
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

/**
 * Stage a local image on Facebook (unpublished) to obtain a Meta CDN URL
 * Instagram can fetch — Graph IG still requires a public image_url for photos.
 */
async function stageLocalImageOnFacebook(
  pageId: string,
  token: string,
  file: { bytes: Buffer; filename: string; mime: string },
): Promise<string> {
  const uploaded = await graphPostMultipart<{ id: string }>(
    `/${pageId}/photos`,
    token,
    { published: "false" },
    { field: "source", filename: file.filename, mime: file.mime, bytes: file.bytes },
  );
  const res = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${uploaded.id}?fields=images&access_token=${encodeURIComponent(token)}`,
  );
  const data = (await res.json()) as {
    images?: Array<{ source?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(data.error?.message ?? "Could not read staged Facebook photo");
  const source = data.images?.[0]?.source;
  if (!source) throw new Error("Facebook did not return a CDN URL for staged photo");
  return source;
}

/** Instagram professional — local file or remote URL. */
export async function publishInstagram(input: PublishInput): Promise<PublishResult> {
  const token = getMetaPageAccessToken(input.clientId);
  const ig = getMetaAccount(input.clientId, "IG");
  const fb = getMetaAccount(input.clientId, "FB");
  if (!token || !ig?.external_id) {
    throw new Error("Instagram is not connected");
  }
  const igUserId = ig.external_id;
  const caption = composeMessage(input);
  const file = localFile(input);
  let url = remoteUrl(input);
  let kind: "image" | "video" | "unknown" = url
    ? guessMediaKind(url, input.title)
    : "unknown";

  if (file) {
    kind = file.kind;
    if (file.kind === "image") {
      if (!fb?.external_id) {
        throw new Error("Instagram local photo publish needs a connected Facebook Page to stage media");
      }
      url = await stageLocalImageOnFacebook(fb.external_id, token, file);
    } else if (file.kind === "video") {
      // Upload video to Page unpublished, then try source URL for IG Reels
      if (!fb?.external_id) {
        throw new Error("Instagram local video publish needs a connected Facebook Page");
      }
      const uploaded = await graphPostMultipart<{ id: string }>(
        `/${fb.external_id}/videos`,
        token,
        { published: "false", description: caption },
        { field: "source", filename: file.filename, mime: file.mime, bytes: file.bytes },
      );
      const metaRes = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/${uploaded.id}?fields=source&access_token=${encodeURIComponent(token)}`,
      );
      const meta = (await metaRes.json()) as { source?: string; error?: { message?: string } };
      if (!metaRes.ok || !meta.source) {
        throw new Error(
          meta.error?.message ??
            "Could not get a public video URL from Facebook staging — try a shorter MP4 or reconnect Meta with publish scopes",
        );
      }
      url = meta.source;
    } else {
      throw new Error("Unsupported local media type for Instagram");
    }
  }

  if (!url) {
    throw new Error("Instagram publish needs local media or a public media URL");
  }

  const createBody: Record<string, string> = { caption };
  if (kind === "video") {
    createBody.media_type = "REELS";
    createBody.video_url = url;
  } else {
    createBody.image_url = url;
  }

  const created = await graphPostForm<{ id: string }>(`/${igUserId}/media`, token, createBody);
  if (kind === "video") {
    await waitForIgContainer(created.id, token);
  }

  const published = await graphPostForm<{ id: string }>(`/${igUserId}/media_publish`, token, {
    creation_id: created.id,
  });
  return {
    externalPostId: published.id,
    detail: file ? "Published from local Mac media" : "Published from remote URL",
  };
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
