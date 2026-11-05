/**
 * Theme constants shared by the server layout (which emits the pre-hydration
 * script) and the client provider. Kept free of React so the server component
 * can import it without creating a client boundary.
 */

export const THEME_STORAGE_KEY = "scholarbridge_theme";

/** What the user can choose. */
export type ThemeChoice = "light" | "dark" | "system";

/** What is actually painted on screen. */
export type ResolvedTheme = "light" | "dark";

export const THEME_COOKIE = "scholarbridge_theme_hint";

/** Dark-first default for first-time visitors without a saved preference. */
export const DEFAULT_THEME: ThemeChoice = "dark";

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Blocking inline script for <head>.
 *
 * Runs synchronously before first paint so the page never flashes the wrong
 * theme while React hydrates:
 *   1. Saved choice in `localStorage` (`light` | `dark` | `system`) wins.
 *   2. Otherwise falls back to `DEFAULT_THEME` (`dark`) for first-time visitors.
 *   3. Only when the resolved choice is `system` is `prefers-color-scheme` read.
 *
 * Pass the CSP nonce from `headers().get("x-nonce")` — the middleware sends a
 * nonce-based policy, and an inline script without a nonce is blocked.
 */
export function themeInitScript(): string {
  return `(function(){var r=document.documentElement;try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var t=(s==="light"||s==="dark"||s==="system")?s:"${DEFAULT_THEME}";var d=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:t==="dark";r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){r.classList.add("dark");r.style.colorScheme="dark";}})();`;
}
