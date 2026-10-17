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
import { getPremiumStatus } from "@/lib/premium";
import { fmtDate } from "@/lib/notificationTexts";
import { tgSendChatAction, type InlineButton, type Keyboard } from "./api";
import * as app from "./appAdapter";
import { CMD_TEXTS, MENU_ITEMS, markdownToTelegramHtml, maskEmail } from "./botTexts";
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
  "start", "menu", "help", "account", "profile", "universities", "scholarships", "applications",
  "deadlines", "next", "advisor", "saved", "settings", "website", "unlink",
] as const;

/** Commands that work without a linked account. */
const PUBLIC_COMMANDS = new Set(["start", "help", "website"]);

/** Legacy aliases from the first bot version. */
const ALIASES: Record<string, string> = { menu: "start", status: "account", stop: "notify_off", off: "notify_off", on: "notify_on", resume: "notify_on" };

const T = (ctx: BotCtx) => CMD_TEXTS[ctx.lang];

function send(ctx: BotCtx, html: string, buttons: Keyboard = []) {
  return sendToChat(ctx.token, ctx.chatId, html, { profileId: ctx.link?.profileId ?? null, kind: "reply", preview: html.replace(/<[^>]+>/g, "") }, buttons);
}

function who(ctx: BotCtx): app.AppIdentity {
  return { profileId: ctx.link!.profileId, telegramUserId: ctx.link!.telegramUserId };
}

/** Main menu (two per row) + the app/site buttons. Each entry → `mn:<command>`. */
function mainMenu(ctx: BotCtx): InlineButton[][] {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < MENU_ITEMS.length; i += 2) {
    rows.push(MENU_ITEMS.slice(i, i + 2).map((item) => ({ text: T(ctx).menu[item], callback_data: `mn:${item}` })));
  }
  const extra = appButtons(ctx);
  if (extra.length) rows.push(extra);
  return rows;
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
        return void (await send(ctx, BOT_TEXTS[ctx.lang].welcomeLinked(ctx.profile?.name ?? "", ctx.link.notifyEnabled), mainMenu(ctx)));
      }
      return void (await send(ctx, BOT_TEXTS[ctx.lang].welcome, siteButton(publicSiteUrl(ctx.settings), ctx.lang)));
    case "help":
      return void (await send(ctx, ctx.link ? BOT_TEXTS[ctx.lang].help : BOT_TEXTS[ctx.lang].welcome, ctx.link ? mainMenu(ctx) : siteButton(publicSiteUrl(ctx.settings), ctx.lang)));
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
  if (!items.length) {
    // Nothing for these words — offer the country shortcuts and the menu so
    // the next tap is still one tap away.
    return void (await editOrSend(ctx.token, ctx.chatId, messageId, T(ctx).noResults, { kind: "reply" }, [
      quickFilterRow(ctx, kind),
      [{ text: T(ctx).btnMenu, callback_data: "mn:menu" }],
    ]));
  }

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
  const keyboard: InlineButton[][] = [saveRow, quickFilterRow(ctx, kind)];
  if (nav.length) keyboard.push(nav);
  const extra = appButtons(ctx, kind === "u" ? "/universities" : "/scholarships");
  keyboard.push(extra.length ? [{ text: t.btnMenu, callback_data: "mn:menu" }, ...extra] : [{ text: t.btnMenu, callback_data: "mn:menu" }]);
  await editOrSend(ctx.token, ctx.chatId, messageId, `${header}\n\n${lines.join("\n\n")}`, { kind: "reply", profileId: ctx.link!.profileId, preview: "search results" }, keyboard);
}

/**
 * One-tap country shortcuts shown under every result message (`qf:<kind>:<c>`).
 * The words run as an ordinary search for that country — same service, same
 * pagination and save buttons underneath.
 */
function quickFilterRow(ctx: BotCtx, kind: "u" | "s"): InlineButton[] {
  const countries: { label: string; value: string }[] =
    kind === "u"
      ? [
          { label: "🇺🇸 USA", value: "USA" },
          { label: "🇬🇧 UK", value: "UK" },
          { label: "🇩🇪 DE", value: "Germany" },
          { label: "🇰🇷 KR", value: "South Korea" },
        ]
      : [
          { label: "🇺🇸 USA", value: "USA" },
          { label: "🇬🇧 UK", value: "UK" },
          { label: "🇩🇪 DE", value: "Germany" },
        ];
  return countries.map((c) => ({ text: c.label, callback_data: `qf:${kind}:${c.value}` }));
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
  // Basic deadlines are FREE (the 0→1 promise). Extended reminder offsets
  // (notifications_advanced) stay a Pro setting — the list itself is not locked.
  const t = T(ctx);
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

/**
 * Callback payloads are compact and validated (≤ 64 bytes, no user text):
 *   su:<id> / ss:<id>        save university / scholarship
 *   pg:u:<n> / pg:s:<n>      page n of the last search (query kept in DB)
 *   sq:u:<n> / sq:s:<n>      same words, other catalogue (search-kind switch)
 *   qf:<u|s>:<country>       quick country filter on a result message
 *   qa:1                     ask the AI advisor the last typed question
 *   lk:y:<id> / lk:n:<id>    link confirmation (see linking.ts)
 *   ul:y / ul:n              unlink confirmation
 *   st:n:1|0 / st:r:<p>      notifications on/off, reminder preset
 *   mn:<command>             main-menu shortcuts over the commands
 * Anything else ("mn:unlink", "evil:payload", …) is rejected safely.
 */
const CALLBACK_RE =
  /^(?:(su|ss):(\d{1,9})|pg:(u|s):(\d{1,4})|sq:(u|s):(\d{1,4})|qf:(u|s):(USA|UK|Germany|South Korea|Canada)|qa:1|lk:(y|n):(\d{1,12})|ul:(y|n)|st:n:(0|1)|st:r:(standard|short|off)|mn:(universities|scholarships|applications|deadlines|next|saved|advisor|profile|settings|account|menu))$/;
// Group map (positional — the project targets ES2017, so no named groups):
//   1 saveKind · 2 saveId · 3 pgKind · 4 pgPage · 5 sqKind · 6 sqPage
//   7 qfKind · 8 qfCountry · 9 lkYn · 10 lkId · 11 ulYn · 12 stN · 13 stR · 14 mnItem

/** Handle a button press; returns the toast text for answerCallbackQuery. */
export async function runCallback(ctx: BotCtx, data: string, messageId: number | null): Promise<string> {
  const m = CALLBACK_RE.exec(data || "");
  if (!m) return T(ctx).error;
  const t = T(ctx);

  // Linking works before a link exists.
  if (m[9]) return handleLinkCallback(m[9] as "y" | "n", Number(m[10]), ctx.from, ctx.chatId, messageId, ctx.lang);
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
  if (m[5]) {
    // "Search the same words in the other catalogue": switch the stored kind
    // (the query text stays) and run page 1 — pagination then follows.
    const last = readLastQuery(ctx.link);
    const q = last?.q ?? "";
    await db.update(telegramLinks).set({ lastQuery: JSON.stringify({ k: m[5], q }) }).where(eq(telegramLinks.id, ctx.link.id));
    await search(ctx, m[5] as "u" | "s", q, Number(m[6]), messageId);
    return "";
  }
  if (m[7]) {
    // Quick country filter: the country name becomes the query, so the same
    // result message (saves, pagination, filters) simply re-renders.
    await db
      .update(telegramLinks)
      .set({ lastQuery: JSON.stringify({ k: m[7], q: m[8] }) })
      .where(eq(telegramLinks.id, ctx.link.id));
    await search(ctx, m[7] as "u" | "s", m[8] ?? "", 1, messageId);
    return "";
  }
  if (data === "qa:1") {
    const last = readLastQuery(ctx.link);
    if (!last?.q) return t.advisorUsage;
    await advisor(ctx, last.q);
    return "";
  }
  if (m[11]) {
    if (m[11] === "n") {
      await editOrSend(ctx.token, ctx.chatId, messageId, t.unlinkCancelled, { kind: "reply" });
      return "";
    }
    await unlinkProfile(ctx.link.profileId, "bot", { notify: false });
    await editOrSend(ctx.token, ctx.chatId, messageId, BOT_TEXTS[ctx.lang].unlinked, { kind: "reply", preview: "unlinked" });
    return "";
  }
  if (m[14]) {
    // Menu buttons are shortcuts for the commands — same code path, same
    // server-side premium and permission checks.
    await runCommand(ctx, m[14], "");
    return "";
  }
  if (m[12] || m[13]) {
    const patch = m[12] ? { notifyEnabled: m[12] === "1" } : { reminderDays: JSON.stringify(REMINDER_PRESETS[m[13] as ReminderPreset]) };
    const [row] = await db.update(telegramLinks).set(patch).where(eq(telegramLinks.id, ctx.link.id)).returning();
    if (row) await settings({ ...ctx, link: row }, messageId);
    return t.settingsSaved;
  }
  return t.error;
}

/**
 * Plain text from a LINKED user that is a short search phrase (not a
 * question): store it as the last query and answer with one-tap choices —
 * search universities, search scholarships, ask the AI advisor, or open the
 * Mini App. The same words are used by every button below.
 */
export async function promptPlainSearch(ctx: BotCtx, rawText: string): Promise<void> {
  const q = rawText.replace(/\s+/g, " ").trim().slice(0, 80);
  if (!q || !ctx.link) return void (await runCommand(ctx, "help", ""));
  await db.update(telegramLinks).set({ lastQuery: JSON.stringify({ k: "u", q }) }).where(eq(telegramLinks.id, ctx.link.id));
  const t = T(ctx);
  const keyboard: InlineButton[][] = [
    [
      { text: t.btnSearchUnis, callback_data: "pg:u:1" },
      { text: t.btnSearchSchs, callback_data: "sq:s:1" },
    ],
    [{ text: t.btnAskAi, callback_data: "qa:1" }],
  ];
  const extra = appButtons(ctx);
  if (extra.length) keyboard.push(extra);
  await send(ctx, t.plainPrompt(q), keyboard);
}
