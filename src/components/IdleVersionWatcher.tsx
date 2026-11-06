"use client";

import { useEffect, useState, type ComponentType } from "react";
import { scheduleWhenIdle } from "@/lib/idle";

/**
 * Loads the build-version monitor AFTER the first paint.
 *
 * The monitor is a recovery aid, not part of the landing experience: keeping it
 * out of the initial bundle protects the ~1.3 MB first-load JS budget. A single
 * idle callback imports its own small chunk and mounts it; unmount cancels the
 * timer and ignores a late import.
 */
export function IdleVersionWatcher() {
  const [Monitor, setMonitor] = useState<ComponentType | null>(null);
  useEffect(() => {
    let cancelled = false;
    const cancel = scheduleWhenIdle(() => {
      void import("@/components/BuildVersionMonitor").then((module) => {
        if (!cancelled) setMonitor(() => module.BuildVersionMonitor);
      }).catch(() => { /* recovery aid is optional; the app keeps working */ });
    }, 3_000, 3_000);
    return () => {
      cancelled = true;
      cancel();
    };
  }, []);
  return Monitor ? <Monitor /> : null;
}

export default IdleVersionWatcher;
