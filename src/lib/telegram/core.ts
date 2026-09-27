/**
 * Telegram bot — pure helpers (no DB, no network) so they can be unit-tested:
 * settings parsing, sign-in codes, HTML escaping, bot texts in uz/ru/en.
 */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

// ---------------------------------------------------------------------------
// Timings / limits
// ---------------------------------------------------------------------------

/** How long a sign-in attempt (browser window) stays open. */
export const REQUEST_TTL_MS = 10 * 60_000;
/** How long one code from the bot is valid. */
export const CODE_TTL_MS = 5 * 60_000;
/** Wrong code entries allowed per attempt before it is locked. */
export const MAX_CODE_ATTEMPTS = 5;
/** Codes the bot will (re)send for one attempt. */
export const MAX_CODES_PER_REQUEST = 3;
/** Telegram hard limit is 4096; keep headroom for the header/button text. */
export const MAX_BROADCAST_CHARS = 3500;

// ---------------------------------------------------------------------------
// Notification types that can be delivered to Telegram
// ---------------------------------------------------------------------------

export const TELEGRAM_NOTIFICATION_TYPES = [
  "deadline_approaching",
  "deadline_changed",
  "scholarship_opened",
  "milestone_due",
  "requirement_gap",
  "essay_improved",
  "forum_reply",
  "forum_thread",
  "forum_report",
  "login_alert",
] as const;
export type TelegramNotificationType = (typeof TELEGRAM_NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------------------
// Admin settings (app_config.telegram_settings)
// ---------------------------------------------------------------------------

export interface TelegramSettings {
  /** Show "Sign in with Telegram" on the sign-in window. */
  loginEnabled: boolean;
  /** Telegram users without an account get one automatically. */
  signupEnabled: boolean;
  /** Admin accounts may sign in with a Telegram code. */
  adminLoginEnabled: boolean;
  /** Deliver notifications to linked chats. */
  notificationsEnabled: boolean;
  /** Notification types admins allow on Telegram. */
  types: string[];
  /** Public site URL for "Open" buttons + webhook (https only). */
  siteUrl: string;
  /** Cached from getMe so the sign-in window can build t.me links. */
  botUsername: string;
  botName: string;
}

export const DEFAULT_TELEGRAM_SETTINGS: TelegramSettings = {
  loginEnabled: true,
  signupEnabled: true,
  adminLoginEnabled: true,
  notificationsEnabled: true,
  types: [...TELEGRAM_NOTIFICATION_TYPES],
  siteUrl: "",
  botUsername: "",
  botName: "",
};

const BOT_USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

/** Normalise a site URL: https (or http://localhost) origin only, no path. */
export function normalizeSiteUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  try {
    const u = new URL(raw.trim());
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol !== "https:" && !(local && u.protocol === "http:")) return "";
    return u.origin;
  } catch {
    return "";
  }
}

export function normalizeBotUsername(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const v = raw.trim().replace(/^@/, "");
  return BOT_USERNAME_RE.test(v) ? v : "";
}

/** Parse the stored JSON; anything invalid falls back to the defaults. */
export function parseTelegramSettings(raw: string | null | undefined): TelegramSettings {
  let obj: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) obj = parsed;
    } catch {
      // corrupt → defaults
    }
  }
  return sanitizeSettingsPatch(obj, DEFAULT_TELEGRAM_SETTINGS);
}

/** Merge an (untrusted) patch over a base, keeping only valid values. */
export function sanitizeSettingsPatch(patch: Record<string, unknown>, base: TelegramSettings): TelegramSettings {
  const bool = (k: keyof TelegramSettings) =>
    typeof patch[k] === "boolean" ? (patch[k] as boolean) : (base[k] as boolean);
  const known = new Set<string>(TELEGRAM_NOTIFICATION_TYPES);
  const types = Array.isArray(patch.types)
    ? Array.from(new Set(patch.types.filter((t): t is string => typeof t === "string" && known.has(t))))
    : base.types;
  return {
    loginEnabled: bool("loginEnabled"),
    signupEnabled: bool("signupEnabled"),
    adminLoginEnabled: bool("adminLoginEnabled"),
    notificationsEnabled: bool("notificationsEnabled"),
    types,
    siteUrl: "siteUrl" in patch ? normalizeSiteUrl(patch.siteUrl) : base.siteUrl,
    botUsername: "botUsername" in patch ? normalizeBotUsername(patch.botUsername) : base.botUsername,
    botName: "botName" in patch && typeof patch.botName === "string" ? patch.botName.slice(0, 64) : base.botName,
  };
}

/** Bot tokens look like `123456789:AA...` (35 chars after the colon). */
export function looksLikeBotToken(token: unknown): token is string {
  return typeof token === "string" && /^\d{5,12}:[A-Za-z0-9_-]{30,50}$/.test(token.trim());
}

/** `123456789:AA…xyz` → `123456789:••••xyz` for display. */
export function maskToken(token: string | null | undefined): string {
  if (!token) return "";
  const [id, secret = ""] = token.split(":");
  return `${id}:••••${secret.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Tokens, nonces and codes
// ---------------------------------------------------------------------------

/** Public token that travels in the t.me deep link (≤ 64 chars, [A-Za-z0-9_-]). */
export function newStartToken(): string {
  return randomBytes(12).toString("base64url"); // 16 chars
}

/** Secret the browser keeps; only its hash is stored. */
export function newNonce(): string {
  return randomBytes(24).toString("base64url");
}

/** Six random digits, never with a leading-zero surprise (000123 is fine). */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hmacHex(secret: string, ...parts: (string | number)[]): string {
  return createHmac("sha256", secret).update(parts.join("|")).digest("hex");
}

export function safeEqualHex(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

/** "12 34 56" / "123-456" → "123456"; anything else → "". */
export function normalizeCodeInput(raw: unknown): string {
  if (typeof raw !== "string" && typeof raw !== "number") return "";
  const digits = String(raw).replace(/[\s-]/g, "");
  return /^\d{6}$/.test(digits) ? digits : "";
}

/** `/start login_AbC` → { purpose: "login", token: "AbC" }. */
export function parseStartPayload(text: string | undefined | null): { purpose: "login" | "link"; token: string } | null {
  if (!text) return null;
  const m = /^\/start(?:@\w+)?\s+(login|link)_([A-Za-z0-9_-]{8,48})\s*$/.exec(text.trim());
  return m ? { purpose: m[1] as "login" | "link", token: m[2] } : null;
}

/** First word of a message if it is a command: "/stop@MyBot x" → "stop". */
export function parseCommand(text: string | undefined | null): string | null {
  if (!text) return null;
  const m = /^\/([a-z_]+)(?:@\w+)?(?:\s|$)/i.exec(text.trim());
  return m ? m[1].toLowerCase() : null;
}

export function parseMutedTypes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

/** Should this notification go to this chat? (all the switches in one place) */
export function shouldDeliver(input: {
  settings: Pick<TelegramSettings, "notificationsEnabled" | "types">;
  link: { notifyEnabled: boolean; blocked: boolean; mutedTypes: string } | null | undefined;
  type: string;
  hasToken: boolean;
}): boolean {
  const { settings, link, type, hasToken } = input;
  if (!hasToken || !settings.notificationsEnabled || !link) return false;
  if (link.blocked || !link.notifyEnabled) return false;
  // Unknown types (added later in code) are allowed unless muted; known types
  // must also be allowed by the admin.
  const known = (TELEGRAM_NOTIFICATION_TYPES as readonly string[]).includes(type);
  if (known && !settings.types.includes(type)) return false;
  return !parseMutedTypes(link.mutedTypes).includes(type);
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type BotLang = "uz" | "ru" | "en";

export function pickLang(code: string | null | undefined): BotLang {
  const c = (code || "").toLowerCase();
  if (c.startsWith("uz")) return "uz";
  if (c.startsWith("ru") || c.startsWith("kk") || c.startsWith("ky") || c.startsWith("tg")) return "ru";
  if (c.startsWith("en")) return "en";
  return "uz";
}

type Texts = {
  code: (code: string, minutes: number, purpose: "login" | "link") => string;
  welcome: string;
  welcomeLinked: (name: string, notify: boolean) => string;
  help: string;
  openSite: string;
  expired: string;
  alreadyUsed: string;
  tooMany: string;
  loginDisabled: string;
  notLinked: string;
  adminBlocked: string;
  alreadyLinkedOther: string;
  notifyOff: string;
  notifyOn: string;
  unlinked: string;
  notLinkedShort: string;
  linkedOk: (name: string) => string;
  loginAlert: (when: string) => string;
  notificationHeader: string;
  open: string;
  test: string;
  broadcastHeader: string;
};

export const BOT_TEXTS: Record<BotLang, Texts> = {
  uz: {
    code: (code, m, p) =>
      `🔐 <b>ScholarBridge ${p === "link" ? "ulash" : "kirish"} kodi:</b>\n\n<code>${code}</code>\n\n` +
      `Kodni saytdagi oynaga kiriting. U ${m} daqiqa amal qiladi.\n` +
      `⚠️ Bu kodni hech kimga aytmang — ScholarBridge xodimlari uni hech qachon so'ramaydi.`,
    welcome:
      "👋 <b>ScholarBridge botiga xush kelibsiz!</b>\n\n" +
      "Bu bot orqali:\n• saytga parolsiz, kod bilan kirasiz;\n• muddatlar, stipendiyalar va javoblar haqida xabar olasiz.\n\n" +
      "Kirish uchun saytda <b>«Telegram orqali kirish»</b> tugmasini bosing.",
    welcomeLinked: (name, notify) =>
      `👋 Salom, <b>${escapeHtml(name)}</b>! Telegram akkauntingiz ScholarBridge'ga ulangan.\n` +
      `Bildirishnomalar: ${notify ? "✅ yoqilgan" : "⏸ o'chirilgan"}.\n\n/help — buyruqlar ro'yxati`,
    help:
      "<b>Buyruqlar</b>\n/status — ulangan akkaunt\n/stop — bildirishnomalarni to'xtatish\n/on — bildirishnomalarni yoqish\n/unlink — Telegramni akkauntdan uzish\n/help — yordam",
    openSite: "🌐 Saytni ochish",
    expired: "⌛ Bu havolaning muddati tugagan. Saytda qaytadan «Telegram orqali kirish» tugmasini bosing.",
    alreadyUsed: "Bu havola boshqa Telegram akkaunt tomonidan ishlatilgan. Saytda yangi urinish boshlang.",
    tooMany: "Bu urinish uchun kodlar limiti tugadi. Saytda qaytadan boshlang.",
    loginDisabled: "Telegram orqali kirish hozircha o'chirilgan. Iltimos, email va parol bilan kiring.",
    notLinked:
      "Bu Telegram hech bir akkauntga ulanmagan, yangi akkaunt ochish esa hozir yopiq.\n" +
      "Avval saytga email bilan kiring, keyin «Telegram va xabarlar» bo'limida Telegramni ulang.",
    adminBlocked: "Admin akkauntlari uchun Telegram orqali kirish o'chirilgan. Email va parol bilan kiring.",
    alreadyLinkedOther:
      "Bu Telegram boshqa ScholarBridge akkauntiga ulangan. Avval u yerda /unlink qiling yoki administratorga murojaat qiling.",
    notifyOff: "⏸ Bildirishnomalar to'xtatildi. Qayta yoqish: /on",
    notifyOn: "✅ Bildirishnomalar yoqildi.",
    unlinked: "Telegram akkauntdan uzildi. Endi bu yerga xabar kelmaydi.",
    notLinkedShort: "Bu Telegram hali hech bir akkauntga ulanmagan.",
    linkedOk: (name) => `✅ Telegram <b>${escapeHtml(name)}</b> akkauntiga ulandi. Endi muhim xabarlar shu yerga keladi.`,
    loginAlert: (when) =>
      `🔓 Akkauntingizga email va parol bilan kirildi (${when}).\nAgar bu siz bo'lmasangiz, darhol parolingizni o'zgartiring va /unlink qiling.`,
    notificationHeader: "🔔 ScholarBridge",
    open: "Saytda ochish",
    test: "✅ Test xabar: bot to'g'ri ishlayapti.",
    broadcastHeader: "📢 ScholarBridge",
  },
  ru: {
    code: (code, m, p) =>
      `🔐 <b>Код ${p === "link" ? "привязки" : "входа"} ScholarBridge:</b>\n\n<code>${code}</code>\n\n` +
      `Введите код в окне на сайте. Он действует ${m} минут.\n` +
      `⚠️ Никому не сообщайте код — сотрудники ScholarBridge никогда его не спрашивают.`,
    welcome:
      "👋 <b>Добро пожаловать в бот ScholarBridge!</b>\n\n" +
      "Через этого бота вы:\n• входите на сайт без пароля, по коду;\n• получаете уведомления о дедлайнах, стипендиях и ответах.\n\n" +
      "Чтобы войти, нажмите на сайте <b>«Войти через Telegram»</b>.",
    welcomeLinked: (name, notify) =>
      `👋 Здравствуйте, <b>${escapeHtml(name)}</b>! Ваш Telegram привязан к ScholarBridge.\n` +
      `Уведомления: ${notify ? "✅ включены" : "⏸ выключены"}.\n\n/help — список команд`,
    help:
      "<b>Команды</b>\n/status — привязанный аккаунт\n/stop — остановить уведомления\n/on — включить уведомления\n/unlink — отвязать Telegram\n/help — помощь",
    openSite: "🌐 Открыть сайт",
    expired: "⌛ Срок действия ссылки истёк. Нажмите на сайте «Войти через Telegram» ещё раз.",
    alreadyUsed: "Эта ссылка уже использована другим аккаунтом Telegram. Начните новую попытку на сайте.",
    tooMany: "Лимит кодов для этой попытки исчерпан. Начните заново на сайте.",
    loginDisabled: "Вход через Telegram временно отключён. Войдите по email и паролю.",
    notLinked:
      "Этот Telegram не привязан ни к одному аккаунту, а регистрация новых аккаунтов сейчас закрыта.\n" +
      "Войдите на сайт по email и привяжите Telegram в разделе «Telegram и уведомления».",
    adminBlocked: "Вход через Telegram для администраторов отключён. Войдите по email и паролю.",
    alreadyLinkedOther:
      "Этот Telegram уже привязан к другому аккаунту ScholarBridge. Сначала отвяжите его (/unlink) или обратитесь к администратору.",
    notifyOff: "⏸ Уведомления остановлены. Включить снова: /on",
    notifyOn: "✅ Уведомления включены.",
    unlinked: "Telegram отвязан от аккаунта. Сообщения сюда больше не придут.",
    notLinkedShort: "Этот Telegram пока не привязан ни к одному аккаунту.",
    linkedOk: (name) => `✅ Telegram привязан к аккаунту <b>${escapeHtml(name)}</b>. Важные уведомления будут приходить сюда.`,
    loginAlert: (when) =>
      `🔓 В ваш аккаунт выполнен вход по email и паролю (${when}).\nЕсли это были не вы, срочно смените пароль и выполните /unlink.`,
    notificationHeader: "🔔 ScholarBridge",
    open: "Открыть на сайте",
    test: "✅ Тестовое сообщение: бот работает.",
    broadcastHeader: "📢 ScholarBridge",
  },
  en: {
    code: (code, m, p) =>
      `🔐 <b>ScholarBridge ${p === "link" ? "connection" : "sign-in"} code:</b>\n\n<code>${code}</code>\n\n` +
      `Enter it in the window on the website. It is valid for ${m} minutes.\n` +
      `⚠️ Never share this code — ScholarBridge staff will never ask for it.`,
    welcome:
      "👋 <b>Welcome to the ScholarBridge bot!</b>\n\n" +
      "With this bot you:\n• sign in to the website without a password, using a code;\n• get alerts about deadlines, scholarships and replies.\n\n" +
      "To sign in, press <b>“Sign in with Telegram”</b> on the website.",
    welcomeLinked: (name, notify) =>
      `👋 Hi, <b>${escapeHtml(name)}</b>! Your Telegram is connected to ScholarBridge.\n` +
      `Notifications: ${notify ? "✅ on" : "⏸ off"}.\n\n/help — list of commands`,
    help:
      "<b>Commands</b>\n/status — connected account\n/stop — pause notifications\n/on — resume notifications\n/unlink — disconnect Telegram\n/help — help",
    openSite: "🌐 Open website",
    expired: "⌛ This link has expired. Press “Sign in with Telegram” on the website again.",
    alreadyUsed: "This link was already used by another Telegram account. Start a new attempt on the website.",
    tooMany: "No more codes for this attempt. Please start again on the website.",
    loginDisabled: "Signing in with Telegram is currently turned off. Please use your email and password.",
    notLinked:
      "This Telegram is not connected to any account and new sign-ups are currently closed.\n" +
      "Sign in with email first, then connect Telegram under “Telegram & alerts”.",
    adminBlocked: "Telegram sign-in is disabled for admin accounts. Please use your email and password.",
    alreadyLinkedOther:
      "This Telegram is already connected to another ScholarBridge account. Disconnect it there first (/unlink) or contact an admin.",
    notifyOff: "⏸ Notifications paused. Turn them back on with /on",
    notifyOn: "✅ Notifications are on.",
    unlinked: "Telegram disconnected from your account. No more messages will be sent here.",
    notLinkedShort: "This Telegram is not connected to any account yet.",
    linkedOk: (name) => `✅ Telegram connected to <b>${escapeHtml(name)}</b>. Important alerts will arrive here.`,
    loginAlert: (when) =>
      `🔓 Someone signed in to your account with email and password (${when}).\nIf this wasn't you, change your password now and send /unlink.`,
    notificationHeader: "🔔 ScholarBridge",
    open: "Open on the website",
    test: "✅ Test message: the bot is working.",
    broadcastHeader: "📢 ScholarBridge",
  },
};

/** Format a notification for Telegram (HTML parse mode). */
export function formatNotification(lang: BotLang, n: { title: string; body: string }): string {
  const title = escapeHtml(n.title.slice(0, 200));
  const body = escapeHtml(n.body.slice(0, 3000));
  return `${BOT_TEXTS[lang].notificationHeader}\n\n<b>${title}</b>\n${body}`;
}

/** Deep link into the app: `https://site/#applications`. Only absolute https/localhost. */
export function appLink(siteUrl: string, link: string | null | undefined): string | null {
  const base = normalizeSiteUrl(siteUrl);
  if (!base) return null;
  if (!link) return `${base}/`;
  if (/^https?:\/\//i.test(link)) {
    try {
      return new URL(link).origin === base ? link : `${base}/`;
    } catch {
      return `${base}/`;
    }
  }
  const clean = link.startsWith("/") || link.startsWith("#") ? link : `/${link}`;
  return clean.startsWith("#") ? `${base}/${clean}` : `${base}${clean}`;
}

/** Telegram only accepts https URLs in inline buttons (localhost is rejected). */
export function isButtonUrl(url: string | null): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname !== "localhost";
  } catch {
    return false;
  }
}

/** Short random-free display name for a Telegram user. */
export function telegramDisplayName(u: { firstName?: string | null; lastName?: string | null; username?: string | null }): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return (full || (u.username ? `@${u.username}` : "") || "Telegram user").slice(0, 120);
}

export { telegramPlaceholderEmail, isTelegramPlaceholderEmail } from "./placeholder";
