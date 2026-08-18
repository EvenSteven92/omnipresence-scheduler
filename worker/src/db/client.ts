import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { dbPath, WORKER_ROOT } from "../lib/env.js";

let db: Database.Database | null = null;

export function getDb() {
  if (db) return db;
  const path = dbPath();
  mkdirSync(dirname(path), { recursive: true });
  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function initSchema() {
  const schemaPath = resolve(WORKER_ROOT, "schema.sql");
  if (!existsSync(schemaPath)) {
    throw new Error(`Missing schema at ${schemaPath}`);
  }
  const sql = readFileSync(schemaPath, "utf8");
  getDb().exec(sql);
  setMeta("schema_initialized_at", new Date().toISOString());
}

export function setMeta(key: string, value: string) {
  getDb()
    .prepare(
      `INSERT INTO worker_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(key, value);
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare(`SELECT value FROM worker_meta WHERE key = ?`).get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function touchHeartbeat() {
  setMeta("last_tick_at", new Date().toISOString());
}
