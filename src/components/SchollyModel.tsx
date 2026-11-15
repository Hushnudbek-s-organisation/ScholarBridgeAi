"use client";

import { useEffect, useRef } from "react";
import type * as Three from "three";
import type { SchollyMotion } from "./useSchollyMotion";

export function SchollyModel({ trackPointer = false, held = false, paused = false, motion = "idle" }: {
  trackPointer?: boolean;
  held?: boolean;
  paused?: boolean;
  motion?: SchollyMotion;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const animation = useRef({ held, motion, paused, since: 0 });
  useEffect(() => {
    const since = animation.current.motion === motion ? animation.current.since : performance.now();
    animation.current = { held, motion, paused, since };
  }, [held, motion, paused]);

  useEffect(() => {
    const element = host.current;
    if (!trackPointer || !element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    function follow(event: PointerEvent) {
      if (event.pointerType !== "mouse" || reduced.matches || element!.dataset.rendering === "3d") return;
      const box = element!.getBoundingClientRect();
      const angle = (delta: number) => Math.max(-8, Math.min(8, delta / 18));
      element!.style.setProperty("--scholly-look-x", `${angle(event.clientY - box.top - box.height / 2)}deg`);
      element!.style.setProperty("--scholly-look-y", `${angle(event.clientX - box.left - box.width / 2)}deg`);
    }
    function reset() {
      element!.style.removeProperty("--scholly-look-x");
      element!.style.removeProperty("--scholly-look-y");
    }
    window.addEventListener("pointermove", follow, { passive: true });
    document.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("pointermove", follow);
      document.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
    };
  }, [trackPointer]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void import("three").then((T) => {
      if (disposed) return;
      let renderer: Three.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
      } catch {
        return;
      }

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(29, 1, 0.1, 30);
      camera.position.set(0, trackPointer ? 0.05 : 0.16, trackPointer ? 5.1 : 7.7);
      const robot = new T.Group();
      const head = new T.Group();
      scene.add(robot);
      robot.add(head);
      head.position.y = 0.37;
      scene.add(new T.HemisphereLight(0xbddaff, 0x121b53, 2.3));
      const key = new T.DirectionalLight(0xb7dfff, 3.2);
      key.position.set(-3, 4, 4);
      scene.add(key);
      const rim = new T.DirectionalLight(0x1cbdff, 3);
      rim.position.set(3, 0, -2);
      scene.add(rim);

      const sphere = new T.SphereGeometry(1, 48, 32);
      const shell = new T.MeshPhysicalMaterial({ color: 0x1846c0, roughness: 0.34, metalness: 0.16, clearcoat: 0.5 });
      const visor = new T.MeshPhysicalMaterial({ color: 0x080f2e, roughness: 0.28, clearcoat: 0.8 });
      const cyan = new T.MeshBasicMaterial({ color: 0x68efff, transparent: true });
      const purple = new T.MeshBasicMaterial({ color: 0xb779ff });
      function orb(parent: Three.Group, material: Three.Material, position: [number, number, number], scale: [number, number, number]) {
        const mesh = new T.Mesh(sphere, material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        parent.add(mesh);
        return mesh;
      }

      orb(head, shell, [0, 0, 0], [0.97, 0.74, 0.61]);
      orb(head, visor, [0, -0.12, 0.22], [0.83, 0.47, 0.49]);
      const eyes = [-1, 1].map((side) => orb(head, cyan, [side * 0.30, -0.12, 0.673], [0.064, 0.111, 0.035]));
      const smileCurve = new T.QuadraticBezierCurve3(new T.Vector3(-0.126, -0.26, 0.687), new T.Vector3(0, -0.365, 0.687), new T.Vector3(0.126, -0.26, 0.687));
      const smileGeometry = new T.TubeGeometry(smileCurve, 24, 0.014, 8);
      const smile = new T.Mesh(smileGeometry, cyan);
      const expression = new T.Group();
      expression.position.set(0, -0.29, 0.687);
      smile.position.set(0, 0.29, -0.687);
      expression.add(smile);
      head.add(expression);
      const mouth = orb(head, cyan, [0, -0.29, 0.686], [0.105, 0.045, 0.025]);
      orb(robot, shell, [0, -0.67, 0], [0.59, 0.42, 0.39]);
      orb(robot, purple, [0, -0.655, 0.385], [0.17, 0.018, 0.014]);
      const fins = [-1, 1].map((side) => {
        const fin = orb(robot, shell, [side * 0.78, -0.62, 0], [0.122, 0.25, 0.12]);
        fin.rotation.z = side * 0.67;
        return fin;
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.appendChild(renderer.domElement);
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const target = { x: 0, y: 0 };
      const clamp = (value: number) => Math.min(1, Math.max(-1, value));
      function point(event: PointerEvent) {
        if (event.pointerType !== "mouse" || motion.matches) return;
        const rect = element!.getBoundingClientRect();
        target.x = clamp((event.clientX - rect.left - rect.width / 2) / 245);
        target.y = clamp((event.clientY - rect.top - rect.height / 2) / 245);
      }
      function center() { target.x = target.y = 0; }
      if (trackPointer) {
        window.addEventListener("pointermove", point, { passive: true });
        document.addEventListener("pointerleave", center);
        window.addEventListener("blur", center);
      }

      let inView = true;
      const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
      observer.observe(element);
      const resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      });
      resize.observe(element);

      const pressedScale = new T.Vector3();
      const neutralEyes = new T.Color(0x68efff);
      const concernEyes = new T.Color(0xffb869);
      let nextBlink = 0;
      renderer.setAnimationLoop((ms) => {
        if (!inView || document.hidden) return;
        const time = ms / 1000;
        const { motion: pose, held: pressed, paused: staticPose, since } = animation.current;
        const elapsed = Math.max(0, (performance.now() - since) / 1000);
        const reduced = staticPose || motion.matches;
        const sleeping = pose === "sleep";
        const thinking = pose === "think";
        const celebrating = pose === "celebrate" || pose === "proud" || pose === "levelup";
        const smiling = pose === "happy" || celebrating;
        const waving = pose === "wave";
        const pointing = pose === "point";
        const dragging = pose === "drag";
        const dizzy = pose === "shake";
        const idle = pose === "idle" || pose === "look";
        const wobble = dizzy && !reduced ? Math.sin(elapsed * 12) : 0;
        const follow = (idle || pointing) && trackPointer;
        const gaze = follow ? target.x * 0.14 : wobble * 0.20;
        const pitch = follow ? target.y * 0.14 : 0;
        head.rotation.y += ((reduced ? 0 : gaze) - head.rotation.y) * 0.2;
        head.rotation.x += ((reduced ? 0 : pitch) - head.rotation.x) * 0.2;
        head.rotation.z = reduced ? 0 : wobble * 0.23 + (thinking ? Math.PI / 36 : 0);
        const pixelUnit = 2 * camera.position.z * Math.tan(Math.PI * camera.fov / 360) / Math.max(1, element!.clientHeight);
        robot.position.y = idle && !reduced ? Math.sin(time * 2 * Math.PI / 3.2) * 4 * pixelUnit : 0;
        const settling = pose === "dock" && !reduced ? 0.06 * Math.sin(Math.PI * Math.min(1, elapsed / .2)) : 0;
        const scale = pressed ? 0.94 : element!.closest("button")?.matches(":hover") && idle ? 1.06 : 1;
        robot.scale.lerp(pressedScale.setScalar(scale + settling), 0.2);
        if (nextBlink === 0 || time > nextBlink + .12) nextBlink = time + 4 + Math.random() * 3;
        const blink = dragging || dizzy || sleeping || (!reduced && idle && time >= nextBlink) ? .09 : 1;
        cyan.opacity = pose === "talk" || thinking ? .85 + .15 * Math.sin(elapsed * 7) : 1;
        cyan.color.copy(pose === "concern" ? concernEyes : neutralEyes);
        eyes.forEach((eye, index) => {
          const angle = elapsed * 5 + index * Math.PI;
          eye.position.x = (index ? .30 : -.30) + (!reduced && thinking ? .055 * Math.cos(angle) : 0);
          eye.position.y = -.12 + (!reduced && thinking ? .05 * Math.sin(angle) : 0);
          eye.scale.set(smiling ? .098 : .064, .111 * blink * (smiling ? .36 : 1), .035);
          eye.rotation.z = !reduced && smiling ? (index ? -.45 : .45) : 0;
        });
        fins.forEach((fin, index) => {
          const side = index ? 1 : -1;
          const flap = !reduced && dragging ? Math.sin(time * 10 * Math.PI) : 0;
          const raises = !reduced && (smiling || (waving && index === 1) || (pointing && index === 1));
          const wave = raises && waving ? Math.sin(elapsed * 2 * Math.PI * (2 / .9)) : 0;
          fin.position.y = raises ? (pointing && index === 1 ? -.48 : -.25) : -.62 + flap * .11;
          fin.rotation.z = side * (pointing && index === 1 ? -.16 : raises ? -1.08 + wave * .44 : .67 + flap * .56);
        });
        const speaking = pose === "talk";
        smile.visible = !speaking;
        expression.scale.y = sleeping ? .2 : smiling ? 1.35 : 1;
        mouth.visible = speaking;
        mouth.scale.y = reduced ? .045 : .032 + .022 * Math.sin(elapsed * 13);
        renderer.render(scene, camera);
      });
      const lost = (event: Event) => { event.preventDefault(); element.dataset.rendering = "image"; };
      const restored = () => { element.dataset.rendering = "3d"; };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      renderer.domElement.addEventListener("webglcontextrestored", restored);
      restored();
      cleanup = () => {
        resize.disconnect();
        observer.disconnect();
        window.removeEventListener("pointermove", point);
        document.removeEventListener("pointerleave", center);
        window.removeEventListener("blur", center);
        renderer.setAnimationLoop(null);
        sphere.dispose();
        smileGeometry.dispose();
        [shell, visor, cyan, purple].forEach((material) => material.dispose());
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      };
    }).catch(() => {});
    return () => { disposed = true; cleanup?.(); };
  }, [trackPointer]);

  const dragging = motion === "drag";
  const dizzy = motion === "shake";
  const sleeping = motion === "sleep";
  const waving = motion === "wave";
  const happy = motion === "happy" || motion === "celebrate" || motion === "proud" || motion === "levelup";
  const pointing = motion === "point";

  return (
    <span ref={host} className="sb-scholly-model" aria-hidden="true">
      <span className="sb-scholly-portrait" data-dragging={dragging || undefined} data-dizzy={dizzy || undefined} data-arms={dragging || waving || happy || pointing || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/scholly.webp" alt="" draggable={false} />
        {(dragging || waving || happy || pointing) && <>
          <span className="sb-scholly-portrait-arm sb-scholly-portrait-arm-left" />
          <span className="sb-scholly-portrait-arm sb-scholly-portrait-arm-right" />
        </>}
        {dizzy && <span className="sb-scholly-dizzy-head" />}
        <svg className="sb-scholly-lids sb-scholly-expression" viewBox="0 0 221 250">
          {(dragging || dizzy || sleeping || happy || motion === "idle" || motion === "think" || motion === "talk") &&
            <g data-eyes={sleeping || dizzy || dragging ? "closed" : happy ? "happy" : motion}>
              <ellipse cx="91" cy="103" rx="14" ry="19" fill="#131f3f" />
              <ellipse cx="166" cy="99" rx="14" ry="19" fill="#122044" />
              {happy
                ? <path d="M84 104l7-7 7 7m61-4l7-7 7 7" stroke="#68efff" strokeWidth="3" fill="none" />
                : motion === "think" || motion === "talk"
                  ? <g fill="#68efff"><circle cx="91" cy="103" r="5" /><circle cx="166" cy="99" r="5" /></g>
                  : <path d="M85 103q6 4 12 0m63-4q6 4 12 0" stroke="#68efff" strokeWidth="3" strokeLinecap="round" fill="none" />}
            </g>}
          {(motion === "talk" || happy || sleeping) && <>
            <ellipse cx="132" cy="115" rx="20" ry="11" fill="#101b36" />
            {happy ? <path d="M119 112q13 17 26 0" stroke="#68efff" strokeWidth="3" fill="none" /> :
              <ellipse data-scholly-mouth cx="132" cy="115" rx={sleeping ? 4 : 8} ry={sleeping ? 3 : 5} fill="#68efff" />}
          </>}
        </svg>
      </span>
    </span>
  );
}
