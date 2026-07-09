import { aiGenerate } from "@/lib/ai-client";
import {
  applyProposedTimes,
  suggestTimesForDraft,
  type DraftPost,
} from "@/lib/composer-draft";
import type { ScheduledPost } from "@/lib/mock-data";
import type { WorkspaceProfile } from "@/lib/workspaces/types";
import { getEventById } from "@/lib/events/display";
import type { ContentEvent } from "@/lib/workspaces/types";
import { pendingSlotsFromQueue } from "@/lib/schedule-engine";
import { PLATFORMS_BY_SHORT } from "@/lib/platforms";

export type AiPrepareResult = {
  draft: DraftPost;
  scheduleReasons: Partial<Record<string, string>>;
};

function buildBrief(draft: DraftPost, events: ContentEvent[]): string {
  const event = draft.eventId ? getEventById(events, draft.eventId) : undefined;
  const eventContext = event ? `Event album: "${event.title}" (${event.kind}). ` : "";
  const transcript = draft.transcript?.trim();
  const caption = draft.caption?.trim();
  const core = transcript || caption || draft.filename;
  return `${eventContext}${core}`;
}

/** AI caption + hashtags, then peak-time schedule per selected platform. */
export async function prepareCardWithAi(
  draft: DraftPost,
  opts: {
    scheduledPosts: ScheduledPost[];
    queue: DraftPost[];
    postingTimes?: WorkspaceProfile["postingTimes"];
    voice?: string;
    events: ContentEvent[];
  },
): Promise<AiPrepareResult> {
  const brief = buildBrief(draft, opts.events);
  const title = draft.title ?? draft.filename;

  const [caption, hashtags] = await Promise.all([
    aiGenerate({
      kind: "caption",
      brief,
      title,
      platforms: draft.platforms,
      tone: opts.voice,
    }),
    aiGenerate({
      kind: "hashtags",
      brief,
      title,
      platforms: draft.platforms,
      tone: opts.voice,
    }),
  ]);

  const assigned = pendingSlotsFromQueue(opts.queue.filter((d) => d.id !== draft.id));
  const times = suggestTimesForDraft(
    { ...draft, platforms: draft.platforms },
    opts.scheduledPosts,
    assigned,
    opts.postingTimes,
  );

  const scheduleReasons: Partial<Record<string, string>> = {};
  for (const p of draft.platforms) {
    if (times[p]) {
      const peaks = opts.postingTimes?.[p] ?? PLATFORMS_BY_SHORT[p]?.peakTimes ?? [];
      const peakHint = peaks[0] ? `peak window around ${peaks[0]}` : "audience peak window";
      scheduleReasons[p] = `Best time for ${PLATFORMS_BY_SHORT[p]?.full ?? p} · ${peakHint}`;
    }
  }

  return {
    draft: applyProposedTimes(
      {
        ...draft,
        caption: caption.trim(),
        hashtags: hashtags.trim(),
      },
      times,
    ),
    scheduleReasons,
  };
}

/** Run AI prepare across a batch (sequential to avoid rate limits). */
export async function prepareBatchWithAi(
  drafts: DraftPost[],
  opts: {
    scheduledPosts: ScheduledPost[];
    postingTimes?: WorkspaceProfile["postingTimes"];
    voice?: string;
    events: ContentEvent[];
    onProgress?: (done: number, total: number, draftId: string) => void;
  },
): Promise<DraftPost[]> {
  const out: DraftPost[] = [];
  let workingQueue: DraftPost[] = [...drafts];

  for (let i = 0; i < drafts.length; i++) {
    const current = drafts[i]!;
    try {
      const { draft } = await prepareCardWithAi(current, {
        scheduledPosts: opts.scheduledPosts,
        queue: workingQueue,
        postingTimes: opts.postingTimes,
        voice: opts.voice,
        events: opts.events,
      });
      out.push(draft);
      workingQueue = workingQueue.map((d) => (d.id === draft.id ? draft : d));
    } catch {
      out.push(current);
    }
    opts.onProgress?.(i + 1, drafts.length, current.id);
  }
  return out;
}
