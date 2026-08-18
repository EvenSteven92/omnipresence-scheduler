import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_ROOT = resolve(__dirname, "../..");
const REPO_ROOT = resolve(WORKER_ROOT, "..");

/** Load worker/.env then frontend/.env if present (no override of existing env). */
export function loadEnvFiles() {
  for (const path of [
    resolve(WORKER_ROOT, ".env"),
    resolve(WORKER_ROOT, ".env.local"),
    resolve(REPO_ROOT, "frontend/.env"),
    resolve(REPO_ROOT, "frontend/.env.local"),
  ]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

export function workerPort() {
  return Number(process.env.OMNI_WORKER_PORT ?? 8787);
}

export function appBaseUrl() {
  return (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function dataDir() {
  return process.env.OMNI_DATA_DIR ?? resolve(WORKER_ROOT, "data");
}

export function dbPath() {
  return process.env.OMNI_DB_PATH ?? resolve(dataDir(), "omnipresence.sqlite");
}

export { WORKER_ROOT, REPO_ROOT };
