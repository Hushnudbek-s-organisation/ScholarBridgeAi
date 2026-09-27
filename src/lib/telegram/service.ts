/**
 * Telegram bot — server logic: webhook dispatch, code sign-in for LINKED
 * accounts, notification delivery (+ retries), broadcasts and the log.
 *
 * Related modules:
 *   linking.ts    connect / disconnect an account (confirmation button, cases A–G)
 *   bot.ts        commands + inline buttons (adapter over the existing API routes)
 *   messaging.ts  sending, delivery log, lookups
 *
 * SIGN-IN WITH A CODE (only for accounts that already connected Telegram —
 * Telegram never creates accounts; new users sign up on the website):
 *  1. Browser → POST /api/auth/telegram/start → { id, nonce, deepLink }.
 *     The nonce stays in the browser; only its HMAC is stored, and only the
 *     SHA-256 of the deep-link token is stored.
 *  2. User opens t.me/<bot>?start=login_<token> and presses Start.
 *  3. Webhook receives `/start login_<token>` → if this Telegram is linked, the
 *     bot sends a 6-digit code to THAT chat.
 *  4. Browser → POST /api/auth/telegram/verify { id, nonce, code } → session.
 *  A code is only valid together with the browser's nonce, expires after 5
 *  minutes, allows 5 wrong tries and can be used once.
 */
import { and, desc, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { applicationTasks, savedScholarships, studentProfiles, telegramLinks, telegramLoginRequests, telegramMessages, telegramUpdates } from "@/db/schema";
import { sessionSecret } from "@/lib/auth";
import { tgAnswerCallback, tgSendMessage, type InlineButton } from "./api";
import {
  BOT_TEXTS,
  CODE_TTL_MS,
  escapeHtml,
  formatNotification,
  hashStartToken,
  hmacHex,
  MAX_CODE_ATTEMPTS,
  MAX_CODES_PER_REQUEST,
  newCode,
  parseCommand,
  parseStartPayload,
  pickLang,
  safeEqualHex,
  shouldDeliver,
  type BotLang,
} from "./core";
import { CMD_TEXTS } from "./botTexts";
import { runCallback, runCommand, type BotCtx } from "./bot";
import { handleLinkStart, loadOwnedRequest, type TgUser } from "./linking";
import {
  getLinkByProfile,
  getLinkByTelegramUser,
  getProfileRow,
  langOf,
  logMessage,
  markChatReachable,
  publicSiteUrl,
  sendToChat,
  siteButton,
  type LinkRow,
  type ProfileRow,
  type RetryPayload,
} from "./messaging";
import { ensureTelegramTables } from "./db";
import { getBotToken, getTelegramSettings } from "./settings";
import { calendarDaysUntil, reminderTimezone } from "./reminders";

// Existing importers keep working.
export { getLinkByProfile, logMessage, sendToChat } from "./messaging";
export { startRequest, requestStatus, unlinkProfile } from "./linking";

// ---------------------------------------------------------------------------
// Webhook updates
// ---------------------------------------------------------------------------

interface TgChat {
  id: number;
  type: string;
}
export interface TgUpdate {
  update_id?: number;
  message?: { message_id?: number; chat: TgChat; from?: TgUser; text?: string };
  callback_query?: { id: string; from: TgUser; data?: string; message?: { message_id: number; chat: TgChat } };
  my_chat_member?: { chat: TgChat; from: TgUser; new_chat_member?: { status?: string } };
}

/**
 * Claim an update id (persistent, works across instances and restarts).
 * false → already processed (Telegram re-delivered it) or no id at all.
 */
export async function claimUpdate(updateId: unknown): Promise<boolean> {
  if (typeof updateId !== "number" || !Number.isSafeInteger(updateId) || updateId < 0) return false;
  const rows = await db.insert(telegramUpdates).values({ updateId }).onConflictDoNothing().returning({ id: telegramUpdates.updateId });
  return rows.length > 0;
}

export async function pruneTelegramUpdates(days = 7): Promise<void> {
  await db.delete(telegramUpdates).where(lt(telegramUpdates.receivedAt, new Date(Date.now() - days * 86_400_000))).catch(() => undefined);
}

function argsOf(text: string | undefined): string {
  if (!text) return "";
  return text.trim().replace(/^\/[a-z_]+(?:@\w+)?/i, "").trim();
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (!(await claimUpdate(update.update_id))) return;
  const { token } = await getBotToken();
  if (!token) return;
  const settings = await getTelegramSettings();

  // The user blocked / unblocked the bot.
  if (update.my_chat_member) {
    if (update.my_chat_member.chat.type === "private") {
      const status = update.my_chat_member.new_chat_member?.status;
      const blocked = status === "kicked" || status === "left";
      await db.update(telegramLinks).set({ blocked }).where(eq(telegramLinks.telegramUserId, String(update.my_chat_member.from.id)));
    }
    return;
  }

  // ---- inline buttons ----
  const cq = update.callback_query;
  if (cq) {
    let toast = "";
    try {
      const chat = cq.message?.chat;
      if (!chat || chat.type !== "private" || cq.from?.is_bot) {
        toast = CMD_TEXTS[pickLang(cq.from?.language_code)].privateOnly;
      } else {
        const ctx = await buildCtx(token, String(chat.id), cq.from, settings);
        toast = await runCallback(ctx, String(cq.data ?? ""), cq.message?.message_id ?? null);
      }
    } catch (err) {
      console.error("[telegram] callback failed:", err instanceof Error ? err.message : err);
      toast = CMD_TEXTS[pickLang(cq.from?.language_code)].error;
    } finally {
      // Always answer, or the button spins forever on the user's screen.
      await tgAnswerCallback(token, cq.id, toast || undefined).catch(() => undefined);
    }
    return;
  }

  const msg = update.message;
  if (!msg || !msg.from || msg.from.is_bot) return;

  // Groups / channels: never reveal account data where others can read it.
  if (msg.chat.type !== "private") {
    if (msg.text && parseCommand(msg.text)) {
      await sendToChat(token, String(msg.chat.id), CMD_TEXTS[pickLang(msg.from.language_code)].privateOnly, { kind: "reply", preview: "private only" });
    }
    return;
  }

  const chatId = String(msg.chat.id);
  const ctx = await buildCtx(token, chatId, msg.from, settings);

  const payload = parseStartPayload(msg.text);
  if (payload) {
    if (payload.purpose === "link") return void (await handleLinkStart(payload.token, msg.from, chatId, ctx.lang));
    return void (await handleLoginStart(payload.token, msg.from, chatId, ctx.link, ctx.lang, token));
  }

  const cmd = parseCommand(msg.text);
  if (!cmd) {
    // Plain text: point to the commands (or the website when not linked).
    return void (await runCommand(ctx, "help", ""));
  }
  await runCommand(ctx, cmd, argsOf(msg.text));
}

async function buildCtx(token: string, chatId: string, from: TgUser, settings: Awaited<ReturnType<typeof getTelegramSettings>>): Promise<BotCtx> {
  const tgUserId = String(from.id);
  let link = await getLinkByTelegramUser(tgUserId);
  // Keep chat details fresh for linked users.
  if (link && (link.chatId !== chatId || link.username !== (from.username ?? null) || link.blocked)) {
    const [row] = await db
      .update(telegramLinks)
      .set({ chatId, username: from.username ?? null, firstName: from.first_name ?? null, blocked: false })
      .where(eq(telegramLinks.id, link.id))
      .returning();
    link = row ?? link;
  }
  const profile = link ? await getProfileRow(link.profileId) : null;
  return { token, chatId, from, link, profile, lang: langOf(profile, from.language_code), settings };
}

async function failRequest(id: number, reason: string) {
  await db.update(telegramLoginRequests).set({ status: "failed", failReason: reason }).where(eq(telegramLoginRequests.id, id));
}

/** `/start login_<token>` — send a sign-in code, but only to a linked Telegram. */
async function handleLoginStart(rawToken: string, from: TgUser, chatId: string, link: LinkRow | null, lang: BotLang, token: string) {
  const settings = await getTelegramSettings();
  const T = BOT_TEXTS[lang];
  const tgUserId = String(from.id);
  const say = (html: string, buttons: InlineButton[] = []) =>
    sendToChat(token, chatId, html, { profileId: link?.profileId ?? null, kind: "reply", preview: html.replace(/<[^>]+>/g, "") }, buttons);

  const [req] = await db.select().from(telegramLoginRequests).where(eq(telegramLoginRequests.startToken, hashStartToken(rawToken))).limit(1);
  if (!req || req.purpose !== "login" || req.expiresAt.getTime() < Date.now() || !["pending", "code_sent"].includes(req.status)) {
    return void (await say(T.expired));
  }
  if (req.telegramUserId && req.telegramUserId !== tgUserId) return void (await say(T.alreadyUsed));
  if (req.codesSent >= MAX_CODES_PER_REQUEST) return void (await say(T.tooMany));
  if (!settings.loginEnabled) {
    await failRequest(req.id, "login_disabled");
    return void (await say(T.loginDisabled));
  }
  if (!link) {
    // No auto-signup: the user creates the account on the website first.
    await failRequest(req.id, "not_linked");
    return void (await say(T.notLinked, siteButton(publicSiteUrl(settings), lang)));
  }
  const p = await getProfileRow(link.profileId);
  if (p?.isAdmin && !settings.adminLoginEnabled) {
    await failRequest(req.id, "admin_blocked");
    return void (await say(T.adminBlocked));
  }

  const code = newCode();
  // Claim for this Telegram user (a concurrent Start from someone else loses).
  const updated = await db
    .update(telegramLoginRequests)
    .set({
      status: "code_sent",
      telegramUserId: tgUserId,
      chatId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
      codeHash: hmacHex(sessionSecret(), "tg-code", req.id, code),
      codeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
      codesSent: req.codesSent + 1,
      attempts: 0,
    })
    .where(
      and(
        eq(telegramLoginRequests.id, req.id),
        eq(telegramLoginRequests.codesSent, req.codesSent),
        sql`(${telegramLoginRequests.telegramUserId} IS NULL OR ${telegramLoginRequests.telegramUserId} = ${tgUserId})`
      )
    )
    .returning({ id: telegramLoginRequests.id });
  if (!updated.length) return void (await say(T.alreadyUsed));

  await sendToChat(token, chatId, T.code(code, Math.round(CODE_TTL_MS / 60_000), "login"), {
    profileId: link.profileId,
    kind: "code",
    type: "login",
  });
}

// ---------------------------------------------------------------------------
// Verify the code (browser)
// ---------------------------------------------------------------------------

export type VerifyResult =
  | { ok: true; kind: "login"; profile: ProfileRow }
  | { ok: false; status: number; code: string; error: string; attemptsLeft?: number };

const fail = (status: number, code: string, error: string, attemptsLeft?: number): VerifyResult => ({
  ok: false,
  status,
  code,
  error,
  ...(attemptsLeft !== undefined ? { attemptsLeft } : {}),
});

export async function verifyRequest(input: { id: unknown; nonce: unknown; code: string }): Promise<VerifyResult> {
  const req = await loadOwnedRequest(input.id, input.nonce);
  if (!req) return fail(400, "invalid_request", "This sign-in attempt is not valid. Please start again.");
  if (req.purpose !== "login") return fail(400, "invalid_request", "Connecting Telegram is confirmed with the button in the bot.");
  if (req.status === "failed") return fail(409, req.failReason || "failed", "This attempt was refused by the bot.");
  if (req.status === "locked") return fail(429, "locked", "Too many wrong codes. Please start again.");
  if (req.status === "used") return fail(410, "expired", "This code was already used. Please start again.");
  if (req.status !== "code_sent" || !req.codeHash) return fail(400, "code_not_sent", "Open the bot and press Start first.");
  const now = Date.now();
  if (req.expiresAt.getTime() < now || (req.codeExpiresAt && req.codeExpiresAt.getTime() < now)) {
    return fail(410, "expired", "The code has expired. Press Start in the bot again for a new one.");
  }
  if (req.attempts >= MAX_CODE_ATTEMPTS) return fail(429, "locked", "Too many wrong codes. Please start again.");

  if (!safeEqualHex(req.codeHash, hmacHex(sessionSecret(), "tg-code", req.id, input.code))) {
    const attempts = req.attempts + 1;
    await db
      .update(telegramLoginRequests)
      .set({ attempts, ...(attempts >= MAX_CODE_ATTEMPTS ? { status: "locked" } : {}) })
      .where(eq(telegramLoginRequests.id, req.id));
    const left = Math.max(0, MAX_CODE_ATTEMPTS - attempts);
    return left === 0
      ? fail(429, "locked", "Too many wrong codes. Please start again.", 0)
      : fail(400, "wrong_code", "The code is not correct.", left);
  }

  // Single use: only one concurrent request can flip code_sent → used.
  const claimed = await db
    .update(telegramLoginRequests)
    .set({ status: "used" })
    .where(and(eq(telegramLoginRequests.id, req.id), eq(telegramLoginRequests.status, "code_sent")))
    .returning({ id: telegramLoginRequests.id });
  if (claimed.length === 0) return fail(410, "expired", "This code was already used. Please start again.");

  const settings = await getTelegramSettings();
  if (!settings.loginEnabled) return fail(403, "login_disabled", "Signing in with Telegram is turned off.");
  // The link is re-read now: an unlink between Start and verify wins.
  const link = await getLinkByTelegramUser(req.telegramUserId as string);
  const profile = link ? await getProfileRow(link.profileId) : null;
  if (!link || !profile) return fail(403, "not_linked", "This Telegram is not connected to an account.");
  if (profile.isAdmin && !settings.adminLoginEnabled) {
    return fail(403, "admin_blocked", "Admin accounts must sign in with email and password.");
  }
  await db
    .update(telegramLinks)
    .set({ lastLoginAt: new Date(), chatId: req.chatId ?? link.chatId, username: req.username, blocked: false })
    .where(eq(telegramLinks.id, link.id));
  return { ok: true, kind: "login", profile };
}

// ---------------------------------------------------------------------------
// Notifications (+ bounded retries)
// ---------------------------------------------------------------------------

/** Deliver one notification to the profile's Telegram (if every switch allows it). */
export async function deliverTelegramNotification(input: {
  profileId: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
}): Promise<boolean> {
  try {
    if (!(await ensureTelegramTables())) return false;
    const { token } = await getBotToken();
    if (!token) return false;
    const settings = await getTelegramSettings();
    const link = await getLinkByProfile(input.profileId);
    if (!shouldDeliver({ settings, link, type: input.type, hasToken: true }) || !link) return false;
    const profile = await getProfileRow(input.profileId);
    const lang = pickLang(profile?.preferredLocale ?? link.languageCode);
    const res = await sendToChat(
      token,
      link.chatId,
      formatNotification(lang, input),
      {
        profileId: input.profileId,
        kind: "notification",
        type: input.type,
        preview: input.title,
        retryPayload: { profileId: input.profileId, type: input.type, title: input.title, body: input.body, link: input.link ?? null },
      },
      siteButton(publicSiteUrl(settings), lang, input.link, BOT_TEXTS[lang].open)
    );
    return res.ok;
  } catch (err) {
    console.warn("[telegram] notification delivery failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export const MAX_DELIVERY_ATTEMPTS = 3;

/**
 * Is a failed reminder still worth sending? Never re-send a reminder whose
 * due date passed, whose scholarship was unsaved or whose task was completed.
 */
export async function isStaleNotification(p: RetryPayload, now: Date = new Date()): Promise<boolean> {
  const link = p.link || "";
  const due = /[?&]due=(\d{4}-\d{2}-\d{2})/.exec(link)?.[1];
  if (due) {
    const left = calendarDaysUntil(due, now, reminderTimezone());
    if (left === null || left < 0) return true;
  }
  const sch = /^\/scholarships\?id=(\d+)/.exec(link)?.[1];
  if (sch && p.type === "deadline_approaching") {
    const [row] = await db
      .select({ id: savedScholarships.id })
      .from(savedScholarships)
      .where(and(eq(savedScholarships.profileId, p.profileId), eq(savedScholarships.scholarshipId, Number(sch))))
      .limit(1);
    if (!row) return true;
  }
  const task = /^\/tasks\?task=(\d+)/.exec(link)?.[1];
  if (task) {
    const [row] = await db
      .select({ done: applicationTasks.isCompleted })
      .from(applicationTasks)
      .where(and(eq(applicationTasks.id, Number(task)), eq(applicationTasks.profileId, p.profileId)))
      .limit(1);
    if (!row || row.done) return true;
  }
  return false;
}

/** Re-send failed notification deliveries from the last 24 h (up to 3 attempts each). */
export async function retryFailedDeliveries(now: Date = new Date()): Promise<{ retried: number; sent: number; dropped: number }> {
  const out = { retried: 0, sent: 0, dropped: 0 };
  const { token } = await getBotToken();
  if (!token) return out;
  const settings = await getTelegramSettings();
  const rows = await db
    .select()
    .from(telegramMessages)
    .where(
      and(
        eq(telegramMessages.kind, "notification"),
        eq(telegramMessages.status, "failed"),
        isNotNull(telegramMessages.retryPayload),
        lt(telegramMessages.attempts, MAX_DELIVERY_ATTEMPTS),
        gt(telegramMessages.createdAt, new Date(now.getTime() - 86_400_000))
      )
    )
    .orderBy(telegramMessages.createdAt)
    .limit(100);
  for (const row of rows) {
    let payload: RetryPayload | null = null;
    try {
      payload = JSON.parse(row.retryPayload as string);
    } catch {
      payload = null;
    }
    const link = payload ? await getLinkByProfile(payload.profileId) : null;
    if (!payload || !link || !shouldDeliver({ settings, link, type: payload.type, hasToken: true }) || (await isStaleNotification(payload, now))) {
      await db.update(telegramMessages).set({ retryPayload: null }).where(eq(telegramMessages.id, row.id));
      out.dropped++;
      continue;
    }
    out.retried++;
    const profile = await getProfileRow(payload.profileId);
    const lang = pickLang(profile?.preferredLocale ?? link.languageCode);
    const res = await tgSendMessage(token, link.chatId, formatNotification(lang, payload), siteButton(publicSiteUrl(settings), lang, payload.link, BOT_TEXTS[lang].open));
    await markChatReachable(link.chatId, res.ok, res.error_code);
    const attempts = row.attempts + 1;
    await db
      .update(telegramMessages)
      .set({
        attempts,
        status: res.ok ? "sent" : "failed",
        error: res.ok ? null : (res.description || "send failed").slice(0, 300),
        // Done (sent), blocked (403) or out of attempts → stop retrying.
        retryPayload: res.ok || res.error_code === 403 || attempts >= MAX_DELIVERY_ATTEMPTS ? null : row.retryPayload,
      })
      .where(eq(telegramMessages.id, row.id));
    if (res.ok) out.sent++;
  }
  return out;
}

/** Security alert: somebody signed in with the account password. */
export async function sendLoginAlert(profileId: number): Promise<void> {
  try {
    if (!(await ensureTelegramTables())) return;
    const profile = await getProfileRow(profileId);
    const lang = pickLang(profile?.preferredLocale);
    const when = `${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`;
    const text = BOT_TEXTS[lang].loginAlert(when);
    const { token } = await getBotToken();
    const settings = await getTelegramSettings();
    const link = await getLinkByProfile(profileId);
    if (!token || !shouldDeliver({ settings, link, type: "login_alert", hasToken: true }) || !link) return;
    await sendToChat(token, link.chatId, text, { profileId, kind: "login_alert", type: "login_alert", preview: "login alert" });
  } catch (err) {
    console.warn("[telegram] login alert failed:", err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// 5. Admin helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Send an admin message to every linked, reachable chat (≈25 msg/s). */
export async function broadcast(text: string, opts: { includeMuted?: boolean; limit?: number } = {}) {
  const { token } = await getBotToken();
  if (!token) return { ok: false as const, error: "not_configured" };
  const settings = await getTelegramSettings();
  const where = opts.includeMuted ? eq(telegramLinks.blocked, false) : and(eq(telegramLinks.blocked, false), eq(telegramLinks.notifyEnabled, true));
  const links = await db.select().from(telegramLinks).where(where).limit(opts.limit ?? 5000);
  let sent = 0;
  let failed = 0;
  for (const link of links) {
    const lang = pickLang(link.languageCode);
    const html = `${BOT_TEXTS[lang].broadcastHeader}\n\n${escapeHtml(text)}`;
    const res = await sendToChat(token, link.chatId, html, { profileId: link.profileId, kind: "broadcast", preview: text }, siteButton(publicSiteUrl(settings), lang));
    if (res.ok) sent += 1;
    else failed += 1;
    await sleep(40);
  }
  return { ok: true as const, total: links.length, sent, failed };
}

export async function telegramStats() {
  const since24 = new Date(Date.now() - 86_400_000);
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const [links] = (
    await db.execute(sql`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE notify_enabled AND NOT blocked)::int AS reachable,
      COUNT(*) FILTER (WHERE blocked)::int AS blocked
      FROM telegram_links`)
  ).rows as { total: number; reachable: number; blocked: number }[];
  const [msgs] = (
    await db.execute(sql`SELECT
      COUNT(*) FILTER (WHERE created_at >= ${since24} AND status = 'sent')::int AS sent24,
      COUNT(*) FILTER (WHERE created_at >= ${since24} AND status = 'failed')::int AS failed24,
      COUNT(*) FILTER (WHERE created_at >= ${since7} AND kind = 'notification' AND status = 'sent')::int AS notif7,
      COUNT(*) FILTER (WHERE created_at >= ${since24} AND kind = 'code')::int AS codes24
      FROM telegram_messages`)
  ).rows as { sent24: number; failed24: number; notif7: number; codes24: number }[];
  const [logins] = (
    await db.execute(sql`SELECT COUNT(*)::int AS n FROM telegram_login_requests WHERE status = 'used' AND created_at >= ${since24}`)
  ).rows as { n: number }[];
  return { links, messages: msgs, loginsToday: logins?.n ?? 0 };
}

export async function recentMessages(limit = 40) {
  return db
    .select({
      id: telegramMessages.id,
      profileId: telegramMessages.profileId,
      kind: telegramMessages.kind,
      type: telegramMessages.type,
      preview: telegramMessages.preview,
      status: telegramMessages.status,
      error: telegramMessages.error,
      createdAt: telegramMessages.createdAt,
      name: studentProfiles.name,
    })
    .from(telegramMessages)
    .leftJoin(studentProfiles, eq(studentProfiles.id, telegramMessages.profileId))
    .orderBy(desc(telegramMessages.createdAt))
    .limit(limit);
}

export async function linkedUsers(opts: { q?: string; limit?: number } = {}) {
  const q = (opts.q || "").trim().toLowerCase();
  const rows = await db
    .select({
      profileId: telegramLinks.profileId,
      username: telegramLinks.username,
      firstName: telegramLinks.firstName,
      notifyEnabled: telegramLinks.notifyEnabled,
      blocked: telegramLinks.blocked,
      linkedAt: telegramLinks.linkedAt,
      lastLoginAt: telegramLinks.lastLoginAt,
      lastMessageAt: telegramLinks.lastMessageAt,
      name: studentProfiles.name,
      email: studentProfiles.email,
      isAdmin: studentProfiles.isAdmin,
    })
    .from(telegramLinks)
    .innerJoin(studentProfiles, eq(studentProfiles.id, telegramLinks.profileId))
    .where(
      q
        ? sql`(lower(${studentProfiles.name}) LIKE ${"%" + q + "%"} OR lower(${studentProfiles.email}) LIKE ${"%" + q + "%"} OR lower(coalesce(${telegramLinks.username}, '')) LIKE ${"%" + q + "%"})`
        : undefined
    )
    .orderBy(desc(telegramLinks.linkedAt))
    .limit(opts.limit ?? 100);
  return rows;
}
