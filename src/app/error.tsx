"use client";

import React from "react";
import { AppErrorFallback } from "@/components/AppErrorFallback";

/**
 * Route-level error boundary for the whole app segment.
 *
 * Next.js renders this when a component below the root layout throws during
 * render. Without it the student app (a single-page shell in HomeClient with no
 * boundary of its own) turned any render error into a blank white page with no
 * retry — see src/components/AppErrorFallback.tsx.
 *
 * `reset()` re-renders the segment; the student keeps their session and the
 * URL, so a transient failure is one click away from recovering.
 */
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AppErrorFallback error={error} reset={reset} />;
}
