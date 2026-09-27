/**
 * Account ↔ Telegram linking (and unlinking).
 *
 * FLOW (no code typing, nothing secret in logs):
 *  1. Signed-in website user → POST /api/auth/telegram/start {purpose:"link"}
 *     → a 128-bit opaque token; only sha256(token) is stored, valid for
 *     TELEGRAM_LINK_TTL_SECONDS (default 10 min). The browser also keeps a
 *     nonce so only it can poll the attempt's status.
 *  2. The user opens t.me/<bot>?start=link_<token> and presses Start.
 *     The webhook atomically claims the token for THAT Telegram user
 *     (pending → confirming) — a second Telegram account can never use it.
 *  3. The bot asks "Connect to <name> (e•••@mail)?" with [Connect] [Cancel].
 *  4. [Connect]: the callback's `from.id` must equal the claimer; the attempt
 *     flips confirming → used in one UPDATE … RETURNING (single use, race
 *     safe), and the link row is inserted in the same transaction. The UNIQUE
 *     constraints on telegram_links are the final guard against races.
 *  5. The website sees status "used" on its next poll.
 *
 * CASES
 *  A same Telegram already linked to this account → idempotent success
 *  B this Telegram is linked to another account    → refused
 *  C this account has a different Telegram linked  → refused (unlink first)
 *  D expired · E already used · F unknown token    → one generic message
 *  G a different Telegram user presses the button  → generic message
 */
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { telegramLinks, telegramLoginRequests } from "@/db/schema";
import { sessionSecret } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Keyboard } from "./api";
import { BOT_TEXTS, hashStartToken, hmacHex, linkTtlMs, newNonce, newStartToken, REQUEST_TTL_MS, safeEqualHex, telegramDisplayName, MAX_CODE_ATTEMPTS, type BotLang } from "./core";
import { CMD_TEXTS, maskEmail } from "./botTexts";
import {
  editOrSend,
  getLinkByProfile,
  getLinkByTelegramUser,
  getProfileRow,
  langOf,
  openAppButton,
  publicSiteUrl,
  sendToChat,
  siteButton,
} from "./messaging";
import { getBotToken, getTelegramSettings } from "./settings";
import { isUniqueViolation } from "@/lib/db-errors";

type RequestRow = typeof telegramLoginRequests.$inferSelect;

export interface TgUser {
  id: number | string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

/** Link attempts per Telegram user (Start + button presses). */
const LINK_ATTEMPTS = { limit: 10, windowMs: 15 * 60_000 };

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
  if (input.purpose === "link") {
    if (!input.profileId) return { ok: false, status: 401, code: "unauthorized", error: "Sign in first." };
    // Case C, website side: one Telegram per account — unlink first.
    if (await getLinkByProfile(input.profileId)) {
      return { ok: false, status: 409, code: "already_linked", error: "Telegram is already connected. Disconnect it first." };
    }
  }

  // Housekeeping: attempts older than a day are useless.
  await db
    .delete(telegramLoginRequests)
    .where(lt(telegramLoginRequests.expiresAt, new Date(Date.now() - 86_400_000)))
    .catch(() => undefined);

  const nonce = newNonce();
  const startToken = newStartToken();
  const expiresAt = new Date(Date.now() + (input.purpose === "link" ? linkTtlMs() : REQUEST_TTL_MS));
  const [row] = await db
    .insert(telegramLoginRequests)
    .values({
      // Only the hash is stored; the raw token lives in the t.me link alone.
      startToken: hashStartToken(startToken),
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

export async function loadOwnedRequest(id: unknown, nonce: unknown): Promise<RequestRow | null> {
  const rid = Number(id);
  if (!Number.isInteger(rid) || rid <= 0 || typeof nonce !== "string" || nonce.length < 16 || nonce.length > 64) return null;
  const [row] = await db.select().from(telegramLoginRequests).where(eq(telegramLoginRequests.id, rid)).limit(1);
  if (!row) return null;
  return safeEqualHex(row.nonceHash, hmacHex(sessionSecret(), "tg-nonce", nonce)) ? row : null;
}

/** Status for the browser's polling (never reveals a code or token). */
export async function requestStatus(id: unknown, nonce: unknown) {
  const row = await loadOwnedRequest(id, nonce);
  if (!row) return null;
  const expired = row.expiresAt.getTime() < Date.now() && row.status !== "used" && row.status !== "failed";
  return {
    purpose: row.purpose,
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
// 2. /start link_<token> (bot)
// ---------------------------------------------------------------------------

async function failAttempt(id: number, reason: string) {
  await db
    .update(telegramLoginRequests)
    .set({ status: "failed", failReason: reason })
    .where(and(eq(telegramLoginRequests.id, id), inArray(telegramLoginRequests.status, ["pending", "confirming"])));
}

function confirmKeyboard(lang: BotLang, requestId: number): Keyboard {
  const T = CMD_TEXTS[lang];
  return [[
    { text: T.btnConnect, callback_data: `lk:y:${requestId}` },
    { text: T.btnCancel, callback_data: `lk:n:${requestId}` },
  ]];
}

export async function handleLinkStart(rawToken: string, from: TgUser, chatId: string, lang: BotLang): Promise<void> {
  const { token } = await getBotToken();
  if (!token) return;
  const tgUserId = String(from.id);
  const T = CMD_TEXTS[lang];
  const say = (html: string, buttons: Keyboard = []) => sendToChat(token, chatId, html, { kind: "reply", preview: html.replace(/<[^>]+>/g, "") }, buttons);

  if (!checkRateLimit(`tg:link:${tgUserId}`, LINK_ATTEMPTS).ok) return void (await say(T.linkRateLimited));

  const hash = hashStartToken(rawToken);
  // Claim: only a pending, unexpired link attempt, and only once.
  const [claimed] = await db
    .update(telegramLoginRequests)
    .set({
      status: "confirming",
      telegramUserId: tgUserId,
      chatId,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
    })
    .where(
      and(
        eq(telegramLoginRequests.startToken, hash),
        eq(telegramLoginRequests.purpose, "link"),
        eq(telegramLoginRequests.status, "pending"),
        gt(telegramLoginRequests.expiresAt, new Date())
      )
    )
    .returning();

  let req: RequestRow | undefined = claimed;
  if (!req) {
    // The same person pressing Start twice gets the same question again.
    const [existing] = await db.select().from(telegramLoginRequests).where(eq(telegramLoginRequests.startToken, hash)).limit(1);
    if (existing && existing.status === "confirming" && existing.telegramUserId === tgUserId && existing.expiresAt.getTime() > Date.now()) {
      req = existing;
    } else {
      return void (await say(T.linkInvalid)); // D / E / F / G
    }
  }
  if (!req.profileId) {
    await failAttempt(req.id, "invalid");
    return void (await say(T.linkInvalid));
  }

  const profile = await getProfileRow(req.profileId);
  if (!profile) {
    await failAttempt(req.id, "invalid");
    return void (await say(T.linkInvalid));
  }
  const pLang = langOf(profile, from.language_code);
  const P = CMD_TEXTS[pLang];
  const byTelegram = await getLinkByTelegramUser(tgUserId);
  if (byTelegram && byTelegram.profileId === profile.id) {
    // Case A — nothing to do, report success to the website too.
    await db.update(telegramLoginRequests).set({ status: "used" }).where(eq(telegramLoginRequests.id, req.id));
    return void (await say(P.linkAlreadySame(profile.name)));
  }
  if (byTelegram) {
    await failAttempt(req.id, "linked_elsewhere"); // Case B
    return void (await say(P.linkOtherAccount));
  }
  const byProfile = await getLinkByProfile(profile.id);
  if (byProfile) {
    await failAttempt(req.id, "account_has_other"); // Case C
    return void (await say(P.linkAccountHasOther));
  }

  await sendToChat(
    token,
    chatId,
    P.linkConfirm(profile.name, maskEmail(profile.email)),
    { kind: "reply", preview: "link confirmation" },
    confirmKeyboard(pLang, req.id)
  );
}

// ---------------------------------------------------------------------------
// 3. [Connect] / [Cancel] (callback)
// ---------------------------------------------------------------------------

type ConfirmOutcome =
  | { kind: "linked"; profileId: number }
  | { kind: "same"; profileId: number }
  | { kind: "invalid" }
  | { kind: "linked_elsewhere" }
  | { kind: "account_has_other" };

class LinkConflict extends Error {}

/** The atomic part of confirming — exported for the race tests. */
export async function confirmLinkAttempt(requestId: number, from: TgUser, chatId: string): Promise<ConfirmOutcome> {
  const tgUserId = String(from.id);
  try {
    return await db.transaction(async (tx) => {
      const [req] = await tx
        .update(telegramLoginRequests)
        .set({ status: "used" })
        .where(
          and(
            eq(telegramLoginRequests.id, requestId),
            eq(telegramLoginRequests.purpose, "link"),
            eq(telegramLoginRequests.status, "confirming"),
            eq(telegramLoginRequests.telegramUserId, tgUserId),
            gt(telegramLoginRequests.expiresAt, new Date())
          )
        )
        .returning();
      if (!req || !req.profileId) return { kind: "invalid" } as const;
      const profileId = req.profileId;

      const [byTelegram] = await tx.select().from(telegramLinks).where(eq(telegramLinks.telegramUserId, tgUserId)).limit(1);
      if (byTelegram?.profileId === profileId) return { kind: "same", profileId } as const;
      if (byTelegram) {
        await tx.update(telegramLoginRequests).set({ status: "failed", failReason: "linked_elsewhere" }).where(eq(telegramLoginRequests.id, req.id));
        return { kind: "linked_elsewhere" } as const;
      }
      const [byProfile] = await tx.select().from(telegramLinks).where(eq(telegramLinks.profileId, profileId)).limit(1);
      if (byProfile) {
        await tx.update(telegramLoginRequests).set({ status: "failed", failReason: "account_has_other" }).where(eq(telegramLoginRequests.id, req.id));
        return { kind: "account_has_other" } as const;
      }
      try {
        await tx.insert(telegramLinks).values({
          profileId,
          telegramUserId: tgUserId,
          chatId,
          username: from.username ?? req.username,
          firstName: from.first_name ?? req.firstName,
          languageCode: from.language_code ?? req.languageCode,
        });
      } catch (err) {
        // UNIQUE(profile_id) / UNIQUE(telegram_user_id): a concurrent link won.
        if (isUniqueViolation(err)) throw new LinkConflict();
        throw err;
      }
      return { kind: "linked", profileId } as const;
    });
  } catch (err) {
    if (err instanceof LinkConflict || (err as { cause?: unknown })?.cause instanceof LinkConflict) {
      await failAttempt(requestId, "conflict");
      return { kind: "linked_elsewhere" };
    }
    throw err;
  }
}

export async function handleLinkCallback(
  action: "y" | "n",
  requestId: number,
  from: TgUser,
  chatId: string,
  messageId: number | null,
  lang: BotLang
): Promise<string> {
  const { token } = await getBotToken();
  if (!token) return "";
  const tgUserId = String(from.id);
  const T = CMD_TEXTS[lang];
  const meta = { kind: "reply", preview: "link" };

  if (!checkRateLimit(`tg:link:${tgUserId}`, LINK_ATTEMPTS).ok) return T.linkRateLimited;

  if (action === "n") {
    const cancelled = await db
      .update(telegramLoginRequests)
      .set({ status: "failed", failReason: "cancelled" })
      .where(
        and(
          eq(telegramLoginRequests.id, requestId),
          eq(telegramLoginRequests.status, "confirming"),
          eq(telegramLoginRequests.telegramUserId, tgUserId)
        )
      )
      .returning({ id: telegramLoginRequests.id });
    await editOrSend(token, chatId, messageId, cancelled.length ? T.linkCancelled : T.linkInvalid, meta);
    return "";
  }

  const outcome = await confirmLinkAttempt(requestId, from, chatId);
  if (outcome.kind === "invalid") {
    await editOrSend(token, chatId, messageId, T.linkInvalid, meta);
    return "";
  }
  if (outcome.kind === "linked_elsewhere") {
    await editOrSend(token, chatId, messageId, T.linkOtherAccount, meta);
    return "";
  }
  if (outcome.kind === "account_has_other") {
    await editOrSend(token, chatId, messageId, T.linkAccountHasOther, meta);
    return "";
  }

  const profile = await getProfileRow(outcome.profileId);
  const pLang = langOf(profile, from.language_code);
  const settings = await getTelegramSettings();
  if (outcome.kind === "linked") {
    await writeAudit({
      entityType: "telegram_link",
      entityId: outcome.profileId,
      fieldChanged: "telegram_link",
      oldValue: null,
      newValue: `tg:${tgUserId}`,
      actor: "USER",
      source: "telegram_bot_confirm",
    });
  }
  const html = outcome.kind === "same" ? CMD_TEXTS[pLang].linkAlreadySame(profile?.name ?? "") : BOT_TEXTS[pLang].linkedOk(profile?.name ?? "");
  await editOrSend(token, chatId, messageId, html, { ...meta, profileId: outcome.profileId }, [
    ...openAppButton(settings, CMD_TEXTS[pLang].btnOpenApp),
    ...siteButton(publicSiteUrl(settings), pLang),
  ]);
  return "";
}

// ---------------------------------------------------------------------------
// 4. Unlink (website, bot or admin)
// ---------------------------------------------------------------------------

export async function unlinkProfile(profileId: number, source: "website" | "bot" | "admin", opts: { notify?: boolean } = {}): Promise<boolean> {
  const [removed] = await db.delete(telegramLinks).where(eq(telegramLinks.profileId, profileId)).returning();
  if (!removed) return false;
  // Any open link attempts for this account die with the link.
  await db
    .update(telegramLoginRequests)
    .set({ status: "failed", failReason: "unlinked" })
    .where(and(eq(telegramLoginRequests.profileId, profileId), inArray(telegramLoginRequests.status, ["pending", "confirming"])))
    .catch(() => undefined);
  await writeAudit({
    entityType: "telegram_link",
    entityId: profileId,
    fieldChanged: "telegram_link",
    oldValue: `tg:${removed.telegramUserId}`,
    newValue: null,
    actor: source === "admin" ? "ADMIN" : "USER",
    source: `telegram_unlink_${source}`,
  });
  if (opts.notify !== false) {
    const { token } = await getBotToken();
    if (token) {
      const profile = await getProfileRow(profileId);
      const lang = langOf(profile, removed.languageCode);
      await sendToChat(token, removed.chatId, BOT_TEXTS[lang].unlinked, { profileId, kind: "reply", preview: "unlinked" });
    }
  }
  return true;
}
