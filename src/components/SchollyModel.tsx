"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
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
  const state = useRef({ trackPointer, held, paused, motion, turn, since: 0 });
  const refresh = useRef<(() => void) | null>(null);

  useEffect(() => {
    const since = state.current.motion === motion ? state.current.since : performance.now();
    state.current = { trackPointer, held, paused, motion, turn, since };
    refresh.current?.();
  }, [trackPointer, held, paused, motion, turn]);

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
      const T = await import("three");
      if (!mounted) return;
      const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.28;
      renderer.domElement.setAttribute("aria-hidden", "true");

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, 0.1, 24);
      camera.position.set(0, 0.24, 5.72);
      camera.lookAt(0, 0.04, 0);
      const robot = new T.Group();
      const helmet = new T.Group();
      helmet.position.y = 0.33;
      scene.add(robot);
      robot.add(helmet);
      scene.add(new T.HemisphereLight(0xe0f5ff, 0x3044a1, 1.6));
      for (const [color, intensity, position] of [
        [0xffffff, 3.1, [-3, 5, 4]],
        [0x54dfff, 3.8, [2, 2, -3]],
        [0x89a3ff, 0.9, [3, -2, 4]],
      ] as const) {
        const light = new T.DirectionalLight(color, intensity);
        light.position.set(position[0], position[1], position[2]);
        scene.add(light);
      }

      const sphere = new T.SphereGeometry(1, 40, 28);
      const rimShape = new T.TorusGeometry(0.155, 0.032, 10, 32);
      const shell = new T.MeshPhysicalMaterial({ color: 0x1551fb, roughness: 0.18, clearcoat: 0.92, clearcoatRoughness: 0.11, metalness: 0.16 });
      const trim = new T.MeshStandardMaterial({ color: 0x4ac7fa, roughness: 0.28, metalness: 0.18 });
      const visor = new T.MeshPhysicalMaterial({ color: 0x070e36, roughness: 0.19, clearcoat: 1, clearcoatRoughness: 0.12 });
      const teal = new T.MeshBasicMaterial({ color: 0x6df2ff, toneMapped: false });
      const glint = new T.MeshBasicMaterial({ color: 0xdbfaff, toneMapped: false });
      const geometries: Three.BufferGeometry[] = [sphere, rimShape];
      const materials = [shell, trim, visor, teal, glint];

      function oval(group: Three.Group, material: Three.Material, at: [number, number, number], size: [number, number, number]) {
        const mesh = new T.Mesh(sphere, material);
        mesh.position.set(...at);
        mesh.scale.set(...size);
        group.add(mesh);
        return mesh;
      }

      function line(group: Three.Group, path: Three.Curve<Three.Vector3>, thickness: number) {
        const geometry = new T.TubeGeometry(path, 22, thickness, 8, false);
        geometries.push(geometry);
        const mesh = new T.Mesh(geometry, teal);
        group.add(mesh);
        return mesh;
      }

      oval(helmet, shell, [0, 0, 0], [1.02, 0.75, 0.67]);
      oval(helmet, trim, [0, -0.095, 0.305], [0.887, 0.488, 0.462]);
      oval(helmet, visor, [0, -0.094, 0.326], [0.862, 0.465, 0.453]);

      const eyes = [-1, 1].map(side => {
        oval(helmet, shell, [side * 1.0, -0.08, -0.018], [0.155, 0.235, 0.207]);
        const ring = new T.Mesh(rimShape, teal);
        ring.position.set(side * 1.063, -0.08, 0.12);
        ring.rotation.y = side * 0.58;
        ring.scale.y = 1.16;
        helmet.add(ring);
        const eye = new T.Group();
        eye.position.set(side * 0.284, -0.07, 0.76);
        eye.rotation.y = side * 0.13;
        helmet.add(eye);
        oval(eye, teal, [0, 0, 0], [0.066, 0.117, 0.036]);
        oval(eye, glint, [-0.018, 0.044, 0.032], [0.014, 0.019, 0.008]);
        return eye;
      });

      const smile = line(helmet, new T.QuadraticBezierCurve3(
        new T.Vector3(-0.122, 0.028, 0),
        new T.Vector3(0, -0.09, 0.015),
        new T.Vector3(0.122, 0.028, 0),
      ), 0.015);
      smile.position.set(0, -0.258, 0.766);
      const talking = oval(helmet, teal, [0, -0.27, 0.77], [0.105, 0.044, 0.022]);

      oval(robot, shell, [0, -0.65, -0.01], [0.58, 0.411, 0.43]);
      oval(robot, visor, [0, -0.661, 0.306], [0.306, 0.23, 0.126]);
      const badge = (points: [number, number, number][]) => line(robot, new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)), false, "catmullrom", 0), 0.012);
      badge([[-0.17, -0.62, 0.417], [0, -0.538, 0.445], [0.17, -0.62, 0.417], [0, -0.69, 0.448], [-0.17, -0.62, 0.417]]);
      badge([[-0.092, -0.659, 0.44], [-0.092, -0.721, 0.437], [0, -0.763, 0.43], [0.092, -0.721, 0.437], [0.092, -0.659, 0.44]]);
      badge([[0.17, -0.619, 0.42], [0.17, -0.744, 0.416]]);

      const arms = [-1, 1].map(side => {
        const arm = new T.Group();
        arm.position.set(side * 0.52, -0.55, 0.009);
        robot.add(arm);
        oval(arm, visor, [0, 0, 0], [0.133, 0.117, 0.13]);
        oval(arm, shell, [0, -0.145, 0], [0.113, 0.181, 0.123]);
        oval(arm, trim, [0, -0.302, 0.024], [0.148, 0.193, 0.139]);
        return arm;
      });

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
        const heading = -0.19 + facing + (steady ? 0 : x * (drag ? 0.25 : 0.22));
        robot.rotation.y += (heading - robot.rotation.y) * smoothing;
        helmet.rotation.y += ((steady ? 0.04 : x * 0.31) - helmet.rotation.y) * smoothing;
        helmet.rotation.x += ((steady ? 0 : y * 0.17 + lean) - helmet.rotation.x) * smoothing;
        helmet.rotation.z = steady ? 0 : thinking ? 0.11 : shake * 0.21;
        robot.rotation.z = steady ? 0 : shake * 0.09 + (wave ? Math.sin(elapsed * 7) * 0.052 : 0);
        robot.position.y = steady ? 0 : asleep ? -0.06 : Math.sin(time * 2.1) * 0.048 + (happy ? Math.max(0, Math.sin(elapsed * 8)) * 0.12 : 0);
        robot.scale.setScalar(pressed ? 0.94 : 1);
        if (now > nextBlink + 130) nextBlink = now + 3100 + Math.random() * 3300;
        const blink = asleep || (!steady && now >= nextBlink) || drag ? 0.12 : 1;
        for (const [index, eye] of eyes.entries()) {
          eye.position.x = (index ? 0.284 : -0.284) + (steady ? 0 : x * 0.03);
          eye.position.y = -0.07 + (steady ? 0 : -y * 0.019);
          eye.scale.set(happy ? 1.15 : 1, blink * (happy ? 0.58 : 1), 1);
          eye.rotation.z = happy ? (index ? -0.23 : 0.23) : 0;
        }

        arms.forEach((arm, index) => {
          const side = index ? 1 : -1;
          const raised = happy || (index === 1 && (wave || point));
          const flap = !steady && drag ? Math.sin(time * 21) * 0.28 : 0;
          const salute = !steady && wave && index === 1 ? Math.sin(elapsed * 19) * 0.35 : 0;
          arm.rotation.z = steady ? side * 0.55 : side * (raised ? 1.8 + salute : 0.58 + flap + Math.sin(time * 2.1 + index) * 0.045);
          arm.rotation.x = steady ? 0 : raised ? -0.17 : 0.16;
        });
        talking.visible = pose === "talk";
        talking.scale.y = steady ? 0.045 : 0.047 + Math.sin(elapsed * 17) * 0.026;
        smile.visible = !talking.visible;
        smile.scale.y = asleep ? 0.3 : happy ? 1.18 : 1;
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
        camera.aspect = rect.width / rect.height;
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
        renderer.dispose();
        renderer.forceContextLoss();
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
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
    <span ref={host} className="sb-scholly-model" aria-hidden="true" data-companion="scholly"
      data-reference-look data-held={held || undefined} data-paused={paused || undefined}>
      <span className="sb-scholly-portrait">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scholly.webp" alt="" draggable={false} />
      </span>
    </span>
  );
}
