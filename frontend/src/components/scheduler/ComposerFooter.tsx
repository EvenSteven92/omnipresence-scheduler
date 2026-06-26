import { CalendarCheck, Save } from "lucide-react";

export function ComposerFooter({
  readyCount,
  publishCount = 0,
  onSaveDraft,
  onSchedule,
  canSave,
}: {
  readyCount: number;
  publishCount?: number;
  onSaveDraft: () => void;
  onSchedule: () => void;
  canSave: boolean;
}) {
  return (
    <footer
      data-testid="composer-footer"
      className="flex shrink-0 items-center justify-between gap-4 border-t-[1.5px] border-foreground bg-card px-6 py-4"
    >
      <p className="font-mono text-body-sm text-muted-foreground">
        {readyCount > 0
          ? `${readyCount} card${readyCount === 1 ? "" : "s"} ready · ${publishCount} publish${publishCount === 1 ? "" : "es"} on this card`
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
          Schedule{" "}
          {publishCount > 0 ? `${publishCount} publish${publishCount === 1 ? "" : "es"}` : ""}
        </button>
      </div>
    </footer>
  );
}
