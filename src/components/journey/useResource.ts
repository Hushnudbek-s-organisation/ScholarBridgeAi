"use client";

/**
 * One tiny data-loading hook for every Journey panel.
 *
 * WHY
 * ---
 * Eleven panels each need the same three things: load on mount, show a
 * spinner, show an error, and reload after a mutation. Written inline that is
 * ~30 duplicated lines per panel — and the copy-paste version tripped the
 * React compiler's `set-state-in-effect` rule, because a `useCallback` loader
 * invoked directly from an effect reads as a synchronous state write.
 *
 * This hook keeps the fetch inside the effect (state writes happen after the
 * `await`, behind a `live` guard so a fast tab switch cannot set state on an
 * unmounted panel) and exposes an explicit `reload` for event handlers.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface Resource<T> {
  data: T;
  loading: boolean;
  error: string | null;
  /** Re-fetch with a spinner — call after a create / update / delete. */
  reload: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

function message(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function useResource<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: { initial: T; errorFallback?: string }
): Resource<T> {
  const [data, setData] = useState<T>(options.initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The latest fetcher is always used, but its identity is not a dependency —
  // `deps` is the caller's explicit list, exactly like a hand-written effect.
  // The ref is synced in an effect declared BEFORE the loading effect, so the
  // loader always sees the fetcher that belongs to the current dependency set.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetcherRef.current();
        if (!live) return;
        setData(res);
        setError(null);
      } catch (e) {
        if (!live) return;
        setError(message(e, options.errorFallback ?? "Something went wrong"));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetcherRef.current();
      setData(res);
      setError(null);
    } catch (e) {
      setError(message(e, options.errorFallback ?? "Something went wrong"));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, reload, setData };
}

/** `fetch` + JSON + throw-on-error, in the shape `useResource` expects. */
export async function getJson<T>(url: string, fallback: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || fallback);
  return json as T;
}

export async function sendJson<T>(
  url: string,
  init: RequestInit,
  fallback: string
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || fallback);
  return json as T;
}
