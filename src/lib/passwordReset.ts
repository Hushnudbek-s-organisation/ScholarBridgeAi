/**
 * Password reset tokens — the rules, in one pure module.
 *
 * "I forgot my password" is the one flow that turns an *email address* into
 * account access, so every rule here is about what a reset link must NOT be:
 *
 *  - **guessable** → 32 random bytes from the CSPRNG, base64url encoded;
 *  - **stored** → only its SHA-256 hash reaches the database, exactly like
 *    `user_sessions.token_hash`; a database read cannot become an account
 *    takeover;
 *  - **long-lived** → 60 minutes, then it is dead even if it never arrives;
 *  - **reusable** → the first successful reset stamps `used_at`, and a later
 *    request invalidates every older unused link for the account;
 *  - **an oracle** → the request endpoint answers the same way whether or not
 *    the address exists (no account enumeration).
 *
 * Pure by construction: no database, no SMTP, no clock of its own — `now` is
 * always passed in, so the whole lifetime is unit-testable.
 */
import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** How long a link stays usable. */
export const PASSWORD_RESET_TTL_MINUTES = 60;

/** Bytes of entropy behind a token (256 bits). */
export const PASSWORD_RESET_TOKEN_BYTES = 32;

export type ResetTokenState = "valid" | "expired" | "used";

export interface ResetTokenRow {
  expiresAt: Date | string;
  usedAt?: Date | string | null;
}

/** A fresh token and the hash that is safe to store. */
export function createResetToken(now: Date = new Date()): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60_000),
  };
}

/** SHA-256 hex — the only form of the token that is ever persisted. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/**
 * Constant-time comparison of two token hashes. Used by the verify step so a
 * timing difference cannot confirm that a guessed hash is close.
 */
export function resetTokenHashesEqual(a: string, b: string): boolean {
  // Only a well-formed hash can equal anything. Without this an empty pair or a
  // truncated value would compare "equal" on two empty buffers.
  const HEX64 = /^[0-9a-f]{64}$/;
  if (typeof a !== "string" || typeof b !== "string" || !HEX64.test(a) || !HEX64.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function toDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `valid`, `expired` or `used` — never a boolean that hides why. */
export function resetTokenState(row: ResetTokenRow, now: Date = new Date()): ResetTokenState {
  if (row.usedAt) return "used";
  const expiresAt = toDate(row.expiresAt);
  // An unparsable date is treated as expired: a malformed row must never grant.
  if (!expiresAt) return "expired";
  return expiresAt.getTime() > now.getTime() ? "valid" : "expired";
}

/** The shape a link must have before it is worth a database round trip. */
export const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function isWellFormedResetToken(token: unknown): token is string {
  return typeof token === "string" && RESET_TOKEN_PATTERN.test(token);
}

/**
 * The public reset URL. The origin is passed in (never hardcoded): the caller
 * uses `configuredAppUrl()`, so moving the deployment changes the link and
 * nothing else. Returns null rather than a broken link when either part is
 * missing.
 */
export function resetLinkFor(origin: string, token: string): string | null {
  const base = String(origin ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s/]+/i.test(base)) return null;
  if (!isWellFormedResetToken(token)) return null;
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * The email body. Plain text only — a reset link in an HTML image tracker is
 * one more place it can leak, and the mail carries nothing else the student
 * cannot already see in the app.
 */
export function buildResetEmail(input: {
  link: string;
  appName: string;
  ttlMinutes?: number;
  locale?: string | null;
}): { subject: string; text: string } {
  const ttl = input.ttlMinutes ?? PASSWORD_RESET_TTL_MINUTES;
  const app = input.appName || "ScholarBridge";
  const copy = input.locale === "ru"
    ? {
        subject: `Пароль ${app}: ссылка для сброса`,
        lines: [
          `Вы запросили сброс пароля для ${app}.`,
          `Ссылка действует ${ttl} минут и работает один раз:`,
          input.link,
          "Если вы не запрашивали сброс, просто проигнорируйте это письмо — пароль не изменится.",
        ],
      }
    : input.locale === "uz"
      ? {
          subject: `${app}: parolni tiklash havolasi`,
          lines: [
            `${app} akkauntingiz uchun parolni tiklash so'ralgan.`,
            `Havola ${ttl} daqiqa amal qiladi va faqat bir marta ishlaydi:`,
            input.link,
            "Agar buni siz so'ramagan bo'lsangiz, xatni e'tiborsiz qoldiring — parol o'zgarmaydi.",
          ],
        }
      : {
          subject: `${app}: password reset link`,
          lines: [
            `A password reset was requested for your ${app} account.`,
            `The link works for ${ttl} minutes and only once:`,
            input.link,
            "If you did not ask for this, ignore this email — the password will not change.",
          ],
        };
  return { subject: copy.subject, text: copy.lines.join("\n\n") + "\n" };
}

/** True when the address is plausible enough to send a link to. */
export function isEmailShaped(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const email = value.trim();
  if (email.length < 5 || email.length > 320) return false;
  if (/\s/.test(email)) return false;
  return /^[^@]+@[^@.]+\.[^@]+$/.test(email);
}
