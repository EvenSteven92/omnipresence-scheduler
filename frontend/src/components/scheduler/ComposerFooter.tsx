import { CalendarCheck, Save } from "lucide-react";

export function ComposerFooter({
  readyCount,
  onSaveDraft,
  onSchedule,
  canSave,
}: {
  readyCount: number;
  onSaveDraft: () => void;
  onSchedule: () => void;
  canSave: boolean;
}) {
  return (
    <footer
      data-testid="composer-footer"
      className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-surface px-6 py-4"
    >
      <p className="text-body-sm text-muted-foreground">
        {readyCount > 0
          ? `${readyCount} post${readyCount === 1 ? "" : "s"} ready to schedule`
          : "Set publish times for all platforms to schedule"}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={!canSave}
          data-testid="composer-footer-save"
          className="btn-action disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          Save draft
        </button>
        <button
          type="button"
          onClick={onSchedule}
          disabled={readyCount === 0}
          data-testid="composer-footer-schedule"
          className="btn-action-primary btn-action disabled:opacity-50"
        >
          <CalendarCheck className="h-3.5 w-3.5" />
          Schedule
        </button>
      </div>
    </footer>
  );
}