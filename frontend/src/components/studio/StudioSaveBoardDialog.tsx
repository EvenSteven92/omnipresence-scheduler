import { X } from "lucide-react";

/**
 * “Would you like to save this board first?” — reassurance before New board.
 */
export function StudioSaveBoardDialog({
  boardName,
  open,
  onSaveAndContinue,
  onSkip,
  onCancel,
}: {
  boardName: string;
  open: boolean;
  onSaveAndContinue: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-board-title"
      data-testid="studio-save-board-dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-line bg-card p-5 shadow-[var(--shadow-card)] animate-slide-in-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="save-board-title"
              className="font-display text-lg font-bold text-foreground"
            >
              Save this board first?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You’re starting a new board. We’ll make sure{" "}
              <span className="font-semibold text-foreground">
                “{boardName || "this board"}”
              </span>{" "}
              is written out so you can open it again with every reel and event
              still on it. (Boards also autosave as you work.)
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onSaveAndContinue}
            className="btn-action btn-action-primary flex-1 !text-white"
            data-testid="save-board-confirm"
          >
            Save & start new
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="btn-action btn-action-secondary flex-1"
            data-testid="save-board-skip"
          >
            Start without saving
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-action btn-action-secondary sm:hidden"
          >
            Cancel
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 hidden w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground sm:block"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
