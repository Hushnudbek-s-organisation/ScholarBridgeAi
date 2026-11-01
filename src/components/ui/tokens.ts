/**
 * Non-Tailwind colour tokens for SVG attributes, charts and native WebView APIs.
 * Theme-aware roles reference globals.css; fixed illustration colours live here
 * so feature components never need arbitrary hex literals.
 */
export const UI_COLORS = {
  primary: "var(--sb-primary)",
  success: "var(--sb-success)",
  warning: "var(--sb-warning)",
  info: "var(--sb-info)",
  danger: "var(--sb-danger)",
  violet: "var(--sb-violet)",
  border: "var(--sb-border)",
  muted: "var(--sb-ink-muted)",
  body: "var(--sb-ink-body)",
  surface: "var(--sb-surface)",
  canvas: "var(--sb-canvas)",
  well: "var(--sb-well)",
  control: "var(--sb-control)",
  focus: "var(--sb-focus)",
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
} as const;

/** Telegram's native header/background setters require hex, not CSS variables. */
export const TELEGRAM_NATIVE_COLORS = {
  primary: "#4f46e5",
  lightCanvas: "#ffffff",
  darkCanvas: "#0f172a",
} as const;
