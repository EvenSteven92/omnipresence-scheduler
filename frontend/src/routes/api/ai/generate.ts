import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { generateMarketingCopy } from "@/server/ai/generate-copy";
import { AI_KINDS } from "@/server/ai/prompts";

const generateRequestSchema = z.object({
  kind: z.enum(AI_KINDS),
  brief: z.string().trim().min(1).max(10_000),
  tone: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  title: z.string().optional(),
});

export const Route = createFileRoute("/api/ai/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = generateRequestSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ detail: parsed.error.flatten() }, { status: 400 });
        }

        try {
          const text = await generateMarketingCopy(parsed.data);
          return Response.json({ kind: parsed.data.kind, text });
        } catch (error) {
          const message = error instanceof Error ? error.message : "LLM call failed";
          const status =
            message.includes("API key") || message.includes("authentication") ? 503 : 502;
          return Response.json({ detail: `LLM call failed: ${message}` }, { status });
        }
      },
    },
  },
});
