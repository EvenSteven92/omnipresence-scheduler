/**
 * Studio AI hooks — prepare pipeline only.
 *
 * Pipeline: Transcript + CTA → Caption with hashtags.
 * TODO: Generate Transcript → Whisper / real STT later.
 */
import { aiGenerate } from "@/lib/ai-client";
import { prepareCardWithAi, type AiPrepareResult } from "@/lib/ai-schedule";
import type { DraftPost } from "@/lib/composer-draft";
import { draftDisplayTitle } from "@/lib/composer-draft";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent, WorkspaceProfile } from "@/lib/workspaces/types";
import { hasScriptSource } from "@/lib/studio-layout";

/**
 * Draft transcript outline. Not real speech-to-text.
 */
export async function generateTranscript(draft: DraftPost): Promise<string> {
  const title = draftDisplayTitle(draft);
  try {
    const text = await aiGenerate({
      kind: "internal_notes",
      brief: `Draft a short spoken reel transcript outline (6–10 lines) for a ministry social video titled "${title}". ${
        draft.callToAction?.trim()
          ? `Preferred CTA: ${draft.callToAction.trim()}.`
          : ""
      } Use approximate timestamps like [0:00], [0:15]. No markdown fences.`,
      title,
    });
    if (text.trim()) return text.trim();
  } catch {
    /* offline / no key — mock */
  }

  return [
    `[0:00] Hook — open with the heart of "${title}".`,
    `[0:08] Context — who this word is for and why it matters today.`,
    `[0:20] Main point 1 — truth from Scripture or the message.`,
    `[0:35] Main point 2 — practical invitation to respond.`,
    `[0:50] ${draft.callToAction?.trim() || "Call to action — invite a response (pray, come, share)."}`,
    `[1:05] Close — blessing and next step.`,
    ``,
    `// TODO: replace with Whisper / real STT from video audio`,
  ].join("\n");
}

/** Build AI brief strictly from transcript + CTA (+ title). */
export function buildCaptionBrief(draft: DraftPost): string {
  const parts: string[] = [];
  const title = draftDisplayTitle(draft);
  parts.push(`Title: ${title}`);
  if (draft.transcript?.trim()) {
    parts.push(`Transcript:\n${draft.transcript.trim()}`);
  }
  if (draft.callToAction?.trim()) {
    parts.push(`Preferred call to action: ${draft.callToAction.trim()}`);
  }
  return parts.join("\n\n");
}

export async function generateCaptionWithHashtags(
  draft: DraftPost,
  opts: {
    scheduledPosts: ScheduledPost[];
    queue: DraftPost[];
    voice?: string;
    events: ContentEvent[];
    postingTimes?: WorkspaceProfile["postingTimes"];
  },
): Promise<AiPrepareResult> {
  if (!hasScriptSource(draft)) {
    throw new Error("Add a transcript or call to action before generating a caption.");
  }

  // Force caption model to see transcript + CTA first (not bare filename)
  const enriched: DraftPost = {
    ...draft,
    transcript: buildCaptionBrief(draft),
  };

  return prepareCardWithAi(enriched, {
    scheduledPosts: opts.scheduledPosts,
    queue: opts.queue,
    voice: opts.voice,
    events: opts.events,
    postingTimes: opts.postingTimes,
    fillTimes: false,
  });
}
