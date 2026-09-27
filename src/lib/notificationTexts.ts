/**
 * Localised notification texts (uz / ru / en).
 *
 * Notifications are stored as plain title/body strings (the bell and the
 * Telegram bot show them as-is), so they are rendered once, in the
 * recipient's language, when they are created. Pure module — no DB access.
 */
export type NotifyLang = "uz" | "ru" | "en";
export type NotifyText = { title: string; body: string };

export function toNotifyLang(...candidates: (string | null | undefined)[]): NotifyLang {
  for (const c of candidates) {
    const v = (c || "").toLowerCase();
    if (v.startsWith("uz")) return "uz";
    if (v.startsWith("ru") || v.startsWith("kk") || v.startsWith("ky") || v.startsWith("tg")) return "ru";
    if (v.startsWith("en")) return "en";
  }
  return "en";
}

/** 2026-10-05 → 05.10.2026 (no ICU dependency — the server may lack uz data). */
export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${date.getUTCFullYear()}`;
}

const cut = (s: unknown, n: number) => String(s ?? "").slice(0, n);

function plural(lang: NotifyLang, n: number, en: [string, string], ru: [string, string, string], uz: string): string {
  if (lang === "uz") return uz;
  if (lang === "en") return n === 1 ? en[0] : en[1];
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return ru[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return ru[1];
  return ru[2];
}
const days = (lang: NotifyLang, n: number) => `${n} ${plural(lang, n, ["day", "days"], ["день", "дня", "дней"], "kun")}`;

export const NOTIFY_TEXTS = {
  deadlineApproaching(lang: NotifyLang, p: { title: string; daysLeft: number; date: Date | string }): NotifyText {
    const t = cut(p.title, 150);
    const d = days(lang, p.daysLeft);
    return {
      uz: { title: `⏰ Muddat yaqin: ${t}`, body: `«${t}» stipendiyasiga ariza topshirish muddati ${d}dan keyin tugaydi (${fmtDate(p.date)}).` },
      ru: { title: `⏰ Скоро дедлайн: ${t}`, body: `Дедлайн стипендии «${t}» через ${d} (${fmtDate(p.date)}).` },
      en: { title: `⏰ Deadline approaching: ${t}`, body: `The ${t} scholarship deadline is in ${d} (${fmtDate(p.date)}).` },
    }[lang];
  },

  deadlineChanged(lang: NotifyLang, p: { title: string; oldDate: Date | string | null; newDate: Date | string | null }): NotifyText {
    const t = cut(p.title, 150);
    return {
      uz: { title: `📅 Muddat o'zgardi: ${t}`, body: `Siz saqlagan «${t}» stipendiyasining muddati o'zgardi: ${fmtDate(p.oldDate)} → ${fmtDate(p.newDate)}.` },
      ru: { title: `📅 Дедлайн изменился: ${t}`, body: `Дедлайн сохранённой стипендии «${t}» изменился: ${fmtDate(p.oldDate)} → ${fmtDate(p.newDate)}.` },
      en: { title: `📅 Deadline changed: ${t}`, body: `The deadline of your saved scholarship ${t} changed: ${fmtDate(p.oldDate)} → ${fmtDate(p.newDate)}.` },
    }[lang];
  },

  scholarshipOpened(lang: NotifyLang, p: { title: string; deadline: Date | string | null }): NotifyText {
    const t = cut(p.title, 150);
    const until = p.deadline ? fmtDate(p.deadline) : null;
    return {
      uz: { title: `🎓 Qabul ochildi: ${t}`, body: `Siz saqlagan «${t}» stipendiyasi ariza qabul qilishni boshladi.${until ? ` Muddat: ${until}.` : ""}` },
      ru: { title: `🎓 Приём открыт: ${t}`, body: `Сохранённая стипендия «${t}» начала приём заявок.${until ? ` Дедлайн: ${until}.` : ""}` },
      en: { title: `🎓 Applications open: ${t}`, body: `Your saved scholarship ${t} is now accepting applications.${until ? ` Deadline: ${until}.` : ""}` },
    }[lang];
  },

  newMatch(lang: NotifyLang, p: { title: string; country: string; score: number }): NotifyText {
    const t = cut(p.title, 150);
    return {
      uz: { title: `✨ Sizga mos stipendiya: ${t}`, body: `${t} (${p.country}) profilingizga ${p.score}% mos keladi.` },
      ru: { title: `✨ Подходящая стипендия: ${t}`, body: `${t} (${p.country}) подходит вашему профилю на ${p.score}%.` },
      en: { title: `✨ New scholarship matches your profile: ${t}`, body: `${t} (${p.country}) scores ${p.score}% fit against your profile.` },
    }[lang];
  },

  milestoneDue(lang: NotifyLang, p: { title: string; daysLeft: number; date: Date | string }): NotifyText {
    const t = cut(p.title, 150);
    const d = days(lang, p.daysLeft);
    return {
      uz: { title: `✅ Vazifa muddati: ${t}`, body: `«${t}» vazifasini ${d} ichida bajarish kerak (${fmtDate(p.date)}).` },
      ru: { title: `✅ Срок задачи: ${t}`, body: `Задачу «${t}» нужно выполнить через ${d} (${fmtDate(p.date)}).` },
      en: { title: `✅ Milestone due: ${t}`, body: `Your task "${t}" is due in ${d} (${fmtDate(p.date)}).` },
    }[lang];
  },

  roadmapReady(lang: NotifyLang, p: { count: number }): NotifyText {
    const n = p.count;
    return {
      uz: { title: "🗺️ Rejangiz tayyor", body: `Saqlangan universitet va stipendiyalaringiz asosida ${n} ta yangi qadam qo'shildi.` },
      ru: { title: "🗺️ Ваш план готов", body: `На основе сохранённых вузов и стипендий добавлено новых шагов: ${n}.` },
      en: { title: "🗺️ Your roadmap is ready", body: `We generated ${n} new milestone${n === 1 ? "" : "s"} based on your saved universities and scholarships.` },
    }[lang];
  },

  ieltsGap(lang: NotifyLang, p: { score: number | null; missing: number; highest: number }): NotifyText {
    const { score, missing, highest } = p;
    if (score == null) {
      return {
        uz: { title: "📝 IELTS balli kiritilmagan", body: `Siz IELTS talab qiladigan ${missing} ta universitetni saqlagansiz, lekin profilingizda IELTS balli yo'q (eng yuqori talab: ${highest}).` },
        ru: { title: "📝 Не указан балл IELTS", body: `Вы сохранили вузов с требованием IELTS: ${missing}, но в профиле нет балла IELTS (максимальное требование: ${highest}).` },
        en: { title: "📝 IELTS score missing for your saved universities", body: `You have saved ${missing} universit${missing === 1 ? "y" : "ies"} that require IELTS, but your profile has no IELTS score yet (highest requirement: ${highest}).` },
      }[lang];
    }
    return {
      uz: { title: "📝 IELTS talabdan past", body: `IELTS ${score} balingiz saqlangan ${missing} ta universitet talabidan past (eng yuqori talab: ${highest}).` },
      ru: { title: "📝 IELTS ниже требований", body: `Ваш IELTS ${score} ниже требований сохранённых вузов: ${missing} (максимальное требование: ${highest}).` },
      en: { title: "📝 IELTS below the requirement of saved universities", body: `Your IELTS ${score} is below the requirement of ${missing} saved universit${missing === 1 ? "y" : "ies"} (highest requirement: ${highest}).` },
    }[lang];
  },

  essayImproved(lang: NotifyLang, p: { delta: number; latestId: number; last: number; prev: number; prevId: number }): NotifyText {
    return {
      uz: { title: `📈 Inshongiz ${p.delta} ballga yaxshilandi`, body: `${p.latestId}-versiya ${p.last} ball oldi (${p.prevId}-versiyada ${p.prev} edi). Shunday davom eting!` },
      ru: { title: `📈 Эссе улучшилось на ${p.delta} баллов`, body: `Версия ${p.latestId} получила ${p.last} против ${p.prev} у версии ${p.prevId}. Так держать!` },
      en: { title: `📈 Your essay improved by ${p.delta} points`, body: `Version ${p.latestId} scored ${p.last} vs ${p.prev} in version ${p.prevId}. Keep going.` },
    }[lang];
  },

  forumReplyToAuthor(lang: NotifyLang, p: { name: string; thread: string; snippet: string }): NotifyText {
    const th = cut(p.thread, 80);
    const sn = cut(p.snippet, 120);
    return {
      uz: { title: "💬 Savolingizga javob berishdi", body: `${p.name} «${th}» mavzusida javob yozdi: ${sn}` },
      ru: { title: "💬 Вам ответили на форуме", body: `${p.name} ответил(а) в теме «${th}»: ${sn}` },
      en: { title: "💬 Someone replied to your thread", body: `${p.name} replied in "${th}": ${sn}` },
    }[lang];
  },

  adminForumReply(lang: NotifyLang, p: { name: string; thread: string; snippet: string }): NotifyText {
    const th = cut(p.thread, 80);
    const sn = cut(p.snippet, 100);
    return {
      uz: { title: "💬 Forumda yangi javob", body: `${p.name} «${th}» mavzusiga javob yozdi: ${sn}` },
      ru: { title: "💬 Новый ответ на форуме", body: `${p.name} ответил(а) в теме «${th}»: ${sn}` },
      en: { title: "💬 New forum reply", body: `${p.name} replied in "${th}": ${sn}` },
    }[lang];
  },

  adminForumThread(lang: NotifyLang, p: { name: string; title: string }): NotifyText {
    const t = cut(p.title, 100);
    return {
      uz: { title: "💬 Forumda yangi mavzu", body: `${p.name} yangi mavzu ochdi: ${t}` },
      ru: { title: "💬 Новая тема на форуме", body: `${p.name} создал(а) тему: ${t}` },
      en: { title: "💬 New community thread", body: `${p.name} posted: ${t}` },
    }[lang];
  },

  adminForumReport(lang: NotifyLang, p: { isThread: boolean; id: number | string; reason: string }): NotifyText {
    const r = cut(p.reason, 120);
    return {
      uz: { title: "🛡️ Forumda yangi shikoyat", body: `${p.isThread ? "Mavzu" : "Javob"} #${p.id} ustidan shikoyat: ${r}` },
      ru: { title: "🛡️ Новая жалоба на форуме", body: `Жалоба на ${p.isThread ? "тему" : "ответ"} #${p.id}: ${r}` },
      en: { title: "🛡️ New forum report", body: `${p.isThread ? "Thread" : "Reply"} #${p.id} reported: ${r}` },
    }[lang];
  },
};

/** Fallback display name when a profile has no name (per language). */
export function someoneName(lang: NotifyLang): string {
  return { uz: "Talaba", ru: "Студент", en: "A student" }[lang];
}
