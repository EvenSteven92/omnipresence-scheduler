/**
 * Studio AI hooks — production-ready boundaries for whiteboard actions.
 *
 * TODO (future): wire Generate Transcript to Whisper / speech-to-text on the
 * server. v1 drafts a structured outline from title + voice for paste/edit.
 */
import { aiGenerate } from "@/lib/ai-client";
import { prepareCardWithAi, type AiPrepareResult } from "@/lib/ai-schedule";
import type { DraftPost } from "@/lib/composer-draft";
import type { ScheduledPost } from "@/lib/mock-data";
import type { ContentEvent } from "@/lib/workspaces/types";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { draftDisplayTitle } from "@/lib/composer-draft";

/**
 * Draft transcript outline. Not real speech-to-text.
 * Returns timestamped placeholder lines the editor can replace.
 */
export async function generateTranscript(draft: DraftPost): Promise<string> {
  const title = draftDisplayTitle(draft);
  // Prefer AI expansion when gateway is available; fall back to local outline.
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
  // Fold CTA into transcript context for better captions
  const enriched: DraftPost = {
    ...draft,
    transcript: [
      draft.transcript?.trim(),
      draft.callToAction?.trim()
        ? `Preferred CTA: ${draft.callToAction.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
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
