import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  createTeamSessionToken,
  isTeamAccessCodeValid,
  teamSessionCookie,
} from "@/server/team-auth";

const loginSchema = z.object({
  code: z.string().min(1),
});

export const Route = createFileRoute("/api/team/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ detail: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ detail: "Access code required" }, { status: 400 });
        }

        if (!isTeamAccessCodeValid(parsed.data.code)) {
          return Response.json({ detail: "Invalid access code" }, { status: 401 });
        }

        const token = createTeamSessionToken();
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": teamSessionCookie(token),
          },
        });
      },
    },
  },
});
