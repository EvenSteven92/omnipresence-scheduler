import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { ensureMediaSchema, getMediaAsset, saveMediaBuffer } from "../media/store.js";

export const mediaRoutes = new Hono();

mediaRoutes.post("/upload", async (c) => {
  ensureMediaSchema();
  const body = await c.req.parseBody();
  const file = body["file"];
  const clientId = String(body["clientId"] ?? body["workspace"] ?? "torcc");

  if (!file || typeof file === "string") {
    return c.json({ detail: "file required (multipart field name: file)" }, 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const asset = saveMediaBuffer({
    clientId,
    filename: file.name || "upload.bin",
    mime: file.type || "application/octet-stream",
    bytes,
  });

  return c.json({
    ok: true,
    mediaId: asset.id,
    filename: asset.filename,
    mime: asset.mime,
    kind: asset.kind,
    sizeBytes: asset.size_bytes,
    previewPath: `/api/media/${asset.id}`,
  });
});

mediaRoutes.get("/:id", (c) => {
  const id = c.req.param("id");
  const asset = getMediaAsset(id);
  if (!asset) return c.json({ detail: "Not found" }, 404);
  const bytes = readFileSync(asset.path);
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": asset.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${asset.filename.replace(/"/g, "")}"`,
    },
  });
});

mediaRoutes.get("/:id/meta", (c) => {
  const asset = getMediaAsset(c.req.param("id"));
  if (!asset) return c.json({ detail: "Not found" }, 404);
  return c.json({
    id: asset.id,
    clientId: asset.client_id,
    filename: asset.filename,
    mime: asset.mime,
    kind: asset.kind,
    sizeBytes: asset.size_bytes,
    previewPath: `/api/media/${asset.id}`,
  });
});
