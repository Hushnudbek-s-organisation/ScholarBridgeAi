"use client";

import { useEffect, useRef } from "react";
import type { SchollyMotion } from "./useSchollyMotion";

type Props = {
  trackPointer?: boolean;
  held?: boolean;
  paused?: boolean;
  motion?: SchollyMotion;
  turn?: number;
};

export function SchollyModel({ trackPointer = true, held = false, paused = false, motion = "idle", turn = 0 }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const portrait = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const element = host.current;
    if (!element || !trackPointer || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function reset() {
      element?.style.removeProperty("--scholly-look-x");
      element?.style.removeProperty("--scholly-look-y");
    }
    function follow(event: PointerEvent) {
      if (!element || event.pointerType !== "mouse" || document.hidden || reduced.matches) return;
      const box = element.getBoundingClientRect();
      const clamp = (offset: number) => Math.max(-8, Math.min(8, offset / 20));
      element.style.setProperty("--scholly-look-x", `${clamp(box.top + box.height / 2 - event.clientY)}deg`);
      element.style.setProperty("--scholly-look-y", `${clamp(event.clientX - box.left - box.width / 2)}deg`);
    }
    window.addEventListener("pointermove", follow, { passive: true });
    window.addEventListener("blur", reset);
    document.addEventListener("pointerleave", reset);
    reduced.addEventListener("change", reset);
    return () => {
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("blur", reset);
      document.removeEventListener("pointerleave", reset);
      reduced.removeEventListener("change", reset);
      reset();
    };
  }, [trackPointer, paused]);

  useEffect(() => {
    if (!turn || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pose = portrait.current?.animate(
      ["rotateY(0deg)", "rotateY(27deg)", "rotateY(-12deg)", "rotateY(0deg)"]
        .map(value => ({ transform: `perspective(220px) ${value}` })),
      { duration: 600, easing: "ease-in-out" },
    );
    return () => pose?.cancel();
  }, [turn, paused]);

  return (
    <span ref={host} className="sb-scholly-model" aria-hidden="true" data-companion="scholly"
      data-reference-look data-held={held || undefined} data-paused={paused || undefined} data-motion={motion}>
      <span className="sb-scholly-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={portrait} src="/scholly.webp" width={384} height={384} alt="" draggable={false} decoding="async" />
      </span>
    </span>
  );
}
