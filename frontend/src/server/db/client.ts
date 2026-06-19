import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured");
  }
  if (!db) {
    db = drizzle(neon(url), { schema });
  }
  return db;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
