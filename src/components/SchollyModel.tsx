"use client";

import { useEffect, useRef } from "react";
import type { Expression } from "./scholly/SchollyMesh";
import type { SchollyMotion } from "./useSchollyMotion";

type Props = {
  trackPointer?: boolean;
  held?: boolean;
  paused?: boolean;
  motion?: SchollyMotion;
  turn?: number;
};

const EXPRESSIONS: Partial<Record<SchollyMotion, Expression>> = {
  happy: "happy", easter: "happy", think: "thinking", notice: "surprised", shake: "surprised",
  proud: "proud", concern: "concerned", sleep: "sleepy", celebrate: "celebrating", levelup: "celebrating",
};

export function SchollyModel({ trackPointer = true, held = false, paused = false, motion = "idle", turn = 0 }: Props) {
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
    if (!element) return;
    const target = element;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let mounted = true;
    let inView = false;
    let starting = false;
    let cleanup: (() => void) | undefined;

    async function mount() {
      const [T, { createScholly, makeSchollyEnvironment }] = await Promise.all([
        import("three"), import("./scholly/SchollyMesh"),
      ]);
      if (!mounted) return;
      const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.20;
      renderer.domElement.setAttribute("aria-hidden", "true");

      const scene = new T.Scene();
      const camera = new T.OrthographicCamera(-1.57, 1.57, 1.57, -1.57, 0.1, 35);
      camera.position.set(0, -0.169, 8);
      camera.lookAt(0, -0.169, 0);
      const model = createScholly(scene);
      const { robot, helmet, arms, faces, eyes, neutralMouth, shadow, voice } = model;
      let reflections: ReturnType<typeof makeSchollyEnvironment> | undefined;
      function refreshReflections() {
        reflections?.dispose();
        reflections = undefined;
        try {
          reflections = makeSchollyEnvironment(renderer);
          scene.environment = reflections.texture;
        } catch {
          scene.environment = null;
        }
      }
      refreshReflections();

      let pointer: { x: number; y: number } | null = null;
      let box: DOMRect | null = null;
      let lost = false;
      let ready = false;
      let running = false;
      let lastFrame = -Infinity;
      let nextBlink = performance.now() + 1800;
      const clamp = (n: number) => Math.max(-1, Math.min(1, n));

      function draw(now: number, immediate = false) {
        if (!ready || lost || !mounted || !inView || document.hidden) return;
        const { motion: pose, since, held: pressed, paused: stopped, turn: facing, trackPointer: reacts } = state.current;
        const steady = stopped || reduced.matches;
        const interval = pose === "idle" && !pointer ? 61 : 37;
        if (!immediate && now - lastFrame < interval) return;
        lastFrame = now;
        const time = now / 1000;
        const elapsed = Math.max(0, (now - since) / 1000);
        const happy = ["happy", "celebrate", "proud", "levelup", "easter"].includes(pose);
        const asleep = pose === "sleep";
        const thinking = pose === "think";
        const wave = pose === "wave";
        const point = pose === "point";
        const shake = pose === "shake" && !steady ? Math.sin(elapsed * 17) : 0;
        const drag = pose === "drag";
        if (pointer && reacts && !box) box = target.getBoundingClientRect();
        const x = pointer && box && reacts ? clamp((pointer.x - box.left - box.width / 2) / 160) : 0;
        const y = pointer && box && reacts ? clamp((pointer.y - box.top - box.height / 2) / 155) : 0;
        const lean = pose === "notice" ? 0.12 * Math.sin(elapsed * 9) : 0;
        const smoothing = steady || immediate ? 1 : 0.25;
        const heading = facing + (steady ? 0 : x * (drag ? 0.25 : 0.22));
        robot.rotation.y += (heading - robot.rotation.y) * smoothing;
        helmet.rotation.y += ((steady ? 0 : x * 0.31) - helmet.rotation.y) * smoothing;
        helmet.rotation.x += ((steady ? 0 : y * 0.17 + lean) - helmet.rotation.x) * smoothing;
        helmet.rotation.z = steady ? 0 : thinking ? -0.078 : shake * 0.21;
        robot.rotation.z = steady ? 0 : shake * 0.09 + (wave ? Math.sin(elapsed * 7) * 0.052 : 0);
        robot.position.y = steady ? 0 : asleep ? -0.06 : Math.sin(time * 2.3) * 0.027 + (happy ? Math.max(0, Math.sin(elapsed * 8)) * 0.12 : 0);
        robot.scale.setScalar(pressed ? 0.94 : 1);
        if (now > nextBlink + 130) nextBlink = now + 3100 + Math.random() * 3300;
        const blink = (!steady && now >= nextBlink) || drag ? 0.13 : 1;
        const expression = EXPRESSIONS[pose] ?? "neutral";
        const talking = pose === "talk";
        for (const [key, face] of faces) face.visible = key === expression;
        for (const eye of eyes) eye.scale.y = blink;
        if (neutralMouth) neutralMouth.visible = !talking;
        arms.forEach((arm, index) => {
          const side = index ? 1 : -1;
          const raised = ["celebrate", "levelup"].includes(pose) || (index === 1 && (wave || point));
          const flap = !steady && drag ? Math.sin(time * 21) * 0.28 : 0;
          const salute = !steady && wave && index === 1 ? Math.sin(elapsed * 19) * 0.35 : 0;
          arm.rotation.set(steady ? 0 : raised ? -0.17 : 0.10, 0, side * (raised && !steady ? 1.8 + salute : 0.62 + flap));
          if (!steady && thinking && index === 1) arm.rotation.set(-0.44, 0.20, 1.95);
          if (!steady && pose === "proud") arm.rotation.set(-0.95, side * 0.12, side * -0.67);
        });
        voice.visible = talking;
        voice.scale.y = steady ? 0.063 : 0.063 * (0.86 + Math.sin(elapsed * 17) * 0.39);
        shadow.scale.setScalar(1 + robot.position.y * 0.29);
        renderer.render(scene, camera);
        if (target.dataset.rendering !== "3d") target.dataset.rendering = "3d";
      }

      function sync() {
        const animate = inView && ready && !document.hidden && !lost && !reduced.matches && !state.current.paused;
        if (animate !== running) {
          renderer.setAnimationLoop(animate ? (now) => draw(now) : null);
          running = animate;
        }
        if (!animate) draw(performance.now(), true);
      }

      let lastPoint = -Infinity;
      function follow(event: PointerEvent) {
        if (event.pointerType === "touch" && !state.current.held) return;
        if (!state.current.trackPointer || state.current.paused || reduced.matches || !inView) return;
        if (event.timeStamp - lastPoint < 24) return;
        lastPoint = event.timeStamp;
        pointer = { x: event.clientX, y: event.clientY };
      }
      function center() { pointer = null; box = null; }
      function resize() {
        const rect = target.getBoundingClientRect();
        box = rect;
        if (lost || !rect.width || !rect.height) return;
        const aspect = rect.width / rect.height;
        const halfWidth = Math.max(1.52, 1.565 * aspect);
        const halfHeight = halfWidth / aspect;
        camera.left = -halfWidth;
        camera.right = halfWidth;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height, false);
        ready = true;
        draw(performance.now(), true);
        sync();
      }
      function contextLost(event: Event) {
        event.preventDefault();
        lost = true;
        delete target.dataset.rendering;
        sync();
      }
      function contextRestored() {
        lost = false;
        refreshReflections();
        resize();
      }

      target.append(renderer.domElement);
      const size = new ResizeObserver(resize);
      size.observe(target);
      window.addEventListener("pointermove", follow, { passive: true });
      window.addEventListener("blur", center);
      window.addEventListener("scroll", center, { passive: true, capture: true });
      document.addEventListener("pointerleave", center);
      document.addEventListener("visibilitychange", sync);
      reduced.addEventListener("change", sync);
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
      refresh.current = sync;
      cleanup = () => {
        size.disconnect();
        window.removeEventListener("pointermove", follow);
        window.removeEventListener("blur", center);
        window.removeEventListener("scroll", center, true);
        document.removeEventListener("pointerleave", center);
        document.removeEventListener("visibilitychange", sync);
        reduced.removeEventListener("change", sync);
        renderer.domElement.removeEventListener("webglcontextlost", contextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
        renderer.setAnimationLoop(null);
        reflections?.dispose();
        model.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        delete target.dataset.rendering;
      };
      resize();
    }

    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && !starting) {
        starting = true;
        void mount().catch(() => { cleanup?.(); cleanup = undefined; refresh.current = null; });
      }
      refresh.current?.();
    });
    visibility.observe(target);
    return () => {
      mounted = false;
      visibility.disconnect();
      refresh.current = null;
      cleanup?.();
    };
  }, []);

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
