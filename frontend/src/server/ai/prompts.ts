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

export const AI_KINDS = [
  "caption",
  "hashtags",
  "yt_desc",
  "yt_title",
  "internal_notes",
  "weekly_summary",
] as const satisfies readonly AiKind[];

export const PROMPTS: Record<AiKind, string> = {
  caption:
    "You write punchy, on-brand social-media captions for a multi-platform creator. " +
    "Output ONLY the caption text — no preamble, no quotes, no markdown headers. " +
    "Use line breaks for rhythm. Keep it within 1100 characters unless asked otherwise. " +
    "If platforms include X (Twitter), keep the FIRST line under 240 chars so it can be reused there.",
  hashtags:
    "You generate social-media hashtag blocks optimised per platform. " +
    "Output ONLY a single line of space-separated hashtags (no commas, no quotes, no preamble). " +
    "Target ~12 hashtags total. Mix branded, niche, and trending. Lowercase unless brand demands otherwise.",
  yt_desc:
    "You write SEO-optimised YouTube descriptions. " +
    "Output a 3-paragraph description: (1) hook + summary, (2) what viewers will learn / takeaways with bullets, (3) CTA + socials. " +
    "Plain text only, no markdown headers. ~150-220 words.",
  yt_title:
    "You write punchy YouTube titles (max 70 chars) that earn clicks without clickbait. " +
    "Output ONLY the title — no quotes, no numbering, no markdown. One line.",
  internal_notes:
    "You summarise post intent for an internal social team. " +
    "Output 3-5 short bullet points (use '- '): goal, primary platform, success metric, any caveats. " +
    "Plain text only.",
  weekly_summary:
    "You are a friendly, sharp social-media analyst. Given a brand's recent performance numbers, " +
    "write a short report: what's working, what to watch, and 2-3 specific, concrete recommendations " +
    "for the coming week. 4-6 sentences of warm, direct plain text — no markdown headers, no hype.",
};

export function buildUserPrompt(input: AiGenerateInput): string {
  const parts: string[] = [];
  if (input.title) parts.push(`Post title: ${input.title}`);
  if (input.platforms?.length) parts.push(`Target platforms: ${input.platforms.join(", ")}`);
  if (input.tone) parts.push(`Tone: ${input.tone}`);
  parts.push(`Brief / transcript:\n${input.brief.trim()}`);
  return parts.join("\n\n");
}
