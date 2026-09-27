/**
 * Telegram bot — server logic: sign-in / connect attempts, webhook updates,
 * notification delivery, broadcasts and the delivery log.
 *
 * SIGN-IN FLOW (nothing secret ever travels through the t.me link):
 *  1. Browser → POST /api/auth/telegram/start → { id, nonce, deepLink }.
 *     The nonce stays in the browser; only its HMAC is stored.
 *  2. User opens t.me/<bot>?start=login_<startToken> and presses Start.
 *  3. Webhook receives `/start login_<token>` → the bot sends a 6-digit code
 *     to THAT chat and remembers which Telegram user claimed the attempt.
 *  4. Browser → POST /api/auth/telegram/verify { id, nonce, code } → session.
 *  A code is only valid together with the browser's nonce, expires after 5
 *  minutes, allows 5 wrong tries and can be used once.
 */
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, telegramLinks, telegramLoginRequests, telegramMessages } from "@/db/schema";
import { sessionSecret } from "@/lib/auth";
import { tgSendMessage, type InlineButton } from "./api";
import {
  appLink,
  BOT_TEXTS,
  CODE_TTL_MS,
  escapeHtml,
  formatNotification,
  hmacHex,
  isButtonUrl,
  MAX_CODE_ATTEMPTS,
  MAX_CODES_PER_REQUEST,
  newCode,
  newNonce,
  newStartToken,
  parseCommand,
  parseStartPayload,
  pickLang,
  REQUEST_TTL_MS,
  safeEqualHex,
  shouldDeliver,
  telegramDisplayName,
  telegramPlaceholderEmail,
  type BotLang,
} from "./core";
import { ensureTelegramTables } from "./db";
import { getBotToken, getTelegramSettings } from "./settings";

type LinkRow = typeof telegramLinks.$inferSelect;
type RequestRow = typeof telegramLoginRequests.$inferSelect;
type ProfileRow = typeof studentProfiles.$inferSelect;

// ---------------------------------------------------------------------------
// Delivery log + sending
// ---------------------------------------------------------------------------

export async function logMessage(entry: {
  profileId?: number | null;
  chatId?: string | null;
  kind: string;
  type?: string | null;
  preview?: string | null;
  ok: boolean;
  error?: string | null;
}) {
  try {
    await db.insert(telegramMessages).values({
      profileId: entry.profileId ?? null,
      chatId: entry.chatId ?? null,
      kind: entry.kind,
      type: entry.type ?? null,
      preview: entry.preview ? entry.preview.slice(0, 160) : null,
      status: entry.ok ? "sent" : "failed",
      error: entry.error ? entry.error.slice(0, 300) : null,
    });
    // Keep the log small: prune rows older than 90 days now and then.
    if (Math.random() < 0.02) {
      await db.delete(telegramMessages).where(lt(telegramMessages.createdAt, new Date(Date.now() - 90 * 86_400_000)));
    }
  } catch (err) {
    console.warn("[telegram] log write failed:", err instanceof Error ? err.message : err);
  }
}

/** Send + log; marks the chat as blocked when Telegram answers 403. */
export async function sendToChat(
  token: string,
  chatId: string,
  html: string,
  meta: { profileId?: number | null; kind: string; type?: string | null; preview?: string | null },
  buttons: InlineButton[] = []
): Promise<{ ok: boolean; error?: string }> {
  const res = await tgSendMessage(token, chatId, html, buttons);
  // Codes are never written to the log — only the fact that one was sent.
  await logMessage({ ...meta, chatId, ok: res.ok, error: res.ok ? null : res.description });
  if (!res.ok && res.error_code === 403) {
    await db.update(telegramLinks).set({ blocked: true }).where(eq(telegramLinks.chatId, chatId)).catch(() => undefined);
  }
  if (res.ok) {
    await db
      .update(telegramLinks)
      .set({ lastMessageAt: new Date(), blocked: false })
      .where(eq(telegramLinks.chatId, chatId))
      .catch(() => undefined);
  }
  return res.ok ? { ok: true } : { ok: false, error: res.description || "send failed" };
}

function siteButton(siteUrl: string, lang: BotLang, link?: string | null, label?: string): InlineButton[] {
  const url = appLink(siteUrl, link ?? null);
  return isButtonUrl(url) ? [{ text: label ?? BOT_TEXTS[lang].openSite, url }] : [];
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export async function getLinkByProfile(profileId: number): Promise<LinkRow | null> {
  const [row] = await db.select().from(telegramLinks).where(eq(telegramLinks.profileId, profileId)).limit(1);
  return row ?? null;
}

async function getLinkByTelegramUser(telegramUserId: string): Promise<LinkRow | null> {
  const [row] = await db.select().from(telegramLinks).where(eq(telegramLinks.telegramUserId, telegramUserId)).limit(1);
  return row ?? null;
}

async function getProfile(id: number): Promise<ProfileRow | null> {
  const [row] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, id)).limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// 1. Start an attempt (browser)
// ---------------------------------------------------------------------------

export type StartResult =
  | { ok: true; id: number; nonce: string; deepLink: string; botUsername: string; expiresAt: string }
  | { ok: false; status: number; code: string; error: string };

export async function startRequest(input: { purpose: "login" | "link"; profileId?: number | null; ip?: string }): Promise<StartResult> {
  const settings = await getTelegramSettings();
  const { token } = await getBotToken();
  if (!token || !settings.botUsername) {
    return { ok: false, status: 503, code: "not_configured", error: "The Telegram bot is not configured yet." };
  }
  if (input.purpose === "login" && !settings.loginEnabled) {
    return { ok: false, status: 403, code: "login_disabled", error: "Signing in with Telegram is turned off." };
  }

  // Housekeeping: attempts older than a day are useless.
  await db
    .delete(telegramLoginRequests)
    .where(lt(telegramLoginRequests.expiresAt, new Date(Date.now() - 86_400_000)))
    .catch(() => undefined);

  const nonce = newNonce();
  const startToken = newStartToken();
  const expiresAt = new Date(Date.now() + REQUEST_TTL_MS);
  const [row] = await db
    .insert(telegramLoginRequests)
    .values({
      startToken,
      nonceHash: hmacHex(sessionSecret(), "tg-nonce", nonce),
      purpose: input.purpose,
      profileId: input.purpose === "link" ? input.profileId ?? null : null,
      ip: input.ip ?? null,
      expiresAt,
    })
    .returning({ id: telegramLoginRequests.id });

  return {
    ok: true,
    id: row.id,
    nonce,
    botUsername: settings.botUsername,
    deepLink: `https://t.me/${settings.botUsername}?start=${input.purpose}_${startToken}`,
    expiresAt: expiresAt.toISOString(),
  };
}

async function loadOwnedRequest(id: unknown, nonce: unknown): Promise<RequestRow | null> {
  const rid = Number(id);
  if (!Number.isInteger(rid) || rid <= 0 || typeof nonce !== "string" || nonce.length < 16 || nonce.length > 64) return null;
  const [row] = await db.select().from(telegramLoginRequests).where(eq(telegramLoginRequests.id, rid)).limit(1);
  if (!row) return null;
  return safeEqualHex(row.nonceHash, hmacHex(sessionSecret(), "tg-nonce", nonce)) ? row : null;
}

/** Status for the browser's polling (never reveals the code). */
export async function requestStatus(id: unknown, nonce: unknown) {
  const row = await loadOwnedRequest(id, nonce);
  if (!row) return null;
  const expired = row.expiresAt.getTime() < Date.now() && row.status !== "used";
  return {
    status: expired ? "expired" : row.status,
    failReason: row.failReason,
    telegram: row.telegramUserId
      ? { username: row.username, name: telegramDisplayName({ firstName: row.firstName, lastName: row.lastName, username: row.username }) }
      : null,
    codeExpiresAt: row.codeExpiresAt?.toISOString() ?? null,
    expiresAt: row.expiresAt.toISOString(),
    attemptsLeft: Math.max(0, MAX_CODE_ATTEMPTS - row.attempts),
  };
}

// ---------------------------------------------------------------------------
// 2. Webhook updates (Telegram)
// ---------------------------------------------------------------------------

interface TgUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}
interface TgChat {
  id: number;
  type: string;
}
export interface TgUpdate {
  update_id?: number;
  message?: { chat: TgChat; from?: TgUser; text?: string };
  my_chat_member?: { chat: TgChat; from: TgUser; new_chat_member?: { status?: string } };
}

const seenUpdates = new Set<number>();
function alreadySeen(id: number | undefined): boolean {
  if (typeof id !== "number") return false;
  if (seenUpdates.has(id)) return true;
  seenUpdates.add(id);
  if (seenUpdates.size > 2000) {
    const first = seenUpdates.values().next().value;
    if (first !== undefined) seenUpdates.delete(first);
  }
  return false;
}

async function langFor(user: TgUser, link: LinkRow | null): Promise<BotLang> {
  if (link) {
    const p = await getProfile(link.profileId).catch(() => null);
    if (p?.preferredLocale) return pickLang(p.preferredLocale);
  }
  return pickLang(user.language_code);
}

export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (alreadySeen(update.update_id)) return;
  const { token } = await getBotToken();
  if (!token) return;
  const settings = await getTelegramSettings();

  // The user blocked / unblocked the bot.
  if (update.my_chat_member && update.my_chat_member.chat.type === "private") {
    const status = update.my_chat_member.new_chat_member?.status;
    const blocked = status === "kicked" || status === "left";
    await db
      .update(telegramLinks)
      .set({ blocked })
      .where(eq(telegramLinks.telegramUserId, String(update.my_chat_member.from.id)));
    return;
  }

  const msg = update.message;
  if (!msg || !msg.from || msg.from.is_bot || msg.chat.type !== "private") return;
  const from = msg.from;
  const chatId = String(msg.chat.id);
  const tgUserId = String(from.id);
  const link = await getLinkByTelegramUser(tgUserId);

  // Keep chat details fresh for linked users.
  if (link && (link.chatId !== chatId || link.username !== (from.username ?? null) || link.blocked)) {
    await db
      .update(telegramLinks)
      .set({ chatId, username: from.username ?? null, firstName: from.first_name ?? null, blocked: false })
      .where(eq(telegramLinks.id, link.id));
  }

  const lang = await langFor(from, link);
  const T = BOT_TEXTS[lang];
  const reply = (html: string, kind = "reply", buttons: InlineButton[] = []) =>
    sendToChat(token, chatId, html, { profileId: link?.profileId ?? null, kind, preview: kind === "code" ? null : html.replace(/<[^>]+>/g, "") }, buttons);

  const payload = parseStartPayload(msg.text);
  if (payload) {
    await handleStart(payload, from, chatId, link, lang, token, settings.loginEnabled, settings.signupEnabled, settings.adminLoginEnabled);
    return;
  }

  const cmd = parseCommand(msg.text);
  switch (cmd) {
    case "start": {
      if (link) {
        const p = await getProfile(link.profileId);
        await reply(T.welcomeLinked(p?.name ?? "", link.notifyEnabled), "reply", siteButton(settings.siteUrl, lang));
      } else {
        await reply(T.welcome, "reply", siteButton(settings.siteUrl, lang));
      }
      return;
    }
    case "status": {
      if (!link) return void (await reply(T.notLinkedShort, "reply", siteButton(settings.siteUrl, lang)));
      const p = await getProfile(link.profileId);
      await reply(T.welcomeLinked(p?.name ?? "", link.notifyEnabled));
      return;
    }
    case "stop":
    case "off": {
      if (!link) return void (await reply(T.notLinkedShort));
      await db.update(telegramLinks).set({ notifyEnabled: false }).where(eq(telegramLinks.id, link.id));
      await reply(T.notifyOff);
      return;
    }
    case "on":
    case "resume": {
      if (!link) return void (await reply(T.notLinkedShort));
      await db.update(telegramLinks).set({ notifyEnabled: true }).where(eq(telegramLinks.id, link.id));
      await reply(T.notifyOn);
      return;
    }
    case "unlink": {
      if (!link) return void (await reply(T.notLinkedShort));
      await db.delete(telegramLinks).where(eq(telegramLinks.id, link.id));
      await sendToChat(token, chatId, T.unlinked, { profileId: link.profileId, kind: "reply", preview: "unlinked" });
      return;
    }
    default:
      await reply(link ? T.help : T.welcome, "reply", link ? [] : siteButton(settings.siteUrl, lang));
  }
}

async function failRequest(id: number, reason: string) {
  await db.update(telegramLoginRequests).set({ status: "failed", failReason: reason }).where(eq(telegramLoginRequests.id, id));
}

async function handleStart(
  payload: { purpose: "login" | "link"; token: string },
  from: TgUser,
  chatId: string,
  link: LinkRow | null,
  lang: BotLang,
  token: string,
  loginEnabled: boolean,
  signupEnabled: boolean,
  adminLoginEnabled: boolean
) {
  const T = BOT_TEXTS[lang];
  const tgUserId = String(from.id);
  const say = (html: string) => sendToChat(token, chatId, html, { profileId: link?.profileId ?? null, kind: "reply", preview: html.replace(/<[^>]+>/g, "") });

  const [req] = await db.select().from(telegramLoginRequests).where(eq(telegramLoginRequests.startToken, payload.token)).limit(1);
  if (!req || req.purpose !== payload.purpose || req.expiresAt.getTime() < Date.now() || !["pending", "code_sent"].includes(req.status)) {
    await say(T.expired);
    return;
  }
  if (req.telegramUserId && req.telegramUserId !== tgUserId) {
    await say(T.alreadyUsed);
    return;
  }
  if (req.codesSent >= MAX_CODES_PER_REQUEST) {
    await say(T.tooMany);
    return;
  }

  if (req.purpose === "login") {
    if (!loginEnabled) {
      await failRequest(req.id, "login_disabled");
      await say(T.loginDisabled);
      return;
    }
    if (link) {
      const p = await getProfile(link.profileId);
      if (p?.isAdmin && !adminLoginEnabled) {
        await failRequest(req.id, "admin_blocked");
        await say(T.adminBlocked);
        return;
      }
    } else if (!signupEnabled) {
      await failRequest(req.id, "not_linked");
      await say(T.notLinked);
      return;
    }
  } else if (link && link.profileId !== req.profileId) {
    await failRequest(req.id, "linked_elsewhere");
    await say(T.alreadyLinkedOther);
    return;
  }

  const code = newCode();
  await db
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
    .where(eq(telegramLoginRequests.id, req.id));

  await sendToChat(token, chatId, T.code(code, Math.round(CODE_TTL_MS / 60_000), req.purpose === "link" ? "link" : "login"), {
    profileId: link?.profileId ?? req.profileId ?? null,
    kind: "code",
    type: req.purpose,
  });
}

// ---------------------------------------------------------------------------
// 3. Verify the code (browser)
// ---------------------------------------------------------------------------

export type VerifyResult =
  | { ok: true; kind: "login"; profile: ProfileRow; isNew: boolean }
  | { ok: true; kind: "link"; link: LinkRow }
  | { ok: false; status: number; code: string; error: string; attemptsLeft?: number };

const fail = (status: number, code: string, error: string, attemptsLeft?: number): VerifyResult => ({
  ok: false,
  status,
  code,
  error,
  ...(attemptsLeft !== undefined ? { attemptsLeft } : {}),
});

export async function verifyRequest(input: {
  id: unknown;
  nonce: unknown;
  code: string;
  sessionProfileId?: number | null;
  onNewProfile?: (profile: ProfileRow) => Promise<void>;
}): Promise<VerifyResult> {
  const req = await loadOwnedRequest(input.id, input.nonce);
  if (!req) return fail(400, "invalid_request", "This sign-in attempt is not valid. Please start again.");
  if (req.status === "failed") return fail(409, req.failReason || "failed", "This attempt was refused by the bot.");
  if (req.status === "locked") return fail(429, "locked", "Too many wrong codes. Please start again.");
  if (req.status === "used") return fail(410, "expired", "This code was already used. Please start again.");
  if (req.status !== "code_sent" || !req.codeHash) return fail(400, "code_not_sent", "Open the bot and press Start first.");
  // Connecting Telegram is only for the account that started it — checked
  // before the code so a wrong session neither burns a try nor the attempt.
  if (req.purpose === "link" && (!input.sessionProfileId || input.sessionProfileId !== req.profileId)) {
    return fail(403, "forbidden", "Sign in to the account you are connecting first.");
  }
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

  const tgUserId = req.telegramUserId as string;
  const chatId = req.chatId as string;
  const settings = await getTelegramSettings();

  if (req.purpose === "link") {
    if (!req.profileId) return fail(400, "invalid_request", "This attempt is not valid. Please start again.");
    const existing = await getLinkByTelegramUser(tgUserId);
    if (existing && existing.profileId !== req.profileId) {
      return fail(409, "linked_elsewhere", "This Telegram is already connected to another account.");
    }
    // Replace any previous Telegram on this account.
    await db.delete(telegramLinks).where(eq(telegramLinks.profileId, req.profileId));
    const [link] = await db
      .insert(telegramLinks)
      .values({
        profileId: req.profileId,
        telegramUserId: tgUserId,
        chatId,
        username: req.username,
        firstName: req.firstName,
        languageCode: req.languageCode,
      })
      .returning();
    const profile = await getProfile(req.profileId);
    const { token } = await getBotToken();
    if (token && profile) {
      const lang = pickLang(profile.preferredLocale);
      await sendToChat(token, chatId, BOT_TEXTS[lang].linkedOk(profile.name), { profileId: profile.id, kind: "reply", preview: "linked" }, siteButton(settings.siteUrl, lang));
    }
    return { ok: true, kind: "link", link };
  }

  // ---- login ----
  if (!settings.loginEnabled) return fail(403, "login_disabled", "Signing in with Telegram is turned off.");
  let link = await getLinkByTelegramUser(tgUserId);
  let profile: ProfileRow | null = link ? await getProfile(link.profileId) : null;
  let isNew = false;

  if (profile) {
    if (profile.isAdmin && !settings.adminLoginEnabled) {
      return fail(403, "admin_blocked", "Admin accounts must sign in with email and password.");
    }
  } else {
    if (!settings.signupEnabled) return fail(403, "not_linked", "This Telegram is not connected to an account.");
    const email = telegramPlaceholderEmail(tgUserId);
    const [byEmail] = await db.select().from(studentProfiles).where(sql`lower(${studentProfiles.email}) = ${email}`).limit(1);
    if (byEmail) {
      profile = byEmail;
    } else {
      const [created] = await db
        .insert(studentProfiles)
        .values({
          name: telegramDisplayName({ firstName: req.firstName, lastName: req.lastName, username: req.username }),
          email,
          preferredLocale: pickLang(req.languageCode),
          preferredCountries: "[]",
          ieltsScore: null,
          toeflScore: null,
          satScore: null,
          greScore: null,
          extracurriculars: "",
          workExperienceYears: 0,
          researchPublications: 0,
          passwordHash: null,
        })
        .returning();
      profile = created;
      isNew = true;
      if (input.onNewProfile) await input.onNewProfile(created).catch((e) => console.warn("[telegram] onNewProfile:", e));
    }
    if (link) await db.delete(telegramLinks).where(eq(telegramLinks.id, link.id));
    await db.delete(telegramLinks).where(eq(telegramLinks.profileId, profile.id));
    [link] = await db
      .insert(telegramLinks)
      .values({
        profileId: profile.id,
        telegramUserId: tgUserId,
        chatId,
        username: req.username,
        firstName: req.firstName,
        languageCode: req.languageCode,
      })
      .returning();
  }

  await db
    .update(telegramLinks)
    .set({ lastLoginAt: new Date(), chatId, username: req.username, blocked: false })
    .where(eq(telegramLinks.profileId, profile.id));

  return { ok: true, kind: "login", profile, isNew };
}

// ---------------------------------------------------------------------------
// 4. Notifications
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
    const profile = await getProfile(input.profileId);
    const lang = pickLang(profile?.preferredLocale ?? link.languageCode);
    const res = await sendToChat(
      token,
      link.chatId,
      formatNotification(lang, input),
      { profileId: input.profileId, kind: "notification", type: input.type, preview: input.title },
      siteButton(settings.siteUrl, lang, input.link, BOT_TEXTS[lang].open)
    );
    return res.ok;
  } catch (err) {
    console.warn("[telegram] notification delivery failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Security alert: somebody signed in with the account password. */
export async function sendLoginAlert(profileId: number): Promise<void> {
  try {
    if (!(await ensureTelegramTables())) return;
    const profile = await getProfile(profileId);
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
    const res = await sendToChat(token, link.chatId, html, { profileId: link.profileId, kind: "broadcast", preview: text }, siteButton(settings.siteUrl, lang));
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
