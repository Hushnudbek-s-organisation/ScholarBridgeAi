"use client";

import React, { useEffect, useState } from "react";

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

/**
 * Lightweight confetti burst — pure CSS, no canvas, no extra dependency.
 * Respects prefers-reduced-motion: renders nothing when the user asks for
 * reduced motion. Used for streak milestones and level-ups.
 */
export function Confetti({ active, duration = 2200 }: ConfettiProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading media query result is the point of this effect
    setReduceMotion(m.matches);
    const handler = () => setReduceMotion(m.matches);
    m.addEventListener("change", handler);
    return () => m.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!active || reduceMotion) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- activating celebratory burst on milestone is the point
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), duration);
    return () => window.clearTimeout(t);
  }, [active, duration, reduceMotion]);

  if (!visible || reduceMotion) return null;

  const pieces = Array.from({ length: 18 }, (_, i) => i);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const left = 10 + (i * 73) % 80;
        const delay = (i * 67) % 400;
        const colors = ["bg-indigo-500", "bg-amber-400", "bg-emerald-400", "bg-rose-400", "bg-sky-400"];
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className={`absolute top-0 h-2 w-1 rounded-full opacity-80 ${color}`}
            style={{
              left: `${left}%`,
              animation: `sb-confetti-fall 1.8s ease-in ${delay}ms forwards`,
            }}
          />
        );
      })}
      <style>{`@keyframes sb-confetti-fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(120px) rotate(720deg); opacity: 0; } }`}</style>
    </div>
  );
}
