"use client";

import React from "react";
import { cn } from "./cn";

export interface SectionHeadingProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  align?: "left" | "center";
  as?: "h1" | "h2" | "h3";
  className?: string;
}

/**
 * Shared section-heading primitive built on the Phase 2 Inter scale.
 *
 * Keeps `font-black` out of everyday UI headings: `h1` and `h2` use crisp
 * `700` weight with tight negative tracking, `h3` uses `600`, and eyebrows use
 * calm `600` uppercase letter-spacing.
 */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
  align = "left",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";
  const scaleClass =
    Heading === "h1"
      ? "sb-type-h1"
      : Heading === "h2"
        ? "sb-type-h2"
        : "sb-type-h3";

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        centered ? "mx-auto max-w-2xl items-center text-center" : "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="sb-type-eyebrow mb-1.5 text-indigo-600 dark:text-indigo-300">
            {eyebrow}
          </div>
        )}
        <Heading className={cn(scaleClass, "text-slate-900 dark:text-white")}>
          {title}
        </Heading>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
