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
 * Everything here is one 220×220 viewBox so the sphere is a true circle rather
 * than a box with rounded corners:
 *
 *   RING      the state, carried by a gradient rim — sapphire while speaking or
 *             idle, emerald while the student holds the floor, violet while the
 *             answer is being evaluated.
 *   SPHERE    an icy sky-blue radial face, offset so the flat circle reads as a
 *             lit 3D ball, with one white specular arc across the top.
 *   EYES      bold dark geometry clipped to an angled upper lid. They blink on a
 *             3.5s rhythm and once more on every state change, and they shift
 *             gaze with the state (up-and-right while thinking, down while
 *             listening).
 *   MOUTH     real-time lip-sync. `level` drives it when the browser exposes
 *             amplitude; when it does not, `useSpeechOscillator` supplies a
 *             syllable-rate cadence so the mouth still forms words.
 *
 * Deliberately no flames and no orange: an orange flare on a black box reads as
 * a fault condition, which is exactly what the previous stage looked like.
 *
 * The lid angle is load-bearing. Slanting each lid DOWN toward the centre is the
 * mirror of what is drawn here and renders as an unmistakable scowl — verified
 * by rasterizing both. This orb is the face a nervous applicant rehearses
 * against, so it leans friendly: lids angle up toward the nose, the resting
 * mouth is a calm capsule, and the cheeks carry a low warm glow.
 *
 * Colours are hex literals on SVG stops, not `dark:` utility classes. The orb is
 * a light source, so its own colours must not invert with the theme; the host
 * section already swaps its surface behind it.
 */

import React, { useEffect, useId, useState, useSyncExternalStore } from "react";

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
 * Outer-ring gradient stops per state. IDLE and SPEAKING share the sapphire rim
 * — the sphere is at rest in one and talking in the other, and those are the two
 * states where a calm colour is right.
 */
const RING_GRADIENT: Record<AiOrbFaceState, { from: string; via?: string; to: string }> = {
  IDLE: { from: "#3b82f6", via: "#4f46e5", to: "#06b6d4" },
  SPEAKING: { from: "#3b82f6", via: "#4f46e5", to: "#06b6d4" },
  LISTENING: { from: "#10b981", to: "#14b8a6" },
  THINKING: { from: "#7c3aed", to: "#6366f1" },
};

/** Soft halo behind the sphere. Opacity only, so it needs no `dark:` variant. */
const GLOW: Record<AiOrbFaceState, string> = {
  IDLE: "from-blue-500/20 via-indigo-500/20 to-cyan-500/20",
  SPEAKING: "from-blue-500/30 via-indigo-500/25 to-cyan-500/30",
  LISTENING: "from-emerald-500/25 via-teal-400/20 to-cyan-500/25",
  THINKING: "from-violet-500/25 via-indigo-500/25 to-purple-500/25",
};

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

  // Gradient/clip ids must be unique per instance or two orbs on one page would
  // share defs. `useId` returns colons, which are awkward inside `url(#…)`, so
  // they are stripped.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ringId = `aiOrbRing${uid}`;
  const faceId = `aiOrbFace${uid}`;
  const cheekId = `aiOrbCheek${uid}`;
  const eyeLId = `aiOrbEyeL${uid}`;
  const eyeRId = `aiOrbEyeR${uid}`;

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

  const pulse = listening
    ? 1 + Math.min(0.6, Math.max(0, level)) * 0.22
    : speaking
      ? 1 + Math.min(0.6, Math.max(0, level)) * 0.12
      : 1;

  const ring = RING_GRADIENT[state];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative flex h-[248px] w-[248px] items-center justify-center">
        {/* Halo: presence behind the sphere, and the only part that pulses. */}
        <div
          aria-hidden="true"
          className={`absolute inset-6 rounded-full bg-gradient-to-br ${GLOW[state]} blur-2xl ${
            reduced ? "" : "transition-transform duration-150"
          }`}
          style={{ transform: `scale(${pulse})` }}
        />

        {/* viewBox is 220×220 and the sphere fills it, so `rounded-full` here is
            a true circle at every size. */}
        <svg
          viewBox="0 0 220 220"
          className="relative h-[208px] w-[208px] rounded-full"
          role="img"
          aria-label={countryName ? `${roleLabel} — ${countryName}` : roleLabel}
        >
          <defs>
            <linearGradient id={ringId} x1="8%" y1="0%" x2="92%" y2="100%">
              <stop offset="0%" stopColor={ring.from} />
              {ring.via ? <stop offset="50%" stopColor={ring.via} /> : null}
              <stop offset="100%" stopColor={ring.to} />
            </linearGradient>

            {/* Off-centre radial, so a flat circle reads as a lit sphere. */}
            <radialGradient id={faceId} cx="36%" cy="26%" r="82%">
              <stop offset="0%" stopColor="#f0f9ff" />
              <stop offset="55%" stopColor="#d8f0fe" />
              <stop offset="100%" stopColor="#b6e0fe" />
            </radialGradient>

            <radialGradient id={cheekId}>
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </radialGradient>

            {/* The angled upper lids. The dark eye geometry is clipped to these,
                so the lid edge IS the top edge of the eye rather than a line
                drawn near it.

                The angle points UP toward the centre. Down would be the exact
                mirror of this and renders as a scowl — see the note above the
                component. Same coordinate pairs as the upward version, with the
                two `y` values swapped on each lid. */}
            <clipPath id={eyeLId}>
              <polygon points="45,88 105,76 105,130 45,130" />
            </clipPath>
            <clipPath id={eyeRId}>
              <polygon points="115,76 175,88 175,130 115,130" />
            </clipPath>
          </defs>

          {/* Outer gradient ring, then the sphere it rims. */}
          <circle cx="110" cy="110" r="104" fill="none" stroke={`url(#${ringId})`} strokeWidth="8" />
          <circle cx="110" cy="110" r="100" fill={`url(#${faceId})`} />

          {/* Specular arc across the top: the one highlight that sells a sphere. */}
          <path
            d="M 54 62 A 74 74 0 0 1 166 62"
            fill="none"
            stroke="#ffffff"
            strokeWidth="7"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Cheek glows, kept low and soft so they never read as a blush mask. */}
          <ellipse cx="66" cy="137" rx="19" ry="11" fill={`url(#${cheekId})`} />
          <ellipse cx="154" cy="137" rx="19" ry="11" fill={`url(#${cheekId})`} />

          {/* Eyes. The ellipses are sized so their own curves bound the sides and
              bottom, leaving only the lid to clip them — no straight cut at the
              clip edge. Gaze and blink compose in one transform. */}
          <g clipPath={`url(#${eyeLId})`}>
            <g transform={eyeTransform(76)}>
              <ellipse cx="76" cy="101" rx="25" ry="23" fill="#18181b" />
              <ellipse cx="68" cy="93" rx="5.5" ry="4.5" fill="#ffffff" opacity="0.85" />
            </g>
          </g>
          <g clipPath={`url(#${eyeRId})`}>
            <g transform={eyeTransform(144)}>
              <ellipse cx="144" cy="101" rx="25" ry="23" fill="#18181b" />
              <ellipse cx="136" cy="93" rx="5.5" ry="4.5" fill="#ffffff" opacity="0.85" />
            </g>
          </g>

          {/* Bold upper-lid contours, drawn over the eyes. */}
          <line x1="45" y1="88" x2="105" y2="76" stroke="#18181b" strokeWidth="5.5" strokeLinecap="round" />
          <line x1="115" y1="76" x2="175" y2="88" stroke="#18181b" strokeWidth="5.5" strokeLinecap="round" />

          {/* Mouth. Speaks, or rests as a closed capsule. */}
          {speaking ? (
            <g>
              <rect
                x={110 - mouthW / 2}
                y={128 - mouthH / 2}
                width={mouthW}
                height={mouthH}
                rx={mouthW / 2}
                ry={mouthH / 2}
                fill="#18181b"
              />
              {/* Tongue: rides in the lower half of the aperture and only grows
                  once the mouth is actually open. */}
              <rect
                x={110 - (mouthW * 0.62) / 2}
                y={128 + mouthH * 0.05}
                width={mouthW * 0.62}
                height={Math.max(1, mouthH * 0.42)}
                rx={(mouthW * 0.62) / 2}
                ry={Math.max(0.5, (mouthH * 0.42) / 2)}
                fill="#f43f5e"
              />
            </g>
          ) : (
            <path d="M 91 132 C 91 120, 129 120, 129 132 C 129 136, 91 136, 91 132 Z" fill="#18181b" />
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
