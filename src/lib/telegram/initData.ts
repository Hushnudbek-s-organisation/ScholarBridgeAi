/**
 * Telegram Mini App `initData` verification (server-side only).
 *
 * Telegram signs the launch parameters with the bot token:
 *   secret_key       = HMAC_SHA256(key = "WebAppData", message = bot_token)
 *   data_check_string = every field except `hash`, sorted by key, "k=v" joined by "\n"
 *   hash             = hex(HMAC_SHA256(key = secret_key, message = data_check_string))
 *
 * The client-side `Telegram.WebApp.initDataUnsafe` object is never trusted —
 * only the raw query string is accepted, re-verified here on every exchange.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
import { createHmac, timingSafeEqual } from "crypto";

export const MAX_INIT_DATA_LENGTH = 4096;
/** Tolerated clock skew for an auth_date slightly in the future. */
const FUTURE_SKEW_SEC = 60;

/** env TELEGRAM_INIT_DATA_MAX_AGE_SECONDS (default 3600, clamped 60 s … 24 h). */
export function initDataMaxAgeSec(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.min(Math.max(Math.floor(raw), 60), 86_400) : 3600;
}

export interface InitDataUser {
  /** Numeric Telegram id kept as a decimal string (bigint-safe). */
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
}

export type InitDataResult =
  | { ok: true; user: InitDataUser; authDate: number; chatType: string | null; startParam: string | null }
  | { ok: false; reason: "missing" | "too_long" | "malformed" | "bad_hash" | "expired" | "no_user" };

export function initDataHash(dataCheckString: string, botToken: string): string {
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secret).update(dataCheckString).digest("hex");
}

export function dataCheckString(params: URLSearchParams): string {
  return [...params.entries()]
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

function str(v: unknown, max = 128): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export function verifyInitData(
  raw: unknown,
  botToken: string,
  opts: { maxAgeSec?: number; now?: number } = {}
): InitDataResult {
  if (typeof raw !== "string" || !raw) return { ok: false, reason: "missing" };
  if (raw.length > MAX_INIT_DATA_LENGTH) return { ok: false, reason: "too_long" };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  const hash = params.get("hash");
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) return { ok: false, reason: "malformed" };
  // A repeated key would make the check string ambiguous — refuse it.
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) return { ok: false, reason: "malformed" };

  const expected = Buffer.from(initDataHash(dataCheckString(params), botToken), "hex");
  const provided = Buffer.from(hash.toLowerCase(), "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "bad_hash" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || authDate <= 0) return { ok: false, reason: "malformed" };
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const maxAge = opts.maxAgeSec ?? initDataMaxAgeSec();
  if (now - authDate > maxAge || authDate - now > FUTURE_SKEW_SEC) return { ok: false, reason: "expired" };

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, reason: "no_user" };
  // Read the id from the raw JSON text so a large id never loses precision.
  const idMatch = /"id"\s*:\s*(\d{1,20})\s*[,}]/.exec(userRaw);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(userRaw);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!idMatch || !parsed || typeof parsed !== "object" || parsed.is_bot === true) return { ok: false, reason: "no_user" };

  return {
    ok: true,
    authDate,
    chatType: str(params.get("chat_type"), 32),
    startParam: str(params.get("start_param"), 64),
    user: {
      id: idMatch[1],
      firstName: str(parsed.first_name),
      lastName: str(parsed.last_name),
      username: str(parsed.username, 64),
      languageCode: str(parsed.language_code, 16),
    },
  };
}
