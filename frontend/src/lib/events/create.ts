import type { ContentEvent, ContentEventKind } from "@/lib/workspaces/types";
import { combineDateAndTime } from "@/lib/schedule-engine";

export interface CreateEventInput {
  title: string;
  description?: string;
  date: string;
  time: string;
  kind: ContentEventKind;
}

export function createEventFromInput(input: CreateEventInput): ContentEvent {
  return {
    id: `custom-ev-${Date.now()}`,
    title: input.title.trim(),
    description: input.description?.trim() || undefined,
    date: combineDateAndTime(input.date, input.time),
    kind: input.kind,
  };
}
