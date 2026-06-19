import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/** Small mono uppercase label for data/metadata rows only. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("text-eyebrow", className)}>{children}</span>;
}