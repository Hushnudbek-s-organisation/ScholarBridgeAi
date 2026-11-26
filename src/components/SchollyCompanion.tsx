"use client";

import { Button } from "@/components/ui/Button";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, GraduationCap, Hand, PanelBottom, RotateCcw, RotateCw, Scan, X } from "lucide-react";
import { useSchollyActivityCues } from "./useSchollyActivityCues";
import { SCHOLLY_POINTS_CHANGED, type SchollyPointsChange } from "@/lib/scholly-points-client";
import { SchollyModel } from "./SchollyModel";
import { SchollyInspector } from "./SchollyInspector";
import { SchollyReminderPermission } from "./SchollyReminderPermission";
import { explainPageElement } from "@/lib/scholly-page-guide";
import { SCHOLLY_MOTION_PRIORITY, useSchollyMotion, type SchollyMotion } from "./useSchollyMotion";
import { createSchollyShakeDetector } from "@/lib/scholly-shake";
import { isSchollyTopic, type SchollyLearning } from "@/lib/scholly-learning";
import { schollyMessageText, type SchollyReminderMode } from "@/lib/scholly-messages";

type Position = { x: number; y: number };
type Placement = "corner" | "dock" | Position;
type Topic = { id: string; title: string; hint?: string; keywords: string };
type Message = { role: "user" | "assistant"; text: string; target?: Topic; ai?: boolean };
type SchollyOnboardingProfile = {
  userId?: number;
  namePref: string | null;
  nameConfirmed: boolean;
  lang: string;
  tone: string;
  mode?: SchollyReminderMode;
  tz: string;
  reminderWindow: string | null;
  onboardingState: "not_started" | "in_progress" | "skipped" | "completed";
  onboardingStep: "name" | "reminder" | "tone" | "challenge" | "complete";
  onboardingAnswers: Record<string, unknown>;
  onboardedAt: string | null;
  stageKnown: boolean;
  learning?: SchollyLearning;
};

type BrowserModel = {
  availability(): Promise<string>;
  create(options: { initialPrompts: { role: "system"; content: string }[]; signal: AbortSignal }): Promise<{
    prompt(input: string, options: { signal: AbortSignal }): Promise<string>;
    destroy(): void;
  }>;
};

const strings = {
  uz: {
    open: "Scholly chatini ochish", close: "Chatni yopish", dock: "Pastki panel yoniga qo‘yish", reset: "Burchakka qaytarish",
    prompt: "Savolingizni yozing…", send: "Yuborish", wait: "Scholly javob tayyorlayapti…",
    intro: "ScholarBridgeAI bo‘yicha nima bilmoqchisiz?", guide: "Sayt qo‘llanmasi", ai: "Brauzer AI",
    noMatch: "Qaysi bo‘lim bo‘yicha yordam kerak? Universitetlar, grantlar, arizalar yoki viza suhbatini so‘rashingiz mumkin.",
    dizzy: "Boshim aylanib ketdi!", navigate: "Kerakli bo‘limni shu yerdan oching.", locale: "Uzbek",
    hello: "Salom!", easter: "Menga qara, men ham qiziqarliman!",
    quietToday: "Bugun jim bo‘l",
    wave: "Scholly bilan salomlashish", turn: "Scholly’ni qiyshaytirish",
    learning: "Yordamni moslashtirish", saveLearning: "Mavzularimni eslab qol",
    learningHint: "Scholly mavzular va baholarni eslab qoladi. Umumiy natijalar yordamni yaxshilashga xizmat qiladi. Suhbat matni saqlanmaydi. O‘chirganingizda tarix tozalanadi.",
    shortcuts: "Ko‘p so‘ralgan yordam", helpful: "Foydali", needsWork: "Yetarli emas", feedbackSaved: "Fikringiz saqlandi",
    inspect: "Joyni belgilash", pick: "Tushuntirish uchun sahifadagi joyni bosing yoki Tab va Enter’dan foydalaning.", cancel: "Bekor qilish", selected: "Belgilangan joy", clear: "Belgini olib tashlash", explain: (label: string) => label ? `«${label}» nima?` : "Bu joy nima?",
  },
  en: {
    open: "Open Scholly chat", close: "Close chat", dock: "Place beside the dock", reset: "Return to corner",
    prompt: "Ask about ScholarBridgeAI…", send: "Send", wait: "Scholly is preparing a reply…",
    intro: "What would you like to know about ScholarBridgeAI?", guide: "Site guide", ai: "Browser AI",
    noMatch: "Which part of the site can I help with? Ask about universities, scholarships, applications, or visa practice.",
    dizzy: "I’m dizzy!", navigate: "Open the relevant section below.", locale: "English",
    hello: "Hi!", easter: "Hey, look at me! I can be fun too!",
    quietToday: "Quiet today",
    wave: "Wave to Scholly", turn: "Tilt Scholly",
    learning: "Personalise help", saveLearning: "Remember my help topics",
    learningHint: "Scholly remembers topics and ratings. Totals help improve the site. Chat text is never stored. Turning this off clears this history.",
    shortcuts: "Your frequent help topics", helpful: "Helpful", needsWork: "Needs work", feedbackSaved: "Feedback saved",
    inspect: "Select an element", pick: "Click a part of the page for help, or use Tab and Enter.", cancel: "Cancel", selected: "Selected element", clear: "Clear selection", explain: (label: string) => label ? `What is “${label}”?` : "What is this?",
  },
  ru: {
    open: "Открыть чат Scholly", close: "Закрыть чат", dock: "Поставить рядом с панелью", reset: "Вернуть в угол",
    prompt: "Задайте вопрос о сайте…", send: "Отправить", wait: "Scholly готовит ответ…",
    intro: "Что вы хотите узнать о ScholarBridgeAI?", guide: "Справка по сайту", ai: "ИИ в браузере",
    noMatch: "С каким разделом помочь? Спросите об университетах, стипендиях, заявках или тренировке собеседования.",
    dizzy: "Голова кружится!", navigate: "Откройте нужный раздел ниже.", locale: "Russian",
    hello: "Привет!", easter: "Посмотри на меня — я тоже умею веселиться!",
    quietToday: "Без подсказок сегодня",
    wave: "Помахать Scholly", turn: "Наклонить Scholly",
    learning: "Настроить подсказки", saveLearning: "Запоминать мои темы",
    learningHint: "Scholly запоминает темы и оценки. Общие результаты помогают улучшать сайт. Текст чата не сохраняется. При отключении история удаляется.",
    shortcuts: "Ваши частые темы", helpful: "Полезно", needsWork: "Нужно улучшить", feedbackSaved: "Оценка сохранена",
    inspect: "Выбрать элемент", pick: "Нажмите на элемент страницы или воспользуйтесь Tab и Enter.", cancel: "Отмена", selected: "Выбранный элемент", clear: "Снять выделение", explain: (label: string) => label ? `Что такое «${label}»?` : "Что это?",
  },
};

const related: Record<string, string> = {
  universities: "university universities college program programme universitet dastur oliygoh университет вуз программ",
  scholarships: "scholarship scholarships funding grant stipendiya moliya стипенд грант",
  "study-plan": "plan roadmap ielts toefl sat reja test план тест",
  applications: "apply application tracker ariza topshir заявк поступлен",
  tasks: "deadline task calendar muddat vazifa taqvim дедлайн срок задач календар",
  materials: "documents essay sop materials hujjat insho xat документ эссе",
  "materials/documents": "upload document yukla fayl hujjat загрузи файл документ",
  "visa/speaking": "speaking mock interview john rica suhbat gapirish интервью собеседован",
  "visa/daily-speaking": "daily speaking daily conversation kundalik suhbat har kuni разговор ежедневный",
  visa: "visa departure viza виза виз",
  profile: "profile profil профиль",
};

const positionKey = "sb-scholly-placement";
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(min, max), Math.max(min, value));
const normalize = (value: string) => value.toLowerCase().replace(/[ʻ’‘'`]/g, "").split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 2);

function nearDock(x: number, y: number, size: number, dock: DOMRect | undefined) {
  if (!dock) return false;
  const edge = Math.min(document.documentElement.clientWidth - 8, dock.right + size + 12);
  return y + size >= dock.top - 12 && Math.abs(x + size - edge) <= 24;
}

function dragTop() {
  const header = document.querySelector("[data-sb-shell-header]");
  return Math.ceil(header?.getBoundingClientRect().height ?? 48) + 12;
}

function savedPlacement(hasDock: boolean): Placement {
  try {
    const stored = JSON.parse(localStorage.getItem(positionKey) ?? "null");
    if (stored === "dock" || stored === "corner") return hasDock ? stored : "corner";
    if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
      return { x: clamp(stored.x, 0, 1), y: clamp(stored.y, 0, 1) };
    }
  } catch {}
  return hasDock && window.matchMedia("(max-width: 767px)").matches ? "dock" : "corner";
}

export function SchollyCompanion({ activeTab, activePane, topics = [], navigate, locale = "uz", hasDock = true, profileId = null, profileName = "", profileFacts = [], loadModel = true }: {
  activeTab: string;
  activePane?: string | null;
  topics?: Topic[];
  navigate?: (id: string) => void;
  locale?: string;
  hasDock?: boolean;
  profileId?: number | null;
  profileName?: string;
  profileFacts?: string[];
  loadModel?: boolean;
}) {
  const language = locale === "en" || locale === "ru" ? locale : "uz";
  const t = strings[language];
  const st = useTranslations("scholly");
  const [placement, setPlacement] = useState<Placement>("corner");
  const [held, setHeld] = useState(false);
  const [turn, setTurn] = useState(0);
  const [learningBusy, setLearningBusy] = useState(false);
  const learningLock = useRef(false);
  const [learningError, setLearningError] = useState(false);
  const [ratedMessage, setRatedMessage] = useState<Message | null>(null);
  const [dizzy, setDizzy] = useState(false);
  const dizzyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drag, setDrag] = useState<Position | null>(null);
  const [dockPreview, setDockPreview] = useState(false);
  const [open, setOpen] = useState(false);
  const [storedSchollyProfile, setSchollyProfile] = useState<SchollyOnboardingProfile | null>(null);
  const schollyProfile = storedSchollyProfile?.userId === profileId ? storedSchollyProfile : null;
  const [pointsPop, setPointsPop] = useState<SchollyPointsChange | null>(null);
  const [loadedProfile, setLoadedProfile] = useState<string | null>(null);
  const profileRequest = profileId ? `${profileId}:${locale}` : null;
  const schollyProfileLoaded = !profileRequest || loadedProfile === profileRequest;
  const [onboardingBusy, setOnboardingBusy] = useState(false);
  const [onboardingError, setOnboardingError] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [preferredNameInput, setPreferredNameInput] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<{ element: Element; label: string; answer: string } | null>(null);
  const [previousPage, setPreviousPage] = useState({ activeTab, activePane });
  if (previousPage.activeTab !== activeTab || previousPage.activePane !== activePane) {
    setPreviousPage({ activeTab, activePane });
    setSelecting(false);
    setSelection(null);
  }
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const speakingStudio = activeTab === "visa" && (activePane === "speaking" || activePane === "daily-speaking");
  const quiet = activeTab === "payments"
    || speakingStudio || (activeTab === "visa" && !activePane)
    || (activeTab === "materials" && activePane === "documents");
  const live: SchollyMotion = drag ? "drag" : dizzy ? "shake" : selecting ? "point" : pending ? "think" : "idle";
  const { state: motion, setState: playMotion, hidden } = useSchollyMotion(live, quiet, hasDock && placement === "dock");
  const { cue: activityCue, audience, muteToday } = useSchollyActivityCues(
    profileId, quiet || hidden || keyboardOpen || open || !schollyProfileLoaded, motion, playMotion,
    schollyProfile?.mode ?? "full", activeTab === "dashboard", schollyProfile?.tz ?? "Asia/Tashkent",
  );
  useEffect(() => {
    const celebrateMission = () => { playMotion("happy"); };
    window.addEventListener("scholly:mission-done", celebrateMission);
    return () => window.removeEventListener("scholly:mission-done", celebrateMission);
  }, [playMotion]);
  useEffect(() => {
    let timer: number | undefined;
    function celebratePoints(event: Event) {
      const change = (event as CustomEvent<SchollyPointsChange>).detail;
      if (!change || change.profileId !== profileId || change.awardedPoints <= 0) return;
      setPointsPop(change);
      playMotion("happy");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPointsPop(null), 1900);
    }
    window.addEventListener(SCHOLLY_POINTS_CHANGED, celebratePoints);
    return () => {
      window.removeEventListener(SCHOLLY_POINTS_CHANGED, celebratePoints);
      window.clearTimeout(timer);
    };
  }, [playMotion, profileId]);
  const welcomed = useRef(false);
  const gesture = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean; shake: ReturnType<typeof createSchollyShakeDetector> } | null>(null);
  const moved = useRef(false);
  const fastTaps = useRef<number[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const inspectButton = useRef<HTMLButtonElement>(null);
  const onboardingCard = useRef<HTMLElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const feed = useRef<HTMLDivElement>(null);
  const job = useRef<AbortController | null>(null);
  const engine = useRef<BrowserModel | null>(null);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => setPlacement(savedPlacement(hasDock)));
    return () => cancelAnimationFrame(frame);
  }, [hasDock]);

  useEffect(() => {
    const model = (window as Window & { LanguageModel?: BrowserModel }).LanguageModel;
    if (model) void model.availability().then((status) => {
      if (status === "available") {
        engine.current = model;
        setAiReady(true);
      }
    }).catch(() => {});
    return () => {
      job.current?.abort();
      if (dizzyTimer.current !== null) clearTimeout(dizzyTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!profileRequest || !profileId) return;
    let active = true;
    void fetch(`/api/scholly/profile?profileId=${profileId}`, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) return null;
        return response.json() as Promise<{ profile?: SchollyOnboardingProfile }>;
      })
      .then(async data => {
        if (!active || !data?.profile) return;
        setSchollyProfile(data.profile);
        const deviceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent";
        const preferredLanguage = locale === "en" || locale === "ru" ? locale : "uz";
        if (data.profile.tz !== deviceTimeZone || data.profile.lang !== preferredLanguage) {
          const response = await fetch("/api/scholly/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId, tz: deviceTimeZone, lang: preferredLanguage }),
          });
          if (response.ok) {
            const updated = await response.json() as { profile?: SchollyOnboardingProfile };
            if (active && updated.profile) setSchollyProfile(updated.profile);
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoadedProfile(profileRequest); });
    return () => { active = false; };
  }, [profileId, locale, profileRequest]);

  useEffect(() => {
    function updateSettings(event: Event) {
      const settings = (event as CustomEvent<{ profileId: number; mode: SchollyReminderMode; tone: string }>).detail;
      if (!settings || settings.profileId !== profileId) return;
      setSchollyProfile((current) => current ? { ...current, mode: settings.mode, tone: settings.tone } : current);
    }
    window.addEventListener("scholly:settings-updated", updateSettings);
    return () => window.removeEventListener("scholly:settings-updated", updateSettings);
  }, [profileId]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      // Mobile Safari can pan the viewport to the focused field as the
      // keyboard opens. Its top offset does not reduce the lost height.
      setKeyboardOpen(viewport.scale < 1.1 && innerHeight - viewport.height > 120);
    };
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();
    return () => { viewport.removeEventListener("resize", update); viewport.removeEventListener("scroll", update); };
  }, []);

  useEffect(() => {
    if (quiet || welcomed.current) return;
    const greeting = setTimeout(() => { welcomed.current = true; playMotion("wave"); }, 350);
    return () => clearTimeout(greeting);
  }, [quiet, playMotion]);

  const reserveDockSlot = hasDock && !speakingStudio && !keyboardOpen && (dockPreview || (placement === "dock" && !drag));
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-scholly-docked", reserveDockSlot);
    return () => root.removeAttribute("data-scholly-docked");
  }, [reserveDockSlot]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-scholly-quiet", quiet);
    return () => root.removeAttribute("data-scholly-quiet");
  }, [quiet]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-scholly-inspecting", selecting);
    return () => root.removeAttribute("data-scholly-inspecting");
  }, [selecting]);

  const chatOpen = open && !selecting;
  const returningFromPicker = useRef(false);
  const onboardingState = schollyProfile?.onboardingState;
  useEffect(() => {
    if (!chatOpen || (profileId && !schollyProfileLoaded)) return;
    if (returningFromPicker.current) inspectButton.current?.focus({ preventScroll: true });
    else if (onboardingState && onboardingState !== "completed") onboardingCard.current?.focus({ preventScroll: true });
    else input.current?.focus({ preventScroll: true });
    returningFromPicker.current = false;
  }, [chatOpen, profileId, schollyProfileLoaded, onboardingState]);
  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages, pending, chatOpen]);

  async function saveOnboarding(action: Record<string, unknown>) {
    if (!profileId || onboardingBusy) return false;
    setOnboardingBusy(true);
    setOnboardingError(false);
    try {
      const response = await fetch("/api/scholly/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...action, profileId }),
      });
      const data = await response.json() as { profile?: SchollyOnboardingProfile };
      if (!response.ok || !data.profile) throw new Error("Scholly onboarding save failed");
      setSchollyProfile(data.profile);
      setEditingName(false);
      if (data.profile.onboardingState === "completed") playMotion("happy");
      return true;
    } catch {
      setOnboardingError(true);
      return false;
    } finally {
      setOnboardingBusy(false);
    }
  }

  function place(next: Placement) {
    setPlacement(next);
    if (next === "dock") playMotion("dock");
    try { localStorage.setItem(positionKey, JSON.stringify(next)); } catch {}
  }

  function activateLauncher(event: MouseEvent<HTMLButtonElement>) {
    if (moved.current) { moved.current = false; return; }
    if (event.detail > 0) {
      const now = Date.now();
      fastTaps.current = [...fastTaps.current.filter(time => now - time <= 2_500), now];
      if (fastTaps.current.length >= 5) {
        fastTaps.current = [];
        playMotion("easter");
      }
    }
    if (open) close();
    else setOpen(true);
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    moved.current = false;
    const rect = event.currentTarget.getBoundingClientRect();
    gesture.current = {
      id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false,
      shake: createSchollyShakeDetector({ x: event.clientX, y: event.clientY, time: event.timeStamp }),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setHeld(true);
  }

  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (g.shake({ x: event.clientX, y: event.clientY, time: event.timeStamp })) {
      if (dizzyTimer.current !== null) clearTimeout(dizzyTimer.current);
      setDizzy(true);
      dizzyTimer.current = setTimeout(() => {
        setDizzy(false);
        dizzyTimer.current = null;
      }, 1400);
    }
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 7) return;
    if (!g.moved) {
      setOpen(false);
      setSelection(null);
    }
    g.moved = true;
    const size = event.currentTarget.offsetWidth;
    const dock = document.querySelector('[data-testid="grouped-dock"]')?.getBoundingClientRect();
    const x = clamp(g.left + dx, 8, document.documentElement.clientWidth - size - 8);
    const y = clamp(g.top + dy, dragTop(), innerHeight - size - 8);
    setDrag({ x, y });
    setDockPreview(nearDock(x, y, size, dock));
  }

  function pointerEnd(event: PointerEvent<HTMLButtonElement>, cancelled = false) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    gesture.current = null;
    moved.current = g.moved || cancelled;
    if (g.moved && !cancelled) {
      const size = event.currentTarget.offsetWidth;
      const width = document.documentElement.clientWidth;
      const dock = document.querySelector('[data-testid="grouped-dock"]')?.getBoundingClientRect();
      const x = clamp(g.left + event.clientX - g.x, 8, width - size - 8);
      const top = dragTop();
      const y = clamp(g.top + event.clientY - g.y, top, innerHeight - size - 8);
      const limitY = Math.max(top, (dock?.top ?? innerHeight) - size - 12);
      const snap = nearDock(x, y, size, dock);
      place(snap ? "dock" : {
        x: (x - 8) / Math.max(1, width - size - 16),
        y: (clamp(y, top, limitY) - top) / Math.max(1, limitY - top),
      });
    }
    setDrag(null);
    setDockPreview(false);
    setHeld(false);
  }

  async function saveLearning(signal: { action: "preference"; enabled: boolean } | {
    action: "visits" | "helpful" | "needsWork"; topic: string;
  }) {
    if (!profileId || (signal.action !== "preference" && (!schollyProfile?.learning?.enabled || !isSchollyTopic(signal.topic)))) return false;
    if (learningLock.current) return false;
    learningLock.current = true;
    setLearningBusy(true);
    setLearningError(false);
    try {
      const response = await fetch("/api/scholly/learning", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signal),
      });
      if (!response.ok) throw new Error("Update failed");
      const { learning } = await response.json() as { learning: SchollyLearning };
      setSchollyProfile(current => current?.userId === profileId ? { ...current, learning } : current);
      return true;
    } catch {
      if (signal.action !== "visits") setLearningError(true);
      return false;
    } finally {
      learningLock.current = false;
      setLearningBusy(false);
    }
  }

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || job.current) return;
    const words = normalize(question);
    const current = topics.find(topic => topic.id === activeTab) ?? topics.find(topic => topic.id === activeTab.split("/")[0]);
    const ranked = topics.map(topic => {
      const direct = normalize([topic.title, related[topic.id]].join(" "));
      const details = normalize(topic.keywords);
      const score = words.reduce((total, word) => total + (direct.some(key => word.startsWith(key) || (word.length > 4 && key.startsWith(word))) ? 4 : details.includes(word) ? 1 : 0), 0);
      return { topic, score: score + (score && topic.id === activeTab ? 0.25 : 0) };
    }).sort((a, b) => b.score - a.score);
    const followUp = /(?:\b(?:here|this|shu|bu)\b|здесь|эт[оа]м?)/iu.test(question);
    const selectedHelp = selection?.element.isConnected && (followUp || !ranked[0]?.score) ? selection : null;
    const target = selectedHelp ? undefined : ranked[0]?.score ? ranked[0].topic : followUp ? current : undefined;
    const fallback = selectedHelp?.answer ?? (target ? [target.hint, t.navigate].filter(Boolean).join(" ") : t.noMatch);
    setMessages(previous => [...previous.slice(-18), { role: "user", text: question }]);
    setDraft("");

    let answer = fallback;
    let ai = false;
    const model = engine.current;
    if (model) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 9000);
      job.current = controller;
      setPending(true);
      let session: Awaited<ReturnType<BrowserModel["create"]>> | undefined;
      try {
        session = await model.create({
          signal: controller.signal,
          initialPrompts: [{ role: "system", content: `You are Scholly, the ScholarBridgeAI site navigator. Answer briefly in ${t.locale}. Use only the site guide below. If the guide does not answer the question, say so. Avoid making up facts, application outcomes, visa requirements, or deadlines. Current section: ${current?.title ?? activeTab}. Guide: ${[target, ...ranked.slice(0, 6).map(({ topic }) => topic)].filter(Boolean).map(topic => topic!.title + ": " + (topic!.hint ?? "")).join("\n")}` }],
        });
        const prompt = selectedHelp ? JSON.stringify({ question, selectedElement: selectedHelp.label, pageGuide: selectedHelp.answer }) : question;
        const response = await session.prompt(prompt, { signal: controller.signal });
        if (response.trim()) { answer = response.trim(); ai = true; }
      } catch {
        // The same site guide is available when the model can't answer.
      } finally {
        session?.destroy();
        clearTimeout(timeout);
        job.current = null;
        setPending(false);
      }
    }
    setMessages(previous => [...previous, { role: "assistant", text: answer, target, ai }]);
    if (target) void saveLearning({ action: "visits", topic: target.id });
    if (model) requestAnimationFrame(() => playMotion("talk"));
    else playMotion("talk");
  }

  function close() {
    setOpen(false);
    setSelection(null);
    launcher.current?.focus({ preventScroll: true });
  }

  function selectElement(element: Element) {
    const details = explainPageElement(element, language);
    returningFromPicker.current = true;
    setSelection({ element, ...details });
    setSelecting(false);
    setMessages(previous => [
      ...previous.slice(-18),
      { role: "user", text: t.explain(details.label) },
      { role: "assistant", text: details.answer },
    ]);
  }

  const style = drag
    ? { left: drag.x, top: drag.y, right: "auto", bottom: "auto" }
    : typeof placement === "object"
      ? { left: `calc(8px + ${placement.x} * (100% - var(--scholly-size) - 16px))`,
          top: `calc(var(--scholly-free-top) + ${placement.y} * max(0px, 100% - var(--scholly-above) - var(--scholly-size) - var(--scholly-free-top)))`,
          right: "auto", bottom: "auto" }
      : undefined;

  const animation = keyboardOpen ? "idle" : motion;
  const learning = schollyProfile?.learning;
  const recentAnswer = messages.findLast(message => message.role === "assistant");
  const frequentTopics = learning?.enabled ? topics.flatMap(topic => {
    const count = isSchollyTopic(topic.id) ? learning.topics[topic.id]?.visits ?? 0 : 0;
    return count ? [{ topic, count }] : [];
  }).sort((a, b) => b.count - a.count).slice(0, 3) : [];
  const messageCue = !activityCue || activityCue.kind === "submission" ? null
    : activityCue.kind === "deadline" ? st("deadlineNear", { days: activityCue.daysRemaining })
      : schollyMessageText(activityCue, language, schollyProfile?.tone, audience);
  const submissionCue = animation === "proud" && activityCue?.kind === "submission";
  const earnedPoints = !hidden && !keyboardOpen && pointsPop?.profileId === profileId ? pointsPop.awardedPoints : null;
  const lowPower = typeof navigator === "undefined" || !navigator.hardwareConcurrency || navigator.hardwareConcurrency <= 4;
  const celebrating = animation === "celebrate" || animation === "proud" || animation === "levelup";
  const confettiCount = lowPower ? 12 : 24;
  const displayName = schollyProfile?.namePref || profileName.trim();
  const facts = profileFacts.map(value => value.trim()).filter(Boolean).slice(0, 2).join(", ");
  const onboardingQuestion = schollyProfile?.onboardingStep === "reminder" ? 1
    : schollyProfile?.onboardingStep === "tone" ? 2
      : schollyProfile?.onboardingStep === "challenge" ? 3 : 0;

  if (speakingStudio) return null;

  return (
    <div className="sb-scholly print:hidden" data-no-dock={!hasDock || undefined} data-paused={hidden || undefined} data-quiet={quiet || undefined} data-keyboard={keyboardOpen || undefined} onKeyDown={event => { if (event.key === "Escape" && open) { event.stopPropagation(); close(); } }}>
      <Button variant="unstyled" type="button" ref={launcher} className="sb-scholly-launcher" style={style} aria-label={t.open}
        data-inspecting={selecting || undefined} data-motion={animation}
        aria-expanded={chatOpen} aria-controls="scholly-chat" data-placement={hasDock && placement === "dock" ? "dock" : undefined}
        data-held={held || undefined} data-dizzy={dizzy || undefined} onPointerDown={pointerDown} onPointerMove={pointerMove}
        onPointerUp={event => pointerEnd(event)} onPointerCancel={event => pointerEnd(event, true)}
        onLostPointerCapture={event => pointerEnd(event, true)} onContextMenu={event => event.preventDefault()}
        onPointerEnter={event => { if (event.pointerType === "mouse") playMotion("notice"); }}
        onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            setTurn(value => value + (event.key === "ArrowRight" ? 1 : -1) * Math.PI / 4);
          }
        }} onClick={activateLauncher}>
        <SchollyModel loadModel={loadModel} trackPointer={!quiet} paused={quiet || keyboardOpen || hidden} held={held} motion={animation} turn={turn} />
        {earnedPoints !== null && <span className="sb-scholly-points-pop" aria-hidden="true">+{earnedPoints}</span>}
        {animation === "shake" && <span className="sb-scholly-dizzy-stars" aria-hidden="true">
          <span data-index="0">★</span><span data-index="1">★</span><span data-index="2">★</span>
        </span>}
        {animation === "shake" && <span className="sb-scholly-dizzy-text" aria-hidden="true">{t.dizzy}</span>}
        {animation === "sleep" && <span className="sb-scholly-sleep" aria-hidden="true">Zz</span>}
        {animation === "wave" && !open && !profileId && <span className="sb-scholly-dizzy-text sb-scholly-mood-text" aria-hidden="true">{t.hello}</span>}
        {animation === "happy" && <span className="sb-scholly-confetti" aria-hidden="true">
          {Array.from({ length: lowPower ? 4 : 8 }, (_, index) => <i key={index} data-index={index + 1} />)}
        </span>}
        {celebrating && <span className="sb-scholly-confetti sb-scholly-confetti-celebrate" aria-hidden="true">
          {Array.from({ length: confettiCount }, (_, index) => {
            const angle = (index / confettiCount) * Math.PI * 2;
            return <i key={index} data-index={index + 1}
              style={{ "--x": `${Math.cos(angle) * 50}px`, "--y": `${Math.sin(angle) * 50}px` } as CSSProperties} />;
          })}
        </span>}
        {animation === "easter" && <span className="sb-scholly-dizzy-text sb-scholly-mood-text" aria-hidden="true">{t.easter}</span>}
      </Button>
      {messageCue && <div className="sb-scholly-queue-anchor" style={style} data-placement={hasDock && placement === "dock" ? "dock" : undefined}>
        <div className="sb-scholly-dizzy-text sb-scholly-queue-text"
          data-inline-start={typeof placement === "object" && placement.x < 0.5 || undefined}
          data-below={typeof placement === "object" && placement.y < 0.16 || undefined}>
          <span aria-hidden="true">{messageCue}</span>
          <Button variant="unstyled" type="button" onClick={() => { muteToday(); launcher.current?.focus({ preventScroll: true }); }}>{t.quietToday}</Button>
        </div>
      </div>}
      {submissionCue && <div className="sb-scholly-submission" aria-hidden="true">
        <div className="sb-scholly-submission-card">
          <div className="sb-scholly-submission-art">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/scholly-front.webp" alt="" draggable={false} />
            <GraduationCap aria-hidden="true" />
          </div>
          <strong>{st("submissionMarked")}</strong>
          <span>{st("submissionHint")}</span>
        </div>
      </div>}
      <span className="sr-only" role="status">{submissionCue ? `${st("submissionMarked")} ${st("submissionHint")}` : messageCue ?? (animation === "shake" ? t.dizzy : animation === "easter" ? t.easter : animation === "wave" && !open && !profileId ? t.hello : "")}</span>
      <span className="sr-only" role="status">{earnedPoints === null ? "" : `+${earnedPoints} ${language === "uz" ? "ball" : language === "ru" ? "баллов" : "points"}`}</span>
      <SchollyInspector selecting={selecting} selected={chatOpen ? selection?.element ?? null : null}
        instruction={t.pick} cancel={t.cancel} onCancel={() => {
          returningFromPicker.current = true;
          setSelecting(false);
        }} onSelect={selectElement} />
      {chatOpen && <section className="sb-scholly-chat" id="scholly-chat" aria-label="Scholly">
        <header className="sb-scholly-chat-header">
          <div><strong>Scholly</strong><small>{aiReady ? t.ai : t.guide}</small></div>
          <Button variant="unstyled" type="button" onClick={() => { setTurn(0); playMotion("wave", { priority: SCHOLLY_MOTION_PRIORITY.notice + 1 }); }} aria-label={t.wave} title={t.wave} disabled={quiet}><Hand size={17} /></Button>
          <Button variant="unstyled" type="button" onClick={() => setTurn(value => value + Math.PI / 2)} aria-label={t.turn} title={t.turn}><RotateCw size={17} /></Button>
          {hasDock && <Button variant="unstyled" type="button" onClick={() => place(placement === "dock" ? "corner" : "dock")} title={placement === "dock" ? t.reset : t.dock} aria-label={placement === "dock" ? t.reset : t.dock}>
            {placement === "dock" ? <RotateCcw size={17} /> : <PanelBottom size={17} />}
          </Button>}
          {typeof placement === "object" && <Button variant="unstyled" type="button" onClick={() => place("corner")} title={t.reset} aria-label={t.reset}><RotateCcw size={17} /></Button>}
          <Button variant="unstyled" type="button" onClick={close} title={t.close} aria-label={t.close}><X size={19} /></Button>
        </header>
        <div className="sb-scholly-feed" role="log" ref={feed}>
          {messages.length === 0 && <p>{t.intro}</p>}
          {schollyProfile && <details className="sb-scholly-learning">
            <summary>{t.learning}</summary>
            <label><input type="checkbox" checked={learning?.enabled ?? false} disabled={learningBusy}
              onChange={event => { void saveLearning({ action: "preference", enabled: event.target.checked }); }} />
              {t.saveLearning}
            </label>
            <p>{t.learningHint}</p>
          </details>}
          {learningError && <p role="alert">{st("saveFailed")}</p>}
          {messages.length === 0 && navigate && frequentTopics.length > 0 && <section className="sb-scholly-shortcuts" aria-label={t.shortcuts}>
            <small>{t.shortcuts}</small>
            {frequentTopics.map(({ topic }) => <Button variant="unstyled" key={topic.id} type="button"
              onClick={() => { void saveLearning({ action: "visits", topic: topic.id }); close(); navigate(topic.id); }}>
              {topic.title} →
            </Button>)}
          </section>}
          {schollyProfile && schollyProfile.onboardingState !== "completed" && <section ref={onboardingCard} tabIndex={-1} className="sb-scholly-onboarding" aria-labelledby="scholly-onboarding-title" aria-live="polite">
            <h3 id="scholly-onboarding-title">{st("onboardingTitle")}</h3>
            {schollyProfile.onboardingState === "not_started" && <>
              <p>{displayName ? (facts ? st("welcomeFacts", { name: displayName, facts }) : st("welcomeSimple", { name: displayName })) : st("welcomeGeneric")}</p>
              <div className="sb-scholly-onboarding-actions">
                <Button variant="unstyled" type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "start" })}>{st("start")}</Button>
                <Button variant="unstyled" type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "skip" })}>{st("later")}</Button>
              </div>
            </>}
            {schollyProfile.onboardingState === "skipped" && <>
              <p>{displayName ? st("welcomeSimple", { name: displayName }) : st("welcomeGeneric")}</p>
              <Button variant="unstyled" type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "resume" })}>{st("resume")}</Button>
            </>}
            {schollyProfile.onboardingState === "in_progress" && <>
              {schollyProfile.onboardingStep === "name" && <>
                <p>{st("nameQuestion", { name: displayName || st("welcomeGeneric") })}</p>
                {!editingName ? <div className="sb-scholly-onboarding-actions">
                  <Button variant="unstyled" type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "name", confirmed: true })}>{st("yes")}</Button>
                  <Button variant="unstyled" type="button" disabled={onboardingBusy} onClick={() => { setPreferredNameInput(""); setEditingName(true); }}>{st("differentName")}</Button>
                </div> : <form className="sb-scholly-onboarding-name" onSubmit={event => { event.preventDefault(); void saveOnboarding({ action: "name", confirmed: false, namePref: preferredNameInput }); }}>
                  <input value={preferredNameInput} onChange={event => setPreferredNameInput(event.target.value)} maxLength={40} autoComplete="given-name" aria-label={st("preferredName")} placeholder={st("preferredName")} />
                  <Button variant="unstyled" type="submit" disabled={onboardingBusy || !preferredNameInput.trim()}>{st("save")}</Button>
                </form>}
              </>}
              {schollyProfile.onboardingStep === "reminder" && <>
                <p><small>{st("questionCount", { number: onboardingQuestion, total: schollyProfile.stageKnown ? 2 : 3 })}</small><br />{st("reminderQuestion")}</p>
                <div className="sb-scholly-onboarding-options">
                  {([["before_school", "beforeSchool"], ["after_school", "afterSchool"], ["evening", "evening"], ["not_needed", "notNeeded"]] as const).map(([value, label]) => <Button variant="unstyled" key={value} type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "reminder", value })}>{st(label)}</Button>)}
                </div>
              </>}
              {schollyProfile.onboardingStep === "tone" && <>
                {schollyProfile.reminderWindow && schollyProfile.reminderWindow !== "not_needed" && (
                  <SchollyReminderPermission disabled={onboardingBusy} />
                )}
                <p><small>{st("questionCount", { number: onboardingQuestion, total: schollyProfile.stageKnown ? 2 : 3 })}</small><br />{st("toneQuestion")}</p>
                <div className="sb-scholly-onboarding-options">
                  {([["friendly", "friendly"], ["short", "short"]] as const).map(([value, label]) => <Button variant="unstyled" key={value} type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "tone", value })}>{st(label)}</Button>)}
                </div>
              </>}
              {schollyProfile.onboardingStep === "challenge" && schollyProfile.stageKnown && (
                <Button variant="unstyled" type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "resume" })}>{st("finishSetup")}</Button>
              )}
              {schollyProfile.onboardingStep === "challenge" && !schollyProfile.stageKnown && <>
                <p><small>{st("questionCount", { number: onboardingQuestion, total: 3 })}</small><br />{st("challengeQuestion")}</p>
                <div className="sb-scholly-onboarding-options">
                  {([["university", "university"], ["grant", "grant"], ["ielts", "ielts"], ["documents", "documents"]] as const).map(([value, label]) => <Button variant="unstyled" key={value} type="button" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "challenge", value })}>{st(label)}</Button>)}
                </div>
              </>}
              <Button variant="unstyled" type="button" className="sb-scholly-onboarding-later" disabled={onboardingBusy} onClick={() => void saveOnboarding({ action: "skip" })}>{st("later")}</Button>
            </>}
            {onboardingError && <p role="alert">{st("saveFailed")}</p>}
          </section>}
          {messages.map((message, index) => (
            <div key={index} data-role={message.role}>
              <p>{message.text}</p>
              {message.role === "assistant" && !message.ai && <small>{t.guide}</small>}
              {message.target && navigate && <Button variant="unstyled" type="button" onClick={() => { close(); navigate(message.target!.id); }}>{message.target.title} →</Button>}
              {learning?.enabled && message === recentAnswer && (
                ratedMessage === message ? <small role="status">{t.feedbackSaved}</small> :
                  <div className="sb-scholly-feedback">
                    {(["helpful", "needsWork"] as const).map(action => (
                      <Button variant="unstyled" key={action} type="button" disabled={learningBusy}
                        onClick={async () => {
                          const topic = message.target?.id;
                          if (await saveLearning({ action, topic: isSchollyTopic(topic) ? topic : "general" })) setRatedMessage(message);
                        }}>{t[action]}</Button>
                    ))}
                  </div>
              )}
            </div>
          ))}
          {pending && <p>{t.wait}</p>}
        </div>
        <div className="sb-scholly-inspect-actions">
          <Button variant="unstyled" ref={inspectButton} type="button" className="sb-scholly-inspect-trigger" onClick={() => { setSelection(null); setSelecting(true); }}>
            <Scan size={16} aria-hidden />{t.inspect}
          </Button>
          {selection && <Button variant="unstyled" type="button" className="sb-scholly-inspect-clear" aria-label={t.clear} title={t.clear}
            onClick={() => { setSelection(null); input.current?.focus(); }}><X size={14} aria-hidden /><span>{t.selected}</span></Button>}
        </div>
        <form className="sb-scholly-form" onSubmit={ask}>
          <input ref={input} value={draft} onChange={event => setDraft(event.target.value)} placeholder={t.prompt} aria-label={t.prompt} maxLength={400} />
          <Button variant="unstyled" type="submit" disabled={!draft.trim() || pending} aria-label={t.send}><ArrowUp size={18} /></Button>
        </form>
      </section>}
    </div>
  );

}
