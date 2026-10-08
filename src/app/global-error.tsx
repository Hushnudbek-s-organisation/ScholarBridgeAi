"use client";

import React from "react";
import { AppErrorFallback } from "@/components/AppErrorFallback";

/**
 * Last-resort boundary: renders when the ROOT LAYOUT itself throws (the case
 * `error.tsx` cannot cover, because it lives inside that layout).
 *
 * It must supply its own <html>/<body>, which is why AppErrorFallback takes a
 * `fullPage` flag.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppErrorFallback error={error} reset={reset} fullPage />;
}
