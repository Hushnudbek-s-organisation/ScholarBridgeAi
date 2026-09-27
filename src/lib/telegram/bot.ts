/**
 * Bot commands + inline-button callbacks. Every data command goes through
 * appAdapter → the existing API routes (same auth, entitlements, quotas);
 * this file only turns their JSON into Telegram messages.
 *
 * Callback data is compact and validated (≤ 64 bytes, no user text):
 *   su:<id> / ss:<id>     save university / scholarship
 *   pg:u:<n> / pg:s:<n>   result page n of the last search (query kept in DB)
 *   lk:y:<id> / lk:n:<id> link confirmation (see linking.ts)
 *   ul:y / ul:n           unlink confirmation
 *   st:n:1|0 / st:r:<p>   notifications on/off, reminder preset
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramLinks } from "@/db/schema";
import { hasFeature, getPremiumStatus } from "@/lib/premium";
import { fmtDate } from "@/lib/notificationTexts";
import { tgSendChatAction, type InlineButton, type Keyboard } from "./api";
import * as app from "./appAdapter";
import { CMD_TEXTS, markdownToTelegramHtml, maskEmail } from "./botTexts";
import { BOT_TEXTS, escapeHtml, isTelegramPlaceholderEmail, type BotLang, type TelegramSettings } from "./core";
import { handleLinkCallback, unlinkProfile, type TgUser } from "./linking";
import { editOrSend, openAppButton, publicSiteUrl, sendToChat, siteButton, type LinkRow, type ProfileRow } from "./messaging";
import { parseReminderDays, REMINDER_PRESETS, type ReminderPreset } from "./reminders";

export interface BotCtx {
  token: string;
  chatId: string;
  from: TgUser;
  link: LinkRow | null;
  profile: ProfileRow | null;
  lang: BotLang;
  settings: TelegramSettings;
}

export const BOT_COMMANDS = [
  "start", "help", "account", "profile", "universities", "scholarships", "applications",
  "deadlines", "next", "advisor", "saved", "settings", "website", "unlink",
] as const;

/** Commands that work without a linked account. */
const PUBLIC_COMMANDS = new Set(["start", "help", "website"]);

/** Legacy aliases from the first bot version. */
const ALIASES: Record<string, string> = { status: "account", stop: "notify_off", off: "notify_off", on: "notify_on", resume: "notify_on" };

const T = (ctx: BotCtx) => CMD_TEXTS[ctx.lang];

function send(ctx: BotCtx, html: string, buttons: Keyboard = []) {
  return sendToChat(ctx.token, ctx.chatId, html, { profileId: ctx.link?.profileId ?? null, kind: "reply", preview: html.replace(/<[^>]+>/g, "") }, buttons);
}

function who(ctx: BotCtx): app.AppIdentity {
  return { profileId: ctx.link!.profileId, telegramUserId: ctx.link!.telegramUserId };
}

function appButtons(ctx: BotCtx, link?: string | null): InlineButton[] {
  return [...openAppButton(ctx.settings, T(ctx).btnOpenApp), ...siteButton(publicSiteUrl(ctx.settings), ctx.lang, link ?? null, T(ctx).btnWebsite)];
}

/** Map a failed adapter response to a user message (null → it succeeded). */
function failure(ctx: BotCtx, res: app.AppResponse): string | null {
  if (res.fallback) return T(ctx).unavailable;
  if (res.status === 401) return T(ctx).sessionGone;
  if (res.status === 429) return T(ctx).rateLimited;
  if (res.status === 503) return T(ctx).unavailable;
  if (res.status >= 400) return T(ctx).error;
  return null;
}

const money = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? `$${Math.round(n).toLocaleString("en-US")}` : null);
const clamp = (s: unknown, n = 90) => escapeHtml(String(s ?? "").slice(0, n));

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export async function runCommand(ctx: BotCtx, rawCmd: string, args: string): Promise<void> {
  const cmd = ALIASES[rawCmd] ?? rawCmd;
  if (!ctx.link && !PUBLIC_COMMANDS.has(cmd)) {
    return void (await send(ctx, BOT_TEXTS[ctx.lang].notLinkedShort, siteButton(publicSiteUrl(ctx.settings), ctx.lang)));
  }
  switch (cmd) {
    case "start":
      if (ctx.link) {
        return void (await send(ctx, BOT_TEXTS[ctx.lang].welcomeLinked(ctx.profile?.name ?? "", ctx.link.notifyEnabled), appButtons(ctx)));
      }
      return void (await send(ctx, BOT_TEXTS[ctx.lang].welcome, siteButton(publicSiteUrl(ctx.settings), ctx.lang)));
    case "help":
      return void (await send(ctx, ctx.link ? BOT_TEXTS[ctx.lang].help : BOT_TEXTS[ctx.lang].welcome, ctx.link ? [] : siteButton(publicSiteUrl(ctx.settings), ctx.lang)));
    case "website": {
      const buttons = appButtons(ctx);
      return void (await send(ctx, buttons.length ? T(ctx).websiteText : T(ctx).unavailable, buttons));
    }
    case "account":
      return account(ctx);
    case "profile":
      return profile(ctx);
    case "universities":
      return search(ctx, "u", args, 1, null);
    case "scholarships":
      return search(ctx, "s", args, 1, null);
    case "saved":
      return saved(ctx);
    case "applications":
      return applications(ctx);
    case "deadlines":
      return deadlines(ctx);
    case "next":
      return next(ctx);
    case "advisor":
      return advisor(ctx, args);
    case "settings":
      return settings(ctx, null);
    case "notify_off":
    case "notify_on": {
      const on = cmd === "notify_on";
      await db.update(telegramLinks).set({ notifyEnabled: on }).where(eq(telegramLinks.id, ctx.link!.id));
      return void (await send(ctx, on ? BOT_TEXTS[ctx.lang].notifyOn : BOT_TEXTS[ctx.lang].notifyOff));
    }
    case "unlink":
      return void (await send(ctx, T(ctx).unlinkConfirm, [[
        { text: T(ctx).btnUnlink, callback_data: "ul:y" },
        { text: T(ctx).btnCancel, callback_data: "ul:n" },
      ]]));
    default:
      return void (await send(ctx, T(ctx).unknown));
  }
}

async function account(ctx: BotCtx) {
  const status = await getPremiumStatus(ctx.link!.profileId);
  const email = ctx.profile?.email && !isTelegramPlaceholderEmail(ctx.profile.email) ? maskEmail(ctx.profile.email) : "";
  await send(
    ctx,
    T(ctx).account({
      name: ctx.profile?.name ?? "",
      email,
      plan: T(ctx).planNames[status.plan],
      notify: ctx.link!.notifyEnabled,
      since: fmtDate(ctx.link!.linkedAt),
    }),
    appButtons(ctx, "/payments")
  );
}

async function profile(ctx: BotCtx) {
  const res = await app.getProfile(who(ctx));
  const fail = failure(ctx, res);
  if (fail) return void (await send(ctx, fail));
  const p = (res.body as { profile?: Record<string, any> })?.profile ?? {};
  const ns = T(ctx).notSet;
  let countries = ns;
  try {
    const list = JSON.parse(p.preferredCountries || "[]");
    if (Array.isArray(list) && list.length) countries = list.slice(0, 6).join(", ");
  } catch {
    /* keep "not set" */
  }
  const english = p.ieltsScore != null ? `IELTS ${p.ieltsScore}` : p.toeflScore != null ? `TOEFL ${p.toeflScore}` : ns;
  await send(
    ctx,
    T(ctx).profile({
      name: p.name || ns,
      level: p.degreeLevel || ns,
      major: p.targetMajor || ns,
      gpa: p.gpa != null ? `${p.gpa}${p.gpaScale ? ` / ${p.gpaScale}` : ""}` : ns,
      english,
      countries,
      budget: money(p.budgetAnnualUsd) ?? ns,
    }),
    appButtons(ctx, "/profile")
  );
}

// ---- search (universities / scholarships) --------------------------------

interface LastQuery {
  k: "u" | "s";
  q: string;
}

function readLastQuery(link: LinkRow): LastQuery | null {
  try {
    const v = JSON.parse(link.lastQuery || "null");
    return v && (v.k === "u" || v.k === "s") && typeof v.q === "string" ? { k: v.k, q: v.q.slice(0, 80) } : null;
  } catch {
    return null;
  }
}

async function search(ctx: BotCtx, kind: "u" | "s", rawQuery: string, page: number, messageId: number | null) {
  const query = rawQuery.replace(/\s+/g, " ").trim().slice(0, 80);
  if (messageId === null) {
    await db.update(telegramLinks).set({ lastQuery: JSON.stringify({ k: kind, q: query }) }).where(eq(telegramLinks.id, ctx.link!.id));
  }
  const res = kind === "u" ? await app.searchUniversities(who(ctx), query, page) : await app.searchScholarships(who(ctx), query, page);
  const fail = failure(ctx, res);
  if (fail) return void (await editOrSend(ctx.token, ctx.chatId, messageId, fail, { kind: "reply" }));
  const body = res.body as Record<string, any>;
  const items: Record<string, any>[] = (kind === "u" ? body.universities : body.scholarships) ?? [];
  const total = Number(body.total ?? items.length);
  const pages = Math.max(1, Number(body.totalPages ?? 1));
  const current = Math.min(Math.max(1, Number(body.page ?? page)), pages);
  if (!items.length) return void (await editOrSend(ctx.token, ctx.chatId, messageId, T(ctx).noResults, { kind: "reply" }));

  const t = T(ctx);
  const lines = items.map((it, i) => {
    const n = (current - 1) * app.PAGE_SIZE + i + 1;
    const match = typeof it.matchScore === "number" ? ` · 🎯 ${Math.round(it.matchScore)}% ${t.match}` : "";
    if (kind === "u") {
      const place = [it.city, it.country].filter(Boolean).map((x) => clamp(x, 40)).join(", ");
      const rank = it.worldRanking ? ` · 🏆 #${Number(it.worldRanking)}` : "";
      const fee = money(it.annualTuitionUsd);
      return `<b>${n}. ${clamp(it.name)}</b>\n📍 ${place}${rank}${fee ? ` · 💵 ${fee} ${t.perYear}` : ""}${match}`;
    }
    const amount = money(it.amountUsdValue);
    const dl = it.deadlineDate ? ` · ⏰ ${t.deadline} ${fmtDate(it.deadlineDate)}` : "";
    return `<b>${n}. ${clamp(it.title)}</b>\n🏢 ${clamp(it.provider, 50)} · 📍 ${clamp(it.country, 40)}${amount ? ` · 💵 ${amount}` : ""}${dl}${match}`;
  });
  const header = kind === "u" ? t.uniHeader(query, current, pages, total) : t.schHeader(query, current, pages, total);
  const saveRow: InlineButton[] = items.map((it, i) => ({
    text: `⭐ ${(current - 1) * app.PAGE_SIZE + i + 1}`,
    callback_data: `${kind === "u" ? "su" : "ss"}:${Number(it.id)}`,
  }));
  const nav: InlineButton[] = [];
  if (current > 1) nav.push({ text: t.prev, callback_data: `pg:${kind}:${current - 1}` });
  if (current < pages) nav.push({ text: t.next, callback_data: `pg:${kind}:${current + 1}` });
  const keyboard: InlineButton[][] = [saveRow];
  if (nav.length) keyboard.push(nav);
  const extra = appButtons(ctx, kind === "u" ? "/universities" : "/scholarships");
  if (extra.length) keyboard.push(extra);
  await editOrSend(ctx.token, ctx.chatId, messageId, `${header}\n\n${lines.join("\n\n")}`, { kind: "reply", profileId: ctx.link!.profileId, preview: "search results" }, keyboard);
}

// ---- lists -----------------------------------------------------------------

async function saved(ctx: BotCtx) {
  const [u, s] = await Promise.all([app.savedUniversities(who(ctx)), app.savedScholarships(who(ctx))]);
  const fail = failure(ctx, u) ?? failure(ctx, s);
  if (fail) return void (await send(ctx, fail));
  const unis: Record<string, any>[] = (u.body as any)?.savedUniversities ?? [];
  const schs: Record<string, any>[] = (s.body as any)?.savedScholarships ?? [];
  const t = T(ctx);
  if (!unis.length && !schs.length) return void (await send(ctx, t.savedEmpty, appButtons(ctx)));
  const parts = [t.savedHeader];
  if (unis.length) {
    parts.push(`\n<b>${t.savedUnis}</b>`);
    for (const r of unis.slice(0, 10)) parts.push(`• ${clamp(r.university?.name)} — ${clamp(r.university?.country, 40)}`);
  }
  if (schs.length) {
    parts.push(`\n<b>${t.savedSch}</b>`);
    for (const r of schs.slice(0, 10)) {
      const dl = r.scholarship?.deadlineDate ? ` · ⏰ ${fmtDate(r.scholarship.deadlineDate)}` : "";
      parts.push(`• ${clamp(r.scholarship?.title)}${dl}`);
    }
  }
  await send(ctx, parts.join("\n"), appButtons(ctx));
}

async function applications(ctx: BotCtx) {
  const res = await app.listApplications(who(ctx));
  const fail = failure(ctx, res);
  if (fail) return void (await send(ctx, fail));
  const rows: Record<string, any>[] = (res.body as any)?.applications ?? [];
  const t = T(ctx);
  if (!rows.length) return void (await send(ctx, t.appsEmpty, appButtons(ctx, "/applications")));
  const lines = rows.slice(0, 12).map((a) => {
    const status = t.appStatus[a.status] ?? clamp(a.status, 30);
    const dl = a.deadline ? ` · ⏰ ${fmtDate(a.deadline)}` : "";
    const prog = a.programName ? ` — ${clamp(a.programName, 60)}` : "";
    return `• <b>${clamp(a.universityName)}</b>${prog}\n   ${escapeHtml(status)}${dl}`;
  });
  await send(ctx, `${t.appsHeader}\n\n${lines.join("\n")}`, appButtons(ctx, "/applications"));
}

async function deadlines(ctx: BotCtx) {
  const t = T(ctx);
  // Same Premium rule the website's Deadline Center uses — enforced here on
  // the server, whatever the client shows.
  if (!(await hasFeature(ctx.link!.profileId, "deadline_center"))) {
    return void (await send(ctx, t.premiumLocked, siteButton(publicSiteUrl(ctx.settings), ctx.lang, "/payments", t.btnUpgrade)));
  }
  const res = await app.listDeadlines(who(ctx));
  const fail = failure(ctx, res);
  if (fail) return void (await send(ctx, fail));
  const items: Record<string, any>[] = ((res.body as any)?.items ?? []).filter(
    (i: any) => i.date && typeof i.daysRemaining === "number" && i.daysRemaining >= 0
  );
  if (!items.length) return void (await send(ctx, t.deadlinesEmpty, appButtons(ctx)));
  const icon: Record<string, string> = { critical: "🔴", soon: "🟠" };
  const lines = items.slice(0, 10).map((i) => `${icon[i.urgency] ?? "🟡"} <b>${clamp(i.title)}</b>\n   ${fmtDate(i.date)} · ${t.daysLeft(i.daysRemaining)}`);
  await send(ctx, `${t.deadlinesHeader}\n\n${lines.join("\n")}`, appButtons(ctx));
}

async function next(ctx: BotCtx) {
  const res = await app.nextActions(who(ctx));
  const fail = failure(ctx, res);
  if (fail) return void (await send(ctx, fail));
  const body = res.body as { headline?: string; actions?: { title: string; why: string; urgency: string }[] };
  const t = T(ctx);
  const actions = body?.actions ?? [];
  if (!actions.length) return void (await send(ctx, t.nextEmpty, appButtons(ctx)));
  const icon: Record<string, string> = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };
  const lines = actions.slice(0, 3).map((a, i) => `${icon[a.urgency] ?? "•"} <b>${i + 1}. ${clamp(a.title, 120)}</b>\n${clamp(a.why, 300)}`);
  const head = body.headline ? `\n<i>${clamp(body.headline, 200)}</i>` : "";
  await send(ctx, `${t.nextHeader}${head}\n\n${lines.join("\n\n")}`, appButtons(ctx));
}

async function advisor(ctx: BotCtx, question: string) {
  const t = T(ctx);
  const q = question.trim().slice(0, 2000);
  if (!q) return void (await send(ctx, t.advisorUsage));
  await tgSendChatAction(ctx.token, ctx.chatId).catch(() => undefined);
  const res = await app.askAdvisor(who(ctx), q);
  if (res.status === 403) {
    return void (await send(ctx, t.premiumLocked, siteButton(publicSiteUrl(ctx.settings), ctx.lang, "/payments", t.btnUpgrade)));
  }
  const fail = failure(ctx, res);
  if (fail) return void (await send(ctx, fail));
  const body = res.body as { reply?: string; offline?: boolean };
  if (!body?.reply) return void (await send(ctx, t.error));
  const html = markdownToTelegramHtml(body.reply);
  await send(ctx, body.offline ? `${t.advisorOffline}\n\n${html}` : html, appButtons(ctx, "/chat"));
}

// ---- settings ----------------------------------------------------------------

function settingsKeyboard(ctx: BotCtx, link: LinkRow): Keyboard {
  const t = T(ctx);
  return [
    [link.notifyEnabled ? { text: t.btnNotifyOff, callback_data: "st:n:0" } : { text: t.btnNotifyOn, callback_data: "st:n:1" }],
    (Object.keys(REMINDER_PRESETS) as ReminderPreset[]).map((p) => ({ text: t.reminderPresets[p], callback_data: `st:r:${p}` })),
  ];
}

async function settings(ctx: BotCtx, messageId: number | null) {
  const link = ctx.link!;
  await editOrSend(
    ctx.token,
    ctx.chatId,
    messageId,
    T(ctx).settings(link.notifyEnabled, parseReminderDays(link.reminderDays)),
    { kind: "reply", profileId: link.profileId, preview: "settings" },
    settingsKeyboard(ctx, link)
  );
}

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

const CALLBACK_RE = /^(?:(su|ss):(\d{1,9})|pg:(u|s):(\d{1,4})|lk:(y|n):(\d{1,12})|ul:(y|n)|st:n:(0|1)|st:r:(standard|short|off))$/;

/** Handle a button press; returns the toast text for answerCallbackQuery. */
export async function runCallback(ctx: BotCtx, data: string, messageId: number | null): Promise<string> {
  const m = CALLBACK_RE.exec(data || "");
  if (!m) return T(ctx).error;
  const t = T(ctx);

  // Linking works before a link exists.
  if (m[5]) return handleLinkCallback(m[5] as "y" | "n", Number(m[6]), ctx.from, ctx.chatId, messageId, ctx.lang);
  if (!ctx.link) return t.sessionGone;

  if (m[1]) {
    const id = Number(m[2]);
    const res = m[1] === "su" ? await app.saveUniversity(who(ctx), id) : await app.saveScholarship(who(ctx), id);
    const fail = failure(ctx, res);
    if (fail) return fail;
    return (res.body as { message?: string })?.message === "Already saved" ? t.alreadySaved : t.saved;
  }
  if (m[3]) {
    const last = readLastQuery(ctx.link);
    await search(ctx, m[3] as "u" | "s", last && last.k === m[3] ? last.q : "", Number(m[4]), messageId);
    return "";
  }
  if (m[7]) {
    if (m[7] === "n") {
      await editOrSend(ctx.token, ctx.chatId, messageId, t.unlinkCancelled, { kind: "reply" });
      return "";
    }
    await unlinkProfile(ctx.link.profileId, "bot", { notify: false });
    await editOrSend(ctx.token, ctx.chatId, messageId, BOT_TEXTS[ctx.lang].unlinked, { kind: "reply", preview: "unlinked" });
    return "";
  }
  if (m[8] || m[9]) {
    const patch = m[8] ? { notifyEnabled: m[8] === "1" } : { reminderDays: JSON.stringify(REMINDER_PRESETS[m[9] as ReminderPreset]) };
    const [row] = await db.update(telegramLinks).set(patch).where(eq(telegramLinks.id, ctx.link.id)).returning();
    if (row) await settings({ ...ctx, link: row }, messageId);
    return t.settingsSaved;
  }
  return t.error;
}
