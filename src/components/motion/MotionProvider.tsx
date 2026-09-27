"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * App-wide Framer Motion configuration.
 *
 * `reducedMotion="user"` is the important part: every animation in the app
 * (springs, layout transitions, the staggered reveals) is automatically
 * reduced to an instant state change for anyone who has asked their OS to
 * "reduce motion". Individual components additionally check `useReducedMotion()`
 * when they animate something that isn't a transform/opacity — e.g. the
 * counting numbers, which have no CSS equivalent to fall back on.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.32 }}>
      {children}
    </MotionConfig>
  );
}
