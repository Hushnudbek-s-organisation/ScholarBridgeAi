/**
 * Texts for the bot commands, the account-linking confirmation and the
 * reminder settings (uz / ru / en). Pure data + formatting helpers; every
 * value that comes from the database or the user is HTML-escaped by the
 * caller or here via `escapeHtml`.
 */
import { escapeHtml, type BotLang } from "./core";

type Dict = {
  linkConfirm: (name: string, email: string) => string;
  btnConnect: string;
  btnCancel: string;
  linkCancelled: string;
  linkInvalid: string;
  linkAlreadySame: (name: string) => string;
  linkOtherAccount: string;
  linkAccountHasOther: string;
  linkRateLimited: string;
  privateOnly: string;
  btnOpenApp: string;
  btnWebsite: string;
  websiteText: string;
  account: (a: { name: string; email: string; plan: string; notify: boolean; since: string }) => string;
  planNames: Record<"free" | "premium" | "admin", string>;
  profile: (p: { name: string; level: string; major: string; gpa: string; english: string; countries: string; budget: string }) => string;
  notSet: string;
  uniHeader: (q: string, page: number, pages: number, total: number) => string;
  schHeader: (q: string, page: number, pages: number, total: number) => string;
  noResults: string;
  save: string;
  saved: string;
  alreadySaved: string;
  prev: string;
  next: string;
  match: string;
  perYear: string;
  deadline: string;
  savedHeader: string;
  savedUnis: string;
  savedSch: string;
  savedEmpty: string;
  appsHeader: string;
  appsEmpty: string;
  appStatus: Record<string, string>;
  deadlinesHeader: string;
  deadlinesEmpty: string;
  daysLeft: (n: number) => string;
  premiumLocked: string;
  btnUpgrade: string;
  nextHeader: string;
  nextEmpty: string;
  advisorUsage: string;
  advisorOffline: string;
  rateLimited: string;
  settings: (notify: boolean, days: number[]) => string;
  btnNotifyOn: string;
  btnNotifyOff: string;
  reminderPresets: Record<string, string>;
  settingsSaved: string;
  unlinkConfirm: string;
  btnUnlink: string;
  unlinkCancelled: string;
  unavailable: string;
  error: string;
  sessionGone: string;
  unknown: string;
};

const PRESET_LABEL = {
  standard: "30 · 14 · 7 · 3 · 1 · 0",
  short: "7 · 3 · 1 · 0",
  off: "—",
};

export const CMD_TEXTS: Record<BotLang, Dict> = {
  uz: {
    linkConfirm: (n, e) =>
      `🔗 <b>Telegramni ulash</b>\n\nShu Telegram akkauntini ScholarBridge'dagi <b>${escapeHtml(n)}</b>${e ? ` (${escapeHtml(e)})` : ""} akkauntiga ulaysizmi?\n\nAgar bu so'rovni siz boshlamagan bo'lsangiz, «Bekor qilish»ni bosing.`,
    btnConnect: "✅ Ulash",
    btnCancel: "✖️ Bekor qilish",
    linkCancelled: "Ulash bekor qilindi. Hech narsa o'zgarmadi.",
    linkInvalid: "⌛ Bu havola yaroqsiz yoki muddati tugagan. Saytda «Telegramni ulash» tugmasini qaytadan bosing.",
    linkAlreadySame: (n) => `✅ Bu Telegram allaqachon <b>${escapeHtml(n)}</b> akkauntiga ulangan.`,
    linkOtherAccount: "Bu Telegram boshqa ScholarBridge akkauntiga ulangan. Avval o'sha akkauntdan uzing (/unlink), keyin qayta urinib ko'ring.",
    linkAccountHasOther: "Bu ScholarBridge akkauntiga boshqa Telegram ulangan. Avval saytda uni uzing, keyin qayta ulang.",
    linkRateLimited: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.",
    privateOnly: "🔒 Maxfiylik uchun men bilan faqat shaxsiy chatda ishlang.",
    btnOpenApp: "📱 Ilovani ochish",
    btnWebsite: "🌐 Sayt",
    websiteText: "ScholarBridge saytining to'liq versiyasi:",
    account: (a) =>
      `👤 <b>${escapeHtml(a.name)}</b>\n${a.email ? `📧 ${escapeHtml(a.email)}\n` : ""}⭐ Tarif: <b>${escapeHtml(a.plan)}</b>\n🔔 Bildirishnomalar: ${a.notify ? "yoqilgan" : "o'chirilgan"}\n🔗 Ulangan: ${escapeHtml(a.since)}`,
    planNames: { free: "Bepul", premium: "Premium", admin: "Admin" },
    profile: (p) =>
      `🎓 <b>${escapeHtml(p.name)}</b>\nDaraja: ${escapeHtml(p.level)}\nYo'nalish: ${escapeHtml(p.major)}\nGPA: ${escapeHtml(p.gpa)}\nIngliz tili: ${escapeHtml(p.english)}\nDavlatlar: ${escapeHtml(p.countries)}\nByudjet: ${escapeHtml(p.budget)}`,
    notSet: "ko'rsatilmagan",
    uniHeader: (q, p, t, n) => `🏛 <b>Universitetlar</b>${q ? ` — «${escapeHtml(q)}»` : ""}\n${n} ta natija · ${p}/${t}-sahifa`,
    schHeader: (q, p, t, n) => `🎓 <b>Stipendiyalar</b>${q ? ` — «${escapeHtml(q)}»` : ""}\n${n} ta natija · ${p}/${t}-sahifa`,
    noResults: "Hech narsa topilmadi. Boshqa so'z bilan urinib ko'ring, masalan: /universities Germany",
    save: "⭐ Saqlash",
    saved: "Saqlandi ✓",
    alreadySaved: "Allaqachon saqlangan",
    prev: "◀️ Oldingi",
    next: "Keyingi ▶️",
    match: "moslik",
    perYear: "yiliga",
    deadline: "muddat",
    savedHeader: "⭐ <b>Saqlanganlar</b>",
    savedUnis: "Universitetlar",
    savedSch: "Stipendiyalar",
    savedEmpty: "Hali hech narsa saqlanmagan. /universities yoki /scholarships orqali qidiring.",
    appsHeader: "📋 <b>Arizalarim</b>",
    appsEmpty: "Hali ariza qo'shilmagan. Ularni saytdagi «Arizalar» bo'limida qo'shing.",
    appStatus: { not_started: "boshlanmagan", in_progress: "jarayonda", submitted: "topshirilgan", interview: "suhbat", decision: "qaror kutilmoqda", accepted: "qabul qilindi", rejected: "rad etildi", waitlisted: "kutish ro'yxati", withdrawn: "qaytarib olingan" },
    deadlinesHeader: "⏰ <b>Yaqin muddatlar</b>",
    deadlinesEmpty: "Yaqin muddatlar yo'q. Stipendiya yoki ariza saqlasangiz, shu yerda ko'rinadi.",
    daysLeft: (n) => (n < 0 ? "o'tib ketgan" : n === 0 ? "bugun" : `${n} kun qoldi`),
    premiumLocked: "🔒 Muddatlar markazi — Premium imkoniyati. Saytda Premium'ga o'tib, barcha muddatlarni bir joyda kuzating.",
    btnUpgrade: "⭐ Premium",
    nextHeader: "🧭 <b>Keyingi qadam</b>",
    nextEmpty: "Hozircha shoshilinch vazifa yo'q. Profilingizni to'ldirib boring.",
    advisorUsage: "Savolingizni buyruq bilan birga yozing, masalan:\n<code>/advisor Germaniyada magistratura uchun qanday stipendiyalar bor?</code>",
    advisorOffline: "ℹ️ AI hozir ishlamayapti — quyida umumiy tavsiya berilgan.",
    rateLimited: "⏳ Juda ko'p so'rov. Bir daqiqadan so'ng qayta urinib ko'ring.",
    settings: (n, d) =>
      `⚙️ <b>Sozlamalar</b>\n\n🔔 Bildirishnomalar: <b>${n ? "yoqilgan" : "o'chirilgan"}</b>\n⏰ Muddat eslatmalari (kun oldin): <b>${d.length ? d.join(" · ") : "o'chirilgan"}</b>`,
    btnNotifyOn: "🔔 Yoqish",
    btnNotifyOff: "🔕 O'chirish",
    reminderPresets: { standard: `⏰ ${PRESET_LABEL.standard}`, short: `⏰ ${PRESET_LABEL.short}`, off: "⏰ Eslatmasiz" },
    settingsSaved: "Saqlandi ✓",
    unlinkConfirm: "Telegramni ScholarBridge akkauntingizdan uzasizmi? Bildirishnomalar va bot buyruqlari to'xtaydi.",
    btnUnlink: "🔌 Ha, uzish",
    unlinkCancelled: "Bekor qilindi — Telegram ulangan holda qoldi.",
    unavailable: "Ma'lumotlar vaqtincha mavjud emas. Birozdan keyin qayta urinib ko'ring.",
    error: "Nimadir xato ketdi. Qayta urinib ko'ring.",
    sessionGone: "Bu Telegram endi akkauntga ulanmagan.",
    unknown: "Bu buyruqni tushunmadim. /help — buyruqlar ro'yxati.",
  },
  ru: {
    linkConfirm: (n, e) =>
      `🔗 <b>Подключение Telegram</b>\n\nПодключить этот Telegram к аккаунту ScholarBridge <b>${escapeHtml(n)}</b>${e ? ` (${escapeHtml(e)})` : ""}?\n\nЕсли вы не начинали подключение, нажмите «Отмена».`,
    btnConnect: "✅ Подключить",
    btnCancel: "✖️ Отмена",
    linkCancelled: "Подключение отменено. Ничего не изменилось.",
    linkInvalid: "⌛ Ссылка недействительна или устарела. Нажмите «Подключить Telegram» на сайте ещё раз.",
    linkAlreadySame: (n) => `✅ Этот Telegram уже подключён к аккаунту <b>${escapeHtml(n)}</b>.`,
    linkOtherAccount: "Этот Telegram подключён к другому аккаунту ScholarBridge. Сначала отвяжите его там (/unlink), затем повторите.",
    linkAccountHasOther: "К этому аккаунту ScholarBridge уже подключён другой Telegram. Сначала отвяжите его на сайте.",
    linkRateLimited: "Слишком много попыток. Попробуйте чуть позже.",
    privateOnly: "🔒 Ради приватности пользуйтесь мной только в личном чате.",
    btnOpenApp: "📱 Открыть приложение",
    btnWebsite: "🌐 Сайт",
    websiteText: "Полная версия ScholarBridge:",
    account: (a) =>
      `👤 <b>${escapeHtml(a.name)}</b>\n${a.email ? `📧 ${escapeHtml(a.email)}\n` : ""}⭐ Тариф: <b>${escapeHtml(a.plan)}</b>\n🔔 Уведомления: ${a.notify ? "включены" : "выключены"}\n🔗 Подключён: ${escapeHtml(a.since)}`,
    planNames: { free: "Бесплатный", premium: "Premium", admin: "Админ" },
    profile: (p) =>
      `🎓 <b>${escapeHtml(p.name)}</b>\nУровень: ${escapeHtml(p.level)}\nНаправление: ${escapeHtml(p.major)}\nGPA: ${escapeHtml(p.gpa)}\nАнглийский: ${escapeHtml(p.english)}\nСтраны: ${escapeHtml(p.countries)}\nБюджет: ${escapeHtml(p.budget)}`,
    notSet: "не указано",
    uniHeader: (q, p, t, n) => `🏛 <b>Университеты</b>${q ? ` — «${escapeHtml(q)}»` : ""}\n${n} результатов · стр. ${p}/${t}`,
    schHeader: (q, p, t, n) => `🎓 <b>Стипендии</b>${q ? ` — «${escapeHtml(q)}»` : ""}\n${n} результатов · стр. ${p}/${t}`,
    noResults: "Ничего не найдено. Попробуйте другое слово, например: /universities Germany",
    save: "⭐ Сохранить",
    saved: "Сохранено ✓",
    alreadySaved: "Уже сохранено",
    prev: "◀️ Назад",
    next: "Вперёд ▶️",
    match: "совпадение",
    perYear: "в год",
    deadline: "дедлайн",
    savedHeader: "⭐ <b>Сохранённое</b>",
    savedUnis: "Университеты",
    savedSch: "Стипендии",
    savedEmpty: "Пока ничего не сохранено. Ищите через /universities или /scholarships.",
    appsHeader: "📋 <b>Мои заявки</b>",
    appsEmpty: "Заявок пока нет. Добавьте их в разделе «Заявки» на сайте.",
    appStatus: { not_started: "не начата", in_progress: "в работе", submitted: "подана", interview: "интервью", decision: "ждёт решения", accepted: "принят", rejected: "отказ", waitlisted: "лист ожидания", withdrawn: "отозвана" },
    deadlinesHeader: "⏰ <b>Ближайшие дедлайны</b>",
    deadlinesEmpty: "Ближайших дедлайнов нет. Сохраните стипендию или заявку — они появятся здесь.",
    daysLeft: (n) => (n < 0 ? "прошёл" : n === 0 ? "сегодня" : `осталось ${n} дн.`),
    premiumLocked: "🔒 Центр дедлайнов — функция Premium. Оформите Premium на сайте, чтобы видеть все сроки в одном месте.",
    btnUpgrade: "⭐ Premium",
    nextHeader: "🧭 <b>Следующий шаг</b>",
    nextEmpty: "Срочных задач нет. Продолжайте заполнять профиль.",
    advisorUsage: "Напишите вопрос вместе с командой, например:\n<code>/advisor Какие стипендии есть для магистратуры в Германии?</code>",
    advisorOffline: "ℹ️ AI сейчас недоступен — ниже общие рекомендации.",
    rateLimited: "⏳ Слишком много запросов. Попробуйте через минуту.",
    settings: (n, d) =>
      `⚙️ <b>Настройки</b>\n\n🔔 Уведомления: <b>${n ? "включены" : "выключены"}</b>\n⏰ Напоминания о дедлайнах (за дней): <b>${d.length ? d.join(" · ") : "выключены"}</b>`,
    btnNotifyOn: "🔔 Включить",
    btnNotifyOff: "🔕 Выключить",
    reminderPresets: { standard: `⏰ ${PRESET_LABEL.standard}`, short: `⏰ ${PRESET_LABEL.short}`, off: "⏰ Без напоминаний" },
    settingsSaved: "Сохранено ✓",
    unlinkConfirm: "Отвязать Telegram от аккаунта ScholarBridge? Уведомления и команды бота перестанут работать.",
    btnUnlink: "🔌 Да, отвязать",
    unlinkCancelled: "Отменено — Telegram остаётся подключённым.",
    unavailable: "Данные временно недоступны. Попробуйте чуть позже.",
    error: "Что-то пошло не так. Попробуйте ещё раз.",
    sessionGone: "Этот Telegram больше не подключён к аккаунту.",
    unknown: "Не понял команду. /help — список команд.",
  },
  en: {
    linkConfirm: (n, e) =>
      `🔗 <b>Connect Telegram</b>\n\nConnect this Telegram account to the ScholarBridge account <b>${escapeHtml(n)}</b>${e ? ` (${escapeHtml(e)})` : ""}?\n\nIf you did not start this, press “Cancel”.`,
    btnConnect: "✅ Connect",
    btnCancel: "✖️ Cancel",
    linkCancelled: "Connection cancelled. Nothing was changed.",
    linkInvalid: "⌛ This link is invalid or has expired. Press “Connect Telegram” on the website again.",
    linkAlreadySame: (n) => `✅ This Telegram is already connected to <b>${escapeHtml(n)}</b>.`,
    linkOtherAccount: "This Telegram is connected to another ScholarBridge account. Disconnect it there first (/unlink), then try again.",
    linkAccountHasOther: "That ScholarBridge account already has a different Telegram connected. Disconnect it on the website first.",
    linkRateLimited: "Too many attempts. Please try again a bit later.",
    privateOnly: "🔒 For your privacy, please use me in a private chat only.",
    btnOpenApp: "📱 Open app",
    btnWebsite: "🌐 Website",
    websiteText: "The full ScholarBridge website:",
    account: (a) =>
      `👤 <b>${escapeHtml(a.name)}</b>\n${a.email ? `📧 ${escapeHtml(a.email)}\n` : ""}⭐ Plan: <b>${escapeHtml(a.plan)}</b>\n🔔 Notifications: ${a.notify ? "on" : "off"}\n🔗 Connected: ${escapeHtml(a.since)}`,
    planNames: { free: "Free", premium: "Premium", admin: "Admin" },
    profile: (p) =>
      `🎓 <b>${escapeHtml(p.name)}</b>\nLevel: ${escapeHtml(p.level)}\nMajor: ${escapeHtml(p.major)}\nGPA: ${escapeHtml(p.gpa)}\nEnglish: ${escapeHtml(p.english)}\nCountries: ${escapeHtml(p.countries)}\nBudget: ${escapeHtml(p.budget)}`,
    notSet: "not set",
    uniHeader: (q, p, t, n) => `🏛 <b>Universities</b>${q ? ` — “${escapeHtml(q)}”` : ""}\n${n} results · page ${p}/${t}`,
    schHeader: (q, p, t, n) => `🎓 <b>Scholarships</b>${q ? ` — “${escapeHtml(q)}”` : ""}\n${n} results · page ${p}/${t}`,
    noResults: "Nothing found. Try another word, e.g. /universities Germany",
    save: "⭐ Save",
    saved: "Saved ✓",
    alreadySaved: "Already saved",
    prev: "◀️ Prev",
    next: "Next ▶️",
    match: "match",
    perYear: "per year",
    deadline: "deadline",
    savedHeader: "⭐ <b>Saved</b>",
    savedUnis: "Universities",
    savedSch: "Scholarships",
    savedEmpty: "Nothing saved yet. Search with /universities or /scholarships.",
    appsHeader: "📋 <b>My applications</b>",
    appsEmpty: "No applications yet. Add them under “Applications” on the website.",
    appStatus: { not_started: "not started", in_progress: "in progress", submitted: "submitted", interview: "interview", decision: "awaiting decision", accepted: "accepted", rejected: "rejected", waitlisted: "waitlisted", withdrawn: "withdrawn" },
    deadlinesHeader: "⏰ <b>Upcoming deadlines</b>",
    deadlinesEmpty: "No upcoming deadlines. Save a scholarship or an application and it shows up here.",
    daysLeft: (n) => (n < 0 ? "passed" : n === 0 ? "today" : `${n} days left`),
    premiumLocked: "🔒 The Deadline Center is a Premium feature. Upgrade on the website to track every deadline in one place.",
    btnUpgrade: "⭐ Premium",
    nextHeader: "🧭 <b>Next best step</b>",
    nextEmpty: "Nothing urgent right now. Keep completing your profile.",
    advisorUsage: "Write your question after the command, e.g.:\n<code>/advisor Which scholarships exist for a master's in Germany?</code>",
    advisorOffline: "ℹ️ The AI is offline right now — below is general guidance.",
    rateLimited: "⏳ Too many requests. Please try again in a minute.",
    settings: (n, d) =>
      `⚙️ <b>Settings</b>\n\n🔔 Notifications: <b>${n ? "on" : "off"}</b>\n⏰ Deadline reminders (days before): <b>${d.length ? d.join(" · ") : "off"}</b>`,
    btnNotifyOn: "🔔 Turn on",
    btnNotifyOff: "🔕 Turn off",
    reminderPresets: { standard: `⏰ ${PRESET_LABEL.standard}`, short: `⏰ ${PRESET_LABEL.short}`, off: "⏰ No reminders" },
    settingsSaved: "Saved ✓",
    unlinkConfirm: "Disconnect Telegram from your ScholarBridge account? Notifications and bot commands will stop.",
    btnUnlink: "🔌 Yes, disconnect",
    unlinkCancelled: "Cancelled — Telegram stays connected.",
    unavailable: "Data is temporarily unavailable. Please try again a bit later.",
    error: "Something went wrong. Please try again.",
    sessionGone: "This Telegram is no longer connected to an account.",
    unknown: "I didn't understand that command. /help — list of commands.",
  },
};

/**
 * Minimal Markdown → Telegram HTML for AI replies: escape everything first,
 * then re-introduce only bold and headings. Anything else stays plain text,
 * so a model can never inject markup or links.
 */
export function markdownToTelegramHtml(md: string, max = 3500): string {
  const lines = escapeHtml(md.replace(/\r/g, "")).split("\n");
  const out = lines.map((line) => {
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) return `<b>${heading[1].replace(/\*\*/g, "")}</b>`;
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const text = bullet ? `• ${bullet[1]}` : line;
    return text.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  });
  let html = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (html.length > max) {
    html = html.slice(0, max);
    // Never cut inside a tag or leave a <b> unclosed.
    html = html.replace(/<[^>]*$/, "");
    const opens = (html.match(/<b>/g) || []).length - (html.match(/<\/b>/g) || []).length;
    if (opens > 0) html += "</b>";
    html += "…";
  }
  return html;
}

/** "a.b@c.com" → "a•••@c.com" (shown in the link confirmation). */
export function maskEmail(email: string | null | undefined): string {
  if (!email || !email.includes("@")) return "";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 1)}•••@${domain}`;
}
