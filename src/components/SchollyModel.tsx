"use client";

import { useEffect, useRef } from "react";
import { scheduleWhenIdle } from "@/lib/idle";
import { connectSchollyScene } from "./scholly/connectSchollyScene";
import type { SceneStatus } from "./scholly/SchollyScene";
import type { SchollyMotion } from "./useSchollyMotion";

type Props = {
  loadModel?: boolean;
  trackPointer?: boolean;
  held?: boolean;
  paused?: boolean;
  motion?: SchollyMotion;
  turn?: number;
};

const ANIMATED_POSES = new Set<SchollyMotion>([
  "happy", "easter", "notice", "shake", "proud", "celebrate", "levelup", "wave", "drag", "talk",
]);

export function SchollyModel({ loadModel = true, trackPointer = true, held = false, paused = false, motion = "idle", turn = 0 }: Props) {
  const host = useRef<HTMLSpanElement>(null);
  const portrait = useRef<HTMLImageElement>(null);
  const state = useRef({ trackPointer, held, paused, motion, turn, since: 0 });
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    const since = state.current.motion === motion ? state.current.since : performance.now();
    state.current = { trackPointer, held, paused, motion, turn, since };
    refresh.current?.();
  }, [trackPointer, held, paused, motion, turn]);

  useEffect(() => {
    const element = host.current;
    if (!element || !trackPointer || paused) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function reset() {
      element?.style.removeProperty("--scholly-look-x");
      element?.style.removeProperty("--scholly-look-y");
    }
    function follow(event: PointerEvent) {
      if (!element || element.dataset.rendering === "3d" || event.pointerType !== "mouse" || document.hidden || reduced.matches) return;
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
    if (!turn || paused || host.current?.dataset.rendering === "3d" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const pose = portrait.current?.animate(
      [0, 27, -12, 0].map(value => ({ transform: `perspective(220px) rotateY(${value}deg)` })),
      { duration: 600, easing: "ease-in-out" },
    );
    return () => pose?.cancel();
  }, [turn, paused]);

  useEffect(() => {
    const element = host.current;
    if (!element || !loadModel) return;
    const target = element;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mounted = true;
    let inView = false;
    let starting = false;
    let cancelStart: (() => void) | undefined;
    let cleanup: (() => void) | undefined;

    function mount() {
      function createCanvas() {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        target.append(canvas);
        return canvas;
      }
      let canvas = createCanvas();
      let surface = connectSchollyScene(canvas, window.devicePixelRatio, onStatus);
      let pointer: { x: number; y: number } | null = null;
      let box: DOMRect | null = null;
      let ready = false;
      let rendererReady = false;
      let animationFrame = 0;
      let pointerUntil = 0;
      let lastFrame = -Infinity;
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));

      function draw(now: number, immediate = false) {
        if (!immediate && now - lastFrame < 40) return;
        lastFrame = now;
        const { motion: pose, since, held: pressed, paused: stopped, turn: facing, trackPointer: reacts } = state.current;
        if (pointer && reacts && !box) box = target.getBoundingClientRect();
        const x = pointer && box && reacts ? clamp((pointer.x - box.left - box.width / 2) / 160) : 0;
        const y = pointer && box && reacts ? clamp((pointer.y - box.top - box.height / 2) / 155) : 0;
        surface.draw({ now, since, pose, pressed, steady: stopped || reduced.matches, facing, x, y, immediate });
      }

      function tick(now: number) {
        animationFrame = 0;
        if (!inView || !ready || document.hidden) return;
        const { motion: pose, paused: stopped } = state.current;
        if (!stopped && !reduced.matches && (now < pointerUntil || ANIMATED_POSES.has(pose))) {
          draw(now);
          animationFrame = requestAnimationFrame(tick);
        } else {
          draw(now, true);
        }
      }

      function sync() {
        if (animationFrame) cancelAnimationFrame(animationFrame);
        animationFrame = inView && ready && !document.hidden ? requestAnimationFrame(tick) : 0;
      }

      let lastPoint = -Infinity;
      function follow(event: PointerEvent) {
        if (event.pointerType === "touch" && !state.current.held) return;
        if (!state.current.trackPointer || state.current.paused || reduced.matches || !inView) return;
        if (event.timeStamp - lastPoint < 24) return;
        lastPoint = event.timeStamp;
        box ??= target.getBoundingClientRect();
        const near = state.current.held || Math.hypot(event.clientX - box.left - box.width / 2, event.clientY - box.top - box.height / 2) < 220;
        if (!near && !pointer) return;
        pointer = near ? { x: event.clientX, y: event.clientY } : null;
        pointerUntil = performance.now() + 300;
        if (!animationFrame) sync();
      }
      function center() {
        box = null;
        if (!pointer) return;
        pointer = null;
        pointerUntil = performance.now() + 300;
        if (!animationFrame) sync();
      }
      function resize() {
        const rect = target.getBoundingClientRect();
        box = rect;
        if (!rendererReady || !rect.width || !rect.height) return;
        surface.resize(rect.width, rect.height);
        ready = true;
        sync();
      }
      function onStatus(status: SceneStatus) {
        if (!mounted) return;
        if (status === "ready") {
          rendererReady = true;
          resize();
        } else if (status === "rendered") {
          if (rendererReady) target.dataset.rendering = "3d";
        } else {
          rendererReady = ready = false;
          delete target.dataset.rendering;
          sync();
          if (status === "failed" && surface.worker) {
            surface.dispose();
            canvas.remove();
            canvas = createCanvas();
            surface = connectSchollyScene(canvas, window.devicePixelRatio, onStatus, false);
          } else if (status === "failed") {
            cleanup?.();
            cleanup = undefined;
            refresh.current = null;
          }
        }
      }

      const size = new ResizeObserver(resize);
      size.observe(target);
      window.addEventListener("pointermove", follow, { passive: true });
      window.addEventListener("blur", center);
      window.addEventListener("scroll", center, { passive: true, capture: true });
      document.addEventListener("pointerleave", center);
      document.addEventListener("visibilitychange", sync);
      reduced.addEventListener("change", sync);
      refresh.current = sync;
      cleanup = () => {
        size.disconnect();
        window.removeEventListener("pointermove", follow);
        window.removeEventListener("blur", center);
        window.removeEventListener("scroll", center, true);
        document.removeEventListener("pointerleave", center);
        document.removeEventListener("visibilitychange", sync);
        reduced.removeEventListener("change", sync);
        if (animationFrame) cancelAnimationFrame(animationFrame);
        surface.dispose();
        canvas.remove();
        delete target.dataset.rendering;
      };
    }

    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !starting && !cancelStart) {
        cancelStart = scheduleWhenIdle(() => {
          cancelStart = undefined;
          if (!mounted || !inView) return;
          starting = true;
          mount();
        }, 1200, 380);
      } else if (!inView) {
        cancelStart?.();
        cancelStart = undefined;
      }
      refresh.current?.();
    });
    visibility.observe(target);
    return () => {
      mounted = false;
      visibility.disconnect();
      cancelStart?.();
      refresh.current = null;
      cleanup?.();
    };
  }, [loadModel]);

  return (
    <span ref={host} className="sb-scholly-model" aria-hidden="true" data-companion="scholly" data-model="character-sheet"
      data-reference-look data-held={held || undefined} data-paused={paused || undefined} data-motion={motion}>
      <span className="sb-scholly-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={portrait} src="/scholly.webp" width={384} height={384} alt="" draggable={false} decoding="async" />
      </span>
    </span>
  );
}
