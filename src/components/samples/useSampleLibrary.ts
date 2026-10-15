"use client";

import { useEffect, useState } from "react";

/**
 * Lazy access to the exemplar library (src/lib/samples/exemplars.ts).
 *
 * The library is ~100 KB of text that most screens never show, so it is a
 * separate chunk fetched the first time a samples surface mounts, and shared
 * by every surface after that. Callers receive `null` while it loads.
 */
export type SampleLibrary = typeof import("@/lib/samples/exemplars");

let pending: Promise<SampleLibrary> | null = null;

export function loadSampleLibrary(): Promise<SampleLibrary> {
  if (!pending) {
    pending = import("@/lib/samples/exemplars").catch((error: unknown) => {
      // Let a later mount retry instead of caching the failure forever.
      pending = null;
      throw error;
    });
  }
  return pending;
}

export function useSampleLibrary(): { lib: SampleLibrary | null; failed: boolean; retry: () => void } {
  const [lib, setLib] = useState<SampleLibrary | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    loadSampleLibrary()
      .then((module) => {
        if (live) setLib(module);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  return {
    lib,
    failed,
    retry: () => {
      setFailed(false);
      setAttempt((n) => n + 1);
    },
  };
}
