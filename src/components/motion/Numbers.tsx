"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect } from "react";

/**
 * Counts up to `value` when it first appears.
 *
 * Reduced-motion users get the final number immediately — a ticking counter is
 * exactly the kind of continuous motion that setting exists to suppress.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1.1,
  delay = 0,
  prefix = "",
  suffix = "",
  locale,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  delay?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const safeValue = Number.isFinite(value) ? value : 0;
  const motionValue = useMotionValue(reduceMotion ? safeValue : 0);

  const text = useTransform(motionValue, (current) => {
    const n = Number.isFinite(current) ? current : 0;
    const formatted =
      locale !== undefined
        ? new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }).format(n)
        : n.toFixed(decimals);
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(safeValue);
      return;
    }
    const controls = animate(motionValue, safeValue, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [safeValue, duration, delay, reduceMotion, motionValue]);

  return (
    <motion.span className={className} aria-label={`${prefix}${safeValue}${suffix}`}>
      {text}
    </motion.span>
  );
}

/**
 * Horizontal bar that fills from 0 to `value` when scrolled into view.
 * `value` is clamped to 0–100 so a bad number can never overflow the track.
 */
export function AnimatedBar({
  value,
  barClassName = "bg-indigo-500",
  trackClassName = "h-2 w-full overflow-hidden rounded-full bg-slate-200",
  duration = 1,
  delay = 0,
}: {
  value: number;
  barClassName?: string;
  trackClassName?: string;
  duration?: number;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

  return (
    <div className={trackClassName} role="presentation">
      <motion.div
        className={`h-full rounded-full ${barClassName}`}
        initial={{ width: reduceMotion ? `${pct}%` : "0%" }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true, margin: "-40px 0px" }}
        transition={{ duration: reduceMotion ? 0 : duration, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

/**
 * Ring/donut progress for compact score cards. Uses stroke-dashoffset so the
 * arc draws itself rather than scaling in.
 */
export function AnimatedRing({
  value,
  size = 88,
  strokeWidth = 8,
  trackClassName = "stroke-slate-200",
  progressClassName = "stroke-indigo-500",
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  trackClassName?: string;
  progressClassName?: string;
  children?: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={trackClassName}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={progressClassName}
          initial={{ strokeDashoffset: reduceMotion ? circumference * (1 - pct / 100) : circumference }}
          whileInView={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          viewport={{ once: true, margin: "-40px 0px" }}
          transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      ) : null}
    </div>
  );
}
