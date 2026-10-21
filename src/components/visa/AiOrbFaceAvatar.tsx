"use client";

/**
 * AiOrbFaceAvatar — the circular AI Face Orb that fronts the visa interview
 * studio.
 *
 * It replaces the previous anthropomorphic officer portrait. That one drew a
 * human head with hair, a blazer, a tie and a nose, which made two claims the
 * product cannot honestly make: that the interviewer is a specific person, and
 * that the role has a gender. An orb is the honest shape — it presents a voice
 * and a state, and nothing about a body.
 *
 * The face is intentionally minimal, matching the supplied reference: one
 * solid-white circular face, two black oval eyes, and a small black mouth. No
 * colored rim, gradients, eye highlights, or tongue. It is one 220×220 SVG so
 * the silhouette stays circular at every size.
 *
 * The eyes blink and shift gaze with the interview state. The mouth lip-syncs:
 * `level` drives it when the browser exposes amplitude; otherwise
 * `useSpeechOscillator` supplies a syllable-rate cadence. State color belongs to
 * the surrounding waveform/status UI, not the face itself. Fixed SVG fills keep
 * the face white and features black in both light and dark themes.
 */

import React, { useEffect, useState, useSyncExternalStore } from "react";

export type AiOrbFaceState = "LISTENING" | "THINKING" | "SPEAKING" | "IDLE";

// ---------------------------------------------------------------------------
// Motion primitives
// ---------------------------------------------------------------------------

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Read `prefers-reduced-motion` as an external store rather than mirroring it
 * into state. A media query is exactly what `useSyncExternalStore` is for: the
 * mirrored version had to write state from inside the effect body, which React
 * runs synchronously after mount and which cascades a second render for a value
 * that was already correct on the first paint.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(REDUCED_MOTION_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(REDUCED_MOTION_QUERY).matches
        : false,
    // Server render: motion is fine, the loop simply never starts.
    () => false
  );
}

/**
 * Syllabic mouth level for voices we cannot measure.
 *
 * `window.speechSynthesis` exposes no amplitude at all, so a live analyser
 * reading is unavailable and `level` stays 0 for the entire sentence. This
 * produces a 6.5 Hz carrier (roughly syllable rate) shaped by a slower envelope
 * and a phrase-length gate, which reads as speech rather than as a metronome.
 * A `requestAnimationFrame` loop, so it lands at the display's 60fps.
 */
function useSpeechOscillator(active: boolean, enabled: boolean): number {
  const [value, setValue] = useState(0);
  const running = active && enabled;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const syllable = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 6.5);
      const envelope = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.3 + 0.9);
      const gate = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 1.15 + 2.1);
      setValue(Math.max(0, Math.min(1, syllable * (0.35 + 0.65 * envelope) * gate)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  // The idle value is derived, not written: resetting it from the effect would
  // cascade a render every time the orb stopped talking.
  return running ? value : 0;
}

/** Blink state: periodic, restarted by a state change so it blinks on the turn. */
function useBlink(state: AiOrbFaceState, reduced: boolean): boolean {
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (reduced) return;
    let close = 0;
    let next = 0;
    const loop = () => {
      setBlink(true);
      close = window.setTimeout(() => setBlink(false), 150);
      next = window.setTimeout(loop, 3500);
    };
    // One loop, restarted by `state`: the first blink lands right away so the
    // orb blinks on the turn changing, then settles into the 3.5s rhythm. Both
    // writes happen inside a timer callback; setting them inline in the effect
    // body would cascade a render on every state change.
    next = window.setTimeout(loop, 0);
    return () => {
      window.clearTimeout(close);
      window.clearTimeout(next);
    };
  }, [state, reduced]);
  return blink;
}

// ---------------------------------------------------------------------------
// Palettes
// ---------------------------------------------------------------------------

/**
 * Equalizer bars. Accent families, never slate: a `dark:bg-slate-*` utility
 * resolves to the INVERTED (light) slate token in this theme, which
 * scripts/dark-audit.mjs flags as an unreadable fill.
 */
const WAVE_TONE: Record<AiOrbFaceState, string> = {
  IDLE: "bg-indigo-400/45 dark:bg-indigo-300/35",
  SPEAKING: "bg-indigo-600 dark:bg-cyan-400",
  LISTENING: "bg-emerald-500 dark:bg-emerald-400",
  THINKING: "bg-violet-500 dark:bg-violet-400",
};

const PILL_RING: Record<AiOrbFaceState, string> = {
  IDLE: "border-indigo-400/50",
  SPEAKING: "border-blue-500/70",
  LISTENING: "border-emerald-500/60",
  THINKING: "border-indigo-500/60",
};

// ---------------------------------------------------------------------------
// Equalizer
// ---------------------------------------------------------------------------

/** 28-bar equalizer. Sapphire while the orb talks, emerald while you do. */
export function HudWave({
  level,
  state,
  bars = 28,
}: {
  level: number;
  state: AiOrbFaceState;
  bars?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const speaking = state === "SPEAKING";
  const listening = state === "LISTENING";
  const idle = !speaking && !listening;
  const pulse = idle ? 0.05 : Math.max(0.06, Math.min(1, level));
  const tone = WAVE_TONE[state];

  return (
    <div className="flex h-14 items-center justify-center gap-1" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => {
        // Symmetric bell so the tallest bars sit in the middle.
        const center = Math.sin((i / (bars - 1)) * Math.PI);
        const height = 6 + pulse * 48 * (0.25 + center * 0.75);
        return (
          <span
            key={i}
            className={`w-1 rounded-full ${tone} ${reduced ? "" : "transition-all duration-75"}`}
            style={{
              height: `${height}px`,
              opacity: idle ? 0.35 : 0.55 + center * 0.45,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The orb
// ---------------------------------------------------------------------------

export interface AiOrbFaceAvatarProps {
  state: AiOrbFaceState;
  /** 0–1 amplitude from the audio analyser (or mic) for the current turn. */
  level: number;
  /** Localized status pill copy, so this component stays translation-free. */
  statusLabel: string;
  roleLabel: string;
  /** Optional country context: a small flag badge on the rim. */
  countryFlag?: string;
  countryName?: string;
}

export function AiOrbFaceAvatar({
  state,
  level,
  statusLabel,
  roleLabel,
  countryFlag,
  countryName,
}: AiOrbFaceAvatarProps) {
  const reduced = usePrefersReducedMotion();
  const blink = useBlink(state, reduced);
  const speaking = state === "SPEAKING";
  const listening = state === "LISTENING";
  const thinking = state === "THINKING";

  // Real amplitude when the browser gives us one; a syllable-rate oscillator
  // when the voice is `speechSynthesis`, which exposes none.
  const oscillator = useSpeechOscillator(speaking, level < 0.02);
  const measured = speaking ? Math.min(1, Math.max(0, level) * 1.4) : 0;
  const driven = speaking ? Math.max(0.12, measured || oscillator) : 0;
  // Without motion the mouth still moves — a frozen open mouth reads as broken —
  // it just does so calmly.
  const mouthOpen = reduced && speaking ? 0.45 : driven;

  const mouthH = 7 + mouthOpen * 17; // 7 → 24
  const mouthW = 36 + mouthOpen * 6; // 36 → 42

  // Where the gaze sits. Thinking looks up and to the side; listening drops a
  // touch, which reads as attention rather than as a stare.
  const gaze = thinking ? { x: 3, y: -2.5 } : listening ? { x: 0, y: 1 } : { x: 0, y: 0 };

  /**
   * scaleY(0.08) about each eye's own centre, composed AFTER the gaze shift so
   * the lid closes on the eye wherever it happens to be looking.
   */
  const eyeTransform = (cx: number) =>
    `translate(${gaze.x} ${gaze.y}) translate(${cx} 101) scale(1 ${blink ? 0.08 : 1}) translate(${-cx} -101)`;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative flex h-[248px] w-[248px] items-center justify-center">
        {/* Minimal white face, matching the requested reference: no colored
            rim, gradients, highlights, or skin tones. Only the features are black. */}
        <svg
          viewBox="0 0 220 220"
          className="relative h-[208px] w-[208px] rounded-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
          role="img"
          aria-label={countryName ? `${roleLabel} — ${countryName}` : roleLabel}
        >
          <circle cx="110" cy="110" r="108" fill="#ffffff" />
          <g transform={eyeTransform(64)}>
            <ellipse cx="64" cy="110" rx="17" ry="22" fill="#000000" />
          </g>
          <g transform={eyeTransform(156)}>
            <ellipse cx="156" cy="110" rx="17" ry="22" fill="#000000" />
          </g>

          {/* Keep lip-sync, but use the same solid black as the resting mouth. */}
          {speaking ? (
            <rect
              x={110 - mouthW / 2}
              y={132 - mouthH / 2}
              width={mouthW}
              height={mouthH}
              rx={mouthW / 2}
              ry={mouthW / 2}
              fill="#000000"
            />
          ) : (
            <path d="M 90 128 C 90 120, 130 120, 130 128 C 130 139, 90 139, 90 128 Z" fill="#000000" />
          )}
        </svg>

        {/* Country context on the rim. */}
        {countryFlag && (
          <span
            className="absolute right-3 bottom-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-md ring-2 ring-white/80 dark:bg-slate-800 dark:ring-slate-700"
            title={countryName}
            aria-hidden="true"
          >
            {countryFlag}
          </span>
        )}
      </div>

      <HudWave level={speaking ? mouthOpen : level} state={state} />

      {/* One clean status pill — this is where "THINKING" and a vendor name
          used to be printed side by side. */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${PILL_RING[state]} bg-white/85 text-slate-700 dark:bg-[#131f38]/90 dark:text-slate-200`}
        role="status"
        aria-live="polite"
      >
        {statusLabel}
      </span>
    </div>
  );
}
