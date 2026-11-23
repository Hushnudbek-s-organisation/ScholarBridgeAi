"use client";

import { useEffect, useRef } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STUDY_COLORS, STUDY_GROUPS, type StudyEdge, type StudyNode } from "@/lib/study-map";

export type GraphCommand = { action: "reset" | "zoom-in" | "zoom-out" | "rotate" | "focus"; id?: string };
type Target = { position: T.Vector3; size: number; color: string; label: string; id: string; category: boolean };
type Props = {
  nodes: StudyNode[];
  edges: StudyEdge[];
  groupLabels: readonly string[];
  selected: string;
  labels: boolean;
  command: GraphCommand | null;
  onSelect: (id: string) => void;
  onUnavailable: () => void;
};
const homeCamera = [0, .8, 26] as const;
const slots = [
  [-6.7, 3.35, -1.2], [0, 4.15, 1.3], [6.7, 3.35, -.8],
  [6.6, -2.7, 1.7], [-.1, -3.5, -1.0], [-6.6, -2.7, 1.7],
] as const;

function locate(nodes: StudyNode[], labels: readonly string[]) {
  return STUDY_GROUPS.flatMap((group, index): Target[] => {
    const children = nodes.filter(node => node.group === group);
    if (!children.length) return [];
    const center = new T.Vector3(...slots[index]);
    const color = STUDY_COLORS[index];
    return [
      { position: center, size: .205, color, label: labels[index], id: `group:${group}`, category: true },
      ...children.map((node, i) => {
        const azimuth = i * 2.3999632297;
        const vertical = 1 - (i + .5) * 2 / children.length;
        const radius = .75 + Math.min(1.66, Math.sqrt(children.length) * .14) * (.42 + (i % 7) / 11);
        const flat = radius * Math.sqrt(1 - vertical ** 2);
        return { position: center.clone().add(new T.Vector3(Math.cos(azimuth) * flat, vertical * radius, Math.sin(azimuth) * flat)),
          size: .065 + (i % 4) * .012, color, label: node.title, id: node.id, category: false };
      }),
    ];
  });
}

function glowTexture() {
  const image = document.createElement("canvas");
  image.width = image.height = 64;
  const context = image.getContext("2d")!;
  const glow = context.createRadialGradient(32, 32, 1, 32, 32, 32);
  glow.addColorStop(0, "#fff");
  glow.addColorStop(.22, "#fff9");
  glow.addColorStop(.53, "#fff2");
  glow.addColorStop(1, "#fff0");
  context.fillStyle = glow;
  context.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(image);
}

function createScene(host: HTMLDivElement, labelLayer: HTMLDivElement, onPick: (id: string) => void) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.prepend(renderer.domElement);
  const camera = new T.PerspectiveCamera(46, 1, .1, 140);
  camera.position.set(...homeCamera);
  const scene = new T.Scene();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  controls.dampingFactor = .13;
  controls.minDistance = 3.5;
  controls.maxDistance = 60;
  const geometry = new T.SphereGeometry(1, 12, 8);
  const material = new T.MeshBasicMaterial();
  const ray = new T.Raycaster();
  const cursor = new T.Vector2();
  const projected = new T.Vector3();
  const transform = new T.Matrix4();
  const color = new T.Color();
  const glow = glowTexture();
  let dots: T.InstancedMesh | null = null;
  let targets: Target[] = [];
  let selection = "";
  let showLabels = true;
  let dirty = true;
  let onScreen = true;
  let width = 1;
  let height = 1;
  let pointer: { id: number; x: number; y: number } | null = null;
  let clearData = () => {};
  let labelItems: { element: HTMLButtonElement; target: Target }[] = [];
  const targetPosition = new Map<string, T.Vector3>();
  const labelElements = new Map<string, HTMLButtonElement>();
  const highlights = new T.Sprite(new T.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true, opacity: .88, depthTest: false, depthWrite: false }));
  highlights.visible = false;
  highlights.scale.setScalar(.83);
  scene.add(highlights);

  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.fov = Math.max(46, Math.min(98, T.MathUtils.radToDeg(2 * Math.atan(Math.tan(T.MathUtils.degToRad(23)) / camera.aspect))));
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    dirty = true;
  }
  const size = new ResizeObserver(resize);
  size.observe(host);
  resize();
  const visibility = new IntersectionObserver(entries => { onScreen = entries[0]?.isIntersecting ?? true; dirty = true; });
  visibility.observe(host);
  controls.addEventListener("change", () => { dirty = true; });

  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary) { pointer = null; return; }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }
  function pointerUp(event: PointerEvent) {
    const start = pointer;
    pointer = null;
    if (!dots || start?.id !== event.pointerId || Math.hypot(start.x - event.clientX, start.y - event.clientY) > 5) return;
    const box = renderer.domElement.getBoundingClientRect();
    cursor.set((event.clientX - box.left) / width * 2 - 1, 1 - (event.clientY - box.top) / height * 2);
    ray.setFromCamera(cursor, camera);
    const hit = ray.intersectObject(dots)[0]?.instanceId;
    if (hit !== undefined && targets[hit]) onPick(targets[hit].id);
  }
  renderer.domElement.addEventListener("pointerdown", pointerDown);
  renderer.domElement.addEventListener("pointerup", pointerUp);

  function select(id: string, labels: boolean) {
    selection = id;
    showLabels = labels;
    const position = targetPosition.get(id);
    highlights.visible = Boolean(position);
    if (position) highlights.position.copy(position);
    for (const [key, button] of labelElements) button.setAttribute("aria-pressed", String(key === id));
    dirty = true;
  }

  function update(nodes: StudyNode[], edges: StudyEdge[], labels: readonly string[]) {
    clearData();
    targets = locate(nodes, labels);
    targetPosition.clear();
    labelElements.clear();
    labelLayer.replaceChildren();
    const graph = new T.Group();
    const spheres = new T.InstancedMesh(geometry, material, targets.length);
    spheres.frustumCulled = false;
    dots = spheres;
    const categoryGlows = new Map<string, T.SpriteMaterial>();
    const indexed = new Map(targets.map((target, index) => [target.id, index]));
    targets.forEach((target, index) => {
      const { position, size, id, category } = target;
      targetPosition.set(id, position);
      transform.makeScale(size, size, size).setPosition(position);
      spheres.setMatrixAt(index, transform);
      spheres.setColorAt(index, color.set(target.color));
      if (category) {
        const halo = new T.SpriteMaterial({ map: glow, color: target.color, opacity: .60, transparent: true, depthWrite: false });
        categoryGlows.set(id, halo);
        const sprite = new T.Sprite(halo);
        sprite.position.copy(position);
        sprite.scale.setScalar(1.16);
        graph.add(sprite);
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = category ? "sb-study-label sb-study-label-group" : "sb-study-label";
      button.textContent = target.label;
      button.style.setProperty("--node-color", target.color);
      button.dataset.node = id;
      button.onclick = () => onPick(id);
      labelElements.set(id, button);
      labelLayer.append(button);
    });
    spheres.instanceMatrix.needsUpdate = true;
    if (spheres.instanceColor) spheres.instanceColor.needsUpdate = true;
    spheres.computeBoundingSphere();
    graph.add(spheres);
    labelItems = targets.map(target => ({ target, element: labelElements.get(target.id)! }))
      .sort((a, b) => Number(b.target.category) - Number(a.target.category));

    const spokes: number[] = [];
    const spokeColors: number[] = [];
    const bindings: number[] = [];
    const addBinding = (from: string, to: string, points: number[]) => {
      const a = targetPosition.get(from);
      const b = targetPosition.get(to);
      if (a && b) points.push(...a.toArray(), ...b.toArray());
    };
    for (const node of nodes) {
      const index = indexed.get(node.id);
      if (index === undefined) continue;
      const a = targetPosition.get(`group:${node.group}`)!;
      const to = targets[index];
      spokes.push(...a.toArray(), ...to.position.toArray());
      color.set(to.color);
      spokeColors.push(...color.toArray(), ...color.toArray());
    }
    for (const edge of edges) addBinding(edge.from, edge.to, bindings);
    const spokeGeometry = new T.BufferGeometry();
    spokeGeometry.setAttribute("position", new T.Float32BufferAttribute(spokes, 3));
    spokeGeometry.setAttribute("color", new T.Float32BufferAttribute(spokeColors, 3));
    const spokeMaterial = new T.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .24, depthWrite: false });
    graph.add(new T.LineSegments(spokeGeometry, spokeMaterial));
    const bindingGeometry = new T.BufferGeometry();
    bindingGeometry.setAttribute("position", new T.Float32BufferAttribute(bindings, 3));
    const bindingMaterial = new T.LineBasicMaterial({ color: 0x99b6e6, transparent: true, opacity: .41, depthWrite: false });
    graph.add(new T.LineSegments(bindingGeometry, bindingMaterial));
    scene.add(graph);
    clearData = () => {
      scene.remove(graph);
      spheres.dispose();
      spokeGeometry.dispose(); bindingGeometry.dispose();
      spokeMaterial.dispose(); bindingMaterial.dispose();
      for (const halo of categoryGlows.values()) halo.dispose();
    };
    select(selection, showLabels);
  }

  function run(command: GraphCommand) {
    const offset = camera.position.clone().sub(controls.target);
    if (command.action === "reset") {
      camera.position.set(...homeCamera);
      controls.target.set(0, 0, 0);
    } else if (command.action === "focus") {
      const target = command.id && targetPosition.get(command.id);
      if (!target) return;
      controls.target.copy(target);
      camera.position.copy(target).add(offset.setLength(Math.min(11, offset.length())));
    } else if (command.action === "rotate") {
      camera.position.copy(controls.target).add(offset.applyAxisAngle(new T.Vector3(0, 1, 0), .33));
    } else {
      const value = offset.length() * (command.action === "zoom-in" ? .82 : 1.22);
      camera.position.copy(controls.target).add(offset.setLength(T.MathUtils.clamp(value, controls.minDistance, controls.maxDistance)));
    }
    controls.update();
    dirty = true;
  }

  renderer.setAnimationLoop(() => {
    if (document.hidden || !onScreen || renderer.getContext().isContextLost()) return;
    controls.update();
    if (!dirty) return;
    dirty = false;
    renderer.render(scene, camera);
    const close = camera.position.distanceTo(controls.target) < 13;
    const occupied = new Set<string>();
    const positionLabel = ({ target, element }: typeof labelItems[number], forced = false) => {
      projected.copy(target.position).project(camera);
      const display = forced || showLabels && (target.category || close);
      const inside = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < .95 && Math.abs(projected.y) < .90;
      const x = Math.round((projected.x + 1) * width / 2);
      const y = Math.round((1 - projected.y) * height / 2 + (target.category ? 14 : 8));
      const row = Math.floor(y / 24);
      const radius = Math.min(88, target.label.length * 3.5 + 6);
      const left = Math.floor((x - radius) / 26);
      const right = Math.floor((x + radius) / 26);
      const cells = Array.from({ length: right - left + 1 }, (_, i) => `${row}:${left + i}`);
      element.hidden = !display || !inside || (!forced && !target.category && cells.some(cell => occupied.has(cell)));
      if (!element.hidden) {
        cells.forEach(cell => occupied.add(cell));
        element.style.transform = `translate(${x}px,${y}px) translateX(-50%)`;
      }
    };
    const active = labelItems.find(({ target }) => target.id === selection);
    if (active) positionLabel(active, true);
    for (const item of labelItems) if (item !== active) positionLabel(item);
  });
  return {
    update, select, run,
    dispose() {
      renderer.setAnimationLoop(null);
      visibility.disconnect();
      size.disconnect();
      controls.dispose();
      clearData();
      highlights.material.dispose();
      glow.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelLayer.replaceChildren();
    },
  };
}

export function StudyGraph3D({ nodes, edges, groupLabels, selected, labels, command, onSelect, onUnavailable }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const textLayer = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  const handlers = useRef({ onSelect, onUnavailable });
  useEffect(() => { handlers.current = { onSelect, onUnavailable }; }, [onSelect, onUnavailable]);

  useEffect(() => {
    if (!host.current || !textLayer.current) return;
    let instance: ReturnType<typeof createScene>;
    try {
      instance = createScene(host.current, textLayer.current, id => handlers.current.onSelect(id));
    } catch {
      handlers.current.onUnavailable();
      return;
    }
    const element = host.current;
    element.dataset.webgl = "ready";
    scene.current = instance;
    const canvas = element.querySelector("canvas");
    const lost = () => handlers.current.onUnavailable();
    canvas?.addEventListener("webglcontextlost", lost);
    return () => {
      delete element.dataset.webgl;
      canvas?.removeEventListener("webglcontextlost", lost);
      instance.dispose();
      scene.current = null;
    };
  }, []);
  useEffect(() => { scene.current?.update(nodes, edges, groupLabels); }, [nodes, edges, groupLabels]);
  useEffect(() => { scene.current?.select(selected, labels); }, [selected, labels]);
  useEffect(() => { if (command) scene.current?.run(command); }, [command]);

  return <div ref={host} className="sb-study-3d"><div ref={textLayer} className="sb-study-labels" /></div>;
}
