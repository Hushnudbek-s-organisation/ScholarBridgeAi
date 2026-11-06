/**
 * Framer Motion feature bundle, loaded lazily by LazyMotion.
 *
 * `m` components ship only the tiny motion core. The DOM/layout feature code
 * lives in this separate chunk and is fetched once in the background after the
 * landing shell is interactive. `domMax` is required because the navigation
 * uses `layoutId` shared-element pills; `domAnimation` would silently drop
 * those.
 */
import { domMax } from "framer-motion";

export default domMax;
