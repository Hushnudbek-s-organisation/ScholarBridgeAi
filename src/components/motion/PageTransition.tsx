"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp } from "./variants";

/**
 * Cross-fades + lifts content when the key changes.
 *
 * `mode="wait"` plays the exit first and only then the entrance. It is the
 * right choice here: ScholarBridge's sections are tall, and running two of
 * them at once (the default "sync") makes the page jump and doubles the
 * scroll height for a moment.
 */
export function PageTransition({
  children,
  transitionKey,
  className = "",
  distance = 18,
}: {
  children: ReactNode;
  /** Change this to trigger the animation (route, tab id, view name…). */
  transitionKey: string;
  className?: string;
  distance?: number;
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: distance }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -distance / 2 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
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
      <motion.div
        key={transitionKey}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
