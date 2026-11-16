import type { SchollySegment } from "./scholly-audience";
import type { SchollyReminderPreferences } from "./scholly-reminders";

type Language = "uz" | "en" | "ru";
type MessageCopy = Record<Language, readonly [friendly: string, serious: string, short: string]>;

export type SchollyQueuedMessage =
  | { kind: "deadline"; key: string; daysRemaining: number }
  | { kind: "submission"; key: string }
  | { kind: "badge" | "level"; key: string; name: string }
  | { kind: "mission"; key: string; sizeMin: number }
  | { kind: "mission-done"; key: string; points: number }
  | { kind: "grant"; key: string; match: number }
  | { kind: "welcome-back" | "profile-tip" | "tip"; key: string };

const priorities: Record<SchollyQueuedMessage["kind"], number> = {
  deadline: 5, submission: 4, badge: 4, level: 4, "mission-done": 4, mission: 3, grant: 2,
  "welcome-back": 1, "profile-tip": 1, tip: 1,
};

const copy = {
  badge: {
    uz: ["Yangi nishon olding: {name}!", "Yangi nishon ochildi: {name}.", "Nishon: {name}"],
    en: ["You earned a new badge: {name}!", "A new badge is available: {name}.", "Badge: {name}"],
    ru: ["У тебя новая награда: {name}!", "Открыта новая награда: {name}.", "Награда: {name}"],
  },
  level: {
    uz: ["Yangi darajaga chiqding: {name}!", "Yangi daraja: {name}.", "Daraja: {name}"],
    en: ["You reached a new level: {name}!", "You’ve reached level {name}.", "Level: {name}"],
    ru: ["Ты на новом уровне: {name}!", "Достигнут уровень {name}.", "Уровень: {name}"],
  },
  mission: {
    uz: ["Bugungi missiyang tayyor. Taxminan {n} daqiqa oladi.", "Bugungi topshiriq tayyor. Ajratiladigan vaqt: {n} daq.", "Bugungi missiya · {n} daq."],
    en: ["Your mission is ready. It takes about {n} min.", "Today’s mission is ready. Allow {n} min.", "Today’s mission · {n} min"],
    ru: ["Задание на сегодня готово. Около {n} мин.", "Сегодняшнее задание готово. Выдели {n} мин.", "Задание дня · {n} мин."],
  },
  "mission-done": {
    uz: ["Bugungi missiyani bajarding! +{n} ball.", "Missiya yakunlandi. +{n} ball.", "Missiya bajarildi · +{n} ball"],
    en: ["You finished today’s mission! +{n} points.", "Mission completed. +{n} points.", "Mission done · +{n} points"],
    ru: ["Ты выполнил задание дня! +{n} баллов.", "Задание завершено. +{n} баллов.", "Задание готово · +{n} баллов"],
  },
  grant: {
    uz: ["Senga {n}% mos grant topildi. Grantlar bo‘limidan ko‘r.", "Grant tavsiyasi · moslik {n}%.", "Mos grant · {n}%"],
    en: ["There’s a {n}% scholarship match for you in Scholarships.", "Scholarship recommendation · {n}% match.", "Scholarship match · {n}%"],
    ru: ["Есть стипендия с совпадением {n}%. Загляни в раздел стипендий.", "Рекомендация стипендии · совпадение {n}%.", "Стипендия · {n}%"],
  },
  "welcome-back": {
    uz: ["Qaytganing yaxshi! Qolgan joyingdan davom etishing mumkin.", "Rejangni qolgan joyidan davom ettir.", "Qolgan joyingdan davom et."],
    en: ["Good to have you back! Pick up where you left off.", "You can resume your plan from where you left off.", "Resume your plan."],
    ru: ["Здорово, что ты вернулся! Продолжай с того места, где остановился.", "Можно продолжить свой план.", "Продолжи план."],
  },
  "profile-tip": {
    uz: ["Profilingga yo‘nalish yoki davlat qo‘sh. Shunda tavsiyalar senga yaxshiroq moslashadi.", "Tavsiyalarni aniqlashtirish uchun profil ma’lumotlaringni to‘ldir.", "Profilingni to‘ldir."],
    en: ["Add a subject or country to your profile to get more relevant suggestions.", "Complete your profile for more tailored recommendations.", "Complete your profile."],
    ru: ["Добавь специальность или страну в профиль, чтобы уточнить рекомендации.", "Заполни профиль для более точных рекомендаций.", "Заполни профиль."],
  },
  tip: {
    uz: ["Grantni saqlashdan oldin rasmiy manbadan talablar va muddatni tekshir.", "Ariza muddatini va talablarini rasmiy manbadan tasdiqla.", "Talablarni rasmiy manbadan tekshir."],
    en: ["Before saving a scholarship, check the requirements and deadline on the official site.", "Confirm requirements and deadlines with the official source.", "Check the official source."],
    ru: ["Перед сохранением стипендии проверь условия и сроки на официальном сайте.", "Подтверди условия и сроки в официальном источнике.", "Проверь официальный источник."],
  },
} satisfies Record<Exclude<SchollyQueuedMessage["kind"], "deadline" | "submission">, MessageCopy>;

export function schollyMessageText(
  message: Exclude<SchollyQueuedMessage, { kind: "deadline" | "submission" }>,
  language: Language,
  tone: string | undefined,
  audience: readonly SchollySegment[],
) {
  const short = tone === "short" || (tone !== "serious" && audience.includes("active")
    && !audience.some((segment) => ["new", "cooling", "returned"].includes(segment)));
  const variant = short ? 2 : tone === "serious" ? 1 : 0;
  const text = copy[message.kind][language][variant];
  if (message.kind === "badge" || message.kind === "level") return text.replace("{name}", () => message.name);
  if (message.kind === "mission") return text.replace("{n}", String(message.sizeMin));
  if (message.kind === "mission-done") return text.replace("{n}", String(message.points));
  if (message.kind === "grant") return text.replace("{n}", String(message.match));
  return text;
}

const MINUTE_MS = 60_000;
const COOLDOWN_MS = 24 * 60 * MINUTE_MS;

export interface SchollyMessageSession { count: number; lastShown: number }
export type SchollyReminderMode = SchollyReminderPreferences["mode"];

export function nextSchollyMessage(
  pending: readonly SchollyQueuedMessage[],
  shown: Readonly<Record<string, number>>,
  session: SchollyMessageSession,
  mode: SchollyReminderMode,
  now: number,
) {
  const eligible = pending.filter((message) => {
    if (now - (shown[message.key] ?? Number.NEGATIVE_INFINITY) < cooldownForKey(message.key)) return false;
    if (message.kind === "submission") return true;
    if (mode === "muted" || (mode === "important" && message.kind !== "deadline")) return false;
    return session.count < 3;
  }).sort((a, b) => priorities[b.kind] - priorities[a.kind]);
  const waitMs = Math.max(0, MINUTE_MS - (now - session.lastShown));
  const message = (waitMs > 0 && eligible.find((candidate) => candidate.kind === "submission")) || eligible[0];
  if (!message) return null;

  return {
    message,
    // Explicitly requested submission feedback is not an automatic bubble.
    waitMs: message.kind === "submission" ? 0 : waitMs,
  };
}

export function recentSchollyMessageHistory(shown: Readonly<Record<string, number>>, now: number) {
  return Object.fromEntries(Object.entries(shown).filter(([key, timestamp]) =>
    Number.isFinite(timestamp) && now - timestamp < cooldownForKey(key)));
}

export function markSchollyMessageShown(session: SchollyMessageSession, now: number): SchollyMessageSession {
  return { count: session.count + 1, lastShown: now };
}

function cooldownForKey(key: string) {
  return key.startsWith("grant:") ? 30 * COOLDOWN_MS : COOLDOWN_MS;
}
