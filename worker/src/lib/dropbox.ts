/** Normalize public Dropbox share links to a direct download URL. */

export function toDropboxDirectUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)dropbox\.com$/i.test(u.hostname) && !/(^|\.)dropboxusercontent\.com$/i.test(u.hostname)) {
      return null;
    }
    if (/(^|\.)dropboxusercontent\.com$/i.test(u.hostname)) return u.toString();
    u.searchParams.set("dl", "1");
    u.searchParams.delete("raw");
    return u.toString();
  } catch {
    return null;
  }
}

export function guessMediaKind(url: string, title?: string): "image" | "video" | "unknown" {
  const hay = `${url} ${title ?? ""}`.toLowerCase();
  if (/\.(mp4|mov|m4v|webm)(\?|$)/i.test(hay) || hay.includes("video")) return "video";
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(hay) || hay.includes("photo") || hay.includes("image")) {
    return "image";
  }
  return "unknown";
}
