/**
 * Studio AI hooks — prepare pipeline.
 *
 * Transcript → (CTA when event-linked) → Caption + hashtags.
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

/**
 * AI call-to-action once a reel is stringed to an event.
 */
export async function generateCallToAction(
  draft: DraftPost,
  event: ContentEvent,
  voice?: string,
): Promise<string> {
  const title = draftDisplayTitle(draft);
  const eventDate = new Date(event.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  try {
    const text = await aiGenerate({
      kind: "caption",
      brief: [
        `Write ONE short social call-to-action line (max 12 words) for a ministry reel.`,
        `Event: "${event.title}" (${event.kind.replace(/_/g, " ")}) on ${eventDate}.`,
        `Reel: "${title}".`,
        `No hashtags. No quotes. Imperative and warm. Examples: Join us Sunday · Watch the full message · Link in bio.`,
      ].join("\n"),
      title,
      tone: voice,
    });
    const line = text
      .trim()
      .split("\n")[0]
      ?.replace(/^["']|["']$/g, "")
      .trim();
    if (line) return line.slice(0, 120);
  } catch {
    /* mock */
  }
  return `Join us for ${event.title}`;
}

/** Build AI brief: event → title → transcript → CTA. */
export function buildCaptionBrief(
  draft: DraftPost,
  event?: ContentEvent | null,
): string {
  const parts: string[] = [];
  if (event) {
    parts.push(
      `Event: "${event.title}" (${event.kind.replace(/_/g, " ")}) — ${new Date(event.date).toLocaleDateString()}`,
    );
    if (event.description?.trim()) {
      parts.push(`Event context: ${event.description.trim()}`);
    }
  }
  parts.push(`Title: ${draftDisplayTitle(draft)}`);
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

  const event = draft.eventId
    ? opts.events.find((e) => e.id === draft.eventId)
    : undefined;

  const enriched: DraftPost = {
    ...draft,
    transcript: buildCaptionBrief(draft, event),
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

/**
 * Full AI prepare: transcript (if empty) → CTA if event-linked → caption+hashtags.
 */
export async function prepareStudioCardWithAi(
  draft: DraftPost,
  opts: {
    scheduledPosts: ScheduledPost[];
    queue: DraftPost[];
    voice?: string;
    events: ContentEvent[];
    postingTimes?: WorkspaceProfile["postingTimes"];
  },
): Promise<DraftPost> {
  let next = { ...draft };

  if (!next.transcript?.trim()) {
    next = {
      ...next,
      transcript: await generateTranscript(next),
      studioOpen: { ...next.studioOpen, transcript: true },
    };
  }

  const event = next.eventId
    ? opts.events.find((e) => e.id === next.eventId)
    : undefined;
  if (event && !next.callToAction?.trim()) {
    next = {
      ...next,
      callToAction: await generateCallToAction(next, event, opts.voice),
      studioOpen: { ...next.studioOpen, cta: true },
    };
  }

  if (!next.caption?.trim() || !next.hashtags?.trim()) {
    if (!hasScriptSource(next)) {
      next = {
        ...next,
        callToAction: next.callToAction || "Watch and share",
        studioOpen: { ...next.studioOpen, cta: true },
      };
    }
    const { draft: withCopy } = await generateCaptionWithHashtags(next, opts);
    next = {
      ...next,
      caption: withCopy.caption,
      hashtags: withCopy.hashtags,
      studioOpen: { ...next.studioOpen, caption: true, title: true },
    };
  }

  return next;
}
