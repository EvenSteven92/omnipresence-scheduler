type Step = "upload" | "configure" | "schedule";

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: "upload", label: "Upload", description: "Drop your media files" },
  { id: "configure", label: "Configure", description: "Pick platforms & write copy" },
  { id: "schedule", label: "Schedule", description: "Set publish times" },
];

export function SchedulerWorkflowSteps({ active }: { active: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.id === active);

  return (
    <nav aria-label="New post workflow" data-testid="scheduler-workflow-steps" className="mb-8">
      <ol className="flex flex-wrap items-start gap-2 sm:gap-0">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-start sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      current
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-success/15 text-success"
                          : "border border-border bg-surface text-muted-foreground"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        current ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </div>
                    <p className="hidden text-xs text-muted-foreground sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
              {i < STEPS.length - 1 ? (
                <div
                  aria-hidden
                  className={`mx-3 mt-3 hidden h-px flex-1 sm:mt-0 sm:block ${
                    done ? "bg-success/40" : "bg-border"
                  }`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
