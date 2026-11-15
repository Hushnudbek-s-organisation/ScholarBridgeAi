"use client";

import { useEffect, useRef } from "react";

const size = 256;

const center = size / 2;
const rimRadius = size * .33; // The avatar shell occupies 66% of the stage.

const flameTips = [
  { x: 68, height: 26, lean: -9 },
  { x: 85, height: 41, lean: -10 },
  { x: 104, height: 44, lean: 3 },
  { x: 125, height: 33, lean: -6 },
  { x: 147, height: 43, lean: -4 },
  { x: 168, height: 41, lean: 4 },
  { x: 188, height: 27, lean: 9 },
];

function rise(elapsed: number, duration: number) {
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return progress * progress * (3 - 2 * progress);
}

function rimHeight(x: number) {
  return center - Math.sqrt(rimRadius ** 2 - (x - center) ** 2);
}

function flameShape(ctx: CanvasRenderingContext2D, x: number, rim: number, top: number, tip: number, width: number) {
  const base = rim + 11;
  const height = base - top;
  ctx.beginPath();
  ctx.moveTo(x - width, base);
  ctx.bezierCurveTo(x - width * 1.05, top + height * .62, tip + width * .35, top + height * .24, tip, top);
  ctx.bezierCurveTo(tip + width * .52, top + height * .08, tip + width * .78, top + height * .41, x + width * .67, top + height * .57);
  ctx.quadraticCurveTo(x + width * 1.04, top + height * .79, x + width, base);
  ctx.closePath();
  ctx.fill();
}

function fire(ctx: CanvasRenderingContext2D, time: number, still: boolean) {
  const intensity = still ? 1 : rise(time, .21);
  if (intensity === 0) return;
  ctx.globalAlpha = intensity;

  const glow = ctx.createRadialGradient(center, 55, 9, center, 55, 98);
  glow.addColorStop(0, "#ff581d67");
  glow.addColorStop(1, "#ff491400");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, 153);

  // A continuous hot rim connects the tongues across the round silhouette.
  const rimGlow = ctx.createLinearGradient(61, 0, 195, 0);
  rimGlow.addColorStop(0, "#ff532900");
  rimGlow.addColorStop(.26, "#ff692d");
  rimGlow.addColorStop(.7, "#ff8b39");
  rimGlow.addColorStop(1, "#ff532900");
  ctx.strokeStyle = rimGlow;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(center, center, rimRadius + 1.5, -2.39, -.75);
  ctx.stroke();

  const drift = Math.sin(time * 4) * 3;
  const flames = flameTips.map(({ x, height, lean }, index) => {
    const rim = rimHeight(x);
    const delay = Math.abs(x - center) * .0013;
    const lift = still ? 1 : rise(time - delay, .22);
    const sway = Math.sin(time * 6.4 - index * .84);
    const ripple = Math.sin(time * 10.1 + index * 1.9);
    const reach = (height + sway * 4.5 + ripple * 1.6) * lift;
    const tip = x + (lean + drift + sway * 5) * lift;
    return { x, rim, top: Math.max(5, rim + 3 - reach), tip, lift };
  });

  for (const { x, rim, top, tip, lift } of flames) {
    const outer = ctx.createLinearGradient(x, top, x, rim + 9);
    outer.addColorStop(0, "#ff6846");
    outer.addColorStop(.51, "#ff4b28");
    outer.addColorStop(1, "#ff7c28");
    ctx.fillStyle = outer;
    flameShape(ctx, x, rim, top, tip, 15 + lift * 2);
  }

  for (const { x, rim, top, tip } of flames) {
    const coreTop = top + (rim + 6 - top) * .48;
    const core = ctx.createLinearGradient(x, coreTop, x, rim + 4);
    core.addColorStop(0, "#ff962c");
    core.addColorStop(.64, "#ffc04a");
    core.addColorStop(1, "#fff3a1");
    ctx.fillStyle = core;
    flameShape(ctx, x, rim, coreTop, (x + tip) / 2, 8);
  }

  if (still) return;
  for (let index = 0; index < 6; index++) {
    const age = (time * (.7 + index * .023) + index / 6) % 1;
    const x = 88 + index * 16 + Math.sin(age * 3 + index) * 9 * age;
    const y = 42 - age * 34;
    ctx.globalAlpha = intensity * Math.sin(age * Math.PI) * .68;
    ctx.fillStyle = "#ffc267";
    ctx.beginPath();
    ctx.arc(x, y, 1.6 - age * .95, 0, Math.PI * 2);
    ctx.fill();
  }
}

type Point = [number, number];

function bolt(ctx: CanvasRenderingContext2D, from: Point, to: Point, seed: number, width: number, glow: number, branch = true) {
  const points: Point[] = [from];
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  for (let i = 1; i < 8; i++) {
    const step = i / 8;
    const variation = Math.sin(seed + i * 8.31) * Math.sin(i * 4.05 + seed) * .27;
    points.push([from[0] + dx * step + dy * variation, from[1] + dy * step - dx * variation]);
  }
  points.push(to);
  ctx.beginPath();
  ctx.moveTo(...from);
  for (const point of points.slice(1)) ctx.lineTo(...point);
  ctx.lineWidth = width * 4;
  ctx.strokeStyle = "#3c88ff55";
  ctx.shadowColor = "#567bff";
  ctx.shadowBlur = glow;
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = "#d9ffff";
  ctx.shadowColor = "#6af5ff";
  ctx.stroke();
  ctx.shadowBlur = 0;
  if (branch) {
    for (const [index, side] of [[3, -1], [5, 1]]) {
      const origin = points[index];
      bolt(ctx, origin, [origin[0] + dx * .28 + dy * side * .27, origin[1] + dy * .28 - dx * side * .27], seed + index * 3, width / 2, glow / 2, false);
    }
  }
}

const arcs: [Point, Point][] = [
  [[73, 60], [32, 19]], [[46, 106], [12, 81]], [[183, 63], [229, 22]],
  [[210, 106], [247, 83]], [[208, 154], [241, 168]], [[45, 159], [12, 181]],
];

function electricity(ctx: CanvasRenderingContext2D, time: number, still: boolean) {
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const beat = Math.floor(time * 3.5);
  arcs.forEach(([from, to], i) => {
    ctx.globalAlpha = still ? .8 : .43 + .38 * Math.sin(time * 6 + i * 1.7) ** 2;
    bolt(ctx, from, to, beat * 3.7 + i * 4.71, i % 2 === 0 ? 1.4 : 1, 13);
  });
}

export function SpeakingEffects({ effect, reduced, className }: {
  effect: "irritated" | "fast";
  reduced: boolean;
  className: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext("2d");
    if (!node || !ctx) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    node.width = node.height = size * ratio;
    ctx.scale(ratio, ratio);
    let request = 0;
    const started = performance.now();
    const draw = (now: number) => {
      const time = reduced ? .72 : (now - started) / 1000;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      if (effect === "irritated") fire(ctx, time, reduced);
      else electricity(ctx, time, reduced);
      ctx.restore();
      if (!reduced) request = requestAnimationFrame(draw);
    };
    draw(started);
    return () => cancelAnimationFrame(request);
  }, [effect, reduced]);

  return <canvas ref={canvas} className={className} aria-hidden="true" />;
}
