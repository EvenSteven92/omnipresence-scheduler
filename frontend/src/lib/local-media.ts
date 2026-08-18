export type LocalMediaUploadResult = {
  mediaId: string;
  filename: string;
  mime: string;
  kind: "image" | "video" | "unknown";
  sizeBytes: number;
  previewPath: string;
};

/** Upload a Mac-local file into the OmniPresence worker media vault. */
export async function uploadLocalMedia(
  file: File,
  clientId: string,
): Promise<LocalMediaUploadResult> {
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("clientId", clientId);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body,
    credentials: "include",
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(err.detail ?? `Media upload failed (${res.status})`);
  }
  const data = (await res.json()) as LocalMediaUploadResult & { ok?: boolean };
  return {
    mediaId: data.mediaId,
    filename: data.filename,
    mime: data.mime,
    kind: data.kind,
    sizeBytes: data.sizeBytes,
    previewPath: data.previewPath,
  };
}

export function localMediaPreviewUrl(mediaId: string) {
  return `/api/media/${mediaId}`;
}
