import { setMeta } from "../db/client.js";
import { ensureEngageSchema } from "./schema.js";
import { syncYouTubeComments } from "./youtube.js";
import { syncMetaComments } from "./meta.js";

export async function syncEngageClient(clientId: string) {
  ensureEngageSchema();
  const youtube = await syncYouTubeComments(clientId);
  const meta = await syncMetaComments(clientId);
  setMeta("last_engage_sync_at", new Date().toISOString());
  return {
    clientId,
    youtube,
    meta,
    synced: (youtube.synced ?? 0) + (meta.synced ?? 0),
  };
}

export async function syncEngageAllClients() {
  ensureEngageSchema();
  const clients = ["torcc", "first-love", "open-eyes", "keka"] as const;
  const results = [];
  for (const clientId of clients) {
    try {
      results.push(await syncEngageClient(clientId));
    } catch (error) {
      results.push({
        clientId,
        error: error instanceof Error ? error.message : "Engage sync failed",
        synced: 0,
      });
    }
  }
  setMeta("last_engage_sync_at", new Date().toISOString());
  return { results };
}
