"use client";

import React, { useEffect, useRef, useState } from "react";

/** Whether this page is running inside somebody else's frame (a preview pane,
 *  an LMS embed...). Parent frames must grant `allow="microphone"` — the page's
 *  own header cannot — so the interview offers a way out of the frame.
 *  It is read through `useSyncExternalStore` rather than an effect, and the
 *  server render always assumes "not embedded" (the value settles after
 *  hydration). */
function subscribeEmbedded(): () => void {
  return () => {};
}
function embeddedSnapshot(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin parent: reading window.top throws — that IS an embed.
    return true;
  }
}
function embeddedServerSnapshot(): boolean {
  return false;
}

/** Missing or malformed next-intl messages must never take down the Visa hub. */
type SafeTranslationValues = Record<string, string | number>;
type SafeTranslator = (key: string, values?: SafeTranslationValues) => unknown;
export function safeT(
  translator: SafeTranslator,
  key: string,
  fallback: string,
  values?: SafeTranslationValues,
): string {
  try {
    const translated = translator(key, values);
    return typeof translated === "string" ? translated : fallback;
  } catch {
    return fallback;
  }
}

function safeKeyFallback(key: string): string {
  const leaf = key.split(".").pop() || key;
  return leaf.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

/** `preferredCountries` is stored as nullable text and may be JSON or a CSV. */
function normalizePreferredCountries(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  const raw = value.trim();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
    if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
  } catch {
    // Older profiles may store plain comma/semicolon-separated text.
  }
  return raw.split(/[,;|]/).map((item) => item.trim().replace(/^['\"]|['\"]$/g, "")).filter(Boolean);
}

import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";
import { useLocale, useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { localeToLanguageName } from "@/i18n/config";
import { countryTranslationKey } from "@/lib/countries";
import { collapsePicks, countrySearchMatch, matchesAnyCountry, rankCountryPicks } from "@/lib/countryPicker";
import { CountryFlag } from "@/components/CountryFlag";
import {
  VISA_COUNTRIES,
  VISA_LIVE_VOICES,
  buildInterviewUserPrompt,
  getVisaCountry,
  normalizeVisaLiveVoice,
  type VisaAnalysis,
  type VisaLiveVoice,
  type VisaMessage,
  type VisaOfficerGender,
} from "@/lib/visa-interview";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
  Waves,
} from "lucide-react";
import { AppNote } from "@/components/AppNote";
import { VisaModelAnswers } from "@/components/samples/VisaModelAnswers";
// The picker is pure and lives in lib; the exemplar library itself stays in a
// lazy chunk (a static value import of it is forbidden by check-samples.ts).
import { modelAnswerForTurn } from "@/lib/samples/modelAnswers";
import { visaSampleCountryFor } from "@/lib/samples/visa";
import { AiOrbFaceAvatar } from "@/components/visa/AiOrbFaceAvatar";
import {
  classifySpeechError,
  LIVE_SPEAK_WATCHDOG_MS,
  MAX_MIC_START_ATTEMPTS,
  MIC_RESTART_DELAY_MS,
  shouldSubmitInterimOnEnd,
  speakWatchdogMs,
} from "@/lib/visa-mic";

// ---------------------------------------------------------------------------
// Web Speech API typings (fallback mode; not in the TS DOM lib).
// ---------------------------------------------------------------------------
interface VisaSpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: { readonly transcript: string };
}

interface VisaSpeechEvent extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<VisaSpeechResult> & { readonly length: number };
}

interface VisaSpeechErrorEvent extends Event {
  readonly error: string;
}

interface VisaSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: VisaSpeechEvent) => void) | null;
  onerror: ((e: VisaSpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => VisaSpeechRecognition;
    webkitSpeechRecognition?: new () => VisaSpeechRecognition;
    webkitAudioContext?: typeof AudioContext;
  }
}

// ---------------------------------------------------------------------------
// Gemini Live browser audio worklets.
// Input: mic Float32 -> 16 kHz PCM16 chunks (40 ms) -> session.sendRealtimeInput({ audio })
// Output: Gemini 24 kHz PCM16 chunks -> gapless AudioWorklet FIFO playback.
// ---------------------------------------------------------------------------

const GEMINI_INPUT_RATE = 16_000;
const GEMINI_OUTPUT_RATE = 24_000;
const MIC_CHUNK_SAMPLES = 640; // 40 ms at 16 kHz.
const ECHO_GUARD_MS = 250;

const MIC_WORKLET_SOURCE = `
class VisaMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetRate = 16000;
    this.chunkSize = 640;
    this.ratio = sampleRate / this.targetRate;
    this.source = new Float32Array(0);
    this.readOffset = 0;
    this.chunk = [];
  }
  merge(input) {
    const old = this.source;
    const merged = new Float32Array(old.length + input.length);
    merged.set(old, 0);
    merged.set(input, old.length);
    this.source = merged;
  }
  sampleAt(index) {
    const i = Math.floor(index);
    const frac = index - i;
    const a = this.source[i] || 0;
    const b = this.source[i + 1] ?? a;
    return a + (b - a) * frac;
  }
  flushChunk() {
    const pcm = new Int16Array(this.chunkSize);
    let sum = 0;
    for (let i = 0; i < this.chunkSize; i++) {
      const s = Math.max(-1, Math.min(1, this.chunk[i] || 0));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      sum += s * s;
    }
    this.chunk = [];
    const rms = Math.sqrt(sum / this.chunkSize);
    this.port.postMessage({ type: 'audio', buffer: pcm.buffer, level: Math.min(1, rms * 3.2) }, [pcm.buffer]);
  }
  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (!input || input.length === 0) return true;

    this.merge(input);
    while (this.readOffset + 1 < this.source.length) {
      this.chunk.push(this.sampleAt(this.readOffset));
      this.readOffset += this.ratio;
      if (this.chunk.length >= this.chunkSize) this.flushChunk();
    }

    const consumed = Math.max(0, Math.floor(this.readOffset) - 1);
    if (consumed > 0) {
      this.source = this.source.slice(consumed);
      this.readOffset -= consumed;
    }
    return true;
  }
}
registerProcessor('visa-mic-processor', VisaMicProcessor);
`;

const PLAYER_WORKLET_SOURCE = `
class VisaPcmPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputRate = 24000;
    this.step = this.inputRate / sampleRate;
    this.queue = [];
    this.offset = 0;
    this.wasPlaying = false;
    this.lastLevelAt = 0;
    this.port.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === 'clear') {
        this.queue = [];
        this.offset = 0;
        this.wasPlaying = false;
        this.port.postMessage({ type: 'level', level: 0 });
        this.port.postMessage({ type: 'drain' });
        return;
      }
      if (data.type === 'enqueue' && data.buffer) {
        const pcm = new Int16Array(data.buffer);
        const floats = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) floats[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
        if (floats.length) this.queue.push(floats);
      }
    };
  }
  sampleAt(pos) {
    if (this.queue.length === 0) return 0;
    const current = this.queue[0];
    const i = Math.floor(pos);
    const frac = pos - i;
    const a = current[i] || 0;
    let b = current[i + 1];
    if (b === undefined) b = this.queue[1]?.[0] ?? a;
    return a + (b - a) * frac;
  }
  consume() {
    while (this.queue.length && this.offset >= this.queue[0].length) {
      this.offset -= this.queue[0].length;
      this.queue.shift();
    }
  }
  process(_inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    let sum = 0;
    let produced = false;
    for (let i = 0; i < output.length; i++) {
      this.consume();
      if (this.queue.length === 0) {
        output[i] = 0;
        continue;
      }
      const s = this.sampleAt(this.offset);
      output[i] = s;
      sum += s * s;
      produced = true;
      this.offset += this.step;
    }
    const now = currentTime;
    if (now - this.lastLevelAt > 0.05) {
      this.lastLevelAt = now;
      const level = produced ? Math.min(1, Math.sqrt(sum / output.length) * 2.8) : 0;
      this.port.postMessage({ type: 'level', level });
    }
    if (produced) this.wasPlaying = true;
    if (this.wasPlaying && this.queue.length === 0) {
      this.wasPlaying = false;
      this.offset = 0;
      this.port.postMessage({ type: 'drain' });
    }
    return true;
  }
}
registerProcessor('visa-pcm-player', VisaPcmPlayerProcessor);
`;

const FEMALE_VOICE_HINTS = [
  "female",
  "woman",
  "girl",
  "samantha",
  "zira",
  "aria",
  "jenny",
  "kate",
  "serena",
  "veena",
  "tessa",
  "susan",
  "linda",
  "amelie",
  "anna",
];

const MALE_VOICE_HINTS = [
  "male",
  "david",
  "daniel",
  "alex",
  "fred",
  "thomas",
  "guy",
  "davis",
  "ryan",
  "george",
  "oliver",
  "mark",
  "paul",
];

function browserSupportsGeminiLive(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof WebSocket !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!(window.AudioContext || window.webkitAudioContext) &&
    "AudioWorkletNode" in window
  );
}

function createWorkletUrl(source: string): string {
  // A CSP that forbids blob:, or an engine without object URLs, must fall
  // back to text+voice mode — not surface as an uncaught crash.
  if (typeof window === "undefined" || typeof URL?.createObjectURL !== "function") {
    throw new Error("Browser audio pipeline is unavailable");
  }
  return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}

/**
 * Several in-app browsers (Telegram, some Android/Linux WebViews, older
 * Safari) expose `window.speechSynthesis` as an object whose methods are
 * missing or throw synchronously. An `"speechSynthesis" in window` check
 * alone passes on those engines — and the first `.getVoices()` /
 * `.addEventListener()` call then took the WHOLE hub down with a TypeError.
 * Every speech access goes through these guards instead; a broken voice
 * engine must only disable voice, never the page.
 */
function getSafeSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  try {
    const synth = window.speechSynthesis;
    return synth && typeof synth.getVoices === "function" ? synth : null;
  } catch {
    return null;
  }
}

function safeCancelSpeech(): void {
  try {
    getSafeSpeechSynthesis()?.cancel();
  } catch {
    // Engines that throw on cancel during teardown are harmless; ignore.
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(data: string): ArrayBuffer {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function pickVoice(
  locale: string,
  gender: VisaOfficerGender,
): SpeechSynthesisVoice | null {
  const synth = getSafeSpeechSynthesis();
  if (!synth) return null;
  let voices: SpeechSynthesisVoice[] = [];
  try {
    voices = synth.getVoices();
  } catch {
    return null;
  }
  if (voices.length === 0) return null;

  const prefix = locale.split("-")[0].toLowerCase();
  const sameLang = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix),
  );
  const pool =
    sameLang.length > 0
      ? sameLang
      : voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const candidates = pool.length > 0 ? pool : voices;

  const scored = candidates.map((v) => {
    const hay = `${v.name} ${v.voiceURI}`.toLowerCase();
    const looksFemale = FEMALE_VOICE_HINTS.some((h) => hay.includes(h));
    const looksMale =
      !looksFemale && MALE_VOICE_HINTS.some((h) => hay.includes(h));
    let score = 0;
    if (gender === "female" && looksFemale) score += 10;
    if (gender === "male" && looksMale) score += 10;
    if (gender === "female" && looksMale) score -= 10;
    if (gender === "male" && looksFemale) score -= 10;
    if (v.lang.toLowerCase() === locale.toLowerCase()) score += 3;
    if (hay.includes("google")) score += 2;
    if (
      hay.includes("natural") ||
      hay.includes("neural") ||
      hay.includes("premium")
    ) {
      score += 2;
    }
    if (v.default) score += 1;
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.v ?? null;
}

function cleanTranscript(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function mergeTranscript(previous: string, nextChunk: string): string {
  const prev = cleanTranscript(previous);
  const next = cleanTranscript(nextChunk);
  if (!next) return prev;
  if (!prev) return next;
  if (next.startsWith(prev)) return next;
  if (prev.endsWith(next)) return prev;

  const maxOverlap = Math.min(prev.length, next.length, 80);
  for (let len = maxOverlap; len > 0; len--) {
    if (prev.slice(-len).toLowerCase() === next.slice(0, len).toLowerCase()) {
      return `${prev}${next.slice(len)}`.trim();
    }
  }
  return `${prev}${/[.!?…]$/.test(prev) ? " " : " "}${next}`.trim();
}

function getInlineAudioParts(message: LiveServerMessage): string[] {
  const parts = message.serverContent?.modelTurn?.parts ?? [];
  const audio: string[] = [];
  for (const part of parts) {
    const maybe = part as { inlineData?: { data?: unknown; mimeType?: unknown } };
    const data = maybe.inlineData?.data;
    const mimeType = maybe.inlineData?.mimeType;
    if (
      typeof data === "string" &&
      (typeof mimeType !== "string" || mimeType.startsWith("audio/"))
    ) {
      audio.push(data);
    }
  }
  return audio;
}

function getTextParts(message: LiveServerMessage): string[] {
  const parts = message.serverContent?.modelTurn?.parts ?? [];
  const texts: string[] = [];
  for (const part of parts) {
    const maybe = part as { text?: unknown };
    if (typeof maybe.text === "string" && maybe.text.trim()) {
      texts.push(maybe.text);
    }
  }
  return texts;
}

function Steps({ current }: { current: 0 | 1 | 2 }) {
  const rawT = useTranslations("visa");
  const t = (key: string, values?: SafeTranslationValues) => safeT(rawT as unknown as SafeTranslator, key, safeKeyFallback(key), values);
  const labels = [t("stepSetup"), t("stepInterview"), t("stepResult")];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="h-px w-5 bg-white/25 sm:w-8" />}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i === current
                  ? "bg-white text-blue-700"
                  : i < current
                    ? "bg-emerald-400 text-slate-950 sb-ink-on-bright"
                    : "bg-white/15 text-white/60"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                i === current ? "text-white" : "text-white/60"
              }`}
            >
              {label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function ScoreRing({
  value,
  label,
  size = 120,
  color = "#2563eb",
}: {
  value: number;
  label: string;
  size?: number;
  color?: string;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(value));
    return () => cancelAnimationFrame(id);
  }, [value]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * animated) / 100}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-900">
            {animated}
            <span className="text-sm font-bold text-slate-400">%</span>
          </span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-600">{label}</span>
    </div>
  );
}

type Screen = "setup" | "interview" | "analyzing" | "result";
type OfficerState = "idle" | "thinking" | "speaking";
type EngineMode = "gemini-live" | "fallback";

interface LiveTokenResponse {
  token: string;
  model: string;
  apiVersion?: string;
  voice?: string;
  expiresAt?: string;
  /** Server-enforced cap on one Live session (minutes × 60). */
  maxSessionSeconds?: number;
}

/** Error from /api/visa/live-token carrying the server's stable code. */
type LiveTokenError = Error & { code?: string };

/**
 * Which localized notice explains why the interview moved to text practice.
 * Keys come from the server's stable `code`, never from its English text.
 */
function liveFallbackNoticeKey(
  reason: unknown,
): "liveFallback" | "liveQuotaReached" | "liveDisabled" | "livePremiumRequired" | "liveSessionTimeLimit" {
  const code = typeof reason === "object" && reason !== null ? (reason as { code?: unknown }).code : undefined;
  if (code === "live_quota_exceeded") return "liveQuotaReached";
  if (code === "live_voice_disabled") return "liveDisabled";
  if (code === "premium_required") return "livePremiumRequired";
  if (code === "session_time_limit") return "liveSessionTimeLimit";
  return "liveFallback";
}

interface LiveSessionLike {
  sendRealtimeInput(params: {
    audio?: { data: string; mimeType: string };
    text?: string;
    audioStreamEnd?: boolean;
  }): void;
  close(): void;
}

interface VisaEngine {
  startInterview: () => void;
  submitAnswer: (text: string) => void;
  onMicClick: () => void;
  toggleMute: () => void;
  interruptAssistant: () => void;
  endInterview: () => void;
  backToInterview: () => void;
  restartInterview: () => void;
  backToSetup: () => void;
  retryReply: () => void;
  runAnalysis: () => void;
}

interface VisaSpeakingAssistantProps {
  activeProfile: StudentProfile | null;
}

export function VisaSpeakingAssistant({
  activeProfile,
}: VisaSpeakingAssistantProps) {
  const rawT = useTranslations("visa");
  const rawTs = useTranslations("samples");
  const rawTCountry = useTranslations("countryNames");
  const locale = useLocale();
  const t = (key: string, values?: SafeTranslationValues) => safeT(rawT as unknown as SafeTranslator, key, safeKeyFallback(key), values);
  const ts = (key: string, values?: SafeTranslationValues) => safeT(rawTs as unknown as SafeTranslator, key, safeKeyFallback(key), values);
  const tCountry = (key: string) => safeT(rawTCountry as unknown as SafeTranslator, key, safeKeyFallback(key));

  const [screen, setScreen] = useState<Screen>("setup");
  const [countryCode, setCountryCode] = useState<string | null>(null);
  /**
   * The 37-country wall is now a compact picker: selected + priority
   * destinations first, everything else behind one search box and a
   * "Show all (+N)" footer.
   */
  const [countrySearch, setCountrySearch] = useState("");
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [gender, setGender] = useState<VisaOfficerGender | null>(null);
  const [voice, setVoice] = useState<VisaLiveVoice>("Kore");
  const [messages, setMessages] = useState<VisaMessage[]>([]);
  const [officerState, setOfficerState] = useState<OfficerState>("idle");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [liveOutputPartial, setLiveOutputPartial] = useState("");
  const [muted, setMuted] = useState(false);
  const [engineMode, setEngineMode] = useState<EngineMode>("gemini-live");
  const [liveConnected, setLiveConnected] = useState(false);
  const [sttSupported, setSttSupported] = useState(
    () =>
      typeof window !== "undefined" &&
      !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  );
  const [ttsSupported] = useState(() => getSafeSpeechSynthesis() !== null);
  const [micBlocked, setMicBlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadedModelAnswer, setLoadedModelAnswer] = useState(false);
  const [loadingModelAnswer, setLoadingModelAnswer] = useState(false);
  /**
   * A page embedded in someone else's frame needs the PARENT to grant
   * `allow="microphone"` — the app cannot grant it for itself. Detect it so the
   * student gets a one-click way out instead of a dead microphone.
   */
  const embedded = React.useSyncExternalStore(
    subscribeEmbedded,
    embeddedSnapshot,
    embeddedServerSnapshot,
  );
  const [error, setError] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  /**
   * The response now carries a deterministic rubric computed from the transcript
   * and a disclaimer for the model's own probability. `estimated_visa_chance`
   * is the model's opinion, not a prediction — see lib/visaScoring.
   */
  type VisaAnalysisResponse = VisaAnalysis & {
    aiAvailable?: boolean;
    /** Why the AI half is missing (safe, category-based server message). */
    aiError?: string;
    rubric?: {
      scores: {
        purposeOfStudy: number;
        funding: number;
        homeTies: number;
        nonImmigrantIntent: number;
        specificity: number;
        languageClarity: number;
        total: number;
      };
      risks: { code: string; message: string; severity: "high" | "medium" | "low"; params?: Record<string, string | number> }[];
      unanswered: string[];
      turnFeedback: {
        turnNumber: number;
        question: string | null;
        answerExcerpt: string;
        answerWordCount: number;
        evidence: ("purpose" | "funding" | "home_ties" | "specific_detail")[];
        concerns: string[];
      }[];
      answerCount: number;
      averageAnswerWords: number;
    };
    chanceDisclaimer?: string;
    openRouterReview?: {
      mercury: { model: string; available: boolean; signals: Record<string, { probabilityPercent: number | null; score: number | null; status: "ok" | "fallback" }> } | null;
      respan: { model: string; available: boolean; signals: Record<string, { probabilityPercent: number | null; score: number | null; status: "ok" | "fallback" }> } | null;
    };
  };

  function normalizeVisaAnalysis(value: unknown): VisaAnalysisResponse {
    const source = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
    const score = (item: unknown) => typeof item === "number" && Number.isFinite(item)
      ? Math.max(0, Math.min(100, Math.round(item)))
      : 0;
    const text = (item: unknown) => typeof item === "string" ? item : "";
    const rawRubric = source.rubric && typeof source.rubric === "object" && !Array.isArray(source.rubric)
      ? source.rubric as Record<string, unknown>
      : null;
    let rubric: VisaAnalysisResponse["rubric"];
    if (rawRubric) {
      const rawScores = rawRubric.scores && typeof rawRubric.scores === "object" && !Array.isArray(rawRubric.scores)
        ? rawRubric.scores as Record<string, unknown>
        : {};
      const rawRisks = Array.isArray(rawRubric.risks) ? rawRubric.risks : [];
      const rawUnanswered = Array.isArray(rawRubric.unanswered) ? rawRubric.unanswered : [];
      const rawFeedback = Array.isArray(rawRubric.turnFeedback) ? rawRubric.turnFeedback : [];
      rubric = {
        scores: {
          purposeOfStudy: score(rawScores.purposeOfStudy),
          funding: score(rawScores.funding),
          homeTies: score(rawScores.homeTies),
          nonImmigrantIntent: score(rawScores.nonImmigrantIntent),
          specificity: score(rawScores.specificity),
          languageClarity: score(rawScores.languageClarity),
          total: score(rawScores.total),
        },
        risks: rawRisks.flatMap((risk) => {
          if (!risk || typeof risk !== "object" || Array.isArray(risk)) return [];
          const item = risk as Record<string, unknown>;
          if (typeof item.code !== "string" || typeof item.message !== "string" || !["high", "medium", "low"].includes(String(item.severity))) return [];
          const rawParams = item.params && typeof item.params === "object" && !Array.isArray(item.params) ? item.params as Record<string, unknown> : {};
          const params = Object.fromEntries(Object.entries(rawParams).filter(([, v]) => typeof v === "string" || (typeof v === "number" && Number.isFinite(v)))) as Record<string, string | number>;
          return [{ code: item.code, message: item.message, severity: item.severity as "high" | "medium" | "low", ...(Object.keys(params).length ? { params } : {}) }];
        }),
        unanswered: rawUnanswered.filter((item): item is string => typeof item === "string"),
        turnFeedback: rawFeedback.flatMap((turn) => {
          if (!turn || typeof turn !== "object" || Array.isArray(turn)) return [];
          const item = turn as Record<string, unknown>;
          if (typeof item.turnNumber !== "number" || !Number.isFinite(item.turnNumber)) return [];
          const evidence = Array.isArray(item.evidence) ? item.evidence.filter((x): x is "purpose" | "funding" | "home_ties" | "specific_detail" => ["purpose", "funding", "home_ties", "specific_detail"].includes(String(x))) : [];
          return [{
            turnNumber: Math.max(1, Math.floor(item.turnNumber)),
            question: typeof item.question === "string" ? item.question : null,
            answerExcerpt: text(item.answerExcerpt),
            answerWordCount: score(item.answerWordCount),
            evidence,
            concerns: Array.isArray(item.concerns) ? item.concerns.filter((x): x is string => typeof x === "string") : [],
          }];
        }),
        answerCount: score(rawRubric.answerCount),
        averageAnswerWords: score(rawRubric.averageAnswerWords),
      };
    }

    const normalizeProviderReview = (input: unknown, kind: "mercury" | "respan") => {
      if (!input || typeof input !== "object" || Array.isArray(input)) return null;
      const raw = input as Record<string, unknown>;
      const rawSignals = raw.signals && typeof raw.signals === "object" && !Array.isArray(raw.signals)
        ? raw.signals as Record<string, unknown>
        : {};
      const signals: Record<string, { probabilityPercent: number | null; score: number | null; status: "ok" | "fallback" }> = {};
      for (const [key, value] of Object.entries(rawSignals)) {
        if (!value || typeof value !== "object" || Array.isArray(value)) continue;
        const signal = value as Record<string, unknown>;
        const probabilityPercent = typeof signal.probabilityPercent === "number" && Number.isFinite(signal.probabilityPercent)
          ? Math.max(0, Math.min(100, Math.round(signal.probabilityPercent)))
          : null;
        const scoreValue = typeof signal.score === "number" && Number.isFinite(signal.score)
          ? Math.max(0, Math.min(100, Math.round(signal.score)))
          : null;
        signals[key] = {
          probabilityPercent,
          score: scoreValue,
          status: signal.status === "ok" && (probabilityPercent !== null || scoreValue !== null) ? "ok" : "fallback",
        };
      }
      return {
        model: typeof raw.model === "string" ? raw.model : "",
        available: raw.available === true && Object.values(signals).some((signal) => signal.status === "ok"),
        signals,
      };
    };
    const rawReview = source.openRouterReview && typeof source.openRouterReview === "object" && !Array.isArray(source.openRouterReview)
      ? source.openRouterReview as Record<string, unknown>
      : null;
    const openRouterReview = rawReview ? {
      mercury: normalizeProviderReview(rawReview.mercury, "mercury"),
      respan: normalizeProviderReview(rawReview.respan, "respan"),
    } : undefined;
    return {
      confidence: score(source.confidence),
      persuasiveness: score(source.persuasiveness),
      language_level: score(source.language_level),
      estimated_visa_chance: score(source.estimated_visa_chance),
      recommendations: text(source.recommendations),
      ...(typeof source.aiAvailable === "boolean" ? { aiAvailable: source.aiAvailable } : {}),
      ...(typeof source.aiError === "string" ? { aiError: source.aiError } : {}),
      ...(typeof source.chanceDisclaimer === "string" ? { chanceDisclaimer: source.chanceDisclaimer } : {}),
      ...(rubric ? { rubric } : {}),
      ...(openRouterReview ? { openRouterReview } : {}),
    };
  }

  const [analysis, setAnalysis] = useState<VisaAnalysisResponse | null>(null);
  // Practice history (spec §13) — saved sessions from /api/visa/history,
  // oldest first. Shows the student their progress across sessions.
  const [practiceHistory, setPracticeHistory] = useState<
    { sessions: { id: number; total: number; country: string | null; createdAt: string }[]; count: number } | null
  >(null);

  const loadPracticeHistory = async () => {
    if (!activeProfile?.id) return;
    try {
      const res = await fetch(`/api/visa/history?profileId=${activeProfile.id}`);
      if (res.ok) {
        const data = await res.json();
        setPracticeHistory({ sessions: data.sessions ?? [], count: data.count ?? 0 });
      }
    } catch {
      // History is decorative — never break the result screen for it.
    }
  };
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [outputLevel, setOutputLevel] = useState(0);

  const sessionRef = useRef(0);
  const mountedRef = useRef(true);
  const messagesRef = useRef<VisaMessage[]>([]);
  const listeningRef = useRef(false);
  const officerStateRef = useRef<OfficerState>("idle");
  const mutedRef = useRef(false);
  const engineModeRef = useRef<EngineMode>("gemini-live");
  const configRef = useRef<{
    countryCode: string;
    gender: VisaOfficerGender;
    voice: VisaLiveVoice;
  } | null>(null);
  const submittingRef = useRef(false);
  const micReadyRef = useRef(false);
  const recognitionRef = useRef<VisaSpeechRecognition | null>(null);
  const interimRef = useRef("");
  const finalReceivedRef = useRef(false);
  const meterAudioCtxRef = useRef<AudioContext | null>(null);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const meterRafRef = useRef(0);
  /** Watchdog for a speechSynthesis utterance whose onend never fires. */
  const speakWatchdogRef = useRef<number | null>(null);
  /**
   * Neural-voice playback (POST /api/visa/tts). The audio is routed through an
   * AnalyserNode so the officer's mouth is driven by the REAL waveform rather
   * than by the synthetic syllable oscillator — which is only needed for
   * browser speechSynthesis, since that API exposes no amplitude at all.
   */
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const ttsAudioCtxRef = useRef<AudioContext | null>(null);
  const ttsRafRef = useRef(0);
  /** Set once the server answers 204/no-key, so we stop re-asking every turn. */
  const ttsUnavailableRef = useRef(false);
  /** Watchdog for a Gemini Live turn that stops producing audio mid-speech. */
  const liveSpeakWatchdogRef = useRef<number | null>(null);
  /** Retry timer for a `SpeechRecognition.start()` that threw (transient). */
  const micRetryTimerRef = useRef<number | null>(null);
  /** Consecutive failed start attempts — stops an infinite retry loop. */
  const micStartAttemptsRef = useRef(0);
  /** The student denied the microphone: don't auto-prompt on every question. */
  const micDeniedRef = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VisaEngine | null>(null);

  const liveSessionRef = useRef<LiveSessionLike | null>(null);
  const liveConnectedRef = useRef(false);
  const liveTokenRef = useRef<LiveTokenResponse | null>(null);
  const liveSessionHandleRef = useRef<string | null>(null);
  const liveIntentionalCloseRef = useRef(false);
  const liveReconnectTimerRef = useRef<number | null>(null);
  /** Ends a Live session at the server's time cap; falls back to text practice. */
  const liveSessionLimitTimerRef = useRef<number | null>(null);
  const liveReconnectAttemptsRef = useRef(0);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveMicNodeRef = useRef<AudioWorkletNode | null>(null);
  const liveMicSilenceRef = useRef<GainNode | null>(null);
  const livePlayerNodeRef = useRef<AudioWorkletNode | null>(null);
  const liveMicWorkletUrlRef = useRef<string | null>(null);
  const livePlayerWorkletUrlRef = useRef<string | null>(null);
  const liveOutputBufferRef = useRef("");
  const livePlaybackActiveRef = useRef(false);
  const liveDropOutputRef = useRef(false);
  const liveGenerationActiveRef = useRef(false);
  const micHoldUntilRef = useRef(0);

  const country = getVisaCountry(countryCode);
  const localizedCountryName = (name: string) => {
    const key = countryTranslationKey(name);
    return key ? tCountry(key) : name;
  };
  /** Interview-language names localized for the card chips (uz/ru). */
  const VISA_LANGUAGE_NAMES: Record<string, { uz: string; ru: string }> = {
    English: { uz: "Ingliz tili", ru: "Английский" },
    Deutsch: { uz: "Nemis tili", ru: "Немецкий" },
    Français: { uz: "Fransuz tili", ru: "Французский" },
    Español: { uz: "Ispan tili", ru: "Испанский" },
    Italiano: { uz: "Italyan tili", ru: "Итальянский" },
    Nederlands: { uz: "Golland tili", ru: "Нидерландский" },
    Dansk: { uz: "Dat tili", ru: "Датский" },
    Norsk: { uz: "Norveg tili", ru: "Норвежский" },
    Svenska: { uz: "Shved tili", ru: "Шведский" },
    Suomi: { uz: "Fin tili", ru: "Финский" },
    Português: { uz: "Portugal tili", ru: "Португальский" },
    "Bahasa Indonesia": { uz: "Indonez tili", ru: "Индонезийский" },
    Русский: { uz: "Rus tili", ru: "Русский" },
    العربية: { uz: "Arab tili", ru: "Арабский" },
    日本語: { uz: "Yapon tili", ru: "Японский" },
    한국어: { uz: "Koreys tili", ru: "Корейский" },
    普通话: { uz: "Xitoy tili", ru: "Китайский" },
    國語: { uz: "Xitoy tili (mandarin)", ru: "Китайский (мандарин)" },
  };
  const languageLabel = (lang: string) => {
    if (locale === "en") return lang;
    const hit = VISA_LANGUAGE_NAMES[lang];
    return hit ? hit[locale as "uz" | "ru"] : lang;
  };

  const countryPickerSearching = countrySearch.trim() !== "";
  const visibleVisaCountries = (() => {
    const preferred = normalizePreferredCountries(activeProfile?.preferredCountries);
    const ranked = rankCountryPicks(VISA_COUNTRIES, {
      isSelected: (c) => c.code === (countryCode ?? "") || matchesAnyCountry(c.name, preferred),
      priorityCodes: ["us", "gb", "de", "ca", "kr", "au", "sg", "jp"],
      codeOf: (c) => c.code.toLowerCase(),
    });
    const filtered = ranked.filter((c) =>
      countrySearchMatch(countrySearch, [c.name, localizedCountryName(c.name), c.code, c.language])
    );
    return collapsePicks(
      filtered,
      8,
      showAllCountries || countryPickerSearching,
      (c) => c.code === (countryCode ?? "")
    );
  })();
  const lastOfficer = [...messages]
    .reverse()
    .find((m) => m.role === "officer");
  const userTurns = messages.filter((m) => m.role === "user").length;
  // Whether this destination has an authored model answer at all. The samples
  // themselves stay in a lazy chunk and are only fetched when the student taps.
  const hasModelAnswer = visaSampleCountryFor(countryCode) !== null;

  async function loadModelAnswer(): Promise<void> {
    if (!hasModelAnswer) return;
    setLoadingModelAnswer(true);
    try {
      const { VISA_INTERVIEW_QA_SAMPLES } = await import("@/lib/samples/exemplars");
      const answer = modelAnswerForTurn(
        VISA_INTERVIEW_QA_SAMPLES,
        countryCode,
        lastOfficer?.text ?? null,
        userTurns,
      );
      if (!answer) return;
      setTextAnswer(answer);
      setLoadedModelAnswer(true);
      setNotice(t("modelAnswerLoaded"));
    } catch (err) {
      console.warn("Visa model answer failed to load:", err);
    } finally {
      setLoadingModelAnswer(false);
    }
  }
  const showTextFallback = engineMode === "fallback" && (!sttSupported || micBlocked);
  const reactorStatus: "LISTENING" | "THINKING" | "SPEAKING" | "IDLE" =
    officerState === "speaking"
      ? "SPEAKING"
      : officerState === "thinking"
        ? "THINKING"
        : listening
          ? "LISTENING"
          : "IDLE";
  const reactorLevel =
    reactorStatus === "SPEAKING"
      ? outputLevel
      : reactorStatus === "LISTENING"
        ? volume
        : reactorStatus === "THINKING"
          ? 0.25
          : 0.02;

  useEffect(() => {
    mountedRef.current = true;
    const synth = getSafeSpeechSynthesis();
    if (!synth) return;
    try {
      void synth.getVoices();
      const warm = () => {
        try {
          void synth.getVoices();
        } catch {
          // Voice list probing is best-effort on flaky engines.
        }
      };
      if (typeof synth.addEventListener === "function") {
        synth.addEventListener("voiceschanged", warm);
        return () => {
          try {
            synth.removeEventListener?.("voiceschanged", warm);
          } catch {
            // Detaching on a half-implemented engine cannot be fatal.
          }
        };
      } else if ("onvoiceschanged" in synth) {
        synth.onvoiceschanged = warm;
        return () => {
          try { synth.onvoiceschanged = null; } catch { /* optional legacy property */ }
        };
      }
    } catch {
      // No voice warm-up — the interview still runs on text and typing.
    }
  }, []);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      sessionRef.current += 1;
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      safeCancelSpeech();
      cancelAnimationFrame(meterRafRef.current);
      meterStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      meterStreamRef.current = null;
      meterAudioCtxRef.current?.close().catch(() => {});
      meterAudioCtxRef.current = null;

      // A neural clip still playing would keep talking over the next screen.
      try {
        ttsSourceRef.current?.stop();
      } catch {
        // already stopped
      }
      ttsSourceRef.current = null;
      cancelAnimationFrame(ttsRafRef.current);
      ttsRafRef.current = 0;
      ttsAudioCtxRef.current?.close().catch(() => {});
      ttsAudioCtxRef.current = null;

      if (speakWatchdogRef.current !== null) {
        window.clearTimeout(speakWatchdogRef.current);
        speakWatchdogRef.current = null;
      }
      if (liveSpeakWatchdogRef.current !== null) {
        window.clearTimeout(liveSpeakWatchdogRef.current);
        liveSpeakWatchdogRef.current = null;
      }
      if (micRetryTimerRef.current !== null) {
        window.clearTimeout(micRetryTimerRef.current);
        micRetryTimerRef.current = null;
      }
      liveIntentionalCloseRef.current = true;
      if (liveReconnectTimerRef.current !== null) {
        window.clearTimeout(liveReconnectTimerRef.current);
      }
      try {
        liveSessionRef.current?.close();
      } catch {
        // ignore
      }
      liveSessionRef.current = null;
      liveMicStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      liveMicStreamRef.current = null;
      liveInputCtxRef.current?.close().catch(() => {});
      liveOutputCtxRef.current?.close().catch(() => {});
      liveInputCtxRef.current = null;
      liveOutputCtxRef.current = null;
      if (liveMicWorkletUrlRef.current) URL.revokeObjectURL(liveMicWorkletUrlRef.current);
      if (livePlayerWorkletUrlRef.current) URL.revokeObjectURL(livePlayerWorkletUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, interim, liveOutputPartial]);

  useEffect(() => {
    function setMode(mode: EngineMode): void {
      engineModeRef.current = mode;
      setEngineMode(mode);
    }

    function setLiveConnectedState(next: boolean): void {
      liveConnectedRef.current = next;
      setLiveConnected(next);
    }

    function setOfficer(next: OfficerState): void {
      officerStateRef.current = next;
      setOfficerState(next);
    }

    function pushMessage(m: VisaMessage): void {
      const clean = cleanTranscript(m.text);
      if (!clean) return;
      const last = messagesRef.current[messagesRef.current.length - 1];
      if (last?.role === m.role && cleanTranscript(last.text) === clean) return;
      messagesRef.current = [...messagesRef.current, { role: m.role, text: clean }];
      setMessages(messagesRef.current);
    }

    function resetConversation(): void {
      messagesRef.current = [];
      setMessages([]);
      liveOutputBufferRef.current = "";
      setLiveOutputPartial("");
    }

    function clearLiveReconnectTimer(): void {
      if (liveReconnectTimerRef.current !== null) {
        window.clearTimeout(liveReconnectTimerRef.current);
        liveReconnectTimerRef.current = null;
      }
    }

    function stopFallbackMeter(): void {
      cancelAnimationFrame(meterRafRef.current);
      meterStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      meterStreamRef.current = null;
      meterAudioCtxRef.current?.close().catch(() => {});
      meterAudioCtxRef.current = null;
      setVolume(0);
    }

    function stopListening(): void {
      if (micRetryTimerRef.current !== null) {
        window.clearTimeout(micRetryTimerRef.current);
        micRetryTimerRef.current = null;
      }
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      listeningRef.current = false;
      setListening(false);
      setInterim("");
      interimRef.current = "";
      stopFallbackMeter();
    }

    function clearLivePlayback(): void {
      livePlayerNodeRef.current?.port.postMessage({ type: "clear" });
      livePlaybackActiveRef.current = false;
      setOutputLevel(0);
      micHoldUntilRef.current = performance.now() + ECHO_GUARD_MS;
    }

    function clearLiveSpeakWatchdog(): void {
      if (liveSpeakWatchdogRef.current !== null) {
        window.clearTimeout(liveSpeakWatchdogRef.current);
        liveSpeakWatchdogRef.current = null;
      }
    }

    /**
     * The officer's turn must always end. If the socket stops mid-speech (or
     * the audio player never drains), mic chunks stay suppressed forever — the
     * student is muted with no way back. Re-open the mic when nothing is
     * playing AND nothing is being generated.
     */
    function armLiveSpeakWatchdog(): void {
      clearLiveSpeakWatchdog();
      liveSpeakWatchdogRef.current = window.setTimeout(() => {
        liveSpeakWatchdogRef.current = null;
        if (engineModeRef.current !== "gemini-live") return;
        if (livePlaybackActiveRef.current || liveGenerationActiveRef.current) {
          armLiveSpeakWatchdog();
          return;
        }
        setOfficer("idle");
        listeningRef.current = true;
        setListening(true);
        micHoldUntilRef.current = 0;
      }, LIVE_SPEAK_WATCHDOG_MS);
    }

    function closeLiveSession(): void {
      clearLiveReconnectTimer();
      clearLiveSessionLimitTimer();
      liveIntentionalCloseRef.current = true;
      try {
        liveSessionRef.current?.close();
      } catch {
        // ignore
      }
      liveSessionRef.current = null;
      setLiveConnectedState(false);
    }

    function stopLiveAudio(): void {
      clearLiveSpeakWatchdog();
      clearLivePlayback();
      liveMicNodeRef.current?.disconnect();
      liveMicSilenceRef.current?.disconnect();
      liveMicNodeRef.current = null;
      liveMicSilenceRef.current = null;
      liveMicStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      liveMicStreamRef.current = null;
      liveInputCtxRef.current?.close().catch(() => {});
      liveOutputCtxRef.current?.close().catch(() => {});
      liveInputCtxRef.current = null;
      liveOutputCtxRef.current = null;
      if (liveMicWorkletUrlRef.current) {
        URL.revokeObjectURL(liveMicWorkletUrlRef.current);
        liveMicWorkletUrlRef.current = null;
      }
      if (livePlayerWorkletUrlRef.current) {
        URL.revokeObjectURL(livePlayerWorkletUrlRef.current);
        livePlayerWorkletUrlRef.current = null;
      }
      setVolume(0);
      setOutputLevel(0);
    }

    function stopLiveAll(): void {
      closeLiveSession();
      stopLiveAudio();
      liveTokenRef.current = null;
      liveSessionHandleRef.current = null;
      liveReconnectAttemptsRef.current = 0;
      liveDropOutputRef.current = false;
      liveGenerationActiveRef.current = false;
      setLiveOutputPartial("");
    }

    async function startFallbackMeter(): Promise<void> {
      const token = sessionRef.current;
      try {
        stopFallbackMeter();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (sessionRef.current !== token || !mountedRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return;
        const ctx = new Ctor();
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        let lastPaint = 0;
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const now = performance.now();
          if (now - lastPaint > 80) {
            lastPaint = now;
            setVolume(Math.min(1, rms * 2.4));
          }
          meterRafRef.current = requestAnimationFrame(tick);
        };
        tick();
        meterAudioCtxRef.current = ctx;
        meterStreamRef.current = stream;
      } catch {
        // Decorative meter only.
      }
    }

    function clearSpeakWatchdog(): void {
      if (speakWatchdogRef.current !== null) {
        window.clearTimeout(speakWatchdogRef.current);
        speakWatchdogRef.current = null;
      }
    }

    /**
     * Stop any neural clip that is still playing (barge-in, mute, unmount).
     * speechSynthesis has its own cancel; this is the server-voice equivalent.
     */
    function stopNeuralSpeech(): void {
      try {
        ttsSourceRef.current?.stop();
      } catch {
        // already stopped — AudioBufferSourceNode.stop() throws if called twice
      }
      ttsSourceRef.current = null;
      cancelAnimationFrame(ttsRafRef.current);
      ttsRafRef.current = 0;
      setOutputLevel(0);
    }

    /**
     * Play a server-rendered voice clip and drive `outputLevel` from the real
     * waveform, so the avatar's mouth tracks the actual audio.
     *
     * Returns false when playback could not start (no AudioContext, decode
     * failure) — the caller then uses the browser voice instead of going silent.
     */
    async function playNeuralSpeech(
      text: string,
      bytes: ArrayBuffer,
      token: number,
      onDone: () => void
    ): Promise<boolean> {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      try {
        const ctx = ttsAudioCtxRef.current ?? new Ctor();
        ttsAudioCtxRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();
        const buffer = await ctx.decodeAudioData(bytes.slice(0));
        if (sessionRef.current !== token) return true;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);
        ttsSourceRef.current = source;

        const bins = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (ttsSourceRef.current !== source) return;
          analyser.getByteFrequencyData(bins);
          let sum = 0;
          for (let i = 0; i < bins.length; i += 1) sum += bins[i];
          setOutputLevel(Math.max(0, Math.min(1, sum / bins.length / 140)));
          ttsRafRef.current = requestAnimationFrame(tick);
        };

        source.onended = () => {
          if (ttsSourceRef.current === source) {
            ttsSourceRef.current = null;
            cancelAnimationFrame(ttsRafRef.current);
            ttsRafRef.current = 0;
            setOutputLevel(0);
          }
          onDone();
        };

        setOfficer("speaking");
        source.start();
        ttsRafRef.current = requestAnimationFrame(tick);
        // Same reasoning as the browser voice: if `onended` never fires the
        // officer must not stay "speaking" with the mic disabled.
        clearSpeakWatchdog();
        speakWatchdogRef.current = window.setTimeout(() => {
          stopNeuralSpeech();
          onDone();
        }, speakWatchdogMs(text));
        return true;
      } catch {
        stopNeuralSpeech();
        return false;
      }
    }

    function fallbackSpeak(text: string): void {
      const token = sessionRef.current;
      if (mutedRef.current || getSafeSpeechSynthesis() === null) {
        setOfficer("idle");
        autoListen(token);
        return;
      }
      // Whatever ends the utterance — onend, onerror, a decode failure or the
      // watchdog — the interview must continue the same way: officer idle, then
      // LISTEN. (onerror used to reset the state without reopening the
      // microphone, so after a question the student had to click the mic
      // themselves; if that click also failed, typing was the only way forward.)
      let finished = false;
      const finishSpeaking = () => {
        if (finished || sessionRef.current !== token) return;
        finished = true;
        clearSpeakWatchdog();
        setOfficer("idle");
        autoListen(token);
      };

      /** The browser voice: always available, no amplitude to read. */
      const browserSpeak = () => {
        if (sessionRef.current !== token || finished) return;
        try {
          safeCancelSpeech();
          const c = getVisaCountry(configRef.current?.countryCode);
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = c?.locale ?? "en-US";
          const selectedVoice = pickVoice(
            utter.lang,
            configRef.current?.gender ?? "male",
          );
          if (selectedVoice) utter.voice = selectedVoice;
          utter.rate = 0.95;
          utter.pitch = configRef.current?.gender === "female" ? 1.15 : 0.85;
          setOfficer("speaking");
          utter.onend = finishSpeaking;
          utter.onerror = finishSpeaking;
          getSafeSpeechSynthesis()?.speak(utter);
          // Some browsers fire neither onend nor onerror (no user activation,
          // throttled tab, cancelled utterance). Without this the officer stayed
          // "speaking" forever and the microphone button stayed disabled.
          clearSpeakWatchdog();
          speakWatchdogRef.current = window.setTimeout(finishSpeaking, speakWatchdogMs(text));
        } catch {
          finishSpeaking();
        }
      };

      // ---- 1. Neural officer voice from the server --------------------------
      // POST /api/visa/tts returns audio/mpeg, or 204 when the deployment has
      // no OpenAI key. 204 is not an error: it means "use the browser voice",
      // which is exactly what the catch/all-other-status branches do too.
      if (ttsUnavailableRef.current) {
        browserSpeak();
        return;
      }
      setOfficer("speaking");
      void (async () => {
        try {
          const res = await fetch("/api/visa/tts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              text,
              gender: configRef.current?.gender ?? "male",
              language: getVisaCountry(configRef.current?.countryCode)?.locale,
            }),
          });
          if (sessionRef.current !== token || finished) return;
          if (res.status === 204) {
            // No key configured anywhere: stop asking for the rest of the session.
            ttsUnavailableRef.current = true;
            browserSpeak();
            return;
          }
          if (!res.ok) {
            browserSpeak();
            return;
          }
          const bytes = await res.arrayBuffer();
          if (sessionRef.current !== token || finished) return;
          const ok = await playNeuralSpeech(text, bytes, token, finishSpeaking);
          if (!ok) browserSpeak();
        } catch {
          if (sessionRef.current === token && !finished) browserSpeak();
        }
      })();
    }

    async function fetchOfficerReply(history: VisaMessage[]): Promise<void> {
      const token = sessionRef.current;
      const c = getVisaCountry(configRef.current?.countryCode);
      if (!c) return;
      setOfficer("thinking");
      setError(null);
      try {
        const res = await fetch("/api/visa/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: c.code,
            gender: configRef.current?.gender ?? "male",
            messages: history,
            profile: activeProfile
              ? {
                  name: activeProfile.name,
                  degreeLevel: activeProfile.degreeLevel,
                  targetMajor: activeProfile.targetMajor,
                }
              : null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (sessionRef.current !== token || !mountedRef.current) return;
        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : t("loadError"),
          );
        }
        const reply =
          typeof data?.reply === "string" ? data.reply.trim() : "";
        if (!reply) throw new Error(t("loadError"));
        pushMessage({ role: "officer", text: reply });
        // No AI provider on the server: the officer asks this country's
        // standard consular questions and the score still comes from the
        // rubric over the student's own answers. Say so — never pretend.
        if (data?.source === "script" || data?.aiUsed === false) {
          setNotice(t("offlinePractice"));
        }
        fallbackSpeak(reply);
      } catch (e) {
        if (sessionRef.current !== token || !mountedRef.current) return;
        setOfficer("idle");
        setError(e instanceof Error ? e.message : t("loadError"));
      }
    }

    async function submitAnswer(text: string): Promise<void> {
      const clean = text.trim();
      if (!clean || submittingRef.current) return;
      submittingRef.current = true;
      if (engineModeRef.current === "fallback") stopListening();
      setNotice(null);
      const history: VisaMessage[] = [
        ...messagesRef.current,
        { role: "user", text: clean },
      ];
      pushMessage({ role: "user", text: clean });
      setTextAnswer("");
      try {
        if (engineModeRef.current === "gemini-live" && liveSessionRef.current) {
          liveSessionRef.current.sendRealtimeInput({ text: clean });
          setOfficer("thinking");
        } else {
          await fetchOfficerReply(history);
        }
      } finally {
        submittingRef.current = false;
      }
    }

    function startListening(): void {
      if (listeningRef.current || officerStateRef.current !== "idle") return;
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        setSttSupported(false);
        return;
      }
      try {
        const c = getVisaCountry(configRef.current?.countryCode);
        const rec = new SR();
        rec.lang = c?.locale ?? "en-US";
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.continuous = false;
        const token = sessionRef.current;
        interimRef.current = "";
        finalReceivedRef.current = false;

        rec.onresult = (e: VisaSpeechEvent) => {
          if (sessionRef.current !== token) return;
          let interimText = "";
          let finalText = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) finalText += r[0].transcript;
            else interimText += r[0].transcript;
          }
          if (interimText) {
            interimRef.current = interimText;
            setInterim(interimText);
          }
          if (finalText.trim()) {
            finalReceivedRef.current = true;
            micReadyRef.current = true;
            void submitAnswer(finalText.trim());
          }
        };
        rec.onerror = (e: VisaSpeechErrorEvent) => {
          if (sessionRef.current !== token) return;
          const kind = classifySpeechError(e.error);
          if (kind === "blocked") {
            micDeniedRef.current = true;
            setMicBlocked(true);
            micReadyRef.current = false;
          } else if (e.error === "no-speech") {
            setNotice(t("noSpeech"));
          } else if (kind === "transient") {
            // "aborted" / "network" / empty: the session hiccuped. Voice must
            // stay available — a transient error used to leave the student
            // with nothing but the text box.
            setNotice(t("noSpeech"));
          }
          stopListening();
        };
        rec.onend = () => {
          if (sessionRef.current !== token) return;
          listeningRef.current = false;
          setListening(false);
          const pending = interimRef.current.trim();
          interimRef.current = "";
          setInterim("");
          stopFallbackMeter();
          // Chrome ends the session on a pause. The student's answer exists as
          // an interim transcript at that moment and used to be thrown away —
          // speak, see nothing happen, type instead. Submit it.
          if (shouldSubmitInterimOnEnd(finalReceivedRef.current, pending)) {
            void submitAnswer(pending);
          }
        };

        recognitionRef.current = rec;
        rec.start();
        listeningRef.current = true;
        setListening(true);
        setNotice(null);
        setMicBlocked(false);
        micStartAttemptsRef.current = 0;
        void startFallbackMeter();
      } catch {
        // A start() that throws is NOT "this browser cannot listen": Chrome
        // throws InvalidStateError while the previous session is still
        // winding down. Marking STT unsupported here killed the voice path for
        // the rest of the interview after a single hiccup — retry instead.
        recognitionRef.current = null;
        listeningRef.current = false;
        setListening(false);
        stopFallbackMeter();
        if (micStartAttemptsRef.current < MAX_MIC_START_ATTEMPTS) {
          micStartAttemptsRef.current += 1;
          if (micRetryTimerRef.current !== null) window.clearTimeout(micRetryTimerRef.current);
          micRetryTimerRef.current = window.setTimeout(() => {
            micRetryTimerRef.current = null;
            if (!mountedRef.current) return;
            if (listeningRef.current || officerStateRef.current !== "idle") return;
            startListening();
          }, MIC_RESTART_DELAY_MS);
        } else {
          setNotice(t("micStartFailed"));
        }
      }
    }

    /**
     * Open the microphone for the student's answer. Called whenever the
     * officer finishes a question, so a student never has to hunt for the
     * button — and never silently loses the voice path because the one-time
     * permission probe at interview start failed.
     */
    async function ensureMicPermissionThenListen(token: number): Promise<void> {
      if (sessionRef.current !== token || !mountedRef.current) return;
      if (!micReadyRef.current) {
        // Already denied this session? Do not pop the prompt on every single
        // question — the student's explicit mic click retries it instead.
        if (micDeniedRef.current) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          stream.getTracks().forEach((tr) => tr.stop());
          if (sessionRef.current !== token || !mountedRef.current) return;
          micReadyRef.current = true;
          setMicBlocked(false);
        } catch {
          micReadyRef.current = false;
          micDeniedRef.current = true;
          setMicBlocked(true);
          return;
        }
      }
      if (sessionRef.current !== token || !mountedRef.current) return;
      if (submittingRef.current) return;
      startListening();
    }

    function autoListen(token: number): void {
      if (sessionRef.current !== token || !mountedRef.current) return;
      if (submittingRef.current) return;
      void ensureMicPermissionThenListen(token);
    }

    function clearLiveSessionLimitTimer(): void {
      if (liveSessionLimitTimerRef.current !== null) {
        window.clearTimeout(liveSessionLimitTimerRef.current);
        liveSessionLimitTimerRef.current = null;
      }
    }

    function armLiveSessionLimit(seconds: number | undefined): void {
      clearLiveSessionLimitTimer();
      if (!seconds || seconds <= 0) return;
      liveSessionLimitTimerRef.current = window.setTimeout(() => {
        liveSessionLimitTimerRef.current = null;
        if (engineModeRef.current !== "gemini-live" || !mountedRef.current) return;
        const err = Object.assign(new Error("Live session time limit"), { code: "session_time_limit" });
        void scheduleFallbackAfterLiveFailure(err);
      }, seconds * 1000);
    }

    async function requestLiveToken(): Promise<LiveTokenResponse> {
      const c = getVisaCountry(configRef.current?.countryCode);
      if (!c) throw new Error("Missing visa country.");
      const res = await fetch("/api/visa/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryCode: c.code,
          gender: configRef.current?.gender ?? "male",
          voice: configRef.current?.voice ?? voice,
          profile: activeProfile
            ? {
                name: activeProfile.name,
                degreeLevel: activeProfile.degreeLevel,
                targetMajor: activeProfile.targetMajor,
              }
            : null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data?.token !== "string") {
        const err: LiveTokenError = new Error(
          typeof data?.error === "string" ? data.error : t("liveTokenError"),
        );
        err.code = typeof data?.code === "string" ? data.code : undefined;
        throw err;
      }
      return {
        maxSessionSeconds:
          typeof data.maxSessionSeconds === "number" && data.maxSessionSeconds > 0
            ? data.maxSessionSeconds
            : undefined,
        token: data.token,
        model:
          typeof data.model === "string"
            ? data.model
            : "gemini-3.1-flash-live-preview",
        apiVersion: typeof data.apiVersion === "string" ? data.apiVersion : "v1beta",
        voice: typeof data.voice === "string" ? data.voice : undefined,
        expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : undefined,
      };
    }

    function shouldSendMicChunk(): boolean {
      if (engineModeRef.current !== "gemini-live") return false;
      if (!liveSessionRef.current || !liveConnectedRef.current) return false;
      if (liveDropOutputRef.current) return false;
      if (officerStateRef.current === "speaking") return false;
      return performance.now() >= micHoldUntilRef.current;
    }

    async function ensureLiveAudio(): Promise<void> {
      if (!browserSupportsGeminiLive()) {
        throw new Error(t("liveUnsupported"));
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) throw new Error(t("liveUnsupported"));

      if (!liveOutputCtxRef.current || !livePlayerNodeRef.current) {
        const outCtx = new Ctor({ sampleRate: GEMINI_OUTPUT_RATE });
        // CSP-blocked blob: URLs or engines without AudioWorklet must fall
        // back to text + standard-voice mode with a notice, not crash.
        if (typeof outCtx.audioWorklet?.addModule !== "function") {
          void outCtx.close().catch(() => {});
          throw new Error(t("liveUnsupported"));
        }
        livePlayerWorkletUrlRef.current = createWorkletUrl(PLAYER_WORKLET_SOURCE);
        await outCtx.audioWorklet.addModule(livePlayerWorkletUrlRef.current);
        const player = new AudioWorkletNode(outCtx, "visa-pcm-player", {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        player.port.onmessage = (event: MessageEvent) => {
          const data = event.data as { type?: unknown; level?: unknown };
          if (data.type === "level" && typeof data.level === "number") {
            setOutputLevel(Math.max(0, Math.min(1, data.level)));
          }
          if (data.type === "drain") {
            livePlaybackActiveRef.current = false;
            micHoldUntilRef.current = performance.now() + ECHO_GUARD_MS;
            if (!liveGenerationActiveRef.current && engineModeRef.current === "gemini-live") {
              setOfficer("idle");
              listeningRef.current = true;
              setListening(true);
            }
          }
        };
        player.connect(outCtx.destination);
        if (outCtx.state === "suspended") await outCtx.resume().catch(() => {});
        liveOutputCtxRef.current = outCtx;
        livePlayerNodeRef.current = player;
      }

      if (!liveInputCtxRef.current || !liveMicNodeRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        const inCtx = new Ctor();
        liveMicWorkletUrlRef.current = createWorkletUrl(MIC_WORKLET_SOURCE);
        await inCtx.audioWorklet.addModule(liveMicWorkletUrlRef.current);
        const src = inCtx.createMediaStreamSource(stream);
        const micNode = new AudioWorkletNode(inCtx, "visa-mic-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });
        const silence = inCtx.createGain();
        silence.gain.value = 0;
        micNode.port.onmessage = (event: MessageEvent) => {
          const data = event.data as {
            type?: unknown;
            buffer?: unknown;
            level?: unknown;
          };
          if (typeof data.level === "number") {
            const level = Math.max(0, Math.min(1, data.level));
            if (officerStateRef.current !== "speaking") setVolume(level);
          }
          if (data.type !== "audio" || !(data.buffer instanceof ArrayBuffer)) {
            return;
          }
          if (!shouldSendMicChunk()) return;
          try {
            liveSessionRef.current?.sendRealtimeInput({
              audio: {
                data: arrayBufferToBase64(data.buffer),
                mimeType: `audio/pcm;rate=${GEMINI_INPUT_RATE}`,
              },
            });
          } catch (err) {
            console.warn("Gemini Live mic send failed:", err);
          }
        };
        src.connect(micNode);
        micNode.connect(silence);
        silence.connect(inCtx.destination);
        if (inCtx.state === "suspended") await inCtx.resume().catch(() => {});
        liveMicStreamRef.current = stream;
        liveInputCtxRef.current = inCtx;
        liveMicNodeRef.current = micNode;
        liveMicSilenceRef.current = silence;
      }
    }

    function enqueueLiveAudio(base64: string): void {
      if (liveDropOutputRef.current) return;
      liveGenerationActiveRef.current = true;
      setOfficer("speaking");
      armLiveSpeakWatchdog();
      listeningRef.current = false;
      setListening(false);
      micHoldUntilRef.current = performance.now() + ECHO_GUARD_MS;
      if (mutedRef.current) return;
      try {
        const buffer = base64ToArrayBuffer(base64);
        livePlaybackActiveRef.current = true;
        livePlayerNodeRef.current?.port.postMessage(
          { type: "enqueue", buffer },
          [buffer],
        );
      } catch (err) {
        console.warn("Gemini Live output decode failed:", err);
      }
    }

    function commitLiveOutput(): void {
      const clean = cleanTranscript(liveOutputBufferRef.current);
      if (clean) pushMessage({ role: "officer", text: clean });
      liveOutputBufferRef.current = "";
      setLiveOutputPartial("");
    }

    function handleLiveMessage(message: LiveServerMessage): void {
      const resumption = message.sessionResumptionUpdate;
      if (resumption?.resumable && resumption.newHandle) {
        liveSessionHandleRef.current = resumption.newHandle;
      }
      if (message.goAway) scheduleLiveReconnect("goAway");

      const server = message.serverContent;
      if (!server) return;

      if (server.interrupted) {
        clearLivePlayback();
        liveDropOutputRef.current = false;
        liveGenerationActiveRef.current = false;
        setOfficer("idle");
        listeningRef.current = true;
        setListening(true);
      }

      const interimText = server.interimInputTranscription?.text;
      if (interimText) {
        interimRef.current = interimText;
        setInterim(interimText);
        if (officerStateRef.current === "idle") {
          listeningRef.current = true;
          setListening(true);
        }
      }

      const inputText = server.inputTranscription?.text;
      if (inputText) {
        const clean = cleanTranscript(inputText);
        if (clean) {
          pushMessage({ role: "user", text: clean });
          setOfficer("thinking");
          listeningRef.current = false;
          setListening(false);
        }
        interimRef.current = "";
        setInterim("");
      }

      for (const text of getTextParts(message)) {
        liveOutputBufferRef.current = mergeTranscript(
          liveOutputBufferRef.current,
          text,
        );
        setLiveOutputPartial(liveOutputBufferRef.current);
      }

      const outputText = server.outputTranscription?.text;
      if (outputText) {
        liveOutputBufferRef.current = mergeTranscript(
          liveOutputBufferRef.current,
          outputText,
        );
        setLiveOutputPartial(liveOutputBufferRef.current);
      }

      for (const audio of getInlineAudioParts(message)) enqueueLiveAudio(audio);

      if (server.generationComplete) {
        liveGenerationActiveRef.current = false;
      }

      if (server.turnComplete) {
        liveGenerationActiveRef.current = false;
        liveDropOutputRef.current = false;
        commitLiveOutput();
        if (!livePlaybackActiveRef.current) {
          micHoldUntilRef.current = performance.now() + ECHO_GUARD_MS;
          setOfficer("idle");
          listeningRef.current = true;
          setListening(true);
        }
      }
    }

    async function connectLiveSession(sendKickoff: boolean): Promise<void> {
      const c = getVisaCountry(configRef.current?.countryCode);
      if (!c) throw new Error("Missing visa country.");
      let token = liveTokenRef.current;
      const expires = token?.expiresAt ? Date.parse(token.expiresAt) : 0;
      if (!token || Number.isNaN(expires) || expires - Date.now() < 90_000) {
        token = await requestLiveToken();
        liveTokenRef.current = token;
      }

      liveIntentionalCloseRef.current = false;
      const ai = new GoogleGenAI({
        apiKey: token.token,
        apiVersion: token.apiVersion || "v1beta",
      });
      const session = await ai.live.connect({
        model: token.model,
        config: {
          responseModalities: [Modality.AUDIO],
          sessionResumption: {
            handle: liveSessionHandleRef.current || undefined,
            transparent: true,
          },
        },
        callbacks: {
          onopen: () => {
            setLiveConnectedState(true);
            setError(null);
            setNotice(null);
          },
          onmessage: handleLiveMessage,
          onerror: (event) => {
            console.warn("Gemini Live socket error:", event.message);
            setNotice(t("liveReconnecting"));
          },
          onclose: (event) => {
            setLiveConnectedState(false);
            if (!liveIntentionalCloseRef.current && mountedRef.current) {
              console.warn("Gemini Live socket closed:", event.code, event.reason);
              scheduleLiveReconnect("close");
            }
          },
        },
      });
      liveSessionRef.current = session as LiveSessionLike;
      setLiveConnectedState(true);
      liveReconnectAttemptsRef.current = 0;
      if (sendKickoff) {
        // The time cap runs from the start of the interview, not each reconnect.
        armLiveSessionLimit(token.maxSessionSeconds);
        setOfficer("thinking");
        listeningRef.current = false;
        setListening(false);
        armLiveSpeakWatchdog();
        session.sendRealtimeInput({ text: buildInterviewUserPrompt(c, []) });
      }
    }

    async function scheduleFallbackAfterLiveFailure(reason: unknown): Promise<void> {
      console.warn("Gemini Live unavailable; falling back:", reason);
      stopLiveAll();
      setMode("fallback");
      setNotice(t(liveFallbackNoticeKey(reason)));
      const needsFirstQuestion = messagesRef.current.length === 0;
      await startFallbackInterview(needsFirstQuestion);
      if (!needsFirstQuestion) setOfficer("idle");
    }

    function scheduleLiveReconnect(reason: string): void {
      if (engineModeRef.current !== "gemini-live") return;
      if (liveIntentionalCloseRef.current) return;
      clearLiveReconnectTimer();
      if (liveReconnectAttemptsRef.current >= 3) {
        void scheduleFallbackAfterLiveFailure(reason);
        return;
      }
      liveReconnectAttemptsRef.current += 1;
      setNotice(t("liveReconnecting"));
      setOfficer("thinking");
      liveReconnectTimerRef.current = window.setTimeout(() => {
        liveReconnectTimerRef.current = null;
        void (async () => {
          try {
            await ensureLiveAudio();
            // A Live token is single-use and each one is a counted session:
            // a reconnect asks the server for a new token (and its allowance check).
            liveTokenRef.current = null;
            await connectLiveSession(false);
            setNotice(null);
          } catch (err) {
            // Out of allowance / disabled / not on this plan: stop retrying and
            // continue in text practice with the reason shown.
            if (liveFallbackNoticeKey(err) !== "liveFallback") {
              void scheduleFallbackAfterLiveFailure(err);
              return;
            }
            scheduleLiveReconnect(err instanceof Error ? err.message : "reconnect");
          }
        })();
      }, 600 + liveReconnectAttemptsRef.current * 350);
    }

    async function startLiveInterview(): Promise<void> {
      setMode("gemini-live");
      if (!browserSupportsGeminiLive()) throw new Error(t("liveUnsupported"));
      await ensureLiveAudio();
      liveTokenRef.current = await requestLiveToken();
      await connectLiveSession(true);
    }

    async function startFallbackInterview(fetchFirst = true): Promise<void> {
      setMode("fallback");
      setLiveConnectedState(false);
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        s.getTracks().forEach((tr) => tr.stop());
        micReadyRef.current = true;
      } catch {
        micReadyRef.current = false;
      }
      if (fetchFirst) await fetchOfficerReply(messagesRef.current);
    }

    async function startInterview(): Promise<void> {
      const c = getVisaCountry(countryCode);
      if (!c || !gender) return;
      const selectedVoice = normalizeVisaLiveVoice(voice, gender);
      configRef.current = { countryCode: c.code, gender, voice: selectedVoice };
      sessionRef.current += 1;
      liveIntentionalCloseRef.current = true;
      closeLiveSession();
      stopLiveAudio();
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      safeCancelSpeech();
      stopNeuralSpeech();
      stopFallbackMeter();
      resetConversation();
      setError(null);
      setNotice(null);
      setAnalysis(null);
      setAnalyzeError(null);
      setTextAnswer("");
      setInterim("");
      setLiveOutputPartial("");
      listeningRef.current = false;
      setListening(false);
      clearSpeakWatchdog();
      micStartAttemptsRef.current = 0;
      micDeniedRef.current = false;
      micReadyRef.current = false;
      setOfficer("thinking");
      setScreen("interview");
      try {
        await startLiveInterview();
      } catch (err) {
        await scheduleFallbackAfterLiveFailure(err);
      }
    }

    async function runAnalysis(): Promise<void> {
      const token = sessionRef.current;
      const c = getVisaCountry(configRef.current?.countryCode);
      if (!c) return;
      commitLiveOutput();
      setAnalyzeError(null);
      try {
        const res = await fetch("/api/visa/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: c.code,
            messages: messagesRef.current,
            uiLanguage: localeToLanguageName(locale),
            homeCountry: activeProfile?.country || undefined,
            // Saves this session to the student's practice history (spec §13).
            profileId: activeProfile?.id ?? undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (sessionRef.current !== token || !mountedRef.current) return;
        // A rubric-only response (no AI provider configured) is still a real
        // result — only reject when neither half arrived.
        if (!res.ok || (typeof data?.recommendations !== "string" && !data?.rubric)) {
          throw new Error(
            typeof data?.error === "string" ? data.error : t("analyzeError"),
          );
        }
        setAnalysis(normalizeVisaAnalysis(data));
        setScreen("result");
        // The session was just persisted server-side — refresh the trend.
        void loadPracticeHistory();
      } catch (e) {
        if (sessionRef.current !== token || !mountedRef.current) return;
        setAnalyzeError(e instanceof Error ? e.message : t("analyzeError"));
      }
    }

    function interruptAssistant(): void {
      if (engineModeRef.current === "gemini-live") {
        const wasProducing =
          officerStateRef.current !== "idle" ||
          livePlaybackActiveRef.current ||
          liveGenerationActiveRef.current;
        clearLivePlayback();
        liveDropOutputRef.current = wasProducing;
        liveGenerationActiveRef.current = false;
        try {
          liveSessionRef.current?.sendRealtimeInput({ audioStreamEnd: true });
        } catch {
          // ignore
        }
        setOfficer("idle");
        listeningRef.current = true;
        setListening(true);
        setNotice(t("interrupted"));
        return;
      }
      safeCancelSpeech();
      stopNeuralSpeech();
      clearSpeakWatchdog();
      stopListening();
      setOfficer("idle");
      autoListen(sessionRef.current);
    }

    function endInterview(): void {
      sessionRef.current += 1;
      clearSpeakWatchdog();
      commitLiveOutput();
      stopListening();
      stopLiveAll();
      safeCancelSpeech();
      stopNeuralSpeech();
      setOfficer("idle");
      setAnalysis(null);
      setAnalyzeError(null);
      setScreen("analyzing");
      void runAnalysis();
    }

    function backToInterview(): void {
      sessionRef.current += 1;
      stopListening();
      stopLiveAll();
      setAnalyzeError(null);
      setScreen("interview");
    }

    function restartInterview(): void {
      void startInterview();
    }

    function backToSetup(): void {
      sessionRef.current += 1;
      clearSpeakWatchdog();
      stopListening();
      stopLiveAll();
      safeCancelSpeech();
      stopNeuralSpeech();
      setOfficer("idle");
      resetConversation();
      setError(null);
      setAnalysis(null);
      setNotice(null);
      setScreen("setup");
    }

    function toggleMute(): void {
      const next = !mutedRef.current;
      mutedRef.current = next;
      setMuted(next);
      if (next) {
        safeCancelSpeech();
        stopNeuralSpeech();
        clearLivePlayback();
      } else {
        liveOutputCtxRef.current?.resume().catch(() => {});
      }
    }

    function onMicClick(): void {
      if (engineModeRef.current === "gemini-live") {
        if (!liveConnected) scheduleLiveReconnect("manual");
        return;
      }
      if (listeningRef.current) {
        const pending = interimRef.current.trim();
        const hadFinal = finalReceivedRef.current;
        stopListening();
        if (pending && !hadFinal) void submitAnswer(pending);
        return;
      }
      if (officerStateRef.current !== "idle" || submittingRef.current) return;
      setNotice(null);
      // An explicit tap is the student asking for the microphone: clear the
      // denial flag so permission is requested again and reset the retry
      // budget, then (re)open the mic.
      micDeniedRef.current = false;
      micStartAttemptsRef.current = 0;
      void ensureMicPermissionThenListen(sessionRef.current);
    }

    function retryReply(): void {
      if (engineModeRef.current === "gemini-live") {
        scheduleLiveReconnect("retry");
        return;
      }
      void fetchOfficerReply(messagesRef.current);
    }

    engineRef.current = {
      startInterview,
      submitAnswer,
      onMicClick,
      toggleMute,
      interruptAssistant,
      endInterview,
      backToInterview,
      restartInterview,
      backToSetup,
      retryReply,
      runAnalysis,
    };
  });

  return (
    <div className="space-y-5">
      {/* Theme-adaptive hero: alabaster-indigo in light mode, obsidian-indigo
          in dark. The old hardcoded slate-950 banner stayed black in Light
          Mode, which read as a rendering fault. */}
      <div className="sb-journey-hero overflow-hidden rounded-3xl border border-slate-200 p-5 shadow-sm sm:p-6 dark:border-slate-700/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/50 bg-indigo-100/70 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-indigo-700 uppercase dark:border-indigo-400/30 dark:bg-indigo-400/15 dark:text-indigo-200">
              <Radio className="h-3.5 w-3.5" />
              {t("aiSimulatorBadge")}
            </div>
            {/* h2: the hub shell that hosts this panel already renders the
                screen's single <h1>. */}
            <h2 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
              🎙️ {t("title")}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-300">
              {t("subtitle")}
            </p>
          </div>
          <div className="rounded-2xl bg-white/60 px-3 py-2 backdrop-blur-sm dark:bg-white/10">
            <Steps current={screen === "setup" ? 0 : screen === "result" ? 2 : 1} />
          </div>
        </div>
      </div>

      {screen === "setup" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-700">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t("countryTitle")}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("countryHint")}</p>
              </div>
              <input
                type="search"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder={t("searchCountryPlaceholder")}
                aria-label={t("searchCountryPlaceholder")}
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-56 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleVisaCountries.map((c) => {
                const selected = countryCode === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCountryCode(c.code)}
                    aria-pressed={selected}
                    className={`relative rounded-xl border-2 p-3 text-left transition-all ${
                      selected
                        ? "border-blue-600 bg-blue-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                    }`}
                  >
                    {selected && (
                      <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                    )}
                    <CountryFlag country={c.name} flagEmoji={c.flag} size="lg" />
                    <div
                      className={`mt-2 break-words text-xs font-bold ${
                        selected ? "text-blue-900" : "text-slate-800"
                      }`}
                    >
                      {localizedCountryName(c.name)}
                    </div>
                    <div
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Globe className="h-2.5 w-2.5" />
                      {languageLabel(c.language)}
                    </div>
                  </button>
                );
              })}
            </div>
            {visibleVisaCountries.length === 0 && (
              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                {t("countryNoMatches")}
              </p>
            )}
            {!countryPickerSearching && VISA_COUNTRIES.length > visibleVisaCountries.length && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllCountries((v) => !v)}
                  aria-expanded={showAllCountries}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {showAllCountries
                    ? t("showFewer")
                    : t("showAllCountries", {
                        total: VISA_COUNTRIES.length,
                        hidden: VISA_COUNTRIES.length - visibleVisaCountries.length,
                      })}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-slate-900">
                {t("genderTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{t("genderHint")}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {(
                  [
                    { id: "male", emoji: "👨‍💼", label: t("male"), desc: t("maleDesc") },
                    { id: "female", emoji: "👩‍💼", label: t("female"), desc: t("femaleDesc") },
                  ] as const
                ).map((g) => {
                  const selected = gender === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGender(g.id);
                        setVoice(normalizeVisaLiveVoice(voice, g.id));
                      }}
                      aria-pressed={selected}
                      className={`relative flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        selected
                          ? "border-blue-600 bg-blue-50 shadow-md"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                      }`}
                    >
                      {selected && (
                        <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-4xl leading-none sm:text-5xl">
                        {g.emoji}
                      </span>
                      <span>
                        <span
                          className={`block text-sm font-bold ${
                            selected ? "text-blue-900" : "text-slate-800"
                          }`}
                        >
                          {g.label}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {g.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-slate-900">
                {t("liveVoiceTitle")}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{t("liveVoiceHint")}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {VISA_LIVE_VOICES.map((v) => {
                  const selected = voice === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVoice(v)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        selected
                          ? "border-cyan-400 bg-slate-950 text-white shadow-md"
                          : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-xs font-black">
                        <Waves className="h-3.5 w-3.5" />
                        {v}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            {t("openRouterInterviewDisclosure")}
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => engineRef.current?.startInterview()}
              disabled={!countryCode || !gender}
              className={`w-full rounded-xl px-6 py-3.5 text-sm font-bold shadow-md transition-all sm:w-auto sm:min-w-72 ${
                countryCode && gender
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              🎙️ {t("start")}
            </button>
            {(!countryCode || !gender) && (
              <p className="text-xs text-slate-400">{t("pickCountryFirst")}</p>
            )}
          </div>
        </div>
      )}

      {screen === "interview" && country && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
            <CountryFlag country={country.name} flagEmoji={country.flag} size="lg" />
            <div className="min-w-0">
              <div className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">
                {localizedCountryName(country.name)}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Globe className="h-3 w-3" />
                {languageLabel(country.language)}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-inset ${
                engineMode === "gemini-live"
                  ? "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:ring-indigo-800"
                  : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              {engineMode === "gemini-live" ? t("aiLiveVoice") : t("aiStandardVoice")}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
              {t("answers", { count: userTurns })}
            </span>
            <button
              type="button"
              onClick={() => engineRef.current?.endInterview()}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700"
            >
              <PhoneOff className="h-4 w-4" />
              {t("end")}
            </button>
          </div>

          {/* Theme-adaptive studio: light alabaster-indigo by day, deep
              obsidian-indigo at night. Replaces the old slab of `bg-slate-950`,
              which was black in both themes. */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-slate-50 via-indigo-50/35 to-sky-50/25 text-slate-900 shadow-lg dark:border-slate-700/80 dark:from-[#0b1325] dark:via-[#111c35] dark:to-[#0d1528] dark:text-slate-100">
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_420px] lg:p-6">
              <div className="relative flex min-h-[430px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-xs backdrop-blur-md dark:border-slate-700/70 dark:bg-[#131f38]/85">
                <AiOrbFaceAvatar
                  state={reactorStatus}
                  level={reactorLevel}
                  countryFlag={country.flag}
                  countryName={localizedCountryName(country.name)}
                  statusLabel={
                    reactorStatus === "SPEAKING"
                      ? `🔊 ${t("avSpeaking")}`
                      : reactorStatus === "LISTENING"
                        ? `🎙️ ${t("avListening")}`
                        : reactorStatus === "THINKING"
                          ? `✨ ${t("avThinking")}`
                          : `✅ ${t("avReady")}`
                  }
                  roleLabel={t("avOfficerRole")}
                />
                <div className="mt-4 grid w-full max-w-xl grid-cols-3 gap-2 text-center text-[10px] font-black tracking-wide text-slate-500 uppercase sm:text-xs dark:text-slate-300">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-700/60 dark:bg-white/5">
                    {liveConnected || engineMode === "fallback" ? t("connected") : t("connecting")}
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-700/60 dark:bg-white/5">
                    {muted ? t("soundOff") : t("soundOn")}
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3 py-2 dark:border-slate-700/60 dark:bg-white/5">
                    {country.language}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-700/70 dark:bg-[#15223c]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-3xl ring-1 ring-slate-200 dark:bg-indigo-950/60 dark:ring-indigo-800/50">
                      {gender === "female" ? "👩‍💼" : "👨‍💼"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                        {t("officer")} · {localizedCountryName(country.name)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {reactorStatus === "SPEAKING"
                          ? t("speaking")
                          : reactorStatus === "THINKING"
                            ? t("thinking")
                            : reactorStatus === "LISTENING"
                              ? t("micListening")
                              : t("micStart")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 min-h-24 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-indigo-800/50 dark:bg-indigo-950/40">
                    {officerState === "thinking" && !lastOfficer && !liveOutputPartial ? (
                      <span className="inline-flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("thinking")}
                      </span>
                    ) : liveOutputPartial ? (
                      <p className="text-sm leading-relaxed font-medium text-slate-800 sm:text-base dark:text-slate-100">
                        &ldquo;{liveOutputPartial}&rdquo;
                      </p>
                    ) : lastOfficer ? (
                      <p className="text-sm leading-relaxed font-medium text-slate-800 sm:text-base dark:text-slate-100">
                        &ldquo;{lastOfficer.text}&rdquo;
                      </p>
                    ) : null}
                  </div>
                  {engineMode === "fallback" && !ttsSupported && (
                    <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                      {t("voiceUnavailable")}
                    </p>
                  )}
                </div>

                <div className="min-h-0 flex-1 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-700/70 dark:bg-[#15223c]">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-400">
                    {t("transcriptTitle")}
                  </h3>
                  <div
                    ref={transcriptRef}
                    className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1"
                  >
                    {messages.length === 0 && !interim && !liveOutputPartial && (
                      <p className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        {t("emptyTranscript")}
                      </p>
                    )}
                    {messages.map((m, i) =>
                      m.role === "officer" ? (
                        <div
                          key={i}
                          className="mr-6 rounded-2xl rounded-tl-sm border border-slate-200/80 bg-slate-100 px-3 py-2 text-xs leading-relaxed text-slate-800 sm:text-sm dark:border-indigo-800/50 dark:bg-indigo-950/60 dark:text-slate-100"
                        >
                          <span className="mb-0.5 block text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                            {t("officer")}
                          </span>
                          {m.text}
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="ml-6 rounded-2xl rounded-tr-sm bg-indigo-600 px-3 py-2 text-xs leading-relaxed text-white shadow-xs sm:text-sm"
                        >
                          <span className="mb-0.5 block text-[10px] font-bold text-indigo-200">
                            {t("you")}
                          </span>
                          {m.text}
                        </div>
                      ),
                    )}
                    {liveOutputPartial && (
                      <div className="mr-6 rounded-2xl rounded-tl-sm border border-dashed border-indigo-300/50 bg-indigo-50 px-3 py-2 text-xs text-slate-600 italic sm:text-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                        <span className="mb-0.5 block text-[10px] font-bold text-cyan-300">
                          {t("officer")}
                        </span>
                        {liveOutputPartial}…
                      </div>
                    )}
                    {interim && (
                      <div className="ml-6 rounded-2xl rounded-tr-sm border border-dashed border-indigo-300/50 bg-indigo-50 px-3 py-2 text-xs text-slate-600 italic sm:text-sm dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-200">
                        <span className="mb-0.5 block text-[10px] font-bold text-indigo-600 dark:text-indigo-300">
                          {t("you")}
                        </span>
                        {interim}…
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/[0.03] p-4">
              <p className="text-center text-xs font-bold text-cyan-100">
                {t("answerIn", { language: country.language })}
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => engineRef.current?.onMicClick()}
                  disabled={engineMode === "gemini-live" ? liveConnected : officerState !== "idle"}
                  className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-black shadow-sm transition-all ${
                    engineMode === "gemini-live"
                      ? liveConnected
                        ? "cursor-not-allowed bg-white/10 text-white/45"
                        : "bg-emerald-500 text-slate-950 sb-ink-on-bright hover:bg-emerald-400"
                      : listening
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : officerState !== "idle"
                          ? "cursor-not-allowed bg-white/10 text-white/45"
                          : "bg-emerald-500 text-slate-950 sb-ink-on-bright hover:bg-emerald-400"
                  }`}
                >
                  {engineMode === "fallback" && listening ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : engineMode === "fallback" && officerState !== "idle" ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  {engineMode === "fallback" && listening ? t("micStop") : t("startShort")}
                </button>

                <button
                  type="button"
                  onClick={() => engineRef.current?.interruptAssistant()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-xs font-black text-white shadow-sm transition-colors hover:bg-red-700"
                >
                  <Square className="h-4 w-4 fill-current" />
                  {t("stop")}
                </button>

                <button
                  type="button"
                  onClick={() => engineRef.current?.toggleMute()}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-black transition-colors ${
                    muted
                      ? "border-white/10 bg-white/10 text-white/60"
                      : "border-cyan-300/25 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15"
                  }`}
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {muted ? t("soundOff") : t("soundOn")}
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                {reactorStatus === "LISTENING"
                  ? t("micListening")
                  : reactorStatus === "THINKING"
                    ? t("thinking")
                    : reactorStatus === "SPEAKING"
                      ? t("speaking")
                      : t("micStart")}
              </p>

              {/* Hybrid input is ALWAYS available: voice when the microphone
                  works, typing when it does not. It used to appear only after a
                  mic failure, so a desktop or mobile student who simply
                  preferred typing had no way in. */}
              <div className="mx-auto mt-4 max-w-2xl space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700/60 dark:bg-white/5">
                {showTextFallback && (
                  <>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {!sttSupported ? t("sttUnsupported") : t("micBlocked")}
                    </p>
                    {sttSupported && (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => engineRef.current?.onMicClick()}
                          disabled={officerState !== "idle"}
                          className="sb-ink-on-bright inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-black text-slate-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Mic className="h-3.5 w-3.5" />
                          {t("micRetry")}
                        </button>
                        <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {t("micInlineHint")}
                        </p>
                        {embedded && (
                          <a
                            href={typeof window === "undefined" ? "/" : window.location.href}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-300/50 bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700/60 dark:bg-indigo-950/40 dark:text-indigo-200"
                          >
                            <Mic className="h-3.5 w-3.5" />
                            {t("micOpenTab")}
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="flex gap-2">
                  <input
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && textAnswer.trim()) {
                        engineRef.current?.submitAnswer(textAnswer);
                      }
                    }}
                    placeholder={t("typePlaceholder")}
                    disabled={officerState !== "idle"}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 disabled:bg-slate-100 dark:border-slate-700/70 dark:bg-[#0f1a30] dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => engineRef.current?.submitAnswer(textAnswer)}
                    disabled={!textAnswer.trim() || officerState !== "idle"}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    {t("send")}
                  </button>
                </div>

                {/* 1-click model answer: fills the box with the authored
                    answer for THIS question so the student can see the level
                    of detail expected, then edit it into their own words. */}
                {hasModelAnswer && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void loadModelAnswer()}
                      disabled={loadingModelAnswer || officerState !== "idle"}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                    >
                      {loadingModelAnswer ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <span aria-hidden>🎯</span>
                      )}
                      {t("loadModelAnswer")}
                    </button>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {loadedModelAnswer ? t("modelAnswerTip") : t("modelAnswerHint")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => engineRef.current?.retryReply()}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700"
              >
                {t("tryAgain")}
              </button>
            </div>
          )}
          {notice && !error && (
            <p className="text-center text-xs text-slate-500">{notice}</p>
          )}
        </div>
      )}

      {screen === "analyzing" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
          {analyzeError ? (
            <div className="mx-auto max-w-md space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
              <p className="text-sm font-medium text-red-700">{analyzeError}</p>
              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => engineRef.current?.runAnalysis()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
                >
                  {t("tryAgain")}
                </button>
                <button
                  type="button"
                  onClick={() => engineRef.current?.backToInterview()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {t("backToInterview")}
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-3">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-blue-600" />
              <p className="text-base font-bold text-slate-900">
                {t("analyzing")}
              </p>
              <p className="text-xs text-slate-500">{t("analyzingHint")}</p>
            </div>
          )}
        </div>
      )}

      {screen === "result" && analysis && country && (
        <div className="space-y-4">
          {/* #9 — the rubric is computed from what was actually said, so it
              renders even when no AI provider is configured. */}
          {analysis.rubric && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900">{t("answerRubric")}</h3>
              <p className="mt-0.5 text-xs text-slate-500">{t("rubricComputed")}</p>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["purposeOfStudy", "Purpose of study"],
                    ["funding", "Funding explained"],
                    ["homeTies", "Ties to home country"],
                    ["nonImmigrantIntent", "Non-immigrant intent"],
                    ["specificity", "Specific detail"],
                    ["languageClarity", "Language clarity"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                      <span>{label}</span>
                      <span>{analysis.rubric!.scores[key]}</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${analysis.rubric!.scores[key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-xs font-bold text-slate-600">{t("rubricOverallReadiness")}</span>
                <span className="text-lg font-extrabold text-slate-900">
                  {analysis.rubric.scores.total}
                  <span className="text-xs font-bold text-slate-400">/100</span>
                </span>
              </div>

              {analysis.rubric.risks.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {analysis.rubric.risks.map((risk, i) => (
                    <li key={`${risk.code}-${i}`} className="flex flex-wrap items-start gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                          risk.severity === "high"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : risk.severity === "medium"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t(`riskSeverity.${risk.severity}` as never)}
                      </span>
                      <span className="min-w-0 flex-1 text-xs text-slate-700">
                        {["profile_major_conflict", "profile_degree_conflict", "profile_budget_conflict", "primary_funding_omitted"].includes(risk.code)
                          ? t(`profileRisk.${risk.code}` as never, risk.params as never)
                          : risk.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {analysis.rubric.unanswered.length > 0 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  {t("unansweredPrefix")} {analysis.rubric.unanswered.join(" / ").slice(0, 200)}
                </p>
              )}

              {analysis.rubric.turnFeedback.length > 0 && (
                <section className="mt-4 border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-extrabold text-slate-800">{t("turnFeedbackTitle")}</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t("turnFeedbackIntro")}</p>
                  <div className="mt-2 space-y-2">
                    {analysis.rubric.turnFeedback.map((turn) => (
                      <article key={turn.turnNumber} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h5 className="text-[11px] font-bold text-slate-800">{t("turnNumber", { number: turn.turnNumber })}</h5>
                          <span className="text-[10px] font-semibold tabular-nums text-slate-500">{t("turnWordCount", { count: turn.answerWordCount })}</span>
                        </div>
                        {turn.question && (
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                            <span className="font-semibold">{t("turnQuestion")}:</span> {turn.question}
                          </p>
                        )}
                        <blockquote className="mt-1 rounded-lg border-l-2 border-indigo-300 bg-white px-2 py-1 text-[11px] leading-relaxed text-slate-700">
                          <span className="font-semibold">{t("turnAnswer")}:</span> “{turn.answerExcerpt}”
                        </blockquote>
                        {turn.evidence.length > 0 && (
                          <div className="mt-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("turnEvidenceTitle")}</p>
                            <ul className="mt-1 flex flex-wrap gap-1">
                              {turn.evidence.map((kind) => (
                                <li key={kind} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">{t(`turnEvidence.${kind}` as never)}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{t("turnConcernTitle")}</p>
                          {turn.concerns.length > 0 ? (
                            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11px] leading-relaxed text-amber-800">
                              {turn.concerns.map((code) => <li key={code}>{t(`turnConcerns.${code}` as never)}</li>)}
                            </ul>
                          ) : (
                            <p className="mt-1 text-[11px] text-slate-500">{t("turnNoConcerns")}</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {analysis.openRouterReview && (analysis.openRouterReview.mercury || analysis.openRouterReview.respan) && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
              <h3 className="text-sm font-extrabold text-slate-900">{t("openRouterReviewTitle")}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{t("openRouterReviewNotice")}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {([
                  ["mercury", analysis.openRouterReview.mercury, t("mercuryReviewLabel")],
                  ["respan", analysis.openRouterReview.respan, t("respanReviewLabel")],
                ] as const).map(([provider, review, label]) => review && (
                  <section key={provider} className="rounded-xl border border-indigo-100 bg-white p-3">
                    <h4 className="text-xs font-bold text-indigo-900">{label}</h4>
                    {!review.available ? (
                      <p className="mt-2 text-[11px] text-slate-500">{t("specialistReviewUnavailable")}</p>
                    ) : (
                      <dl className="mt-2 space-y-2">
                        {Object.entries(review.signals).map(([name, signal]) => (
                          <div key={name} className="rounded-lg bg-slate-50 px-2.5 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              <dt className="font-semibold text-slate-700">{t(`review_${name}`)}</dt>
                              <dd className="font-bold text-indigo-800">
                                {signal.probabilityPercent !== null ? `${signal.probabilityPercent}%` : signal.score !== undefined && signal.score !== null ? `${signal.score}/100` : t("reviewNotScored")}
                              </dd>
                            </div>
                            {provider === "respan" && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{t(`reviewTip_${name}`)}</p>}
                          </div>
                        ))}
                      </dl>
                    )}
                  </section>
                ))}
              </div>
            </div>
          )}

          {/* Gold-standard answers for the same country, scored by the same
              rubric — shown only when a model transcript exists for it. */}
          <VisaModelAnswers
            countryHint={country.code}
            onlyHinted
            title={ts("visaCompareTitle", { country: localizedCountryName(country.name) })}
          />

          {/* Practice history (spec §13) — session-by-session progress. The
              last entry is the session that was just analysed. */}
          {practiceHistory && practiceHistory.count > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <h3 className="text-sm font-extrabold text-slate-900">
                {t("practiceHistory")}
              </h3>
              {practiceHistory.sessions.length >= 2 && (
                <p className="mt-0.5 text-xs text-slate-500">
                  {(() => {
                    const first = practiceHistory.sessions[0].total;
                    const last = practiceHistory.sessions[practiceHistory.sessions.length - 1].total;
                    const delta = last - first;
                    return delta > 0
                      ? t("trendUp", { n: practiceHistory.sessions.length, delta })
                      : "";
                  })()}
                </p>
              )}
              <ul className="mt-3 space-y-1.5">
                {practiceHistory.sessions.map((s, i) => {
                  const prev = i > 0 ? practiceHistory.sessions[i - 1].total : null;
                  const delta = prev == null ? null : s.total - prev;
                  const isCurrent = i === practiceHistory.sessions.length - 1;
                  return (
                    <li
                      key={s.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                        isCurrent ? "bg-emerald-50" : "bg-slate-50"
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-700">
                        {t("session")} {i + 1}
                        {s.country ? ` · ${localizedCountryName(s.country)}` : ""}
                        {isCurrent && (
                          <span className="ml-2 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                            now
                          </span>
                        )}
                      </span>
                      <span className="flex items-baseline gap-1.5">
                        {delta != null && delta !== 0 && (
                          <span
                            className={`text-[10px] font-bold ${
                              delta > 0 ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                        <span className="text-sm font-extrabold text-slate-900">{s.total}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {analysis.chanceDisclaimer && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-800">
              {analysis.chanceDisclaimer}
            </p>
          )}

          {analysis.aiError && (
            <p role="status" className="rounded-xl bg-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
              {analysis.aiError}
            </p>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
            <CountryFlag country={country.name} flagEmoji={country.flag} size="lg" className="mx-auto" />
            <h2 className="mt-2 text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {localizedCountryName(country.name)} · {t("visaChance")}
            </h2>
            <div className="mt-4 flex justify-center">
              <ScoreRing
                value={analysis.estimated_visa_chance}
                label=""
                size={150}
                color="#059669"
              />
            </div>
            <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-3">
              <ScoreRing
                value={analysis.confidence}
                label={t("confidence")}
                size={104}
                color="#2563eb"
              />
              <ScoreRing
                value={analysis.persuasiveness}
                label={t("persuasiveness")}
                size={104}
                color="#7c3aed"
              />
              <ScoreRing
                value={analysis.language_level}
                label={t("languageLevel")}
                size={104}
                color="#d97706"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-5">
            <h3 className="text-sm font-bold text-blue-900">
              ✨ {t("recommendations")}
            </h3>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
              {analysis.recommendations}
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => engineRef.current?.restartInterview()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <RotateCcw className="h-4 w-4" />
              {t("retry")}
            </button>
            <button
              type="button"
              onClick={() => engineRef.current?.backToSetup()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              {t("changeSetup")}
            </button>
          </div>
        </div>
      )}
      {/* Standing small print: this panel can be wrong — say so where it is read. */}
      <AppNote kind="visa" className="mt-2" />
    </div>
  );
}
