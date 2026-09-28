import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion vocabulary.
 *
 * Keeping the timings in one file is what makes the app feel like one product
 * instead of 60 independently animated components. Springs are used for
 * anything the user directly manipulates (they follow the finger/cursor), and
 * eased tweens for anything that happens *to* the user on load or navigation.
 */

/** Gentle, springy easing for interactive elements. */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.9,
};

/** Slightly snappier spring for pills, toggles and small controls. */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

/** Standard eased tween for entrances. */
export const easeOut: Transition = {
  duration: 0.42,
  ease: [0.16, 1, 0.3, 1], // easeOutExpo-ish: quick start, long settle
};

/** Fade + rise. The default entrance for anything appearing in place. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: easeOut },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2, ease: "easeIn" } },
};

/** Fade + rise, smaller — for dense lists and cards inside a grid. */
export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { ...easeOut, duration: 0.34 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

/** Plain cross-fade, no movement. Use when the layout must not shift. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.18, ease: "easeIn" } },
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
  exit: { opacity: 0, scale: 0.97, y: 4, transition: { duration: 0.15 } },
};

/** Slide in from the left — the mobile drawer. */
export const slideInLeft: Variants = {
  hidden: { x: "-100%" },
  visible: { x: 0, transition: { type: "spring", stiffness: 300, damping: 32 } },
  exit: { x: "-100%", transition: { duration: 0.22, ease: "easeIn" } },
};

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
