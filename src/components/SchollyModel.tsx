"use client";

import { COMPANION_PAINT } from "@/lib/companion-paint";
import { scheduleWhenIdle } from "@/lib/idle";
import { useEffect, useRef } from "react";
import type * as Three from "three";
import type { SchollyMotion } from "./useSchollyMotion";

export function SchollyModel({ trackPointer = false, held = false, paused = false, motion = "idle", staticPreview = false, studio = false, floating = false, angle = 0, speechLevel }: {
  trackPointer?: boolean;
  held?: boolean;
  paused?: boolean;
  motion?: SchollyMotion;
  staticPreview?: boolean;
  studio?: boolean;
  floating?: boolean;
  angle?: number;
  speechLevel?: number;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const behavior = useRef({ trackPointer, speechLevel });
  useEffect(() => { behavior.current = { trackPointer, speechLevel }; }, [trackPointer, speechLevel]);
  const facing = useRef(angle);
  useEffect(() => { facing.current = angle; }, [angle]);
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
    if (!element || staticPreview) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function mount(element: HTMLSpanElement) {
      const T = await import("three");
      if (disposed) return;
      let renderer: Three.WebGLRenderer;
      try {
        renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: floating ? "low-power" : "default" });
      } catch {
        return;
      }

      const scene = new T.Scene();
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      const camera = new T.PerspectiveCamera(29, 1, 0.1, 30);
      const robot = new T.Group();
      const head = new T.Group();
      scene.add(robot);
      robot.add(head);
      head.position.y = 0.37;
      scene.add(new T.HemisphereLight(0xfffaf5, 0x637291, 1.08));
      const key = new T.DirectionalLight(0xfff4e6, 1.62);
      key.position.set(-3, 4, 4);
      scene.add(key);
      const rim = new T.DirectionalLight(0xa6caff, 2.2);
      rim.position.set(3, 0, -2);
      scene.add(rim);
      const fill = new T.DirectionalLight(0xa6bfff, .55);
      fill.position.set(-3, -1, 3);
      scene.add(fill);

      const sphere = new T.SphereGeometry(1, 48, 32);
      const shell = new T.MeshPhysicalMaterial({ color: 0x1846c0, roughness: 0.13, metalness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
      const visor = new T.MeshPhysicalMaterial({ color: 0x080f2e, roughness: 0.23, clearcoat: .6, clearcoatRoughness: 0.26 });
      const cyan = new T.MeshBasicMaterial({ color: 0x68efff, transparent: true, toneMapped: false });
      const mouthColor = cyan.clone();
      const trim = new T.MeshBasicMaterial({ color: COMPANION_PAINT.cyanEye, toneMapped: false });
      const mitten = new T.MeshPhysicalMaterial({ color: 0x2cbaff, roughness: 0.16, clearcoat: 1 });
      function orb(parent: Three.Group, material: Three.Material, position: [number, number, number], scale: [number, number, number]) {
        const mesh = new T.Mesh(sphere, material);
        mesh.position.set(...position);
        mesh.scale.set(...scale);
        parent.add(mesh);
        return mesh;
      }

      orb(head, shell, [0, 0, 0], [0.97, 0.74, 0.61]);
      const visorRim = new T.MeshStandardMaterial({ color: 0x233a64, roughness: .36, metalness: .12 });
      orb(head, visorRim, [0, -.10, .285], [.852, .472, .441]);
      orb(head, visor, [0, -.10, .31], [.826, .448, .437]);
      const earGeometry = new T.TorusGeometry(0.155, 0.042, 10, 40);
      [-1, 1].forEach(side => {
        orb(head, shell, [side * .96, -.12, 0], [.17, .25, .21]);
        orb(head, visorRim, [side * .984, -.12, .153], [.153, .184, .103]);
        const ear = new T.Mesh(earGeometry, trim);
        ear.position.set(side * 1.01, -.12, .19);
        head.add(ear);
      });
      const eyes = [-1, 1].map((side) => orb(head, cyan, [side * 0.30, -0.12, 0.740], [0.064, 0.111, 0.035]));
      const smileCurve = new T.QuadraticBezierCurve3(new T.Vector3(-0.126, -0.26, 0.755), new T.Vector3(0, -0.365, 0.755), new T.Vector3(0.126, -0.26, 0.755));
      const smileGeometry = new T.TubeGeometry(smileCurve, 24, 0.014, 8);
      const smile = new T.Mesh(smileGeometry, mouthColor);
      const expression = new T.Group();
      expression.position.set(0, -0.29, 0.755);
      smile.position.set(0, 0.29, -0.755);
      expression.add(smile);
      head.add(expression);
      const mouth = orb(head, mouthColor, [0, -0.29, 0.756], [0.105, 0.045, 0.025]);
      orb(robot, shell, [0, -0.67, 0], [0.59, 0.42, 0.39]);
      const details: Three.BufferGeometry[] = [];
      const luminousLine = (points: [number, number, number][], radius = .012) => {
        const geometry = new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p))), 24, radius, 6, false);
        details.push(geometry);
        const mesh = new T.Mesh(geometry, trim);
        robot.add(mesh);
      };
      luminousLine([[-.29, -.55, .31], [-.34, -.7, .31], [-.29, -.86, .25]]);
      luminousLine([[.29, -.55, .31], [.34, -.7, .31], [.29, -.86, .25]]);
      // Small graduation cap on the torso, matching Scholly's character sheet.
      luminousLine([[-.16, -.61, .397], [0, -.54, .404], [.16, -.61, .397], [0, -.69, .405], [-.16, -.61, .397]], .011);
      luminousLine([[-.09, -.67, .405], [-.09, -.72, .403], [0, -.76, .398], [.09, -.72, .403], [.09, -.67, .405]], .009);
      luminousLine([[.16, -.61, .397], [.16, -.73, .397]], .008);
      const fins = [-1, 1].map((side) => {
        const fin = orb(robot, mitten, [side * 0.78, -0.62, 0], [0.122, 0.25, 0.12]);
        fin.rotation.z = side * 0.67;
        return fin;
      });

      camera.position.set(0, studio ? .28 : .12, studio ? 5.65 : 5.25);
      camera.lookAt(0, .04, 0);
      orb(robot, visorRim, [0, -.68, .30], [.29, .21, .054]);
      const shoulder = new T.MeshStandardMaterial({ color: COMPANION_PAINT.nightEdge, roughness: .34 });
      for (const side of [-1, 1]) {
        orb(robot, shoulder, [side * .60, -.59, .03], [.107, .124, .11]);
        luminousLine([[side * .41, -.49, .29], [side * .47, -.59, .276], [side * .44, -.73, .255]], .01);
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute("aria-hidden", "true");
      element.appendChild(renderer.domElement);
      const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const target = { x: 0, y: 0 };
      const clamp = (value: number) => Math.min(1, Math.max(-1, value));
      function point(event: PointerEvent) {
        if (!behavior.current.trackPointer || event.pointerType !== "mouse" || motion.matches) return;
        const rect = element.getBoundingClientRect();
        target.x = clamp((event.clientX - rect.left - rect.width / 2) / 245);
        target.y = clamp((event.clientY - rect.top - rect.height / 2) / 245);
      }
      function center() { target.x = target.y = 0; }
      window.addEventListener("pointermove", point, { passive: true });
      document.addEventListener("pointerleave", center);
      window.addEventListener("blur", center);

      let inView = true;
      const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
      observer.observe(element);
      const resize = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      });
      resize.observe(element);

      const pressedScale = new T.Vector3();
      const neutralEyes = new T.Color(COMPANION_PAINT.cyanEye);
      const concernEyes = new T.Color(0xffb869);
      let nextBlink = 0;
      let lastFrame = -Infinity;
      function render(ms: number) {
        if (!inView || document.hidden || renderer.getContext().isContextLost()) return;
        if (floating && ms - lastFrame < 29) return;
        lastFrame = ms;
        const time = ms / 1000;
        const { motion: pose, held: pressed, paused: staticPose, since } = animation.current;
        const elapsed = Math.max(0, (performance.now() - since) / 1000);
        const reduced = staticPose || motion.matches;
        const sleeping = pose === "sleep";
        const thinking = pose === "think";
        const celebrating = pose === "celebrate" || pose === "proud" || pose === "levelup";
        const smiling = pose === "happy" || celebrating;
        const waving = pose === "wave";
        const concerned = pose === "concern";
        const pointing = pose === "point";
        const dragging = pose === "drag";
        const dizzy = pose === "shake";
        const idle = pose === "idle" || pose === "look";
        const wobble = dizzy && !reduced ? Math.sin(elapsed * 12) : 0;
        const follow = (idle || pointing) && behavior.current.trackPointer;
        const gaze = follow ? target.x * 0.14 : wobble * 0.20;
        const pitch = follow ? target.y * 0.14 : 0;
        head.rotation.y += ((reduced ? 0 : gaze) - head.rotation.y) * 0.2;
        head.rotation.x += ((reduced ? 0 : pitch) - head.rotation.x) * 0.2;
        head.rotation.z = reduced ? 0 : wobble * 0.23 + (thinking ? Math.PI / 36 : 0);
        const pixelUnit = 2 * camera.position.z * Math.tan(Math.PI * camera.fov / 360) / Math.max(1, element!.clientHeight);
        robot.position.y = idle && !reduced ? Math.sin(time * 2 * Math.PI / 3.2) * (studio ? .055 : 4 * pixelUnit) : 0;
        const change = facing.current - robot.rotation.y;
        robot.rotation.y += change * (motion.matches ? 1 : .16);
        robot.rotation.z = 0;
        const settling = pose === "dock" && !reduced ? 0.06 * Math.sin(Math.PI * Math.min(1, elapsed / .2)) : 0;
        const scale = pressed ? 0.94 : element!.closest("button")?.matches(":hover") && idle ? 1.06 : 1;
        robot.scale.lerp(pressedScale.setScalar(scale + settling), 0.2);
        if (nextBlink === 0 || time > nextBlink + .12) nextBlink = time + 4 + Math.random() * 3;
        const blink = dragging || dizzy || sleeping || (!reduced && idle && time >= nextBlink) ? .09 : 1;
        cyan.opacity = pose === "talk" || thinking ? .85 + .15 * Math.sin(elapsed * 7) : 1;
        cyan.color.copy(concerned ? concernEyes : neutralEyes);
        mouthColor.color.copy(cyan.color);
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
          const gentleWave = !reduced && concerned && index === 1 ? Math.sin(Math.PI * Math.min(1, elapsed / .8)) : 0;
          fin.position.y = raises ? (pointing && index === 1 ? -.48 : -.25) : -.62 + flap * .11 + gentleWave * .12;
          fin.rotation.z = side * (pointing && index === 1 ? -.16 : raises ? -1.08 + wave * .44 : .67 + flap * .56 - gentleWave * .5);
        });
        const speaking = pose === "talk";
        smile.visible = !speaking;
        expression.scale.y = sleeping ? .2 : smiling ? 1.35 : 1;
        mouth.visible = speaking;
        mouthColor.opacity = cyan.opacity;
        const volume = behavior.current.speechLevel;
        mouth.scale.y = reduced ? .045 : volume === undefined
          ? .032 + .022 * Math.sin(elapsed * 13)
          : .023 + .091 * Math.min(1, Math.max(0, volume));
        renderer.render(scene, camera);
        if (element.dataset.rendering !== "3d") element.dataset.rendering = "3d";
      }
      const lost = (event: Event) => { event.preventDefault(); element.dataset.rendering = "image"; };
      renderer.domElement.addEventListener("webglcontextlost", lost);
      cleanup = () => {
        resize.disconnect();
        observer.disconnect();
        window.removeEventListener("pointermove", point);
        document.removeEventListener("pointerleave", center);
        window.removeEventListener("blur", center);
        renderer.setAnimationLoop(null);
        sphere.dispose();
        smileGeometry.dispose();
        earGeometry.dispose();
        details.forEach(geometry => geometry.dispose());
        [shell, visor, visorRim, cyan, trim, mitten, mouthColor, shoulder].forEach((material) => material.dispose());
        renderer.domElement.removeEventListener("webglcontextlost", lost);
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
        delete element.dataset.rendering;
      };
      await renderer.compileAsync(scene, camera);
      if (!disposed) renderer.setAnimationLoop(render);
    }
    const start = () => { void mount(element).catch(() => { if (!disposed) cleanup?.(); }); };
    // Give the active page a chance to paint before the small launcher compiles
    // shaders. Its existing portrait already keeps the chat button usable.
    const cancelStart = floating ? scheduleWhenIdle(start, 1600, 600) : undefined;
    if (!floating) start();
    return () => { disposed = true; cancelStart?.(); cleanup?.(); };
  }, [staticPreview, studio, floating]);

  const moving = motion === "drag" || motion === "wave" || motion === "happy" || motion === "point";
  return (
    <span ref={host} className="sb-scholly-model" aria-hidden="true" data-companion="scholly" data-reference-look>
      <span className="sb-scholly-portrait" data-dragging={motion === "drag" || undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={moving ? "/scholly.webp" : "/scholly-front.webp"} alt="" draggable={false} />
      </span>
    </span>
  );
}
