"use client";

import React, { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { StudentProfile } from "./Navbar";
import { localeToLanguageName } from "@/i18n/config";
import {
  VISA_COUNTRIES,
  getVisaCountry,
  type VisaAnalysis,
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
  RotateCcw,
  Send,
  Square,
  Volume2,
  VolumeX,
  Radio,
  Waves,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Web Speech API typings (not in TS DOM lib) — 100% free, built into browsers.
// SpeechRecognition = voice → text, speechSynthesis = text → voice.
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
  }
}

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

/**
 * Pick a speechSynthesis voice matching the interview locale + officer
 * gender. Browser voices rarely expose gender, so this is a name heuristic
 * with graceful fallbacks (same language → any English → default).
 */
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
    // NOTE: check female first — "female" contains "male".
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
    )
      score += 2;
    if (v.default) score += 1;
    return { v, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.v ?? null;
}

// ---------------------------------------------------------------------------
// Small visual helpers
// ---------------------------------------------------------------------------

function Steps({ current }: { current: 0 | 1 | 2 }) {
  const t = useTranslations("visa");
  const labels = [t("stepSetup"), t("stepInterview"), t("stepResult")];
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className="h-px w-6 bg-slate-200 sm:w-10" />}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                i === current
                  ? "bg-blue-600 text-white"
                  : i < current
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-xs font-semibold ${
                i === current ? "text-blue-700" : "text-slate-400"
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

/** Animated equalizer bars for the officer "speaking" indicator. */
function EqBars({ active }: { active: boolean }) {
  return (
    <div className="flex h-6 items-end gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-full bg-white/90 ${active ? "visa-eq-bar" : ""}`}
          style={{
            height: "100%",
            transformOrigin: "bottom",
            animationDelay: `${i * 0.12}s`,
            opacity: active ? 1 : 0.35,
            transform: active ? undefined : "scaleY(0.25)",
          }}
        />
      ))}
    </div>
  );
}

/** Live microphone volume meter (shown while recording). */
function VolumeBars({ level }: { level: number }) {
  return (
    <div className="flex h-10 items-end justify-center gap-1" aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => {
        const spread = Math.sin((i / 10) * Math.PI); // 0 → 1 → 0
        const h = 4 + level * 34 * (0.35 + 0.65 * spread);
        return (
          <div
            key={i}
            className="w-1.5 rounded-full bg-blue-500 transition-[height] duration-75"
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

/** Animated SVG score ring. */
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type Screen = "setup" | "interview" | "analyzing" | "result";
type OfficerState = "idle" | "thinking" | "speaking";

/** Stable entry points the UI calls (implemented by the engine effect). */
interface VisaEngine {
  startInterview: () => void;
  submitAnswer: (text: string) => void;
  onMicClick: () => void;
  toggleMute: () => void;
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
  const [messages, setMessages] = useState<VisaMessage[]>([]);
  const [officerState, setOfficerState] = useState<OfficerState>("idle");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [muted, setMuted] = useState(false);
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
  const [analysis, setAnalysis] = useState<VisaAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);

  // Refs for async-safe flow (session tokens, streams, recognition handles).
  const sessionRef = useRef(0);
  const mountedRef = useRef(true);
  const messagesRef = useRef<VisaMessage[]>([]);
  const listeningRef = useRef(false);
  const officerStateRef = useRef<OfficerState>("idle");
  const mutedRef = useRef(false);
  const configRef = useRef<{
    countryCode: string;
    gender: VisaOfficerGender;
  } | null>(null);
  const submittingRef = useRef(false);
  const micReadyRef = useRef(false);
  const recognitionRef = useRef<VisaSpeechRecognition | null>(null);
  const interimRef = useRef("");
  const finalReceivedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const meterStreamRef = useRef<MediaStream | null>(null);
  const meterRafRef = useRef(0);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<VisaEngine | null>(null);

  const country = getVisaCountry(countryCode);
  const lastOfficer = [...messages]
    .reverse()
    .find((m) => m.role === "officer");
  const userTurns = messages.filter((m) => m.role === "user").length;
  const showTextFallback = !sttSupported || micBlocked;

  // Voice-list warmup (speechSynthesis.getVoices() is async on some browsers).
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

  // Full cleanup on unmount (tab switch away mid-interview).
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
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, []);

  // Auto-scroll transcript.
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, interim]);

  // -------------------------------------------------------------------------
  // Interview engine. All logic lives in ONE effect publishing entry points
  // to `engineRef`, using plain hoisted function declarations on purpose: the
  // conversation is inherently circular
  // (fetch → speak → auto-listen → listen → submit → fetch), which chained
  // useCallback hooks cannot express (circular inference + TDZ). The effect
  // re-runs every render, so closures over t/locale/profile are always fresh;
  // everything async-safe flows through refs + session tokens.
  // -------------------------------------------------------------------------
  useEffect(() => {
    function pushMessage(m: VisaMessage): void {
      messagesRef.current = [...messagesRef.current, m];
      setMessages(messagesRef.current);
    }

    function resetConversation(): void {
      messagesRef.current = [];
      setMessages([]);
    }

    function stopMeter(): void {
      cancelAnimationFrame(meterRafRef.current);
      meterStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      meterStreamRef.current = null;
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
      setVolume(0);
    }

    async function startMeter(): Promise<void> {
      const token = sessionRef.current;
      try {
        stopMeter();
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (sessionRef.current !== token || !mountedRef.current) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
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
        audioCtxRef.current = ctx;
        meterStreamRef.current = stream;
      } catch {
        // Meter is decorative — recording can still work without it.
      }
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
      stopMeter();
    }

    function speak(text: string): void {
      const token = sessionRef.current;
      if (mutedRef.current || !("speechSynthesis" in window)) {
        officerStateRef.current = "idle";
        setOfficerState("idle");
        autoListen(token);
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const c = getVisaCountry(configRef.current?.countryCode);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = c?.locale ?? "en-US";
        const voice = pickVoice(
          utter.lang,
          configRef.current?.gender ?? "male",
        );
        if (voice) utter.voice = voice;
        utter.rate = 0.95;
        utter.pitch = configRef.current?.gender === "female" ? 1.15 : 0.85;
        officerStateRef.current = "speaking";
        setOfficerState("speaking");
        utter.onend = () => {
          if (sessionRef.current !== token) return;
          officerStateRef.current = "idle";
          setOfficerState("idle");
          autoListen(token);
        };
        utter.onerror = () => {
          if (sessionRef.current !== token) return;
          officerStateRef.current = "idle";
          setOfficerState("idle");
        };
        window.speechSynthesis.speak(utter);
      } catch {
        officerStateRef.current = "idle";
        setOfficerState("idle");
      }
    }

    async function fetchOfficerReply(history: VisaMessage[]): Promise<void> {
      const token = sessionRef.current;
      const c = getVisaCountry(configRef.current?.countryCode);
      if (!c) return;
      officerStateRef.current = "thinking";
      setOfficerState("thinking");
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
        speak(reply);
      } catch (e) {
        if (sessionRef.current !== token || !mountedRef.current) return;
        officerStateRef.current = "idle";
        setOfficerState("idle");
        setError(e instanceof Error ? e.message : t("loadError"));
      }
    }

    async function submitAnswer(text: string): Promise<void> {
      const clean = text.trim();
      if (!clean || submittingRef.current) return;
      submittingRef.current = true;
      stopListening();
      setNotice(null);
      const history: VisaMessage[] = [
        ...messagesRef.current,
        { role: "user", text: clean },
      ];
      pushMessage({ role: "user", text: clean });
      setTextAnswer("");
      try {
        await fetchOfficerReply(history);
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
          stopMeter();
        };

        recognitionRef.current = rec;
        rec.start();
        listeningRef.current = true;
        setListening(true);
        setNotice(null);
        setMicBlocked(false);
        void startMeter();
      } catch {
        setSttSupported(false);
      }
    }

    // Continuous conversation: after the officer finishes speaking, start
    // listening automatically when the mic has worked before; otherwise wait
    // for a manual tap (browsers may require a gesture for mic permission).
    function autoListen(token: number): void {
      if (sessionRef.current !== token || !mountedRef.current) return;
      if (submittingRef.current) return;
      if (micReadyRef.current) startListening();
    }

    async function startInterview(): Promise<void> {
      const c = getVisaCountry(countryCode);
      if (!c || !gender) return;
      configRef.current = { countryCode: c.code, gender };
      sessionRef.current += 1;
      const token = sessionRef.current;
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      stopMeter();
      resetConversation();
      setError(null);
      setNotice(null);
      setAnalysis(null);
      setAnalyzeError(null);
      setTextAnswer("");
      setInterim("");
      listeningRef.current = false;
      setListening(false);
      officerStateRef.current = "thinking";
      setOfficerState("thinking");
      setScreen("interview");
      // Best-effort mic pre-warm (the Start tap is a user gesture, so the
      // permission prompt is allowed here and auto-listen works right away).
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((tr) => tr.stop());
        if (sessionRef.current === token) micReadyRef.current = true;
      } catch {
        micReadyRef.current = false;
      }
      if (sessionRef.current !== token || !mountedRef.current) return;
      await fetchOfficerReply([]);
    }

    async function runAnalysis(): Promise<void> {
      const token = sessionRef.current;
      const c = getVisaCountry(configRef.current?.countryCode);
      if (!c) return;
      setAnalyzeError(null);
      try {
        const res = await fetch("/api/visa/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            countryCode: c.code,
            messages: messagesRef.current,
            uiLanguage: localeToLanguageName(locale),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (sessionRef.current !== token || !mountedRef.current) return;
        if (!res.ok || typeof data?.recommendations !== "string") {
          throw new Error(
            typeof data?.error === "string" ? data.error : t("analyzeError"),
          );
        }
        setAnalysis(data as VisaAnalysis);
        setScreen("result");
      } catch (e) {
        if (sessionRef.current !== token || !mountedRef.current) return;
        setAnalyzeError(e instanceof Error ? e.message : t("analyzeError"));
      }
    }

    function endInterview(): void {
      sessionRef.current += 1;
      stopListening();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      officerStateRef.current = "idle";
      setOfficerState("idle");
      setAnalysis(null);
      setAnalyzeError(null);
      setScreen("analyzing");
      void runAnalysis();
    }

    function backToInterview(): void {
      sessionRef.current += 1;
      stopListening();
      setAnalyzeError(null);
      setScreen("interview");
    }

    function restartInterview(): void {
      sessionRef.current += 1;
      if (countryCode && gender)
        configRef.current = { countryCode, gender };
      stopListening();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      resetConversation();
      setError(null);
      setNotice(null);
      setAnalysis(null);
      setAnalyzeError(null);
      setTextAnswer("");
      setScreen("interview");
      void fetchOfficerReply([]);
    }

    function backToSetup(): void {
      sessionRef.current += 1;
      stopListening();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      officerStateRef.current = "idle";
      setOfficerState("idle");
      resetConversation();
      setError(null);
      setAnalysis(null);
      setScreen("setup");
    }

    function toggleMute(): void {
      const next = !mutedRef.current;
      mutedRef.current = next;
      setMuted(next);
      if (next) {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        officerStateRef.current = "idle";
        setOfficerState("idle");
      }
    }

    function onMicClick(): void {
      if (listeningRef.current) {
        // Manual stop: submit the interim transcript when nothing final yet.
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
      void fetchOfficerReply(messagesRef.current);
    }

    engineRef.current = {
      startInterview,
      submitAnswer,
      onMicClick,
      toggleMute,
      endInterview,
      backToInterview,
      restartInterview,
      backToSetup,
      retryReply,
      runAnalysis,
    };
  });

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              🎙️ {t("title")}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-blue-100 sm:text-sm">
              {t("subtitle")}
            </p>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur-sm">
            <Steps current={screen === "setup" ? 0 : screen === "result" ? 2 : 1} />
          </div>
        </div>
      </div>

      {/* ============================ SETUP ============================ */}
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
                    onClick={() => setGender(g.id)}
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

      {/* ========================== INTERVIEW ========================== */}
      {screen === "interview" && country && (
        <div className="space-y-4">
          {/* Top status bar */}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-extrabold text-red-600 ring-1 ring-red-200 ring-inset">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
              </span>
              {t("live")}
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

          {/* Reactor core HUD */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-indigo-900/20 bg-gradient-to-b from-slate-900 via-indigo-950 to-black p-6 shadow-2xl">
            <div className="relative flex h-48 w-48 items-center justify-center">
              {/* Outer ring */}
              <div className={`absolute h-44 w-44 rounded-full border-2 opacity-40 ${
                officerState === "speaking" ? "border-blue-400" :
                officerState === "thinking" ? "border-amber-400" :
                listening ? "border-emerald-400" : "border-slate-500"
              }`} />
              {/* Middle ring */}
              <div className={`absolute h-36 w-36 rounded-full border opacity-60 animate-pulse ${
                officerState === "speaking" ? "border-blue-300" :
                officerState === "thinking" ? "border-amber-300" :
                listening ? "border-emerald-300" : "border-slate-400"
              }`} />
              {/* Core */}
              <div className={`relative h-24 w-24 rounded-full shadow-2xl transition-all duration-300 ${
                officerState === "speaking" ? "reactor-core-speaking scale-110" :
                officerState === "thinking" ? "reactor-core-thinking scale-105" :
                listening ? "reactor-core-listening scale-100" : "reactor-core-idle scale-95"
              }`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-blue-900/60 to-transparent" />
                {/* State label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">
                    {officerState === "speaking" ? "SPEAKING" :
                     officerState === "thinking" ? "THINKING" :
                     listening ? "LISTENING" : "IDLE"}
                  </span>
                  <span className="text-2xl font-black">
                    {officerState === "speaking" ? "🔊" :
                     officerState === "thinking" ? "⚡" :
                     listening ? "🎤" : "●"}
                  </span>
                </div>
              </div>
              {/* Wave indicators around core */}
              <div className="absolute inset-0 animate-[spin_8s_linear_infinite]">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400/60" 
                    style={{
                      transform: `rotate(${i * 60}deg) translateX(56px) translateY(-50%)`,
                      animation: `pulse ${1.5 + i * 0.2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Live transcript below reactor */}
            <div className="w-full max-w-lg rounded-xl bg-black/40 p-3 backdrop-blur-md ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-[11px] font-bold text-blue-300 uppercase tracking-wide">
                <Waves className="h-4 w-4" />
                {t("live")}
              </div>
              <div className="mt-2 min-h-[3.5rem] text-sm font-medium text-white/90 leading-relaxed">
                {officerState === "thinking" && !lastOfficer ? (
                  <span className="inline-flex items-center gap-2 text-blue-200">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    {t("thinking")}
                  </span>
                ) : lastOfficer ? (
                  <p>&ldquo;{lastOfficer.text}&rdquo;</p>
                ) : (
                  <p className="text-white/40">{t("micStart")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Top status bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-xs sm:p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl ring-2 ring-white/30">
                {gender === "female" ? "👩‍💼" : "👨‍💼"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">
                  {t("officer")} · {country.name}
                </div>
                <div className="text-xs text-blue-200">
                  {officerState === "speaking"
                    ? t("speaking")
                    : officerState === "thinking"
                      ? t("thinking")
                      : listening
                        ? t("micListening")
                        : t("micStart")}
                </div>
              </div>
              <EqBars active={officerState === "speaking"} />
            </div>
            <div className="mt-4 min-h-16 rounded-xl bg-black/25 p-4 backdrop-blur-sm">
              {officerState === "thinking" && !lastOfficer ? (
                <span className="inline-flex items-center gap-2 text-sm text-blue-100">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("thinking")}
                </span>
              ) : lastOfficer ? (
                <p className="text-sm leading-relaxed font-medium sm:text-base">
                  &ldquo;{lastOfficer.text}&rdquo;
                </p>
              ) : null}
            </div>
            {!ttsSupported && (
              <p className="mt-2 text-[11px] text-blue-200">
                {t("voiceUnavailable")}
              </p>
            )}
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h3 className="text-xs font-bold tracking-wide text-slate-500 uppercase">
              {t("transcriptTitle")}
            </h3>
            <div
              ref={transcriptRef}
              className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1"
            >
              {messages.length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">
                  {t("emptyTranscript")}
                </p>
              )}
              {messages.map((m, i) =>
                m.role === "officer" ? (
                  <div
                    key={i}
                    className="mr-8 rounded-xl rounded-tl-sm bg-blue-50 px-3 py-2 text-xs leading-relaxed text-slate-800 ring-1 ring-blue-100 ring-inset sm:text-sm"
                  >
                    <span className="mb-0.5 block text-[10px] font-bold text-blue-600">
                      {t("officer")}
                    </span>
                    {m.text}
                  </div>
                ) : (
                  <div
                    key={i}
                    className="ml-8 rounded-xl rounded-tr-sm bg-blue-600 px-3 py-2 text-xs leading-relaxed text-white sm:text-sm"
                  >
                    <span className="mb-0.5 block text-[10px] font-bold text-blue-200">
                      {t("you")}
                    </span>
                    {m.text}
                  </div>
                ),
              )}
              {interim && (
                <div className="ml-8 rounded-xl rounded-tr-sm border border-dashed border-blue-300 bg-blue-50 px-3 py-2 text-xs text-slate-600 italic sm:text-sm">
                  {interim}…
                </div>
              )}
            </div>
          </div>

          {/* Errors / notices */}
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

          {/* Controls */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-center text-xs font-bold text-blue-700">
              {t("answerIn", { language: country.language })}
            </p>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => engineRef.current?.toggleMute()}
                title={muted ? t("soundOff") : t("soundOn")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors ${
                  muted
                    ? "border-slate-200 bg-slate-100 text-slate-500"
                    : "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                {muted ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {muted ? t("soundOff") : t("soundOn")}
                </span>
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.onMicClick()}
                disabled={officerState !== "idle"}
                title={listening ? t("micStop") : t("micStart")}
                className={`flex h-16 w-16 items-center justify-center rounded-full shadow-lg transition-all ${
                  listening
                    ? "animate-pulse bg-red-600 text-white hover:bg-red-700"
                    : officerState !== "idle"
                      ? "cursor-not-allowed bg-slate-200 text-slate-400"
                      : "bg-blue-600 text-white hover:scale-105 hover:bg-blue-700"
                }`}
              >
                {listening ? (
                  <Square className="h-6 w-6 fill-current" />
                ) : officerState !== "idle" ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </button>

              <button
                type="button"
                onClick={() => engineRef.current?.endInterview()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-700"
              >
                <PhoneOff className="h-4 w-4" />
                <span className="hidden sm:inline">{t("end")}</span>
              </button>
            </div>

            <p className="text-center text-xs text-slate-500">
              {listening
                ? t("micListening")
                : officerState === "thinking"
                  ? t("thinking")
                  : officerState === "speaking"
                    ? t("speaking")
                    : t("micStart")}
            </p>

            {listening && <VolumeBars level={volume} />}

            {showTextFallback && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 ring-inset">
                <p className="text-[11px] text-slate-500">
                  {!sttSupported ? t("sttUnsupported") : t("micBlocked")}
                </p>
                <div className="flex gap-2">
                  <input
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && textAnswer.trim())
                        engineRef.current?.submitAnswer(textAnswer);
                    }}
                    placeholder={t("typePlaceholder")}
                    disabled={officerState !== "idle"}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 disabled:bg-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => engineRef.current?.submitAnswer(textAnswer)}
                    disabled={!textAnswer.trim() || officerState !== "idle"}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Send className="h-4 w-4" />
                    {t("send")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================== ANALYZING ========================== */}
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

      {/* ============================ RESULT ============================ */}
      {screen === "result" && analysis && country && (
        <div className="space-y-4">
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
