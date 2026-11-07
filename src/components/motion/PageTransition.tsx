"use client";

import { AnimatePresence, m as Motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, MOTION_TOKENS } from "./variants";

/**
 * Replace the previous destination immediately and animate only the entrance.
 * Waiting for an entire outgoing hub (including nested presence animations)
 * can strand navigation on old content. A keyed child also avoids doubled
 * page height and clears profile-scoped state without an exit grace period.
 */
export function PageTransition({
  children,
  transitionKey,
  className = "",
  distance: _distance = 18,
}: {
  children: ReactNode;
  /** Change this to trigger the animation (route, tab id, view name…). */
  transitionKey: string;
  className?: string;
  distance?: number;
}) {
  return (
    <Motion.div
      key={transitionKey}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Motion.div>
  );
}

/**
 * Softer variant for sub-sections that swap in place (wizard steps, tab
 * panels inside a card) — no vertical travel, so nothing reflows.
 */
export function SectionTransition({
  children,
  transitionKey,
  className = "",
}: {
  children: ReactNode;
  transitionKey: string;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Motion.div
        key={transitionKey}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </Motion.div>
    </AnimatePresence>
  );
}
