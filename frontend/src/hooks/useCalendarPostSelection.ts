import { useCallback, useRef, useState } from "react";
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

/** Shared day grid → detail flow with one-level back navigation. */
export function useCalendarPostSelection() {
  const [dayGrid, setDayGrid] = useState<CalendarDayGrid | null>(null);
  const [detailPost, setDetailPost] = useState<PostDetailSource | null>(null);
  const [detailReturn, setDetailReturn] = useState<DetailReturnContext | null>(null);
  const dayGridRef = useRef(dayGrid);
  const detailReturnRef = useRef(detailReturn);
  dayGridRef.current = dayGrid;
  detailReturnRef.current = detailReturn;

  const openPosts = useCallback((posts: ScheduledPost[], date: Date) => {
    if (posts.length === 0) return;
    setDetailReturn(null);
    setDayGrid({ date, posts });
  }, []);

  const selectFromGrid = useCallback((post: PostDetailSource) => {
    const grid = dayGridRef.current;
    if (grid) setDetailReturn({ kind: "dayGrid", value: grid });
    setDayGrid(null);
    setDetailPost(post);
  }, []);

  const openDetailFromEvent = useCallback((post: PostDetailSource, event: ContentEvent) => {
    setDetailReturn({ kind: "event", value: event });
    setDetailPost(post);
  }, []);

  const closeDayGrid = useCallback(() => setDayGrid(null), []);

  /** Closes detail and restores day grid when applicable. Returns event to reopen when applicable. */
  const closeDetail = useCallback((): ContentEvent | null => {
    setDetailPost(null);
    const ctx = detailReturnRef.current;
    setDetailReturn(null);
    if (ctx?.kind === "dayGrid") {
      setDayGrid(ctx.value);
    }
    return ctx?.kind === "event" ? ctx.value : null;
  }, []);

  return {
    dayGrid,
    detailPost,
    openPosts,
    selectFromGrid,
    openDetailFromEvent,
    closeDayGrid,
    closeDetail,
  };
}
