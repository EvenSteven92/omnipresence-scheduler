import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { resolveDropboxUrl } from "@/lib/dropbox";

const bodySchema = z.object({
  url: z.string().min(1),
});

/**
 * POST /api/dropbox/resolve
 * Body: { url } → { ok, shareUrl, directUrl, filename?, mediaKind }
 * No Dropbox API key — public share link normalization only.
 */
export const Route = createFileRoute("/api/dropbox/resolve")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const json = await request.json().catch(() => null);
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
          return Response.json({ detail: "url required" }, { status: 400 });
        }
        const result = resolveDropboxUrl(parsed.data.url);
        if (!result.ok) {
          return Response.json({ detail: result.detail }, { status: 400 });
        }
        return Response.json(result);
      },
    },
  },
});
