"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";

export const BUTTON_VARIANTS = {
  primary: "border border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700",
  success: "border border-emerald-700 bg-emerald-700 text-white shadow-sm hover:border-emerald-800 hover:bg-emerald-800",
  danger: "border border-rose-600 bg-rose-600 text-white shadow-sm hover:border-rose-700 hover:bg-rose-700",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
  ghost: "border border-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  /** Migrated/feature-specific artwork keeps its own layout and colour classes. */
  unstyled: "",
} as const;

export const BUTTON_SIZES = {
  sm: "min-h-11 gap-1.5 rounded-control px-3 py-2 text-xs font-semibold sm:min-h-9",
  md: "min-h-11 gap-2 rounded-control px-4 py-2.5 text-sm font-semibold",
  lg: "min-h-12 gap-2 rounded-control px-5 py-3 text-sm font-semibold",
  icon: "min-h-11 min-w-11 rounded-control p-2.5",
  unstyled: "",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/**
 * The only native-button wrapper in the product.
 *
 * Feature code must use this component rather than creating another button
 * primitive. `unstyled` is the migration escape hatch for highly visual
 * controls; it still supplies the shared focus, disabled and touch behaviour.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, variant = "primary", size, type = "button", ...props },
  ref,
) {
  const resolvedSize = size ?? (variant === "unstyled" ? "unstyled" : "md");
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "sb-button touch-manipulation disabled:cursor-not-allowed disabled:opacity-60",
        variant !== "unstyled" && "inline-flex items-center justify-center transition-colors",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[resolvedSize],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
