import { Save } from "lucide-react";

export function DraftDropStencil({ active }: { active: boolean }) {
  return (
    <div
      data-testid="draft-dropzone-stencil"
      className={`rounded-sm border border-dashed px-3 py-4 text-center transition-colors ${
        active
          ? "border-accent bg-accent/10"
          : "border-border/80 bg-background/30 hover:border-accent/40 hover:bg-secondary/20"
      }`}
    >
      <span className="mx-auto inline-flex h-8 w-8 items-center justify-center rounded-sm border border-dashed border-border bg-surface text-muted-foreground">
        <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <div className="mt-2 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-foreground">
        Drop_To_Draft
      </div>
      <p className="mt-1 text-[0.55rem] leading-relaxed text-muted-foreground">
        Drag a post here or use Save_Draft in the editor
      </p>
    </div>
  );
}
