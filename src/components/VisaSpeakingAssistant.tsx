"use client";

import React, { useEffect, useRef, useState } from "react";
import { GoogleGenAI, Modality, type LiveServerMessage } from "@google/genai";
import { useLocale, useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { localeToLanguageName } from "@/i18n/config";
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
  Zap,
} from "lucide-react";

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
  return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
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
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
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
  const t = useTranslations("visa");
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
                    ? "bg-emerald-400 text-slate-950"
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

function HudWave({ level, active }: { level: number; active: boolean }) {
  return (
    <div className="flex h-14 items-center justify-center gap-1" aria-hidden="true">
      {Array.from({ length: 29 }, (_, i) => {
        const center = Math.sin((i / 28) * Math.PI);
        const pulse = active ? level : 0.04;
        const height = 8 + pulse * 54 * (0.25 + center * 0.75);
        return (
          <span
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              active ? "bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.75)]" : "bg-slate-500/40"
            }`}
            style={{ height: `${height}px`, opacity: active ? 0.55 + center * 0.45 : 0.35 }}
          />
        );
      })}
    </div>
  );
}

function ReactorCore({
  status,
  level,
  mode,
}: {
  status: "LISTENING" | "THINKING" | "SPEAKING" | "IDLE";
  level: number;
  mode: "gemini-live" | "fallback";
}) {
  const active = status !== "IDLE";
  const palette =
    status === "LISTENING"
      ? "from-emerald-400 via-cyan-300 to-blue-500"
      : status === "THINKING"
        ? "from-amber-300 via-orange-400 to-pink-500"
        : status === "SPEAKING"
          ? "from-fuchsia-400 via-violet-400 to-cyan-300"
          : "from-slate-500 via-slate-400 to-slate-600";
  const scale = 1 + Math.min(0.18, level * 0.18);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex h-64 w-64 items-center justify-center sm:h-80 sm:w-80">
        <div
          className={`absolute inset-7 rounded-full bg-gradient-to-br ${palette} opacity-25 blur-2xl ${
            active ? "animate-pulse" : ""
          }`}
        />
        <div className="absolute inset-2 rounded-full border border-cyan-300/20" />
        <div className="absolute inset-9 rounded-full border border-white/10" />
        <div
          className={`absolute rounded-full border border-cyan-200/30 ${
            active ? "animate-ping" : ""
          }`}
          style={{ inset: `${34 - level * 16}px` }}
        />
        <div
          className={`relative flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br ${palette} text-slate-950 shadow-[0_0_60px_rgba(34,211,238,0.35)] ring-4 ring-white/10 transition-transform duration-100 sm:h-52 sm:w-52`}
          style={{ transform: `scale(${scale})` }}
        >
          <div className="absolute inset-4 rounded-full bg-white/25 blur-md" />
          <Zap className="relative h-8 w-8 text-white drop-shadow sm:h-10 sm:w-10" />
          <span className="relative mt-3 text-xs font-black tracking-[0.28em] text-white sm:text-sm">
            {status}
          </span>
          <span className="relative mt-1 rounded-full bg-black/20 px-2.5 py-0.5 text-[10px] font-bold text-white/85">
            {mode === "gemini-live" ? "Gemini Live" : "Fallback"}
          </span>
        </div>
      </div>
      <HudWave level={level} active={active} />
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
  const t = useTranslations("visa");
  const locale = useLocale();

  const [screen, setScreen] = useState<Screen>("setup");
  const [countryCode, setCountryCode] = useState<string | null>(null);
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
  const [ttsSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );
  const [micBlocked, setMicBlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  /**
   * The response now carries a deterministic rubric computed from the transcript
   * and a disclaimer for the model's own probability. `estimated_visa_chance`
   * is the model's opinion, not a prediction — see lib/visaScoring.
   */
  type VisaAnalysisResponse = VisaAnalysis & {
    aiAvailable?: boolean;
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
      risks: { code: string; message: string; severity: "high" | "medium" | "low" }[];
      unanswered: string[];
      answerCount: number;
      averageAnswerWords: number;
    };
    chanceDisclaimer?: string;
  };
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
  const transcriptRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VisaEngine | null>(null);

  const liveSessionRef = useRef<LiveSessionLike | null>(null);
  const liveConnectedRef = useRef(false);
  const liveTokenRef = useRef<LiveTokenResponse | null>(null);
  const liveSessionHandleRef = useRef<string | null>(null);
  const liveIntentionalCloseRef = useRef(false);
  const liveReconnectTimerRef = useRef<number | null>(null);
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
  const lastOfficer = [...messages]
    .reverse()
    .find((m) => m.role === "officer");
  const userTurns = messages.filter((m) => m.role === "user").length;
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
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const warm = () => window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", warm);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", warm);
      };
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
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      cancelAnimationFrame(meterRafRef.current);
      meterStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      meterStreamRef.current = null;
      meterAudioCtxRef.current?.close().catch(() => {});
      meterAudioCtxRef.current = null;

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

    function closeLiveSession(): void {
      clearLiveReconnectTimer();
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

    function fallbackSpeak(text: string): void {
      const token = sessionRef.current;
      if (mutedRef.current || !("speechSynthesis" in window)) {
        setOfficer("idle");
        autoListen(token);
        return;
      }
      try {
        window.speechSynthesis.cancel();
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
        utter.onend = () => {
          if (sessionRef.current !== token) return;
          setOfficer("idle");
          autoListen(token);
        };
        utter.onerror = () => {
          if (sessionRef.current !== token) return;
          setOfficer("idle");
        };
        window.speechSynthesis.speak(utter);
      } catch {
        setOfficer("idle");
      }
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
          if (e.error === "not-allowed" || e.error === "service-not-allowed") {
            setMicBlocked(true);
            micReadyRef.current = false;
          } else if (e.error === "no-speech") {
            setNotice(t("noSpeech"));
          }
          stopListening();
        };
        rec.onend = () => {
          if (sessionRef.current !== token) return;
          listeningRef.current = false;
          setListening(false);
          setInterim("");
          stopFallbackMeter();
        };

        recognitionRef.current = rec;
        rec.start();
        listeningRef.current = true;
        setListening(true);
        setNotice(null);
        setMicBlocked(false);
        void startFallbackMeter();
      } catch {
        setSttSupported(false);
      }
    }

    function autoListen(token: number): void {
      if (sessionRef.current !== token || !mountedRef.current) return;
      if (submittingRef.current) return;
      if (micReadyRef.current) startListening();
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
        throw new Error(
          typeof data?.error === "string" ? data.error : t("liveTokenError"),
        );
      }
      return {
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
        setOfficer("thinking");
        listeningRef.current = false;
        setListening(false);
        session.sendRealtimeInput({ text: buildInterviewUserPrompt(c, []) });
      }
    }

    async function scheduleFallbackAfterLiveFailure(reason: unknown): Promise<void> {
      console.warn("Gemini Live unavailable; falling back:", reason);
      stopLiveAll();
      setMode("fallback");
      setNotice(t("liveFallback"));
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
            await connectLiveSession(false);
            setNotice(null);
          } catch (err) {
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
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
        setAnalysis(data as VisaAnalysisResponse);
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
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      stopListening();
      setOfficer("idle");
      autoListen(sessionRef.current);
    }

    function endInterview(): void {
      sessionRef.current += 1;
      commitLiveOutput();
      stopListening();
      stopLiveAll();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
      stopListening();
      stopLiveAll();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
      startListening();
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
      <div className="overflow-hidden rounded-3xl border border-blue-100 bg-slate-950 p-5 text-white shadow-lg sm:p-6">
        <div className="absolute" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-black tracking-[0.2em] text-cyan-100 uppercase">
              <Radio className="h-3.5 w-3.5" />
              Gemini Live
            </div>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
              🎙️ {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm">
              {t("subtitle")}
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 backdrop-blur-sm">
            <Steps current={screen === "setup" ? 0 : screen === "result" ? 2 : 1} />
          </div>
        </div>
      </div>

      {screen === "setup" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">
              {t("countryTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("countryHint")}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {VISA_COUNTRIES.map((c) => {
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
                    <div className="text-3xl leading-none">{c.flag}</div>
                    <div
                      className={`mt-2 truncate text-xs font-bold ${
                        selected ? "text-blue-900" : "text-slate-800"
                      }`}
                    >
                      {c.name}
                    </div>
                    <div
                      className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        selected
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Globe className="h-2.5 w-2.5" />
                      {c.language}
                    </div>
                  </button>
                );
              })}
            </div>
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
            <span className="text-3xl leading-none">{country.flag}</span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-slate-900">
                {country.name}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <Globe className="h-3 w-3" />
                {country.language}
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-inset ${
                engineMode === "gemini-live"
                  ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              {engineMode === "gemini-live" ? t("realtimeMode") : t("fallbackMode")}
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

          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-white shadow-xl">
            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_420px] lg:p-6">
              <div className="flex min-h-[440px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.18),transparent_58%)] p-4">
                <ReactorCore status={reactorStatus} level={reactorLevel} mode={engineMode} />
                <div className="mt-3 grid w-full max-w-xl grid-cols-3 gap-2 text-center text-[10px] font-black tracking-wide text-slate-300 uppercase sm:text-xs">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {liveConnected || engineMode === "fallback" ? t("connected") : t("connecting")}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {muted ? t("soundOff") : t("soundOn")}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {country.language}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/15">
                      {gender === "female" ? "👩‍💼" : "👨‍💼"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black">
                        {t("officer")} · {country.name}
                      </div>
                      <div className="text-xs text-slate-400">
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
                  <div className="mt-4 min-h-24 rounded-2xl bg-black/25 p-4 ring-1 ring-white/10 ring-inset">
                    {officerState === "thinking" && !lastOfficer && !liveOutputPartial ? (
                      <span className="inline-flex items-center gap-2 text-sm text-cyan-100">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("thinking")}
                      </span>
                    ) : liveOutputPartial ? (
                      <p className="text-sm leading-relaxed font-medium text-cyan-50 sm:text-base">
                        &ldquo;{liveOutputPartial}&rdquo;
                      </p>
                    ) : lastOfficer ? (
                      <p className="text-sm leading-relaxed font-medium text-cyan-50 sm:text-base">
                        &ldquo;{lastOfficer.text}&rdquo;
                      </p>
                    ) : null}
                  </div>
                  {engineMode === "fallback" && !ttsSupported && (
                    <p className="mt-2 text-[11px] text-slate-400">
                      {t("voiceUnavailable")}
                    </p>
                  )}
                </div>

                <div className="min-h-0 flex-1 rounded-3xl border border-white/10 bg-black/20 p-4">
                  <h3 className="text-xs font-black tracking-[0.2em] text-slate-400 uppercase">
                    {t("transcriptTitle")}
                  </h3>
                  <div
                    ref={transcriptRef}
                    className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1"
                  >
                    {messages.length === 0 && !interim && !liveOutputPartial && (
                      <p className="py-8 text-center text-xs text-slate-500">
                        {t("emptyTranscript")}
                      </p>
                    )}
                    {messages.map((m, i) =>
                      m.role === "officer" ? (
                        <div
                          key={i}
                          className="mr-6 rounded-2xl rounded-tl-sm bg-cyan-400/10 px-3 py-2 text-xs leading-relaxed text-cyan-50 ring-1 ring-cyan-300/15 ring-inset sm:text-sm"
                        >
                          <span className="mb-0.5 block text-[10px] font-bold text-cyan-300">
                            {t("officer")}
                          </span>
                          {m.text}
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="ml-6 rounded-2xl rounded-tr-sm bg-blue-600 px-3 py-2 text-xs leading-relaxed text-white sm:text-sm"
                        >
                          <span className="mb-0.5 block text-[10px] font-bold text-blue-200">
                            {t("you")}
                          </span>
                          {m.text}
                        </div>
                      ),
                    )}
                    {liveOutputPartial && (
                      <div className="mr-6 rounded-2xl rounded-tl-sm border border-dashed border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-50 italic sm:text-sm">
                        <span className="mb-0.5 block text-[10px] font-bold text-cyan-300">
                          {t("officer")}
                        </span>
                        {liveOutputPartial}…
                      </div>
                    )}
                    {interim && (
                      <div className="ml-6 rounded-2xl rounded-tr-sm border border-dashed border-blue-300/40 bg-blue-500/10 px-3 py-2 text-xs text-blue-50 italic sm:text-sm">
                        <span className="mb-0.5 block text-[10px] font-bold text-blue-200">
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
                        : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : listening
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : officerState !== "idle"
                          ? "cursor-not-allowed bg-white/10 text-white/45"
                          : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
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

              {showTextFallback && (
                <div className="mx-auto mt-4 max-w-2xl space-y-2 rounded-2xl bg-white/10 p-3 ring-1 ring-white/10 ring-inset">
                  <p className="text-[11px] text-slate-300">
                    {!sttSupported ? t("sttUnsupported") : t("micBlocked")}
                  </p>
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
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300 disabled:bg-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => engineRef.current?.submitAnswer(textAnswer)}
                      disabled={!textAnswer.trim() || officerState !== "idle"}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-600"
                    >
                      <Send className="h-4 w-4" />
                      {t("send")}
                    </button>
                  </div>
                </div>
              )}
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
              <h3 className="text-sm font-extrabold text-slate-900">Answer rubric</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Computed from your transcript — not from the model, so the same answers always
                score the same.
              </p>

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
                <span className="text-xs font-bold text-slate-600">Overall readiness</span>
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
                        {risk.severity}
                      </span>
                      <span className="min-w-0 flex-1 text-xs text-slate-700">{risk.message}</span>
                    </li>
                  ))}
                </ul>
              )}

              {analysis.rubric.unanswered.length > 0 && (
                <p className="mt-3 text-[11px] text-slate-500">
                  Not substantively answered: {analysis.rubric.unanswered.join(" / ").slice(0, 200)}
                </p>
              )}
            </div>
          )}

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
                        {s.country ? ` · ${s.country}` : ""}
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xs">
            <p className="text-3xl leading-none">{country.flag}</p>
            <h2 className="mt-2 text-lg font-extrabold text-slate-900">
              {country.name} · {t("visaChance")}
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
    </div>
  );
}
