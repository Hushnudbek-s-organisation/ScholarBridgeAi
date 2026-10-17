"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/tracker";
import { scheduleWhenIdle } from "@/lib/idle";

/**
 * Renders nothing — it only records one anonymous page view per route load
 * (mounted once in the root layout). The in-app sections of the SPA are
 * tracked separately by `trackScreen()` in `src/app/page.tsx`.
 *
 * The beacon is scheduled for the browser's idle slot: analytics must never
 * compete with the first paint for the network connection.
 */
export function SiteTracker() {
  useEffect(() => {
    // Pathname only — query strings (?ref=CODE, filters, ...) would fragment
    // the same page into many rows; the traffic source comes from `referrer`.
    const cancel = scheduleWhenIdle(() => {
      trackPageView(window.location.pathname);
    }, 1800);
    return cancel;
  }, []);

  return null;
}
