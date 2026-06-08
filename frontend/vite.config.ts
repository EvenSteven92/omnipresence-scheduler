// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const nitroPreset = process.env.NITRO_PRESET ?? "vercel";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  // Nitro bundles the SSR app for Vercel (or Cloudflare via NITRO_PRESET).
  // Lovable defaults write server output to dist/server; Vercel needs functions/__server.func.
  nitro: {
    preset: nitroPreset,
    ...(nitroPreset === "vercel"
      ? {
          output: {
            dir: ".vercel/output",
            serverDir: ".vercel/output/functions/__server.func",
            publicDir: ".vercel/output/static",
          },
        }
      : {}),
  },
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
      proxy: {
        // Keep news/health on FastAPI; AI copy is handled by TanStack server routes.
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
  },
});
