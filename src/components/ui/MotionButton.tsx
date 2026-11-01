"use client";

import { motion } from "framer-motion";
import { Button } from "./Button";

/** Animated counterpart of Button for the few controls using Framer Motion. */
export const MotionButton = motion.create(Button);
