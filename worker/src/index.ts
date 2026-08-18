import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { getMeta, initSchema, touchHeartbeat } from "./db/client.js";
import { loadEnvFiles, workerPort, appBaseUrl } from "./lib/env.js";
import { accountsRoutes } from "./routes/accounts.js";
import { youtubeRoutes } from "./routes/youtube.js";
import { metaRoutes } from "./routes/meta.js";
import { postsRoutes } from "./routes/posts.js";
import { runPublishDueOnce } from "./publish/loop.js";

loadEnvFiles();
initSchema();
touchHeartbeat();

const app = new Hono();
app.use(
  "*",
  cors({
    origin: [appBaseUrl(), "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);

app.get("/api/ops/health", (c) => {
  touchHeartbeat();
  return c.json({
    online: true,
    detail: "Local OmniPresence worker — OAuth, metrics, armed Meta publish",
    version: "0.2.0",
    lastTickAt: getMeta("last_tick_at"),
    lastPublishRunAt: getMeta("last_publish_run_at"),
  });
});

app.post("/api/ops/publish-due", async (c) => {
  const result = await runPublishDueOnce();
  touchHeartbeat();
  return c.json(result);
});

app.route("/api/accounts", accountsRoutes);
app.route("/api/youtube", youtubeRoutes);
app.route("/api/meta", metaRoutes);
app.route("/api/posts", postsRoutes);

app.get("/", (c) =>
  c.json({
    service: "omnipresence-worker",
    health: "/api/ops/health",
  }),
);

const port = workerPort();
serve({ fetch: app.fetch, port, hostname: "127.0.0.1" }, () => {
  console.log(`OmniPresence worker listening on http://127.0.0.1:${port}`);
  console.log(`App UI expected at ${appBaseUrl()}`);
});

setInterval(() => {
  touchHeartbeat();
}, 15_000);

// Armed auto-post: poll due FB/IG targets about every 30s
setInterval(() => {
  void runPublishDueOnce().catch((err) => {
    console.error("[publish-due]", err);
  });
}, 30_000);

// Kick once shortly after boot
setTimeout(() => {
  void runPublishDueOnce().catch(() => null);
}, 5_000);
