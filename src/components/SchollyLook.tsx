import { useId, useSyncExternalStore, type CSSProperties } from "react";
import type { SchollyMotion } from "./useSchollyMotion";
import type { schollyPalette } from "@/lib/scholly-wardrobe";

const auraParticles: Record<string, { count: number; shape: string; colors: string[] }> = {
  stars: { count: 8, shape: "✦", colors: ["#FFFFFF", "#FFE9A8"] },
  snow: { count: 12, shape: "❄", colors: ["#FFFFFF", "#CFE8FF"] },
  nowruz: { count: 10, shape: "", colors: ["#FF7AA2", "#FFD166", "#7AE582"] },
};

const subscribeToDevice = () => () => {};
const browserLowPower = () => !navigator.hardwareConcurrency || navigator.hardwareConcurrency <= 4;

export function SchollyAura({ aura, eye, paused }: { aura?: string; eye: string; paused: boolean }) {
  const lowPower = useSyncExternalStore(subscribeToDevice, browserLowPower, () => true);
  if (!aura) return null;
  const particles = auraParticles[aura];
  const count = particles && !paused ? Math.ceil(particles.count / (lowPower ? 2 : 1)) : 0;
  return <span className="sb-scholly-aura" data-aura={aura} data-aura-paused={paused || undefined}
    style={{ "--scholly-aura-eye": eye } as CSSProperties} aria-hidden="true">
    {particles && Array.from({ length: count }, (_, index) => {
      const angle = index / count * Math.PI * 2;
      const x = 50 + Math.sin(angle) * 45;
      const y = 50 + Math.cos(angle) * 43;
      return <i key={index} style={{
        "--particle-x": `${x}%`, "--particle-y": `${y}%`, "--particle-color": particles.colors[index % particles.colors.length],
        "--particle-delay": `${index * -.56}s`, "--particle-duration": `${aura === "stars" ? 2.4 : 5 + index % 4}s`,
      } as CSSProperties}>{particles.shape}</i>;
    })}
  </span>;
}

export function SchollyRecoloredPortrait({ palette, body, motion }: {
  palette: ReturnType<typeof schollyPalette>;
  body?: string;
  motion: SchollyMotion;
}) {
  const id = useId();
  const rim = body === "night" ? "#7CC4FF80" : body === "silver" ? "#7B8AA8" : "none";
  return <svg className="sb-scholly-colored-portrait" data-portrait-motion={motion} viewBox="0 0 221 250" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-shell`} cx="30%" cy="18%" r="90%">
        <stop stopColor={palette.highlight} />
        <stop offset=".57" stopColor={palette.main} />
        <stop offset="1" stopColor={palette.shade} />
      </radialGradient>
      <linearGradient id={`${id}-visor`} x2="0" y2="1">
        <stop stopColor="#16224A" /><stop offset="1" stopColor="#0B1020" />
      </linearGradient>
    </defs>
    <ellipse cx="111" cy="223" rx="55" ry="10" fill="#000" opacity=".25" />
    <g fill={`url(#${id}-shell)`} stroke={rim} strokeWidth="2">
      <g className="sb-scholly-color-arm"><ellipse cx="51" cy="175" rx="13" ry="24" transform="rotate(31 51 175)" /></g>
      <g className="sb-scholly-color-arm sb-scholly-color-arm-right"><ellipse cx="167" cy="175" rx="13" ry="24" transform="rotate(-31 167 175)" /></g>
      <ellipse cx="110" cy="179" rx="44" ry="33" />
      <ellipse cx="110" cy="97" rx="82" ry="64" />
    </g>
    <ellipse cx="112" cy="108" rx="68" ry="40" fill={`url(#${id}-visor)`} />
    <path d="M58 93q14-18 51-20" fill="none" stroke="#fff" opacity=".12" strokeWidth="5" strokeLinecap="round" />
    <path d="M101 174h18" stroke="#B779FF" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}
