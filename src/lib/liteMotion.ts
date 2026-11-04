/**
 * Lite-motion tier for mid-range Android and low-power contexts.
 *
 * When any of these is true, heavy effects are simplified:
 *  - `prefers-reduced-motion: reduce`
 *  - coarse pointer (touch) + low hardwareConcurrency / deviceMemory or small viewport
 *
 * The detection is client-only (SSR returns false — the full experience —
 * then hydrates to the correct tier). Listeners keep it in sync on resize /
 * preference changes. All decorative overlays keep working, just with fewer
 * layers / no blur / 2 marquee rows / lower plane LUT.
 */

export function isLiteMotionSync(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (prefersReduced) return true;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (!coarse) return false;
  const concurrency = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 8;
  const memory = typeof (navigator as unknown as { deviceMemory?: number }).deviceMemory === "number"
    ? (navigator as unknown as { deviceMemory: number }).deviceMemory
    : 8;
  const smallViewport = window.innerWidth < 1024;
  // Coarse + (low core OR low RAM OR tablet/phone) → lite
  return (concurrency <= 4 || memory <= 4 || smallViewport);
}

export function subscribeLiteMotion(callback: (lite: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mCoarse = window.matchMedia("(pointer: coarse)");

  const handler = () => callback(isLiteMotionSync());
  // Modern browsers support addEventListener on MediaQueryList; fallback to addListener
  const add = (m: MediaQueryList, fn: () => void) => {
    if (typeof m.addEventListener === "function") m.addEventListener("change", fn);
    else (m as unknown as { addListener: (fn: () => void) => void }).addListener(fn);
  };
  const remove = (m: MediaQueryList, fn: () => void) => {
    if (typeof m.removeEventListener === "function") m.removeEventListener("change", fn);
    else (m as unknown as { removeListener: (fn: () => void) => void }).removeListener(fn);
  };

  add(mReduced, handler);
  add(mCoarse, handler);
  window.addEventListener("resize", handler, { passive: true });

  return () => {
    remove(mReduced, handler);
    remove(mCoarse, handler);
    window.removeEventListener("resize", handler);
  };
}
