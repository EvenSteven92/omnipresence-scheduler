/**
 * Clean local Vite + TanStack Start config (no Lovable / Cloudflare deploy glue).
 */
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    // Avoid full-page reload storms when tooling rewrites env files
    watch: {
      ignored: [
        "**/.env",
        "**/.env.*",
        "**/.vercel/**",
        "**/node_modules/**",
        "**/.git/**",
      ],
    },
    hmr: {
      // Stable HMR overlay; client reconnects without new tabs
      overlay: true,
    },
    proxy: {
      // Optional FastAPI news ticker (backend on :8001)
      "/api/news": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/api/health": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
  // Don't auto-restart server on every env touch during local work
  envDir: ".",
  plugins: [
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: { entry: "server" },
    }),
    // React plugin must come after tanstackStart
    viteReact(),
    // Local/node preview builds only — not Vercel/Cloudflare
    // Disable nitro in pure `vite dev` to reduce watcher churn; enable for build via NITRO_PRESET
    ...(process.env.VITE_ENABLE_NITRO === "1" || process.env.npm_lifecycle_event === "build"
      ? [
          nitro({
            preset: process.env.NITRO_PRESET ?? "node-server",
          }),
        ]
      : []),
  ],
});
