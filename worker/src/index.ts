import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { getMeta, initSchema, touchHeartbeat } from "./db/client.js";
import { loadEnvFiles, workerPort, appBaseUrl } from "./lib/env.js";
import { accountsRoutes } from "./routes/accounts.js";
import { youtubeRoutes } from "./routes/youtube.js";
import { metaRoutes } from "./routes/meta.js";

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
    detail: "Local OmniPresence worker running (SQLite + OAuth + metrics sync)",
    version: "0.1.0",
    lastTickAt: getMeta("last_tick_at"),
  });
});

app.route("/api/accounts", accountsRoutes);
app.route("/api/youtube", youtubeRoutes);
app.route("/api/meta", metaRoutes);

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

// Periodic heartbeat + future publish/inbox loops
setInterval(() => {
  touchHeartbeat();
}, 15_000);
