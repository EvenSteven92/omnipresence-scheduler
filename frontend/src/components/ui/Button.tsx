import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "brand";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary !text-white font-semibold hover:bg-[#262626] hover:!text-white",
  secondary:
    "border-line bg-surface text-foreground font-semibold hover:border-foreground hover:bg-secondary",
  ghost:
    "border-transparent bg-transparent text-muted-foreground font-semibold hover:bg-secondary hover:text-foreground",
  danger:
    "border-destructive bg-destructive text-destructive-foreground font-semibold hover:opacity-90",
  brand:
    "border-brand bg-brand !text-white font-semibold hover:bg-brand-deep hover:!text-white",
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
        "inline-flex items-center justify-center rounded-lg border transition-[background-color,color,border-color,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
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
