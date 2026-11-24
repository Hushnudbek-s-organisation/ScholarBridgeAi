"use client";

import { useEffect, useRef, type CSSProperties } from "react";

export function WhiteSpeakingOrb({ mouthOpen = 0, speaking = false, preview = false }: {
  mouthOpen?: number;
  speaking?: boolean;
  preview?: boolean;
}) {
  const host = useRef<HTMLSpanElement>(null);
  const pose = useRef({ mouthOpen, speaking });
  const draw = useRef<(() => void) | null>(null);

  useEffect(() => {
    pose.current = { mouthOpen, speaking };
    draw.current?.();
  }, [mouthOpen, speaking]);

  useEffect(() => {
    const element = host.current;
    if (!element || preview) return;
    const target = element;
    let disposed = false;
    let dispose: (() => void) | undefined;

    async function mount() {
      const T = await import("three");
      if (disposed) return;
      const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.setAttribute("aria-hidden", "true");

      const camera = new T.OrthographicCamera(-1.08, 1.08, 1.08, -1.08, 0.1, 10);
      camera.position.z = 4;
      const scene = new T.Scene();
      scene.add(new T.HemisphereLight(0xffffff, 0x9199af, 2.25));
      const lamp = new T.DirectionalLight(0xffffff, 1.35);
      lamp.position.set(-3, 5, 4);
      scene.add(lamp);
      const sphere = new T.SphereGeometry(1, 48, 32);
      const porcelain = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.64 });
      const graphite = new T.MeshBasicMaterial({ color: 0x252833 });
      scene.add(new T.Mesh(sphere, porcelain));

      for (const side of [-1, 1]) {
        const eye = new T.Mesh(sphere, graphite);
        eye.position.set(side * 0.23, 0.12, 0.97);
        eye.scale.set(0.047, 0.075, 0.028);
        scene.add(eye);
      }

      const smilePath = new T.QuadraticBezierCurve3(
        new T.Vector3(-0.127, -0.15, 0.985),
        new T.Vector3(0, -0.28, 0.99),
        new T.Vector3(0.127, -0.15, 0.985),
      );
      const smileGeometry = new T.TubeGeometry(smilePath, 24, 0.018, 8);
      const smile = new T.Mesh(smileGeometry, graphite);
      scene.add(smile);
      const mouth = new T.Mesh(sphere, graphite);
      mouth.position.set(0, -0.19, 0.99);
      scene.add(mouth);

      const render = () => {
        if (renderer.getContext().isContextLost()) return;
        const { mouthOpen, speaking } = pose.current;
        smile.visible = !speaking;
        mouth.visible = speaking;
        mouth.scale.set(0.13 - 0.035 * mouthOpen, 0.022 + 0.083 * mouthOpen, 0.025);
        renderer.render(scene, camera);
      };
      const resize = new ResizeObserver(([entry]) => {
        const edge = entry.contentRect.width;
        if (!edge || renderer.getContext().isContextLost()) return;
        renderer.setSize(edge, edge, false);
        render();
        target.dataset.rendering = "3d";
      });
      const contextLost = (event: Event) => {
        event.preventDefault();
        delete target.dataset.rendering;
      };
      const contextRestored = () => {
        if (!target.clientWidth) return;
        render();
        target.dataset.rendering = "3d";
      };
      renderer.domElement.addEventListener("webglcontextlost", contextLost);
      renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
      target.appendChild(renderer.domElement);
      draw.current = render;
      resize.observe(target);
      dispose = () => {
        draw.current = null;
        resize.disconnect();
        renderer.domElement.removeEventListener("webglcontextlost", contextLost);
        renderer.domElement.removeEventListener("webglcontextrestored", contextRestored);
        renderer.domElement.remove();
        renderer.dispose();
        renderer.forceContextLoss();
        sphere.dispose();
        smileGeometry.dispose();
        porcelain.dispose();
        graphite.dispose();
        delete target.dataset.rendering;
      };
    }

    void mount().catch(() => dispose?.());
    return () => {
      disposed = true;
      dispose?.();
    };
  }, [preview]);

  return (
    <span ref={host} className="sb-speaking-orb" data-speaking-orb aria-hidden="true">
      <span className="sb-speaking-face-shell">
        <span className="sb-speaking-face-eye" data-eye="left" />
        <span className="sb-speaking-face-eye" data-eye="right" />
        <span className="sb-speaking-face-mouth" data-speaking={speaking || undefined}
          style={{ "--sb-mouth-level": mouthOpen } as CSSProperties} />
      </span>
    </span>
  );
}
