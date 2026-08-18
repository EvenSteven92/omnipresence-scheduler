import { Hono } from "hono";
import { getYouTubeMetrics, syncYouTubeClient } from "../youtube/sync.js";

export const youtubeRoutes = new Hono();

youtubeRoutes.get("/metrics", (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  try {
    return c.json(getYouTubeMetrics(clientId));
  } catch {
    return c.json({ connected: false, channel: null, videos: [] });
  }
});

youtubeRoutes.get("/sync", async (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  try {
    return c.json(await syncYouTubeClient(clientId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube sync failed";
    return c.json({ detail: message }, 502);
  }
});

youtubeRoutes.post("/sync", async (c) => {
  const clientId = c.req.query("workspace") ?? "torcc";
  try {
    return c.json(await syncYouTubeClient(clientId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "YouTube sync failed";
    return c.json({ detail: message }, 502);
  }
});
