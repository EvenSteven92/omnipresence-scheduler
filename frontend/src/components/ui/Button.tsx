import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-foreground bg-primary text-primary-foreground font-display font-bold shadow-[3px_3px_0_0_var(--color-foreground)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--color-foreground)]",
  secondary:
    "border-foreground bg-surface text-foreground font-semibold hover:bg-secondary",
  ghost:
    "border-transparent bg-transparent text-foreground font-semibold hover:bg-secondary/60",
  danger:
    "border-foreground bg-destructive text-destructive-foreground font-semibold shadow-[3px_3px_0_0_var(--color-foreground)] hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0_0_var(--color-foreground)]",
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
        "inline-flex items-center justify-center rounded-md border-[1.5px] transition-[transform,box-shadow,background-color,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
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
