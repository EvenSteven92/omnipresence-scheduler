import { createHash, randomBytes } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { getDb } from "../db/client.js";
import { dataDir } from "../lib/env.js";

export type MediaAsset = {
  id: string;
  client_id: string;
  filename: string;
  mime: string;
  kind: "image" | "video" | "unknown";
  path: string;
  size_bytes: number;
  created_at: string;
};

function mediaRoot() {
  const dir = join(dataDir(), "media");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function ensureMediaSchema() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS media_assets (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime TEXT NOT NULL DEFAULT 'application/octet-stream',
      kind TEXT NOT NULL DEFAULT 'unknown',
      path TEXT NOT NULL,
      size_bytes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  try {
    getDb().exec(`ALTER TABLE posts ADD COLUMN local_media_id TEXT`);
  } catch {
    /* column already exists */
  }
}

function guessKind(filename: string, mime: string): "image" | "video" | "unknown" {
  const m = mime.toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (m.startsWith("video/")) return "video";
  const ext = extname(filename).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"].includes(ext)) return "image";
  if ([".mp4", ".mov", ".m4v", ".webm"].includes(ext)) return "video";
  return "unknown";
}

export function saveMediaBuffer(input: {
  clientId: string;
  filename: string;
  mime: string;
  bytes: Buffer;
}): MediaAsset {
  ensureMediaSchema();
  const id = `media_${randomBytes(8).toString("hex")}`;
  const safeExt = extname(input.filename) || (input.mime.includes("png") ? ".png" : ".bin");
  const clientDir = join(mediaRoot(), input.clientId);
  mkdirSync(clientDir, { recursive: true });
  const abs = join(clientDir, `${id}${safeExt}`);
  writeFileSync(abs, input.bytes);
  const kind = guessKind(input.filename, input.mime);
  const created = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO media_assets (id, client_id, filename, mime, kind, path, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.clientId, input.filename, input.mime, kind, abs, input.bytes.length, created);

  return {
    id,
    client_id: input.clientId,
    filename: input.filename,
    mime: input.mime,
    kind,
    path: abs,
    size_bytes: input.bytes.length,
    created_at: created,
  };
}

export function getMediaAsset(id: string): MediaAsset | null {
  ensureMediaSchema();
  return (
    (getDb().prepare(`SELECT * FROM media_assets WHERE id = ?`).get(id) as MediaAsset | undefined) ??
    null
  );
}

export function mediaPublicPath(id: string) {
  return `/api/media/${id}`;
}

/** Content hash helper if we later dedupe. */
export function hashBytes(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function copyPathToMedia(input: {
  clientId: string;
  filename: string;
  mime: string;
  sourcePath: string;
}): MediaAsset {
  ensureMediaSchema();
  if (!existsSync(input.sourcePath)) throw new Error("Source file missing");
  const id = `media_${randomBytes(8).toString("hex")}`;
  const safeExt = extname(input.filename) || ".bin";
  const clientDir = join(mediaRoot(), input.clientId);
  mkdirSync(clientDir, { recursive: true });
  const abs = join(clientDir, `${id}${safeExt}`);
  copyFileSync(input.sourcePath, abs);
  const { size } = statSync(abs);
  const kind = guessKind(input.filename, input.mime);
  const created = new Date().toISOString();
  getDb()
    .prepare(
      `INSERT INTO media_assets (id, client_id, filename, mime, kind, path, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, input.clientId, input.filename, input.mime, kind, abs, size, created);
  return {
    id,
    client_id: input.clientId,
    filename: input.filename,
    mime: input.mime,
    kind,
    path: abs,
    size_bytes: size,
    created_at: created,
  };
}
