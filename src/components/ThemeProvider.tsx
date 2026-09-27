"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  isThemeChoice,
  THEME_COOKIE,
  THEME_STORAGE_KEY,
  type ThemeChoice,
  type ResolvedTheme,
} from "@/lib/theme";

export type { ThemeChoice, ResolvedTheme };

interface ThemeContextValue {
  /** What the user picked. */
  theme: ThemeChoice;
  /** What is actually on screen (`system` resolved against the OS). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeChoice) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ---------------------------------------------------------------------------
// External stores
//
// The theme lives outside React — in localStorage (the user's choice) and in
// the OS (`prefers-color-scheme`). `useSyncExternalStore` reads those directly,
// so there is no copy in React state to keep in sync, no setState-in-effect,
// and changes from another tab or the OS arrive through the same subscription.
// ---------------------------------------------------------------------------

/** In-tab listeners (the `storage` event only fires in *other* tabs). */
const choiceListeners = new Set<() => void>();

function readStoredTheme(): ThemeChoice {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeChoice(raw)) return raw;
  } catch {
    // private mode / storage disabled
  }
  return "system";
}

function subscribeChoice(onChange: () => void) {
  choiceListeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    choiceListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeSystem(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readSystemDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function writeChoice(next: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // ignore
  }
  // Mirrored into a cookie purely so the server can render the toggle in the
  // right state on the next full page load (see app/layout.tsx). It is a
  // display hint, never an authorization input.
  try {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax${secure}`;
  } catch {
    // ignore
  }
  choiceListeners.forEach((listener) => listener());
}

/**
 * Applies the theme to <html>, briefly enabling a colour cross-fade.
 * The blocking inline script in <head> (lib/theme.ts) does the same thing
 * before first paint, so this normally only changes anything on a switch.
 */
function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  const isDark = resolved === "dark";
  if (root.classList.contains("dark") === isDark) return;
  root.classList.add("theme-transition");
  window.setTimeout(() => root.classList.remove("theme-transition"), 300);
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: ReactNode;
  /**
   * Server-side hint (cookie) so the first client render matches the server
   * HTML exactly — no hydration mismatch on the toggle.
   */
  defaultTheme?: ThemeChoice;
}) {
  const theme = useSyncExternalStore(
    subscribeChoice,
    readStoredTheme,
    () => defaultTheme
  );
  const systemDark = useSyncExternalStore(
    subscribeSystem,
    readSystemDark,
    () => false
  );

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Synchronising React → DOM is exactly what effects are for.
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((next: ThemeChoice) => writeChoice(next), []);

  // Flip away from what is on screen, not from the OS setting — otherwise a
  // user on "system" who is seeing dark would "toggle" to dark and see nothing
  // happen.
  const toggleTheme = useCallback(() => {
    writeChoice(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Used when a component is rendered without <ThemeProvider> (server-render
 * tests, isolated previews). A theme switch must never take the page down, so
 * it degrades to "light, follow system" and still persists the choice.
 */
const FALLBACK_THEME: ThemeContextValue = {
  theme: "system",
  resolvedTheme: "light",
  setTheme: (next) => {
    if (typeof window !== "undefined") writeChoice(next);
  },
  toggleTheme: () => {
    if (typeof window !== "undefined") writeChoice("dark");
  },
};

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? FALLBACK_THEME;
}
