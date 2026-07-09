import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-foreground bg-primary text-primary-foreground font-medium hover:bg-[#262626]",
  secondary:
    "border-foreground bg-surface text-foreground font-medium hover:bg-secondary",
  ghost:
    "border-transparent bg-transparent text-muted-foreground font-medium hover:bg-secondary hover:text-foreground",
  danger:
    "border-destructive bg-destructive text-destructive-foreground font-medium hover:opacity-90",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "gap-1.5 px-2.5 py-1.5 text-[0.75rem]",
  md: "gap-2 px-3.5 py-2 text-body-sm",
  lg: "gap-2 px-4 py-2.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-md border transition-[background-color,color,border-color,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
