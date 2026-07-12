import { useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { openCardDestination } from "@/lib/card-navigation";
import { useWorkspace } from "@/lib/workspace-context";
import type { ScheduledPost } from "@/lib/mock-data";
import type { PostDetailSource } from "@/lib/post-detail";
import type { ContentEvent } from "@/lib/workspaces/types";

export type CalendarDayGrid = {
  date: Date;
  posts: ScheduledPost[];
};

type DetailReturnContext =
  | { kind: "dayGrid"; value: CalendarDayGrid }
  | { kind: "event"; value: ContentEvent };

/** Shared day grid → open board that owns the card (card detail retired). */
export function useCalendarPostSelection() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspace();
  const [dayGrid, setDayGrid] = useState<CalendarDayGrid | null>(null);
  const [detailReturn, setDetailReturn] = useState<DetailReturnContext | null>(null);
  const dayGridRef = useRef(dayGrid);
  const detailReturnRef = useRef(detailReturn);
  dayGridRef.current = dayGrid;
  detailReturnRef.current = detailReturn;

  const openCardDetail = useCallback(
    (post: PostDetailSource) => {
      const grid = dayGridRef.current;
      if (grid) setDetailReturn({ kind: "dayGrid", value: grid });
      setDayGrid(null);
      openCardDestination(workspaceId, post.id, navigate);
    },
    [navigate, workspaceId],
  );

  const openPosts = useCallback((posts: ScheduledPost[], date: Date) => {
    if (posts.length === 0) return;
    setDetailReturn(null);
    setDayGrid({ date, posts });
  }, []);

  const selectFromGrid = openCardDetail;

  const openDetailFromEvent = useCallback(
    (post: PostDetailSource, event: ContentEvent) => {
      setDetailReturn({ kind: "event", value: event });
      openCardDestination(workspaceId, post.id, navigate);
    },
    [navigate, workspaceId],
  );

  const closeDayGrid = useCallback(() => setDayGrid(null), []);

  /** Returns event to reopen when the user navigates back from a card opened via an event modal. */
  const popDetailReturn = useCallback((): ContentEvent | null => {
    const ctx = detailReturnRef.current;
    setDetailReturn(null);
    if (ctx?.kind === "dayGrid") {
      setDayGrid(ctx.value);
    }
    return ctx?.kind === "event" ? ctx.value : null;
  }, []);

  return {
    dayGrid,
    openPosts,
    selectFromGrid,
    openDetailFromEvent,
    closeDayGrid,
    popDetailReturn,
  };
}
