"use client";

import { m as Motion } from "framer-motion";
import { Button } from "./Button";

/** Animated counterpart of Button for the few controls using Framer Motion. */
export const MotionButton = Motion.create(Button);
