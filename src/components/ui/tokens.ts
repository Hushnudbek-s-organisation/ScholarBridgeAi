/**
 * Shared design-system tokens for SVG attributes, charts, typography, motion
 * and native WebView APIs.
 *
 * Theme-aware colour roles reference `src/app/globals.css`; fixed illustration
 * colours live here so feature components never need arbitrary hex literals.
 */
export const UI_COLORS = {
  primary: "var(--sb-primary)",
  violet: "var(--sb-violet)",
  success: "var(--sb-success)",
  warning: "var(--sb-warning)",
  info: "var(--sb-info)",
  danger: "var(--sb-danger)",
  border: "var(--sb-border)",
  borderSubtle: "var(--sb-border-subtle)",
  borderStrong: "var(--sb-border-strong)",
  display: "var(--sb-ink-display)",
  heading: "var(--sb-ink-heading)",
  body: "var(--sb-ink-body)",
  secondary: "var(--sb-ink-secondary)",
  muted: "var(--sb-ink-muted)",
  dim: "var(--sb-ink-dim)",
  surface: "var(--sb-surface)",
  canvas: "var(--sb-canvas)",
  well: "var(--sb-well)",
  control: "var(--sb-control)",
  focus: "var(--sb-focus)",
  glow: "var(--sb-glow)",
} as const;

export const SVG_COLORS = {
  black: "#000000",
  white: "#ffffff",
  zinc950: "#09090b",
  zinc900: "#18181b",
  zinc800: "#27272a",
  zinc600: "#52525b",
  zinc500: "#71717a",
  zinc400: "#a1a1aa",
  zinc300: "#d4d4d8",
  zinc200: "#e4e4e7",
  zinc100: "#f4f4f5",
  blue50: "#eff6ff",
  sky400: "#38bdf8",
  indigo100: "#e0e7ff",
  indigo400: "#818cf8",
  violet400: "#a78bfa",
} as const;

/** Telegram's native header/background setters require hex, not CSS variables. */
export const TELEGRAM_NATIVE_COLORS = {
  primary: "#4f46e5",
  lightCanvas: "#ffffff",
  darkCanvas: "#060a14",
} as const;

/**
 * Semantic Inter typography scale (`font-black` / `font-extrabold` reserved for
 * display headlines and hero numerals only).
 */
export const TYPOGRAPHY_TOKENS = {
  display: "sb-type-display text-slate-950 dark:text-white",
  h1: "sb-type-h1 text-slate-900 dark:text-white",
  h2: "sb-type-h2 text-slate-900 dark:text-white",
  h3: "sb-type-h3 text-slate-900 dark:text-white",
  h4: "sb-type-h4 text-slate-800 dark:text-slate-100",
  body: "sb-type-body text-slate-700 dark:text-slate-200",
  caption: "sb-type-caption text-slate-600 dark:text-slate-300",
  eyebrow: "sb-type-eyebrow text-indigo-600 dark:text-indigo-300",
} as const;

/**
 * Shared motion timings & curves mirrored in `globals.css` (`--sb-duration-*`,
 * `--sb-ease-*`) and consumed by `src/components/motion/*`.
 */
export const MOTION_TOKENS = {
  duration: {
    instant: 0.1,
    fast: 0.16,
    base: 0.24,
    page: 0.3,
    reveal: 0.4,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    standard: [0.2, 0, 0, 1] as const,
    in: [0.4, 0, 1, 1] as const,
  },
  spring: {
    soft: { type: "spring" as const, stiffness: 260, damping: 26, mass: 0.9 },
    snappy: { type: "spring" as const, stiffness: 400, damping: 30 },
    press: { type: "spring" as const, stiffness: 520, damping: 32 },
  },
} as const;

/** Safe client check for `prefers-reduced-motion: reduce`. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Smooth scroll that automatically degrades to `"auto"` under reduced motion. */
export function preferredScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
