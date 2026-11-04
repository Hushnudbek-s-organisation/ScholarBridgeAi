import type { Transition, Variants } from "framer-motion";
import { MOTION_TOKENS, preferredScrollBehavior, prefersReducedMotion } from "@/components/ui/tokens";

export { MOTION_TOKENS, preferredScrollBehavior, prefersReducedMotion };

/**
 * Shared motion vocabulary.
 *
 * Keeping timings and curves in `MOTION_TOKENS` makes the app feel like one
 * product instead of dozens of independently animated components. Springs are
 * used for direct manipulation, and eased tweens for entrances/navigation.
 */

/** Gentle, springy easing for interactive elements. */
export const springSoft: Transition = MOTION_TOKENS.spring.soft;

/** Slightly snappier spring for pills, toggles and small controls. */
export const springSnappy: Transition = MOTION_TOKENS.spring.snappy;

/** Crisp press feedback spring for buttons and cards. */
export const springPress: Transition = MOTION_TOKENS.spring.press;

/** Standard eased tween for entrances. */
export const easeOut: Transition = {
  duration: MOTION_TOKENS.duration.reveal,
  ease: MOTION_TOKENS.ease.out,
};

/** Fade + rise. The default entrance for anything appearing in place. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: easeOut },
  exit: { opacity: 0, y: -10, transition: { duration: MOTION_TOKENS.duration.fast, ease: "easeIn" } },
};

/** Fade + rise, smaller — for dense lists and cards inside a grid. */
export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: MOTION_TOKENS.duration.page, ease: MOTION_TOKENS.ease.out } },
  exit: { opacity: 0, y: -8, transition: { duration: MOTION_TOKENS.duration.fast } },
};

/** Plain cross-fade, no movement. Use when the layout must not shift. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: MOTION_TOKENS.duration.base, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: MOTION_TOKENS.duration.fast, ease: "easeIn" } },
};

/** Scale + fade, for modals, popovers and the help panel. */
export const pop: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: MOTION_TOKENS.duration.fast } },
};

/** Slide in from the left — the mobile drawer. */
export const slideInLeft: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: { type: "spring", stiffness: 300, damping: 32 } },
  exit: { x: "-100%", transition: { duration: 0.22, ease: "easeIn" } },
};

/** Standard hover/tap targets for interactive motion cards and controls. */
export const interactiveCardMotion = {
  whileHover: { y: -2 },
  whileTap: { scale: 0.99 },
  transition: springSnappy,
} as const;

/**
 * Parent of a staggered list. Children declare `variants={fadeUpSmall}` and
 * inherit the animation automatically — no per-child delay maths.
 */
export const staggerParent = (stagger = 0.06, delayChildren = 0.04): Variants => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});
