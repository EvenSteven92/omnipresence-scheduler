import { generateText } from "ai";

import { buildUserPrompt, PROMPTS, type AiGenerateInput } from "./prompts";

const DEFAULT_MODEL = "xai/grok-4.1-fast-non-reasoning";

export async function generateMarketingCopy(input: AiGenerateInput): Promise<string> {
  const model = process.env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL;

  const { text } = await generateText({
    model,
    system: PROMPTS[input.kind],
    prompt: buildUserPrompt(input),
  });

  return text.trim();
}
