import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Sparkles, X as XIcon } from "lucide-react";
import type { DraftPost } from "@/components/post/ComposerCard";
import type { ScheduledPost } from "@/lib/mock-data";
import {
  defaultBulkRange,
  fixedCadenceBulk,
  smartDistributeBulk,
  toDateInputValue,
  toTimeInputValue,
  type BulkScheduleResult,
  type CadenceUnit,
  type ScheduleConstraints,
} from "@/lib/schedule-engine";
import { SchedulePreviewTimeline } from "@/components/scheduler/SchedulePreviewTimeline";
import { useWorkspace } from "@/lib/workspace-context";

type Strategy = "smart" | "cadence";

export function BulkScheduleModal({
  files,
  scheduledPosts,
  onClose,
  onApprove,
}: {
  files: DraftPost[];
  scheduledPosts: ScheduledPost[];
  onClose: () => void;
  onApprove: (result: BulkScheduleResult) => void;
}) {
  const { workspace } = useWorkspace();
  const defaultRange = defaultBulkRange();
  const [strategy, setStrategy] = useState<Strategy>("smart");
  const [rangeStart, setRangeStart] = useState(toDateInputValue(defaultRange.start));
  const [rangeEnd, setRangeEnd] = useState(toDateInputValue(defaultRange.end));
  const [cadenceStart, setCadenceStart] = useState(toDateInputValue(defaultRange.start));
  const [cadenceTime, setCadenceTime] = useState("09:00");
  const [cadenceInterval, setCadenceInterval] = useState(10);
  const [cadenceUnit, setCadenceUnit] = useState<CadenceUnit>("hours");
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [preview, setPreview] = useState<BulkScheduleResult | null>(null);
  const [busy, setBusy] = useState(false);

  const totalPublishes = useMemo(() => files.reduce((n, f) => n + f.platforms.length, 0), [files]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function parseRange(): { start: Date; end: Date } | null {
    const [sy, sm, sd] = rangeStart.split("-").map(Number);
    const [ey, em, ed] = rangeEnd.split("-").map(Number);
    if (!sy || !sm || !sd || !ey || !em || !ed) return null;
    return {
      start: new Date(sy, sm - 1, sd),
      end: new Date(ey, em - 1, ed),
    };
  }

  function generatePreview() {
    setBusy(true);
    try {
      const constraints: ScheduleConstraints = { skipWeekends };
      if (strategy === "smart") {
        const range = parseRange();
        if (!range) return;
        setPreview(
          smartDistributeBulk(
            files,
            range.start,
            range.end,
            scheduledPosts,
            constraints,
            workspace.postingTimes,
          ),
        );
        return;
      }
      const [y, mo, d] = cadenceStart.split("-").map(Number);
      const [h, mi] = cadenceTime.split(":").map(Number);
      const startIso = new Date(y!, mo! - 1, d, h, mi, 0, 0).toISOString();
      setPreview(
        fixedCadenceBulk(
          files,
          { startIso, interval: cadenceInterval, unit: cadenceUnit },
          scheduledPosts,
          workspace.postingTimes,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      onClick={onClose}
      data-testid="bulk-schedule-modal"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <div className="text-sm font-medium text-foreground">Bulk schedule</div>
            <h2 className="mt-2 text-base font-semibold text-foreground">
              Schedule {files.length} file{files.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {totalPublishes} publish{totalPublishes === 1 ? "" : "es"} across selected platforms
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="rounded-sm border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setStrategy("smart");
                setPreview(null);
              }}
              data-testid="strategy-smart"
              className={`rounded-sm border px-3 py-3 text-left transition-colors ${
                strategy === "smart"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background/40 hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                Smart_distribute
              </div>
              <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
                AI spreads files across your date range using per-platform peak times.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setStrategy("cadence");
                setPreview(null);
              }}
              data-testid="strategy-cadence"
              className={`rounded-sm border px-3 py-3 text-left transition-colors ${
                strategy === "cadence"
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background/40 hover:bg-secondary/40"
              }`}
            >
              <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.14em] text-foreground">
                <CalendarClock className="h-3 w-3 text-accent" />
                Fixed_cadence
              </div>
              <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
                Post files one after another on a fixed interval (Opus-style drip).
              </p>
            </button>
          </div>

          {strategy === "smart" ? (
            <div className="space-y-3 rounded-sm border border-border bg-background/40 px-4 py-4">
              <div className="text-[0.55rem] uppercase tracking-[0.12em] text-muted-foreground">
                Date range
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => {
                    setRangeStart(e.target.value);
                    setPreview(null);
                  }}
                  className="rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs"
                />
                <span className="text-muted-foreground">→</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => {
                    setRangeEnd(e.target.value);
                    setPreview(null);
                  }}
                  className="rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={skipWeekends}
                  onChange={(e) => {
                    setSkipWeekends(e.target.checked);
                    setPreview(null);
                  }}
                />
                Skip weekends
              </label>
            </div>
          ) : (
            <div className="space-y-3 rounded-sm border border-border bg-background/40 px-4 py-4">
              <div className="label-mono text-[0.55rem] text-muted-foreground">cadence</div>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={cadenceStart}
                  onChange={(e) => {
                    setCadenceStart(e.target.value);
                    setPreview(null);
                  }}
                  className="rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs"
                />
                <input
                  type="time"
                  value={cadenceTime}
                  onChange={(e) => {
                    setCadenceTime(e.target.value);
                    setPreview(null);
                  }}
                  className="rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs"
                />
                <span className="text-muted-foreground">then every</span>
                <input
                  type="number"
                  min={1}
                  value={cadenceInterval}
                  onChange={(e) => {
                    setCadenceInterval(Number(e.target.value) || 1);
                    setPreview(null);
                  }}
                  className="w-16 rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs"
                />
                <select
                  value={cadenceUnit}
                  onChange={(e) => {
                    setCadenceUnit(e.target.value as CadenceUnit);
                    setPreview(null);
                  }}
                  className="rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs"
                >
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-sm border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <span className="label-mono text-[0.55rem] text-muted-foreground">preview</span>
              <button
                type="button"
                onClick={generatePreview}
                disabled={busy}
                data-testid="bulk-generate-preview"
                className="flex items-center gap-1.5 rounded-sm border border-accent bg-accent px-2.5 py-1.5 text-[0.55rem] uppercase tracking-[0.14em] text-accent-foreground hover:opacity-90 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : (
                  <Sparkles className="h-2.5 w-2.5" />
                )}
                Generate_preview
              </button>
            </div>
            <SchedulePreviewTimeline slots={preview?.slots ?? []} />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm border border-border bg-surface px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!preview || preview.slots.length === 0}
            onClick={() => preview && onApprove(preview)}
            data-testid="bulk-approve-schedule"
            className="rounded-sm border border-accent bg-accent px-3 py-2 text-[0.6rem] uppercase tracking-[0.14em] text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            Approve_schedule
          </button>
        </div>
      </div>
    </div>
  );
}
