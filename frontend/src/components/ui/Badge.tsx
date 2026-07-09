import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "accent" | "muted";

const tones: Record<Tone, string> = {
  default: "border-foreground bg-card text-foreground",
  success: "border-foreground bg-success/15 text-success",
  warning: "border-foreground bg-warning/15 text-warning",
  accent: "border-foreground bg-accent/20 text-foreground",
  muted: "border-foreground/40 bg-paper-2 text-muted-foreground",
};

export function Badge({
  tone = "default",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border-[1.5px] px-2 py-0.5 font-mono text-[0.625rem] font-bold uppercase tracking-[0.06em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
