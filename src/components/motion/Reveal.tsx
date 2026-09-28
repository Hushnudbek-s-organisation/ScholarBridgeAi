"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { staggerParent } from "./variants";

type RevealProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
  /** How far the element travels, in px. */
  distance?: number;
  /** Delay in seconds. */
  delay?: number;
};

/**
 * Reveals its children the first time they scroll into view.
 *
 * `once: true` matters — without it every element re-animates as the user
 * scrolls back up, which looks restless and burns CPU on long pages.
 */
export function Reveal({
  children,
  distance = 18,
  delay = 0,
  ...rest
}: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px 0px -60px 0px" }}
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.45,
            delay,
            ease: [0.16, 1, 0.3, 1] as const,
          },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its direct `RevealItem` children as the group scrolls into view.
 */
export function RevealGroup({
  children,
  stagger = 0.07,
  delayChildren = 0.05,
  ...rest
}: Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
  stagger?: number;
  delayChildren?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px 0px -60px 0px" }}
      variants={staggerParent(stagger, delayChildren)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * One item inside a `RevealGroup`. Must be a direct child for the stagger
 * propagation to reach it.
 */
export function RevealItem({
  children,
  distance = 14,
  ...rest
}: Omit<HTMLMotionProps<"div">, "children" | "variants"> & {
  children: ReactNode;
  distance?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] as const },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
