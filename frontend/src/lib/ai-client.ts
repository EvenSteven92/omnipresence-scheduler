/**
 * Frontend helper for POST /api/ai/generate.
 * Served by TanStack server routes (Vercel AI Gateway + Grok on deploy).
 *
 * Mock mode (default): skip network so Studio prepare/caption/CTA flows
 * can be tested offline. Set VITE_STUDIO_MOCK_AI=0 to use the live API.
 */
export type AiKind =
  | "caption"
  | "hashtags"
  | "yt_desc"
  | "yt_title"
  | "internal_notes"
  | "weekly_summary";

export interface AiGenerateInput {
  kind: AiKind;
  brief: string;
  title?: string;
  tone?: string;
  platforms?: string[];
}

const MOCK_DELAY_MS = 280;

/** Live AI only when explicitly opted out of mock. */
export function isStudioMockAi(): boolean {
  try {
    return import.meta.env.VITE_STUDIO_MOCK_AI !== "0";
  } catch {
    return true;
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Pull a short title-ish token from brief/title for deterministic copy. */
function topicFrom(input: AiGenerateInput): string {
  const raw = (input.title || "").trim();
  if (raw) return raw.slice(0, 80);
  const m = input.brief.match(/Title:\s*"?([^\n"]+)/i);
  if (m?.[1]) return m[1].trim().slice(0, 80);
  const first = input.brief.split("\n").find((l) => l.trim().length > 0);
  return (first || "this message").trim().slice(0, 80);
}

function eventHint(brief: string): string | null {
  const m = brief.match(/Event:\s*"([^"]+)"/i);
  return m?.[1]?.trim() || null;
}

function mockText(input: AiGenerateInput): string {
  const topic = topicFrom(input);
  const event = eventHint(input.brief);
  const ctaMatch = input.brief.match(
    /(?:Preferred call to action|Preferred CTA):\s*(.+)/i,
  );
  const cta = ctaMatch?.[1]?.trim().replace(/\.$/, "") || null;

  switch (input.kind) {
    case "internal_notes":
      return [
        `[0:00] Hook — open with the heart of "${topic}".`,
        `[0:08] Context — who this word is for and why it matters today.`,
        `[0:20] Main point 1 — truth from Scripture or the message.`,
        `[0:35] Main point 2 — practical invitation to respond.`,
        `[0:50] ${cta || (event ? `Invite them to ${event}` : "Call to action — invite a response.")}.`,
        `[1:05] Close — blessing and next step.`,
        ``,
        `// MOCK transcript — set VITE_STUDIO_MOCK_AI=0 for live generation`,
      ].join("\n");
    case "caption":
      return [
        event
          ? `${topic} — a word that still speaks. Catch the moment from ${event} and share it with someone who needs hope today.`
          : `${topic} — a short word to encourage your week. Watch, reflect, and pass it on.`,
        cta ? cta : event ? `Join us for ${event}.` : "Watch and share.",
      ].join("\n\n");
    case "hashtags":
      return "#faith #hope #community #sunday #encouragement #torcc";
    case "yt_title":
      return topic.length > 3 ? topic : "Sunday message highlight";
    case "yt_desc":
      return `Watch "${topic}"${event ? ` from ${event}` : ""}. Full message and next steps in the description.`;
    case "weekly_summary":
      return `This week’s highlight: ${topic}. Stay connected and invite a friend.`;
    default:
      return `Mock copy for ${topic}`;
  }
}

export async function aiGenerate(input: AiGenerateInput): Promise<string> {
  if (isStudioMockAi()) {
    await sleep(MOCK_DELAY_MS);
    return mockText(input);
  }

  const res = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const j = await res.json();
      detail = j.detail ?? detail;
    } catch {
      /* swallow */
    }
    throw new Error(detail);
  }
  const data = (await res.json()) as { kind: AiKind; text: string };
  return data.text;
}
