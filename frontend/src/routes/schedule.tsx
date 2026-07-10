import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Loader2, Pencil, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ComposerPreviewRail } from "@/components/composer/ComposerPreviewRail";
import { ComposerPublishPlan } from "@/components/composer/ComposerPublishPlan";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import {
  applyProposedTimes,
  draftDisplayTitle,
  type DraftPost,
} from "@/lib/composer-draft";
import {
  readComposerShelf,
  removeFromReady,
  unstageReadyToDrafting,
  writeComposerShelf,
} from "@/lib/draft-storage";
import { demoPreviewForPost } from "@/lib/demo-media";
import {
  applyCadencePreset,
  combineDateAndTime,
  pendingSlotsFromQueue,
  type CadencePresetId,
} from "@/lib/schedule-engine";
import { suggestTimesForDraft } from "@/lib/composer-draft";
import type { Platform } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — TORCC OmniSocial" },
      {
        name: "description",
        content: "Set when and where prepared reels publish. Cadence, peak times, commit to calendar.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const navigate = useNavigate();
  const { workspace, workspaceId, addScheduledPosts } = useWorkspace();
  const [ready, setReady] = useState<DraftPost[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [cadenceActive, setCadenceActive] = useState<CadencePresetId | null>(null);
  const [cadenceScope, setCadenceScope] = useState<"all" | "this">("all");
  const [scheduleReasons, setScheduleReasons] = useState<
    Partial<Record<string, Partial<Record<string, string>>>>
  >({});
  const [timesBusy, setTimesBusy] = useState(false);

  const active = ready[activeIndex] ?? null;

  const reload = useCallback(() => {
    const shelf = readComposerShelf(workspaceId);
    setReady(shelf.ready);
    setActiveIndex((i) => Math.min(i, Math.max(0, shelf.ready.length - 1)));
  }, [workspaceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    // Persist times edits on ready shelf
    const shelf = readComposerShelf(workspaceId);
    writeComposerShelf(workspaceId, shelf.drafting, ready, shelf.savedDrafts);
  }, [workspaceId, ready]);

  const updateActive = useCallback(
    (updater: (d: DraftPost) => DraftPost) => {
      setReady((cur) => {
        const idx = activeIndex;
        const draft = cur[idx];
        if (!draft) return cur;
        const next = cur.slice();
        next[idx] = updater(draft);
        return next;
      });
    },
    [activeIndex],
  );

  function updatePlatformSchedule(platform: Platform, dateStr: string, timeStr: string) {
    if (!active) return;
    const iso = combineDateAndTime(dateStr, timeStr);
    updateActive((draft) => ({
      ...draft,
      proposedTimes: { ...(draft.proposedTimes ?? {}), [platform]: iso },
    }));
  }

  function suggestTimesOnly() {
    if (!active) return;
    const assigned = pendingSlotsFromQueue(ready.filter((d) => d.id !== active.id));
    const times = suggestTimesForDraft(
      active,
      workspace.scheduledPosts,
      assigned,
      workspace.postingTimes,
    );
    updateActive((d) => applyProposedTimes(d, times));
    const reasons: Partial<Record<string, string>> = {};
    for (const p of active.platforms) {
      if (times[p]) reasons[p] = "Audience peak for this network";
    }
    setScheduleReasons((prev) => ({ ...prev, [active.id]: reasons }));
    setCadenceActive("peak");
  }

  function applyCadence(preset: CadencePresetId) {
    if (ready.length === 0) return;
    setCadenceActive(preset);
    const targets = cadenceScope === "this" && active ? [active] : ready;
    const { byFile, slots } = applyCadencePreset(
      targets,
      preset,
      workspace.scheduledPosts,
      workspace.postingTimes,
    );
    setReady((cur) =>
      cur.map((d) => {
        const times = byFile[d.id];
        return times ? applyProposedTimes(d, times) : d;
      }),
    );
    const reasonsByFile: Partial<Record<string, Partial<Record<string, string>>>> = {};
    slots.forEach((s) => {
      const file = reasonsByFile[s.fileId] ?? {};
      file[s.platform] = s.reason;
      reasonsByFile[s.fileId] = file;
    });
    setScheduleReasons((prev) => ({ ...prev, ...reasonsByFile }));
  }

  function fillAllPeakTimes() {
    if (ready.length === 0 || timesBusy) return;
    setTimesBusy(true);
    try {
      applyCadence("peak");
      setCadenceScope("all");
    } finally {
      setTimesBusy(false);
    }
  }

  function scheduleCurrent() {
    if (!active) return;
    const scheduled = draftToScheduledPost(active);
    if (!scheduled) return;
    void addScheduledPosts([scheduled]);
    const nextReady = removeFromReady(workspaceId, [active.id]);
    setReady(nextReady);
    setActiveIndex((i) => Math.min(i, Math.max(0, nextReady.length - 1)));
    if (nextReady.length === 0) navigate({ to: "/calendar" });
  }

  function scheduleAllReady() {
    const toCommit = ready
      .map((d) => draftToScheduledPost(d))
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (toCommit.length === 0) return;
    void addScheduledPosts(toCommit);
    const ids = toCommit.map((p) => p.id);
    removeFromReady(workspaceId, ids);
    setReady([]);
    navigate({ to: "/calendar" });
  }

  function editInCompose(id: string) {
    unstageReadyToDrafting(workspaceId, id);
    navigate({ to: "/scheduler" });
  }

  const canSchedule = active != null && draftToScheduledPost(active) != null;
  const readyToCommit = ready.filter((d) => draftToScheduledPost(d) != null).length;

  return (
    <div className="composer-shell" data-testid="schedule-page">
      {/* Ready inbox */}
      <aside className="composer-queue-pane flex flex-col border-r border-line bg-paper-2">
        <div className="border-b border-line px-4 py-4">
          <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Ready shelf
          </p>
          <h2 className="mt-1 font-display text-lg font-semibold tracking-tight text-foreground">
            {ready.length === 0
              ? "Nothing ready"
              : `${ready.length} ready reel${ready.length === 1 ? "" : "s"}`}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Prepared in Compose — set times here
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {ready.map((draft, i) => {
            const ok = draftToScheduledPost(draft) != null;
            const isActive = draft.id === active?.id;
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => setActiveIndex(i)}
                data-testid={`ready-card-${draft.id}`}
                className={cn(
                  "flex w-full gap-3 rounded-md border p-2 text-left transition-colors",
                  isActive
                    ? "border-foreground bg-foreground text-white"
                    : "border-line bg-card text-foreground hover:bg-secondary",
                )}
              >
                <span
                  className={cn(
                    "h-14 w-14 shrink-0 overflow-hidden rounded-md border",
                    isActive ? "border-white/30" : "border-line",
                  )}
                >
                  {draft.previewUrl ? (
                    <CardThumbnail
                      src={draft.previewUrl}
                      post={{ id: draft.id, title: draft.filename, mediaKind: draft.mediaKind }}
                      alt=""
                      kind={draft.mediaKind}
                      layout="square"
                      className="!h-14 !w-14"
                    />
                  ) : (
                    <img
                      src={demoPreviewForPost({ id: draft.id, title: draft.filename })}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "line-clamp-2 font-display text-sm font-semibold",
                      isActive ? "text-white" : "text-foreground",
                    )}
                  >
                    {draftDisplayTitle(draft)}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-caption",
                      isActive ? "text-white/65" : "text-muted-foreground",
                    )}
                  >
                    {ok ? "Times set" : "Needs times"} · {draft.platforms.length} platforms
                  </span>
                </span>
              </button>
            );
          })}
          {ready.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-card p-4 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Mark cards ready in Compose first
              </p>
              <Link
                to="/scheduler"
                className="btn-action btn-action-primary mt-3 w-full justify-center !text-white"
              >
                Open Compose
              </Link>
            </div>
          ) : null}
        </div>
      </aside>

      {/* Main + when/where */}
      <div className="composer-editor-pane">
        <div className="mx-auto w-full max-w-[720px] px-4 py-5 pb-24 md:px-6">
          <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
                Schedule
              </p>
              <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight text-foreground">
                When & where
              </h1>
              <p className="mt-1.5 max-w-lg text-body-sm text-muted-foreground">
                Cadence and publish times for cards you already prepared. No caption editing here.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <button
                type="button"
                onClick={fillAllPeakTimes}
                disabled={ready.length === 0 || timesBusy}
                className="btn-action btn-action-secondary disabled:opacity-50"
              >
                {timesBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Best times (all)
              </button>
              <button
                type="button"
                onClick={readyToCommit > 1 ? scheduleAllReady : scheduleCurrent}
                disabled={readyToCommit === 0 && !canSchedule}
                data-testid="schedule-commit-btn"
                className="btn-action btn-action-primary !text-white disabled:opacity-50"
              >
                {readyToCommit > 1
                  ? `Schedule ${readyToCommit} reels`
                  : canSchedule
                    ? "Schedule this reel"
                    : "Set times to schedule"}
              </button>
            </div>
          </header>

          {active ? (
            <div className="space-y-5">
              <section className="flex flex-wrap items-center gap-4 rounded-md border border-line bg-card p-4">
                <span className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-line">
                  {active.previewUrl ? (
                    <CardThumbnail
                      src={active.previewUrl}
                      post={{ id: active.id, title: active.filename, mediaKind: active.mediaKind }}
                      alt=""
                      kind={active.mediaKind}
                      layout="square"
                      className="!h-16 !w-16"
                    />
                  ) : (
                    <img
                      src={demoPreviewForPost({ id: active.id, title: active.filename })}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {draftDisplayTitle(active)}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {active.caption || "No caption"}
                  </p>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {active.platforms.join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => editInCompose(active.id)}
                  className="btn-action btn-action-secondary min-h-9"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit in Compose
                </button>
              </section>

              <section className="rounded-md border border-line bg-card p-5 xl:hidden">
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCadenceScope("all")}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-caption font-medium",
                      cadenceScope === "all"
                        ? "border-foreground bg-foreground text-white"
                        : "border-line bg-card",
                    )}
                  >
                    Cadence: all ready
                  </button>
                  <button
                    type="button"
                    onClick={() => setCadenceScope("this")}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-caption font-medium",
                      cadenceScope === "this"
                        ? "border-foreground bg-foreground text-white"
                        : "border-line bg-card",
                    )}
                  >
                    This reel only
                  </button>
                </div>
                <ComposerPublishPlan
                  draft={active}
                  scheduleReasons={scheduleReasons[active.id]}
                  onUpdateTime={updatePlatformSchedule}
                  onSuggestTimes={suggestTimesOnly}
                  onCadence={applyCadence}
                  cadenceActive={cadenceActive}
                />
              </section>
            </div>
          ) : (
            <div className="rounded-md border border-line bg-paper-2 px-6 py-16 text-center">
              <p className="font-display text-xl font-semibold text-foreground">
                No reels waiting
              </p>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                Compose cards with media, captions, and platforms — then Mark ready. They show up
                here for timing.
              </p>
              <Link
                to="/scheduler"
                className="btn-action btn-action-primary mt-6 inline-flex !text-white"
              >
                Go to Compose
              </Link>
            </div>
          )}
        </div>
      </div>

      {active ? (
        <aside className="composer-preview-pane p-5 pb-16">
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setCadenceScope("all")}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-caption font-medium",
                cadenceScope === "all"
                  ? "border-foreground bg-foreground text-white"
                  : "border-line bg-card",
              )}
            >
              All ready
            </button>
            <button
              type="button"
              onClick={() => setCadenceScope("this")}
              className={cn(
                "flex-1 rounded-md border px-2 py-1.5 text-caption font-medium",
                cadenceScope === "this"
                  ? "border-foreground bg-foreground text-white"
                  : "border-line bg-card",
              )}
            >
              This only
            </button>
          </div>
          <div className="flex flex-col gap-6">
            <ComposerPublishPlan
              draft={active}
              scheduleReasons={scheduleReasons[active.id]}
              onUpdateTime={updatePlatformSchedule}
              onSuggestTimes={suggestTimesOnly}
              onCadence={applyCadence}
              cadenceActive={cadenceActive}
            />
            <button
              type="button"
              onClick={scheduleCurrent}
              disabled={!canSchedule}
              className="btn-action btn-action-primary w-full justify-center !text-white disabled:opacity-50"
            >
              {canSchedule ? "Schedule this reel" : "Set all platform times"}
            </button>
            <ComposerPreviewRail
              draft={active}
              workspaceSlug={workspace.slug}
              workspaceInitials={workspace.initials}
            />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
