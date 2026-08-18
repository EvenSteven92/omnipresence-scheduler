/**
 * Dropbox share-link helpers (v1 — no Dropbox app key).
 * Paste public share links; we normalize to a downloadable direct URL.
 */

const DROPBOX_HOST =
  /(^|\.)dropbox\.com$/i;
const DROPBOX_CONTENT_HOST = /(^|\.)dropboxusercontent\.com$/i;

export type DropboxResolveResult = {
  ok: true;
  shareUrl: string;
  directUrl: string;
  filename?: string;
  mediaKind: "image" | "video" | "unknown";
};

export type DropboxResolveError = {
  ok: false;
  detail: string;
};

export function isDropboxUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return DROPBOX_HOST.test(u.hostname) || DROPBOX_CONTENT_HOST.test(u.hostname);
  } catch {
    return false;
  }
}

/** Normalize pasted text into a full URL if it looks like Dropbox. */
export function normalizeDropboxShareUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const u = new URL(withProto);
    if (!DROPBOX_HOST.test(u.hostname) && !DROPBOX_CONTENT_HOST.test(u.hostname)) {
      return null;
    }
    // Prefer https
    u.protocol = "https:";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Convert a Dropbox share link into a direct-download style URL.
 * - `dl=0` → `dl=1`
 * - missing `dl` → add `dl=1`
 * Already-direct content hosts are returned as-is.
 */
export function toDropboxDirectUrl(shareUrl: string): string {
  const u = new URL(shareUrl);
  if (DROPBOX_CONTENT_HOST.test(u.hostname)) {
    return u.toString();
  }
  // Classic /s/ and /scl/fi/ share links
  if (u.searchParams.has("dl")) {
    u.searchParams.set("dl", "1");
  } else {
    u.searchParams.set("dl", "1");
  }
  // Some newer links use raw=1 for direct content
  if (u.pathname.includes("/scl/")) {
    u.searchParams.set("raw", "1");
  }
  return u.toString();
}

export function filenameFromDropboxUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    // /s/TOKEN/filename.ext or /scl/fi/ID/filename
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last || last.length < 3) return undefined;
    // Skip opaque tokens (no extension, pure hash-like)
    if (!last.includes(".") && last.length > 20) {
      const prev = parts[parts.length - 2];
      if (prev?.includes(".")) return decodeURIComponent(prev);
      return undefined;
    }
    return decodeURIComponent(last.split("?")[0]!);
  } catch {
    return undefined;
  }
}

export function mediaKindFromFilename(name?: string): "image" | "video" | "unknown" {
  if (!name) return "unknown";
  const lower = name.toLowerCase();
  if (/\.(mp4|mov|webm|m4v|avi|mkv)$/.test(lower)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp|heic|tif|tiff)$/.test(lower)) return "image";
  return "unknown";
}

/** Client-side resolve (no network) — validates + builds direct URL. */
export function resolveDropboxUrl(raw: string): DropboxResolveResult | DropboxResolveError {
  const shareUrl = normalizeDropboxShareUrl(raw);
  if (!shareUrl) {
    return {
      ok: false,
      detail: "Paste a Dropbox share link (dropbox.com/s/… or /scl/fi/…).",
    };
  }
  const directUrl = toDropboxDirectUrl(shareUrl);
  const filename = filenameFromDropboxUrl(shareUrl);
  return {
    ok: true,
    shareUrl,
    directUrl,
    filename,
    mediaKind: mediaKindFromFilename(filename),
  };
}
