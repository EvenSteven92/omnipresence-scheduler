import {
  CalendarClock,
  FileText,
  Loader2,
  Megaphone,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import type { DraftPost } from "@/lib/composer-draft";
import { hasScriptSource, isCaptionReady, studioStage } from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

export type StudioTool =
  | "prepare"
  | "transcript"
  | "cta"
  | "caption"
  | "schedule"
  | "remove";

/**
 * Contextual tools — horizontal under media.
 * Order: AI all first, then compose steps, schedule, remove.
 */
export function StudioCardToolbar({
  draft,
  busy,
  onTool,
  className,
}: {
  draft: DraftPost;
  busy?: StudioTool | null;
  onTool: (tool: StudioTool) => void;
  className?: string;
}) {
  const stage = studioStage(draft);
  const canCaption = hasScriptSource(draft);
  const canSchedule = isCaptionReady(draft);

  const items: Array<{
    id: StudioTool;
    label: string;
    icon: typeof FileText;
    primary?: boolean;
    disabled?: boolean;
    title?: string;
  }> = [
    {
      id: "prepare",
      label: "AI all",
      icon: Sparkles,
      primary: true,
      title: "AI prepare: transcript → CTA (if event) → caption",
    },
    {
      id: "transcript",
      label: "Script",
      icon: FileText,
      primary: stage === "media",
    },
    {
      id: "cta",
      label: "CTA",
      icon: Megaphone,
    },
    {
      id: "caption",
      label: "Caption",
      icon: Type,
      disabled: !canCaption,
      title: canCaption
        ? "Generate caption + hashtags from transcript"
        : "Add transcript or CTA first",
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: CalendarClock,
      disabled: !canSchedule,
      title: canSchedule
        ? "Open schedule shelf"
        : "Add caption and hashtags first",
    },
    {
      id: "remove",
      label: "Remove",
      icon: Trash2,
    },
  ];

  return (
    <div
      data-testid={`studio-toolbar-${draft.id}`}
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-md border border-line bg-card/95 p-0.5 shadow-[var(--shadow-card)] backdrop-blur-sm",
        "origin-bottom opacity-100 transition-[opacity,transform] duration-150 ease-out",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isBusy = busy === item.id;
        return (
          <button
            key={item.id}
            type="button"
            data-testid={`studio-tool-${item.id}`}
            disabled={Boolean(item.disabled) || isBusy}
            onClick={() => onTool(item.id)}
            title={item.title ?? item.label}
            className={cn(
              "inline-flex h-8 items-center gap-1 rounded px-2 text-[0.65rem] font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40",
              item.id === "remove"
                ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : item.primary
                  ? "bg-primary text-white hover:bg-[#262626]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            )}
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
