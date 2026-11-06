"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { MOTION_TOKENS } from "@/components/ui/tokens";

/**
 * App-wide Framer Motion configuration.
 *
 * `reducedMotion="user"` is the important part: every animation in the app
 * (springs, layout transitions, the staggered reveals) is automatically
 * reduced to an instant state change for anyone who has asked their OS to
 * "reduce motion". Individual components additionally check `useReducedMotion()`
 * when they animate something that isn't a transform/opacity — e.g. the
 * counting numbers, which have no CSS equivalent to fall back on.
 *
 * `LazyMotion` keeps the 1.3 MB landing JS budget honest: components use the
 * lightweight `m` proxy and the feature bundle is fetched on demand. `strict`
 * makes any accidental `motion.*` import fail loudly instead of silently
 * pulling the full bundle back into the first load.
 */
const loadFeatures = () => import("./features").then((module) => module.default);

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig
        reducedMotion="user"
        transition={{ duration: MOTION_TOKENS.duration.page, ease: MOTION_TOKENS.ease.out }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
