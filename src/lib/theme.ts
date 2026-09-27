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

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * Blocking inline script for <head>.
 *
 * It runs before first paint, so the page never flashes light-on-dark (or the
 * reverse) while React hydrates. Deliberately tiny and wrapped in try/catch:
 * if localStorage is unavailable the app still works, it just starts in the
 * system theme.
 *
 * Pass the CSP nonce from `headers().get("x-nonce")` — the middleware sends a
 * nonce-based policy, and an inline script without a nonce is blocked.
 */
export function themeInitScript(): string {
  return `(function(){try{var k="${THEME_STORAGE_KEY}";var s=localStorage.getItem(k);var t=(s==="light"||s==="dark"||s==="system")?s:"system";var d=t==="system"?window.matchMedia("(prefers-color-scheme: dark)").matches:t;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
}
