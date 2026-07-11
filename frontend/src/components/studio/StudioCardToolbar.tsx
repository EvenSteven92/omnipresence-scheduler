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
import { studioStage } from "@/lib/studio-layout";
import { cn } from "@/lib/utils";

export type StudioTool =
  | "transcript"
  | "cta"
  | "caption"
  | "schedule"
  | "remove";

export function StudioCardToolbar({
  draft,
  busy,
  onTool,
}: {
  draft: DraftPost;
  busy?: StudioTool | null;
  onTool: (tool: StudioTool) => void;
}) {
  const stage = studioStage(draft);
  const hasScript =
    Boolean(draft.transcript?.trim()) || Boolean(draft.callToAction?.trim());

  const items: Array<{
    id: StudioTool;
    label: string;
    icon: typeof FileText;
    primary?: boolean;
    hide?: boolean;
  }> = [
    {
      id: "transcript",
      label: "Transcript",
      icon: FileText,
      primary: stage === "media",
    },
    {
      id: "cta",
      label: "CTA",
      icon: Megaphone,
      primary: stage === "media",
    },
    {
      id: "caption",
      label: "Caption",
      icon: Type,
      primary: stage === "script" || hasScript,
    },
    {
      id: "schedule",
      label: "Schedule",
      icon: CalendarClock,
      primary: stage === "caption" || stage === "schedule" || stage === "ready",
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
      className="absolute -left-[3.25rem] top-8 z-20 flex w-12 flex-col gap-1 rounded-lg border border-line bg-card p-1 shadow-[var(--shadow-card)] sm:-left-[9.5rem] sm:w-[9rem]"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isBusy = busy === item.id;
        const open =
          (item.id === "transcript" && draft.studioOpen?.transcript) ||
          (item.id === "cta" && draft.studioOpen?.cta) ||
          (item.id === "caption" && draft.studioOpen?.caption) ||
          (item.id === "schedule" && draft.studioOpen?.schedule);

        return (
          <button
            key={item.id}
            type="button"
            data-testid={`studio-tool-${item.id}`}
            disabled={isBusy}
            onClick={() => onTool(item.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-2 text-left text-caption font-semibold transition-colors",
              item.id === "remove"
                ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : open
                  ? "bg-secondary text-foreground"
                  : item.primary
                    ? "bg-primary text-white hover:bg-[#262626]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            title={item.label}
          >
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : item.id === "caption" && item.primary ? (
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            )}
            <span className="hidden min-w-0 truncate sm:inline">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
