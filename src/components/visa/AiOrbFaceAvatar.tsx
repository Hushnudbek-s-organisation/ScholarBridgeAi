"use client";

import type { SpeakerStyle } from "@/lib/daily-speaking";
import { SpeakingEffects } from "./SpeakingEffects";

import { useEffect, useState, useSyncExternalStore } from "react";

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
function useSpeechOscillator(active: boolean, enabled: boolean, rate: number): number {
  const [value, setValue] = useState(0);
  const running = active && enabled;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const syllable = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * rate);
      const envelope = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.3 + 0.9);
      const gate = 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 1.15 + 2.1);
      setValue(Math.max(0, Math.min(1, syllable * (0.35 + 0.65 * envelope) * gate)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, rate]);
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
  measuredAudio?: boolean;
  temperament?: SpeakerStyle;
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
  measuredAudio = false,
  temperament = "calm",
  roleLabel,
  countryFlag,
  countryName,
}: AiOrbFaceAvatarProps) {
  const reduced = usePrefersReducedMotion();
  const speaking = state === "SPEAKING";
  const rate = temperament === "fast" ? 9 : temperament === "irritated" ? 7 : 5.5;
  const oscillator = useSpeechOscillator(speaking, !measuredAudio && !reduced, rate);
  const blink = useBlink(state, reduced) && !reduced;
  const measured = speaking ? Math.min(1, Math.max(0, level) * 1.4) : 0;
  const mouthOpen = speaking ? (reduced ? 0.45 : measuredAudio ? measured : oscillator) : 0;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className={"sb-speaking-face-stage"} data-speaking-avatar data-state={state}
        data-temperament={temperament}
        role="img" aria-label={countryName ? `${roleLabel} — ${countryName}` : roleLabel}>
        <div className={"sb-speaking-face-halo"} aria-hidden="true" />
        {speaking && temperament !== "calm" && (
          <SpeakingEffects effect={temperament} reduced={reduced}
            className={temperament === "fast" ? "sb-speaking-face-electric" : "sb-speaking-face-fire"} />
        )}
        <div className={"sb-speaking-face-shell"} aria-hidden="true">
          <div className={"sb-speaking-face-visor"}>
            <span className={"sb-speaking-face-eyes"} data-blink={blink || undefined}><i data-eye="left" /><i data-eye="right" /></span>
            <span className={"sb-speaking-face-mouth"} style={{ transform: `scaleY(${1 + mouthOpen * 3.2})` }} />
          </div>
        </div>
        {countryFlag && <span className={"sb-speaking-face-flag"} title={countryName} aria-hidden="true">{countryFlag}</span>}
      </div>

      <HudWave level={speaking ? mouthOpen : level} state={state} />

      {/* One clean status pill — this is where "THINKING" and a vendor name
          used to be printed side by side. */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${PILL_RING[state]} bg-white/85 text-slate-700 dark:bg-surface/90 dark:text-slate-200`}
        role="status"
        aria-live="polite"
      >
        {statusLabel}
      </span>
    </div>
  );
}
