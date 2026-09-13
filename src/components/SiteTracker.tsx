"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/tracker";

/**
 * Renders nothing — it only records one anonymous page view per route load
 * (mounted once in the root layout). The in-app sections of the SPA are
 * tracked separately by `trackScreen()` in `src/app/page.tsx`.
 */
export function SiteTracker() {
  useEffect(() => {
    // Pathname only — query strings (?ref=CODE, filters, ...) would fragment
    // the same page into many rows; the traffic source comes from `referrer`.
    trackPageView(window.location.pathname);
  }, []);

  return null;
}
