"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useLocale } from "next-intl";
import { Check, Globe, Mic, MicOff, Search, Send, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AiOrbFaceAvatar, type AiOrbFaceState } from "@/components/visa/AiOrbFaceAvatar";
import { SpeakingRoom } from "@/components/visa/SpeakingRoom";
import { CountryFlag } from "@/components/CountryFlag";
import { countrySearchMatch } from "@/lib/countryPicker";
import { destinations, practicePrompt, speakerProfiles, type SpeakerStyle } from "@/lib/daily-speaking";

function noAudioSubscription() { return () => {}; }
function micAvailable() { return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition); }

const copy = {
  uz: {
    title: "Kundalik suhbat", country: "Boradigan mamlakatingizni tanlang", intro: "Mamlakat tilida o‘zingiz xohlagan mavzuda erkin suhbatlashing.",
    search: "Mamlakatni qidirish…", empty: "Mamlakat topilmadi.", more: (n: number) => `Barcha ${n} ta mamlakatni ko‘rsatish`, less: "Kamroq ko‘rsatish",
    speaker: "Suhbatdosh", male: "Erkak", female: "Ayol", style: "Gapirish uslubi",
    calm: "Sokin", calmDetail: "Bir tekis", fast: "Tez", fastDetail: "Tez va serg‘ayrat", irritated: "Jahldor", irritatedDetail: "Qisqa va keskin",
    start: "Suhbatni boshlash", exit: "Sozlamalarga qaytish", replay: "Oxirgi gapni tinglash", mic: "Mikrofondan gapirish", stop: "Mikrofonni to‘xtatish",
    stopVoice: "Ovozni to‘xtatish", input: "Istalgan mavzuda yozing", send: "Yuborish", ready: "Sizning navbatingiz", speaking: "Gapiryapti", listening: "Tinglayapti", thinking: "Javob tayyorlanmoqda",
    model: "Brauzer AI", guided: "Oddiy mashq", fallback: "Brauzer AI’i mavjud bo‘lmasa, suhbat umumiy savollar bilan davom etadi.", unavailable: "Mikrofon ishlamadi. Javobingizni yozishingiz mumkin.",
    noAudio: "Bu til uchun ovoz ijro etilmadi. Gapni chatda o‘qishingiz mumkin.", you: "Siz",
  },
  en: {
    title: "Daily Speaking", country: "Choose your destination country", intro: "Chat about whatever interests you in your destination’s practice language.",
    search: "Search country...", empty: "No countries found.", more: (n: number) => `Show all ${n} countries`, less: "Show fewer",
    speaker: "Conversation partner", male: "Male", female: "Female", style: "Speaking style",
    calm: "Calm", calmDetail: "Steady and relaxed", fast: "Fast", fastDetail: "Quick and energetic", irritated: "Irritated", irritatedDetail: "Short and sharp",
    start: "Start conversation", exit: "Back to setup", replay: "Replay last line", mic: "Speak into microphone", stop: "Stop microphone",
    stopVoice: "Stop audio", input: "Type about anything", send: "Send", ready: "Your turn", speaking: "Speaking", listening: "Listening", thinking: "Preparing a reply",
    model: "Browser AI", guided: "Basic practice", fallback: "When browser AI is unavailable, practice continues with general follow-up questions.", unavailable: "The microphone didn’t work. You can type your reply.",
    noAudio: "Audio did not play in this language. You can read the line in the chat.", you: "You",
  },
  ru: {
    title: "Разговорная практика", country: "Выберите страну", intro: "Общайтесь на любые повседневные темы на языке выбранной страны.",
    search: "Поиск страны…", empty: "Страны не найдены.", more: (n: number) => `Показать все страны (${n})`, less: "Показать меньше",
    speaker: "Собеседник", male: "Мужской", female: "Женский", style: "Стиль речи",
    calm: "Спокойный", calmDetail: "Ровная, спокойная речь", fast: "Быстрый", fastDetail: "Быстро и энергично", irritated: "Раздражённый", irritatedDetail: "Коротко и резко",
    start: "Начать разговор", exit: "Вернуться к настройкам", replay: "Повторить последнюю фразу", mic: "Говорить в микрофон", stop: "Выключить микрофон",
    stopVoice: "Остановить звук", input: "Напишите на любую тему", send: "Отправить", ready: "Ваш ход", speaking: "Говорит", listening: "Слушаю", thinking: "Готовлю ответ",
    model: "ИИ в браузере", guided: "Базовая практика", fallback: "Когда ИИ в браузере недоступен, практика продолжается общими вопросами.", unavailable: "Микрофон не сработал. Вы можете написать ответ.",
    noAudio: "Не удалось воспроизвести звук на этом языке. Фразу можно прочитать в чате.", you: "Вы",
  },
};

const partners = { John: "male", Rica: "female" } as const;
type Partner = keyof typeof partners;
const styles = ["irritated", "fast", "calm"] as const;
const featureCount = 8;

type Line = { role: "user" | "assistant"; text: string };
type Session = { prompt: (input: string, options: { signal: AbortSignal }) => Promise<string>; destroy: () => void };
type Model = {
  availability: () => Promise<string>;
  create: (options: { initialPrompts: { role: "system"; content: string }[]; signal: AbortSignal }) => Promise<Session>;
};
const firstLanguage = (locale: string) => locale.toLowerCase().split("-")[0];

function preferredVoice(voices: SpeechSynthesisVoice[], locale: string, partner: Partner) {
  const female = /\bfemale\b|samantha|zira|ava|kyoko|yuna|hortense|helena|anna|katja/i;
  const male = /\bmale\b|david|daniel|alex|fred|guy|thomas|mark|stefan|ichiro/i;
  const sameLanguage = voices.filter(voice => firstLanguage(voice.lang) === firstLanguage(locale));
  const regional = sameLanguage.filter(voice => voice.lang.toLowerCase() === locale.toLowerCase());
  const candidates = regional.length ? regional : sameLanguage;
  const preferred = partner === "Rica" ? female : male;
  const other = partner === "Rica" ? male : female;
  return candidates.find(voice => preferred.test(voice.name))
    ?? candidates.find(voice => !other.test(voice.name))
    ?? candidates[0];
}

export function DailySpeaking() {
  const locale = useLocale();
  const t = copy[locale === "en" || locale === "ru" ? locale : "uz"];
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const [country, setCountry] = useState("US");
  const englishNames = new Intl.DisplayNames(["en"], { type: "region" });
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [partner, setPartner] = useState<Partner>("John");
  const [style, setStyle] = useState<SpeakerStyle>("calm");
  const [messages, setMessages] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [state, setState] = useState<AiOrbFaceState>("IDLE");
  const [usingAI, setUsingAI] = useState<boolean | null>(null);
  const micSupported = useSyncExternalStore(noAudioSubscription, micAvailable, () => false);
  const [audioPending, setAudioPending] = useState(false);
  const destination = destinations.find(item => item.country === country) ?? destinations[0];
  const countryName = names.of(destination.country) ?? destination.country;
  const searching = Boolean(query.trim());
  const visibleDestinations = searching
    ? destinations.filter(item => countrySearchMatch(query, [
        item.country, names.of(item.country), englishNames.of(item.country), languageName(item.locale),
      ]))
    : showAll ? destinations : destinations.slice(0, featureCount);

  function languageName(code: string) {
    const language = firstLanguage(code);
    return new Intl.DisplayNames([language], { type: "language" }).of(language) ?? language;
  }
  const turn = useRef(0);
  const job = useRef<AbortController | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const playbackTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recognition = useRef<InstanceType<NonNullable<Window["SpeechRecognition"]>> | null>(null);
  const feed = useRef<HTMLDivElement>(null);

  function stopVoice() {
    const speech = utterance.current;
    utterance.current = null;
    setAudioPending(false);
    if (speech) window.speechSynthesis?.cancel();
    clearTimeout(playbackTimeout.current);
  }

  useEffect(() => {
    return () => {
      const pending = job.current;
      job.current = null;
      pending?.abort();
      const record = recognition.current;
      recognition.current = null;
      record?.abort();
      const speech = utterance.current;
      utterance.current = null;
      if (speech) window.speechSynthesis?.cancel();
      clearTimeout(playbackTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages]);

  function reset() {
    job.current?.abort();
    job.current = null;
    const record = recognition.current;
    recognition.current = null;
    record?.abort();
    stopVoice();
    turn.current = 0;
    setState("IDLE");
    setUsingAI(null);
    setNotice("");
    setDraft("");
    setMessages([]);
  }

  function speak(text: string) {
    stopVoice();
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      setState("IDLE");
      setNotice(t.noAudio);
      return;
    }
    const speech = new SpeechSynthesisUtterance(text);
    utterance.current = speech;
    setAudioPending(true);
    speech.lang = destination.locale;
    speech.rate = speakerProfiles[style].rate;
    speech.pitch = speakerProfiles[style].pitch * (partner === "Rica" ? 1.11 : 0.90);
    function finish(failed: boolean) {
      if (utterance.current !== speech) return;
      utterance.current = null;
      setAudioPending(false);
      clearTimeout(playbackTimeout.current);
      setState("IDLE");
      if (failed) setNotice(t.noAudio);
    }
    speech.onstart = () => { if (utterance.current === speech) setState("SPEAKING"); };
    speech.onend = () => finish(false);
    speech.onerror = () => finish(true);
    setState("THINKING");
    try {
      const voice = preferredVoice(synth.getVoices(), destination.locale, partner);
      if (voice) speech.voice = voice;
      playbackTimeout.current = setTimeout(() => {
        if (utterance.current !== speech) return;
        finish(true);
        synth.cancel();
      }, 24000);
      synth.speak(speech);
    } catch {
      finish(true);
    }
  }

  function start() {
    reset();
    const opening = practicePrompt(destination.locale, style);
    setMessages([{ role: "assistant", text: opening }]);
    speak(opening);
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || job.current || !messages.length) return;
    setNotice("");
    setDraft("");
    const history: Line[] = [...messages, { role: "user", text: clean }];
    setMessages(history);
    const step = ++turn.current;
    const controller = new AbortController();
    job.current = controller;
    setState("THINKING");
    let response = practicePrompt(destination.locale, style, step, clean);
    let session: Session | undefined;
    let generated = false;
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const model = (window as Window & { LanguageModel?: Model }).LanguageModel;
      if (model && await model.availability() === "available" && !controller.signal.aborted) {
        session = await model.create({
          signal: controller.signal,
          initialPrompts: [{ role: "system", content: `You are ${partner}, a conversation practice partner in ${countryName}. Reply in the language of ${destination.locale}, using natural local colloquial phrasing. Follow the learner’s chosen topic and respond directly to what they said. Let them change topics freely. Use a few short sentences and ask a natural follow-up when appropriate. ${speakerProfiles[style].prompt}` }],
        });
        const answer = (await session.prompt(JSON.stringify(history.slice(-10)), { signal: controller.signal })).trim();
        if (answer) {
          response = answer.slice(0, 420);
          generated = true;
        }
      }
    } catch {
      // The prepared local dialogue is available while browser AI is unavailable.
    } finally {
      clearTimeout(timeout);
      session?.destroy();
    }
    if (job.current !== controller) return;
    job.current = null;
    setUsingAI(generated);
    setMessages([...history, { role: "assistant", text: response }]);
    speak(response);
  }

  function record() {
    const current = recognition.current;
    if (current) {
      current.stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognizer = new Recognition();
    recognition.current = recognizer;
    recognizer.lang = destination.locale;
    recognizer.interimResults = false;
    recognizer.continuous = false;
    recognizer.onresult = event => {
      if (recognition.current !== recognizer) return;
      const text = event.results[event.resultIndex]?.[0]?.transcript;
      if (text?.trim()) {
        recognition.current = null;
        void send(text);
      }
    };
    recognizer.onerror = () => {
      if (recognition.current !== recognizer) return;
      setNotice(t.unavailable);
    };
    recognizer.onend = () => {
      if (recognition.current !== recognizer) return;
      recognition.current = null;
      setState("IDLE");
    };
    setNotice("");
    try {
      recognizer.start();
      setState("LISTENING");
    } catch {
      recognition.current = null;
      setNotice(t.unavailable);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (state === "IDLE") void send(draft);
  }

  const status = state === "LISTENING" ? t.listening : state === "THINKING" ? t.thinking : state === "SPEAKING" ? t.speaking : t.ready;
  const latest = [...messages].reverse().find(line => line.role === "assistant");

  return (
    <section className="space-y-4 rounded-overlay border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-surface sm:p-6" aria-labelledby="daily-speaking-title">
      <div className="rounded-overlay border border-slate-200 p-3 dark:border-slate-700 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="daily-speaking-title" className="text-xl font-extrabold">{t.country}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.intro}</p>
          </div>
          <label className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-500" aria-hidden />
            <input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={event => setQuery(event.target.value)}
              className="w-full min-h-11 rounded-surface border border-slate-300 bg-canvas py-2 pl-9 pr-2 text-sm dark:border-slate-600" />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label={t.country} role="group">
          {visibleDestinations.map(item => {
            const selected = country === item.country;
            const name = names.of(item.country) ?? item.country;
            return <Button key={item.country} type="button" variant="unstyled" aria-pressed={selected}
              onClick={() => { if (!selected) { reset(); setCountry(item.country); } }}
              className={`relative flex min-w-0 flex-col items-start gap-1.5 rounded-surface border-2 p-3 text-left transition-colors ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-200 hover:border-blue-400 dark:border-slate-700 dark:hover:border-blue-500"}`}>
              <CountryFlag country={name} flagEmoji={item.flag} size="lg" />
              {selected && <Check className="absolute right-2.5 top-2.5 size-4 text-blue-600 dark:text-blue-300" aria-hidden />}
              <strong className="mt-1 break-words text-sm">{name}</strong>
              <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300"><Globe className="size-3" aria-hidden />{languageName(item.locale)}</span>
            </Button>;
          })}
        </div>
        {!visibleDestinations.length && <p role="status" className="mt-2 text-center text-sm">{t.empty}</p>}
        {!searching && <div className="mt-3 flex justify-center">
          <Button type="button" variant="outline" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? t.less : t.more(destinations.length)}</Button>
        </div>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-bold">{t.speaker}</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(partners) as Partner[]).map(name => <label key={name} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-slate-300 px-3 has-checked:border-blue-500 dark:border-slate-600">
              <input type="radio" name="daily-partner" checked={partner === name} onChange={() => { reset(); setPartner(name); }} />
              <span><strong>{name}</strong><small className="ml-1 text-slate-600 dark:text-slate-300">{t[partners[name]]}</small></span>
            </label>)}
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-bold">{t.style}</legend>
          <div className="grid grid-cols-3 gap-2">
            {styles.map(option => <label key={option} className="flex min-h-11 cursor-pointer items-start gap-1.5 rounded-control border border-slate-300 p-2 has-checked:border-blue-500 dark:border-slate-600">
              <input className="mt-1 shrink-0" type="radio" name="daily-style" checked={style === option} onChange={() => { reset(); setStyle(option); }} />
              <span className="min-w-0 break-words"><strong className="block">{t[option]}</strong><small className="text-slate-600 dark:text-slate-300">{t[`${option}Detail`]}</small></span>
            </label>)}
          </div>
        </fieldset>
      </div>
      <div>
        <Button type="button" onClick={start}>{t.start}</Button>
      </div>
      <SpeakingRoom open={messages.length > 0} title={t.title} exitLabel={t.exit} onExit={reset}>
        <div className="grid gap-4 md:grid-cols-[minmax(200px,1fr)_2fr]">
          <div className="grid place-items-center rounded-overlay border border-slate-200 p-3 dark:border-slate-700">
            <AiOrbFaceAvatar state={state} level={0} statusLabel={status} roleLabel={partner}
              temperament={style} countryFlag={destination.flag} countryName={countryName} />
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-overlay border border-slate-200 p-3 dark:border-slate-700">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <strong>{partner} · {t[style]}</strong>{usingAI !== null && <> · {usingAI ? t.model : t.guided}</>}
              {usingAI === false && <p>{t.fallback}</p>}
            </div>
            <div ref={feed} role="log" aria-label={t.title} className="min-h-32 max-h-72 flex-1 space-y-2 overflow-y-auto">
              {messages.map((line, index) => <div key={index} className={`w-fit max-w-[92%] rounded-control px-3 py-2 ${line.role === "user" ? "ml-auto bg-indigo-600 text-white" : "bg-canvas"}`}>
                <strong className="block text-xs">{line.role === "user" ? t.you : partner}</strong>
                <p lang={destination.locale} className="break-words">{line.text}</p>
              </div>)}
            </div>
            {notice && <p role="status" className="text-sm">{notice}</p>}
            <div className="flex flex-wrap gap-2">
              {micSupported && <Button variant="outline" type="button" disabled={state === "SPEAKING" || state === "THINKING"} onClick={record}>
                {state === "LISTENING" ? <MicOff size={16} aria-hidden /> : <Mic size={16} aria-hidden />} {state === "LISTENING" ? t.stop : t.mic}
              </Button>}
              {audioPending ? (
                <Button variant="ghost" type="button" onClick={() => { stopVoice(); setState("IDLE"); }}><VolumeX size={16} aria-hidden /> {t.stopVoice}</Button>
              ) : (
                <Button variant="ghost" type="button" disabled={!latest || state !== "IDLE"} onClick={() => { setNotice(""); if (latest) speak(latest.text); }}><Volume2 size={16} aria-hidden /> {t.replay}</Button>
              )}
            </div>
            <form onSubmit={submit} className="flex gap-2">
              <input aria-label={t.input} placeholder={t.input} value={draft} onChange={event => setDraft(event.target.value)} maxLength={500} className="min-w-0 flex-1 rounded-control border border-slate-300 bg-surface px-2 dark:border-slate-600" />
              <Button type="submit" aria-label={t.send} disabled={!draft.trim() || state !== "IDLE"}><Send size={16} aria-hidden /></Button>
            </form>
          </div>
        </div>
      </SpeakingRoom>
    </section>
  );
}
