/**
 * Microphone / speech rules for the visa interview (fallback engine).
 *
 * The interview is voice-first: the officer speaks, then the microphone opens
 * by itself for the student's answer. Three failure modes made that path look
 * "dead" in real browsers, and each one is a decision this module makes
 * testable without a browser:
 *
 *   1. Chrome fires `onend`/`onerror` on a `SpeechSynthesisUtterance` — except
 *      when it doesn't (no user activation, throttled tab, cancelled
 *      utterance). The officer then stays "speaking" forever and the mic
 *      button stays disabled: the interview becomes typing-only. → the
 *      watchdog duration.
 *   2. `SpeechRecognition.start()` throwing is NOT "this browser cannot
 *      listen" — it throws InvalidStateError while the previous session winds
 *      down. Treating it as unsupported disabled voice for the whole
 *      interview. → the error classification.
 *   3. Chrome ends a recognition session on a pause; the interim transcript
 *      (what the student just said) was dropped instead of being submitted.
 *      → `shouldSubmitInterimOnEnd`.
 *
 * Pure, dependency-free — asserted by `npm run test:visa`.
 */

/** Words per second an utterance is spoken at, used to size the watchdog. */
const WORDS_PER_SECOND = 2.6;
/** Never wait longer than this for a speech to finish (ms). */
const MAX_WATCHDOG_MS = 60_000;
/** Always give speech at least this long before assuming it will never end. */
const MIN_WATCHDOG_MS = 5_000;
/** Extra slack on top of the estimated duration (start latency, pauses). */
const WATCHDOG_SLACK_MS = 4_000;

/**
 * How long to wait for `speechSynthesis` before assuming `onend` will never
 * fire. Estimated from the text length (a long question gets more time) with a
 * floor so a short question is never cut off.
 */
export function speakWatchdogMs(text: string, rate = 0.95): number {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const safeRate = Number.isFinite(rate) && rate > 0.1 ? rate : 1;
  const estimate = (words / WORDS_PER_SECOND) * 1000 / safeRate;
  return Math.min(MAX_WATCHDOG_MS, Math.max(MIN_WATCHDOG_MS, Math.round(estimate + WATCHDOG_SLACK_MS)));
}

export type SpeechErrorKind =
  /** The student (or the embedding page) said no — needs a permission retry. */
  | "blocked"
  /** A hiccup ("aborted", "network", a session still winding down): retry. */
  | "transient"
  /** Anything else — do not keep retrying in a loop. */
  | "fatal";

/** Classify a `SpeechRecognitionErrorEvent.error` value. */
export function classifySpeechError(error: string | null | undefined): SpeechErrorKind {
  const e = String(error ?? "").trim().toLowerCase();
  if (e === "not-allowed" || e === "service-not-allowed" || e === "audio-capture") {
    return "blocked";
  }
  // An empty error is what Chrome reports when the session is aborted by a
  // restart — the case that used to disable voice permanently.
  if (e === "" || e === "aborted" || e === "network") return "transient";
  return "fatal";
}

/**
 * When the recognition session ends, was there speech that never made it to a
 * final result? If so it must be submitted instead of dropped.
 */
export function shouldSubmitInterimOnEnd(finalReceived: boolean, interim: string): boolean {
  return !finalReceived && String(interim ?? "").trim().length > 0;
}

/**
 * In Gemini Live mode the microphone chunks are suppressed while the officer
 * is "speaking". If the audio player never reports that it drained (a
 * suspended AudioContext, a dropped socket), the officer stays "speaking"
 * forever and the student cannot be heard at all — with no text box to fall
 * back on in that mode. This watchdog re-opens the mic when nothing is being
 * generated and nothing is playing.
 */
export const LIVE_SPEAK_WATCHDOG_MS = 10_000;

/** How many automatic restarts before we stop retrying and ask the student. */
export const MAX_MIC_START_ATTEMPTS = 3;

/** Delay before retrying a failed `SpeechRecognition.start()` (ms). */
export const MIC_RESTART_DELAY_MS = 350;
