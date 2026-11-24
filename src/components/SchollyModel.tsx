"use client";

import { useEffect, useRef } from "react";
import type { SchollyMotion } from "./useSchollyMotion";

export function SchollyModel({ trackPointer, held, paused, motion }: {
  trackPointer: boolean;
  held: boolean;
  paused: boolean;
  motion: SchollyMotion;
}) {
  const portrait = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = portrait.current;
    if (!element || !trackPointer || paused) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tilt = (distance: number) => Math.max(-9, Math.min(9, distance / 23));
    const reset = () => {
      element.style.removeProperty("--scholly-look-x");
      element.style.removeProperty("--scholly-look-y");
    };
    const follow = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reducedMotion.matches) return;
      const box = element.getBoundingClientRect();
      element.style.setProperty("--scholly-look-x", `${tilt(box.top + box.height / 2 - event.clientY)}deg`);
      element.style.setProperty("--scholly-look-y", `${tilt(event.clientX - box.left - box.width / 2)}deg`);
    };
    window.addEventListener("pointermove", follow, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("pointerleave", reset);
    reducedMotion.addEventListener("change", reset);
    return () => {
      reset();
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("blur", reset);
      document.removeEventListener("pointerleave", reset);
      reducedMotion.removeEventListener("change", reset);
    };
  }, [trackPointer, paused]);

  return (
    <span className="sb-scholly-model" aria-hidden="true" data-companion="scholly" data-reference-look
      data-held={held || undefined} data-paused={paused || undefined}>
      <span ref={portrait} className="sb-scholly-portrait" data-dragging={motion === "drag" || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scholly.webp" alt="" draggable={false} />
      </span>
    </span>
  );
}
