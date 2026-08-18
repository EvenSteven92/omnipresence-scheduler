import { Hono } from "hono";
import { getMetaMetrics, syncMetaClient } from "../meta/sync.js";

export const metaRoutes = new Hono();

metaRoutes.get("/metrics", (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  try {
    return c.json(getMetaMetrics(clientId));
  } catch {
    return c.json({
      facebook: { connected: false, page: null, posts: [] },
      instagram: { connected: false, account: null, media: [] },
    });
  }
});

metaRoutes.get("/sync", async (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  try {
    return c.json(await syncMetaClient(clientId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta sync failed";
    return c.json({ detail: message }, 502);
  }
});

metaRoutes.post("/sync", async (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  try {
    return c.json(await syncMetaClient(clientId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta sync failed";
    return c.json({ detail: message }, 502);
  }
});
