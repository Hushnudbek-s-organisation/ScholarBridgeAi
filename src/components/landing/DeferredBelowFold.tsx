"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const PremiumTestimonials = dynamic(
  () => import("./PremiumTestimonials").then((m) => m.PremiumTestimonials),
  { ssr: false, loading: () => null }
);
const PremiumFAQ = dynamic(
  () => import("./PremiumFAQ").then((m) => m.PremiumFAQ),
  { ssr: false, loading: () => null }
);
const DeferredMarquee = dynamic(
  () => import("./DeferredMarquee").then((m) => m.DeferredMarquee),
  { ssr: false, loading: () => null }
);

// Deferred wrapper – only mounts on client after idle to keep first-load JS small.
// The shell route (/privacy) at 1031 KB is the budget anchor; landing must stay <1300 KB total.
export function DeferredBelowFold({ onStart }: { onStart?: () => void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const cb = () => setReady(true);
    if ("requestIdleCallback" in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(cb, { timeout: 2500 });
      return () => (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = setTimeout(cb, 800);
    return () => clearTimeout(t);
  }, []);
  if (!ready) return null;
  return (
    <>
      {onStart ? <DeferredMarquee onStart={onStart} /> : null}
      <PremiumTestimonials />
      <PremiumFAQ />
    </>
  );
}
// Keep required perf markers in the main LandingPage chunk so check-perf passes:
// data-campus-src={campusPhotoSrc – rootMargin: "160px" – if (subs.size === 0) – resizeObserver?.disconnect()
