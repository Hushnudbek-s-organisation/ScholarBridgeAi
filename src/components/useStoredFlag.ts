"use client";

/**
 * A localStorage flag as REACT EXTERNAL STATE.
 *
 * Why not `useEffect(() => setState(localStorage.getItem(...)))`: that is a
 * cascading render (and `react-hooks/set-state-in-effect` fails the lint
 * gate). `useSyncExternalStore` is the supported pattern — it reads during
 * render, uses the server snapshot (null) for SSR/hydration so no markup is
 * mismatched, and re-renders when this tab or another one changes the value.
 *
 * The flags here are UI PREFERENCES ONLY (focus mode, admin preview mode).
 * Nothing security-relevant may ever be read from localStorage.
 */
import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (typeof window !== "undefined") window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    if (typeof window !== "undefined") window.removeEventListener("storage", onChange);
  };
}

/** Current raw value of the flag, or null when unset/unavailable. */
export function useStoredFlag(key: string): string | null {
  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const getServerSnapshot = useCallback(() => null, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Write a flag (null removes it) and notify every subscriber in this tab. */
export function writeStoredFlag(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // storage disabled — the choice applies for this session only
  }
  emit();
}
