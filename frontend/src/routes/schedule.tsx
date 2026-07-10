import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Pencil, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ComposerPublishPlan } from "@/components/composer/ComposerPublishPlan";
import { CardThumbnail } from "@/components/ui/CardThumbnail";
import { draftToScheduledPost } from "@/hooks/useComposerScheduledPosts";
import {
  applyProposedTimes,
  draftDisplayTitle,
  suggestTimesForDraft,
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
import type { Platform } from "@/lib/mock-data";
import { useWorkspace } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/schedule")({
  head: () => ({
    meta: [
      { title: "Schedule — TORCC OmniSocial" },
      {
        name: "description",
        content:
          "Set when and where prepared reels publish. Multi-select ready cards, cadence, commit.",
      },
    ],
  }),
  component: SchedulePage,
});

function SchedulePage() {
  const navigate = useNavigate();
  const { workspace, workspaceId, addScheduledPosts } = useWorkspace();
  const [ready, setReady] = useState<DraftPost[]>([]);
  /** Multi-select set */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  /** Which card’s platform times are shown for fine-tuning */
  const [focusId, setFocusId] = useState<string | null>(null);
  const [cadenceActive, setCadenceActive] = useState<CadencePresetId | null>(null);
  const [scheduleReasons, setScheduleReasons] = useState<
    Partial<Record<string, Partial<Record<string, string>>>>
  >({});
  const [timesBusy, setTimesBusy] = useState(false);

  const reload = useCallback(() => {
    const shelf = readComposerShelf(workspaceId);
    setReady(shelf.ready);
    setSelectedIds((prev) => {
      const valid = new Set(shelf.ready.map((d) => d.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === 0 && shelf.ready[0]) next.add(shelf.ready[0].id);
      return next;
    });
    setFocusId((fid) => {
      if (fid && shelf.ready.some((d) => d.id === fid)) return fid;
      return shelf.ready[0]?.id ?? null;
    });
  }, [workspaceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const shelf = readComposerShelf(workspaceId);
    writeComposerShelf(workspaceId, shelf.drafting, ready, shelf.savedDrafts);
  }, [workspaceId, ready]);

  const selected = useMemo(
    () => ready.filter((d) => selectedIds.has(d.id)),
    [ready, selectedIds],
  );
  const focusDraft =
    ready.find((d) => d.id === focusId) ?? selected[0] ?? ready[0] ?? null;

  const updateDraft = useCallback((id: string, updater: (d: DraftPost) => DraftPost) => {
    setReady((cur) => cur.map((d) => (d.id === id ? updater(d) : d)));
  }, []);

  function toggleSelect(id: string, opts?: { exclusive?: boolean }) {
    setSelectedIds((prev) => {
      if (opts?.exclusive) return new Set([id]);
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setFocusId(id);
  }

  function selectAll() {
    setSelectedIds(new Set(ready.map((d) => d.id)));
    if (ready[0]) setFocusId(ready[0].id);
  }

  function clearSelection() {
    if (ready[0]) {
      setSelectedIds(new Set([ready[0].id]));
      setFocusId(ready[0].id);
    } else {
      setSelectedIds(new Set());
      setFocusId(null);
    }
  }

  function updatePlatformSchedule(platform: Platform, dateStr: string, timeStr: string) {
    if (!focusDraft) return;
    const iso = combineDateAndTime(dateStr, timeStr);
    updateDraft(focusDraft.id, (draft) => ({
      ...draft,
      proposedTimes: { ...(draft.proposedTimes ?? {}), [platform]: iso },
    }));
  }

  function suggestTimesForFocus() {
    if (!focusDraft) return;
    const assigned = pendingSlotsFromQueue(ready.filter((d) => d.id !== focusDraft.id));
    const times = suggestTimesForDraft(
      focusDraft,
      workspace.scheduledPosts,
      assigned,
      workspace.postingTimes,
    );
    updateDraft(focusDraft.id, (d) => applyProposedTimes(d, times));
    const reasons: Partial<Record<string, string>> = {};
    for (const p of focusDraft.platforms) {
      if (times[p]) reasons[p] = "Audience peak for this network";
    }
    setScheduleReasons((prev) => ({ ...prev, [focusDraft.id]: reasons }));
    setCadenceActive("peak");
  }

  /** Cadence / best times always apply to the multi-select set */
  function applyCadence(preset: CadencePresetId) {
    const targets = selected.length > 0 ? selected : ready;
    if (targets.length === 0) return;
    setCadenceActive(preset);
    setTimesBusy(true);
    try {
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
    } finally {
      setTimesBusy(false);
    }
  }

  function scheduleSelected() {
    const toCommit = selected
      .map((d) => draftToScheduledPost(d))
      .filter((p): p is NonNullable<typeof p> => p != null);
    if (toCommit.length === 0) return;
    void addScheduledPosts(toCommit);
    const ids = toCommit.map((p) => p.id);
    const nextReady = removeFromReady(workspaceId, ids);
    setReady(nextReady);
    setSelectedIds(new Set(nextReady[0] ? [nextReady[0].id] : []));
    setFocusId(nextReady[0]?.id ?? null);
    if (nextReady.length === 0) navigate({ to: "/calendar" });
  }

  function editInCompose() {
    if (!focusDraft) return;
    unstageReadyToDrafting(workspaceId, focusDraft.id);
    navigate({ to: "/scheduler" });
  }

  const selectedComplete = selected.filter((d) => draftToScheduledPost(d) != null);
  const canSchedule = selectedComplete.length > 0;
  const allSelectedComplete =
    selected.length > 0 && selectedComplete.length === selected.length;

  return (
    <div className="composer-shell" data-testid="schedule-page">
      {/* ── Ready shelf (multi-select) ── */}
      <aside
        className="composer-queue-pane flex w-full flex-col border-r border-line bg-paper-2 md:w-[19rem]"
        data-testid="ready-shelf"
      >
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
            Multi-select · set times in the plan
          </p>
          {ready.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="rounded-md border border-line bg-card px-2 py-1 text-[0.65rem] font-medium text-foreground hover:bg-secondary"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-md border border-line bg-card px-2 py-1 text-[0.65rem] font-medium text-muted-foreground hover:bg-secondary"
              >
                Clear
              </button>
              {selected.length > 0 ? (
                <span className="rounded-md bg-foreground px-2 py-1 text-[0.65rem] font-medium text-white">
                  {selected.length} selected
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {ready.map((draft) => {
            const checked = selectedIds.has(draft.id);
            const focused = focusId === draft.id;
            const ok = draftToScheduledPost(draft) != null;
            return (
              <div
                key={draft.id}
                data-testid={`ready-card-${draft.id}`}
                className={cn(
                  "flex w-full gap-2 rounded-md border p-2 transition-colors",
                  focused
                    ? "border-foreground bg-foreground text-white"
                    : checked
                      ? "border-foreground bg-secondary"
                      : "border-line bg-card text-foreground hover:bg-secondary/80",
                )}
              >
                <button
                  type="button"
                  aria-label={checked ? "Deselect" : "Select"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(draft.id);
                  }}
                  className={cn(
                    "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                    focused
                      ? "border-white/50 bg-white text-foreground"
                      : checked
                        ? "border-foreground bg-foreground text-white"
                        : "border-line bg-background",
                  )}
                >
                  {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </button>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 gap-2.5 text-left"
                  onClick={() => {
                    // Focus for time editing; ensure selected
                    setFocusId(draft.id);
                    setSelectedIds((prev) => {
                      if (prev.has(draft.id)) return prev;
                      return new Set([...prev, draft.id]);
                    });
                  }}
                >
                  <span
                    className={cn(
                      "h-12 w-12 shrink-0 overflow-hidden rounded-md border",
                      focused ? "border-white/30" : "border-line",
                    )}
                  >
                    {draft.previewUrl ? (
                      <CardThumbnail
                        src={draft.previewUrl}
                        post={{
                          id: draft.id,
                          title: draft.filename,
                          mediaKind: draft.mediaKind,
                        }}
                        alt=""
                        kind={draft.mediaKind}
                        layout="square"
                        className="!h-12 !w-12"
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
                        "line-clamp-2 font-display text-sm font-semibold leading-snug",
                        focused ? "text-white" : "text-foreground",
                      )}
                    >
                      {draftDisplayTitle(draft)}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 block text-caption",
                        focused ? "text-white/65" : "text-muted-foreground",
                      )}
                    >
                      {ok ? "Times set" : "Needs times"} · {draft.platforms.length} platforms
                    </span>
                  </span>
                </button>
              </div>
            );
          })}

          {ready.length === 0 ? (
            <div className="rounded-md border border-dashed border-line bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">Mark cards ready in Compose first</p>
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

      {/* ── Full-page Publish plan (only main column) ── */}
      <div className="composer-editor-pane min-w-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-28 md:px-8 md:py-8">
          {selected.length === 0 || !focusDraft ? (
            <div className="rounded-md border border-line bg-paper-2 px-6 py-20 text-center">
              <p className="font-display text-xl font-semibold text-foreground">
                Select reels from the shelf
              </p>
              <p className="mx-auto mt-2 max-w-md text-body-sm text-muted-foreground">
                Multi-select cards on the left. Cadence and times apply to everything selected.
              </p>
            </div>
          ) : (
            <>
              <header className="mb-6 border-b border-line pb-5">
                <p className="text-caption font-medium uppercase tracking-[0.1em] text-muted-foreground">
                  Publish plan
                </p>
                <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight text-foreground md:text-[2rem]">
                  When & where
                </h1>
                <p className="mt-1.5 text-body-sm text-muted-foreground">
                  {selected.length === 1
                    ? "One reel selected — set cadence and platform times."
                    : `${selected.length} reels selected — cadence applies to all; fine-tune the focused card.`}
                </p>

                {/* Selected chips */}
                {selected.length > 1 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selected.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setFocusId(d.id)}
                        className={cn(
                          "rounded-md border px-2 py-1 text-caption font-medium transition-colors",
                          focusId === d.id
                            ? "border-foreground bg-foreground text-white"
                            : "border-line bg-card text-foreground hover:bg-secondary",
                        )}
                      >
                        {draftDisplayTitle(d).slice(0, 28)}
                        {draftDisplayTitle(d).length > 28 ? "…" : ""}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => applyCadence("peak")}
                    disabled={timesBusy || selected.length === 0}
                    className="btn-action btn-action-secondary disabled:opacity-50"
                  >
                    {timesBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Best times ({selected.length})
                  </button>
                  <button
                    type="button"
                    onClick={scheduleSelected}
                    disabled={!canSchedule}
                    data-testid="schedule-commit-btn"
                    className="btn-action btn-action-primary !text-white disabled:opacity-50"
                  >
                    {!canSchedule
                      ? "Set times to schedule"
                      : selectedComplete.length === 1
                        ? "Schedule this reel"
                        : `Schedule ${selectedComplete.length} reels`}
                  </button>
                  {focusDraft ? (
                    <button
                      type="button"
                      onClick={editInCompose}
                      className="btn-action btn-action-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit in Compose
                    </button>
                  ) : null}
                </div>
                {selected.length > 0 && !allSelectedComplete ? (
                  <p className="mt-2 text-xs text-warning">
                    {selectedComplete.length} of {selected.length} have full times — schedule will
                    commit those that are ready.
                  </p>
                ) : null}
              </header>

              <div className="rounded-md border border-line bg-card p-5 md:p-6">
                {selected.length > 1 ? (
                  <p className="mb-4 text-sm text-muted-foreground">
                    Editing times for{" "}
                    <span className="font-semibold text-foreground">
                      {draftDisplayTitle(focusDraft)}
                    </span>
                    . Cadence buttons apply to all {selected.length} selected.
                  </p>
                ) : null}
                <ComposerPublishPlan
                  draft={focusDraft}
                  scheduleReasons={scheduleReasons[focusDraft.id]}
                  onUpdateTime={updatePlatformSchedule}
                  onSuggestTimes={suggestTimesForFocus}
                  onCadence={applyCadence}
                  cadenceActive={cadenceActive}
                />
              </div>
            </>
          )}
        </div>

        {/* Mobile sticky CTA */}
        {selected.length > 0 ? (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/95 p-3 backdrop-blur md:hidden">
            <button
              type="button"
              onClick={scheduleSelected}
              disabled={!canSchedule}
              className="btn-action btn-action-primary w-full justify-center !text-white disabled:opacity-50"
            >
              {!canSchedule
                ? "Set times to schedule"
                : selectedComplete.length === 1
                  ? "Schedule this reel"
                  : `Schedule ${selectedComplete.length} reels`}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
