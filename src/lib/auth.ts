/**
 * Server-side session authentication (security baseline).
 *
 * WHY THIS EXISTS
 * ---------------
 * Before this module every API route trusted an id sent by the browser
 * (`adminProfileId`, `requesterId`, `profileId`). Anyone could therefore call
 * `/api/admin/*` with a guessed admin id and get full admin access — the
 * "authorization" was client-asserted, which is not authorization at all.
 *
 * Now identity comes from an HttpOnly cookie holding an HMAC-SHA256 signed
 * token. The browser cannot read or forge it:
 *   - signing key: SESSION_SECRET (env), never sent to the client
 *   - payload:     { pid, iat, exp, fp } where `fp` fingerprints the stored
 *                  password hash, so changing a password invalidates sessions
 *   - every authenticated request re-loads the profile row, so an admin that
 *     is demoted (is_admin = false) loses admin APIs immediately
 *
 * Token format: `v1.<base64url(payload)>.<base64url(hmac)>`
 */
import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, telegramLinks, userSessions } from "@/db/schema";
import { clientIp } from "@/lib/rate-limit";
import { plainHttpDeployment } from "@/lib/security";
import { sanitizeProfile } from "@/lib/password";
import { ensureCoreSchema } from "@/lib/core/db";
import { withDbRetry } from "@/db/retry";

export const SESSION_COOKIE = "sb_session";

/** Absolute session lifetime (7 days). */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  /** Profile id this session authenticates. */
  pid: number;
  /** Issued at (epoch seconds). */
  iat: number;
  /** Expires at (epoch seconds). */
  exp: number;
  /** Password fingerprint — rotating the password kills existing sessions. */
  fp: string;
  /** Random per-session id (audit / future revocation lists). */
  sid: string;
}

/**
 * Where the request came from. "telegram" sessions (Mini App / bot adapter)
 * are the same account with the same entitlements, but never admin powers.
 */
export type SessionChannel = "web" | "telegram";

export interface Session {
  payload: SessionPayload;
  /** The authenticated profile row (password hash already stripped). */
  profile: Omit<typeof studentProfiles.$inferSelect, "passwordHash">;
  isAdmin: boolean;
  channel?: SessionChannel;
  /** Numeric Telegram user id (as a string — ids exceed 2^31) for telegram sessions. */
  telegramUserId?: string;
}

// ---------------------------------------------------------------------------
// Signing key
// ---------------------------------------------------------------------------

let secretWarned = false;

/**
 * Session signing key. Production must use a dedicated, explicitly configured
 * secret; encryption keys and database credentials are never fallback keys.
 * Local development/test keeps a stable, deliberately non-production key so
 * isolated checks can issue and verify cookies without deployment secrets.
 */
export function sessionSecret(
  env: Record<string, string | undefined> = process.env
): string {
  if (hasExplicitSessionSecret(env)) return env.SESSION_SECRET!.trim();
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET (at least 32 characters) is required in production");
  }

  if (!secretWarned) {
    secretWarned = true;
    console.warn("[auth] Using the development-only session key; configure SESSION_SECRET for deployment.");
  }
  return createHash("sha256").update("ScholarBridge local development session key only").digest("hex");
}

/** Whether an explicit, strong SESSION_SECRET is configured. */
export function hasExplicitSessionSecret(
  env: Record<string, string | undefined> = process.env
): boolean {
  const explicit = env.SESSION_SECRET?.trim();
  return Boolean(explicit && explicit.length >= 32);
}

function hmac(data: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(data).digest();
}

/** Short, stable fingerprint of a stored password hash (or "nopw"). */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  if (!passwordHash) return "nopw";
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Token issue / verify
// ---------------------------------------------------------------------------

/** Issue a signed session token for a profile. */
export function signSessionToken(
  profile: { id: number; passwordHash?: string | null },
  opts: { ttlSeconds?: number; now?: number } = {}
): string {
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const ttl = opts.ttlSeconds ?? SESSION_TTL_SECONDS;
  const payload: SessionPayload = {
    pid: profile.id,
    iat: now,
    exp: now + ttl,
    fp: passwordFingerprint(profile.passwordHash ?? null),
    sid: randomBytes(8).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = hmac(body, sessionSecret()).toString("base64url");
  return `v1.${body}.${sig}`;
}

/**
 * Verify a token's signature + expiry. Returns the payload or null.
 * Pure (no DB) — used by `authenticate` and by the security tests.
 */
export function verifySessionToken(
  token: string | null | undefined,
  opts: { now?: number; secret?: string } = {}
): SessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;

  const [, body, sig] = parts;
  const expected = hmac(body, opts.secret ?? sessionSecret());
  let provided: Buffer;
  try {
    provided = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.pid !== "number" || !Number.isFinite(payload.pid)) {
    return null;
  }
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  return payload;
}

// ---------------------------------------------------------------------------
// Server-side session records (audit A23)
// ---------------------------------------------------------------------------
//
// The token itself stays stateless (HMAC), but every sign-in also creates a
// row in `user_sessions`, keyed by the SHA-256 of the full token. That makes
// individual sessions revocable: a stolen token can be killed server-side
// without logging out the owner's other devices, and password rotation keeps
// working exactly as before (the fingerprint check runs first).

/** SHA-256 hex of the full session token — what `user_sessions` stores. */
export function sessionTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Successful web-auth burst cache: intentionally tiny and process-local. */
const AUTH_CACHE_TTL_MS = 3_000;
const AUTH_CACHE_MAX = 1_000;
const successfulAuthCache = new Map<string, { profileId: number; expiresAt: number; result: AuthResult }>();

export function invalidateAuthCacheForProfile(profileId: number): void {
  for (const [key, entry] of successfulAuthCache) {
    if (entry.profileId === profileId) successfulAuthCache.delete(key);
  }
}

function cacheSuccessfulAuth(token: string, profileId: number, result: AuthResult): void {
  const now = Date.now();
  for (const [key, entry] of successfulAuthCache) if (entry.expiresAt <= now) successfulAuthCache.delete(key);
  if (successfulAuthCache.size >= AUTH_CACHE_MAX) {
    const oldest = successfulAuthCache.keys().next().value;
    if (oldest) successfulAuthCache.delete(oldest);
  }
  successfulAuthCache.set(sessionTokenHash(token), { profileId, expiresAt: now + AUTH_CACHE_TTL_MS, result });
}

/** last_seen_at is refreshed at most this often per active session. */
const LAST_SEEN_THROTTLE_MS = 60_000;

/**
 * Check (and keep fresh) the server-side record for a valid token.
 *
 *  - `"ok"`      — the record exists and is not revoked; or the token has no
 *                  record yet (issued before the sessions table shipped) and
 *                  was just lazily adopted — a deploy must never log everyone
 *                  out;
 *  - `"revoked"` — a record exists and has been revoked;
 *  - `"error"`   — the lookup failed; the caller should answer 503 exactly
 *                  like any other database lookup failure.
 */
export async function checkSessionRecord(
  token: string,
  profileId: number,
  meta: { scope: string; userAgent?: string | null; ip?: string | null }
): Promise<"ok" | "revoked" | "error"> {
  const hash = sessionTokenHash(token);
  try {
    const [row] = await withDbRetry(() =>
      db
        .select({ revokedAt: userSessions.revokedAt, lastSeenAt: userSessions.lastSeenAt })
        .from(userSessions)
        .where(eq(userSessions.tokenHash, hash))
        .limit(1)
    );
    if (row) {
      if (row.revokedAt) return "revoked";
      const seen = row.lastSeenAt ? new Date(row.lastSeenAt).getTime() : 0;
      if (Date.now() - seen > LAST_SEEN_THROTTLE_MS) {
        await db
          .update(userSessions)
          .set({ lastSeenAt: new Date() })
          .where(eq(userSessions.tokenHash, hash));
      }
      return "ok";
    }
    // Lazy adoption of a pre-table token (valid signature + fingerprint).
    await db
      .insert(userSessions)
      .values({
        profileId,
        tokenHash: hash,
        scope: meta.scope,
        userAgent: meta.userAgent?.slice(0, 300) ?? null,
        ip: meta.ip ?? null,
      })
      .onConflictDoNothing({ target: userSessions.tokenHash });
    return "ok";
  } catch (err) {
    console.error("[auth] session record check failed:", err);
    return "error";
  }
}

/** Revoke one token server-side (sign-out, "revoke this device"). Best-effort. */
export async function revokeSessionToken(token: string | null): Promise<void> {
  if (!token) return;
  successfulAuthCache.delete(sessionTokenHash(token));
  try {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.tokenHash, sessionTokenHash(token)), isNull(userSessions.revokedAt)));
  } catch (err) {
    console.error("[auth] session revocation failed:", err);
  }
}

/**
 * Revoke every stored session for one account (password reset, "sign out
 * everywhere").
 *
 * The signed cookie is already invalid after a password change — `fp`
 * fingerprints the stored hash — but `user_sessions` would otherwise keep rows
 * that look live forever. Revoking them keeps revocation truthful and stops the
 * in-process positive cache from vouching for an old token.
 */
export async function revokeAllSessionsForProfile(profileId: number): Promise<void> {
  if (!Number.isSafeInteger(profileId) || profileId <= 0) return;
  // Drop the memo first: a cached "this token is fine" must not outlive the call.
  invalidateAuthCacheForProfile(profileId);
  try {
    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.profileId, profileId), isNull(userSessions.revokedAt)));
  } catch (err) {
    console.error("[auth] bulk session revocation failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Cookie plumbing
// ---------------------------------------------------------------------------

/**
 * True when the response must only ever travel over HTTPS.
 *
 * `APP_PLAIN_HTTP=1` (desktop app / phone on the same Wi-Fi, see
 * `plainHttpDeployment`) is the one exception: the cookie is then issued
 * without `Secure` unless the request itself arrived over HTTPS. Without this
 * the browser silently discarded the session cookie on `http://` and every
 * sign-in appeared to succeed and then bounce back to the landing page.
 */
export function isSecureContext(req?: Request): boolean {
  const proto = req?.headers?.get("x-forwarded-proto");
  if (plainHttpDeployment()) return proto === "https";
  if (process.env.NODE_ENV === "production") return true;
  return proto === "https";
}

/**
 * Cross-site cookie mode (opt-in, off by default).
 *
 * `SameSite=Lax` is the right default, but it makes the session cookie
 * unreadable when the app itself runs inside a THIRD-PARTY iframe — an embedded
 * preview, a Mini App shell. There the sign-in POST returns 200 and the very
 * next `/api/auth/session` returns 401, because the browser never sends the
 * cookie back: the person appears signed in to the server and signed out to
 * every request.
 *
 * With `SESSION_COOKIE_CROSS_SITE=1` the session cookie is issued as
 * `SameSite=None; Secure; Partitioned` (CHIPS) — usable in an iframe, still
 * isolated per top-level site, and never sent cross-site unpartitioned.
 * Deployments that serve the app directly keep the default Lax cookie.
 */
function crossSiteSessions(): boolean {
  return process.env.SESSION_COOKIE_CROSS_SITE === "1";
}

function cookieAttrs(req?: Request): string {
  if (crossSiteSessions()) {
    // SameSite=None requires Secure; this mode is only for https deployments
    // and https preview hosts.
    return ["Path=/", "HttpOnly", "SameSite=None", "Secure", "Partitioned"].join("; ");
  }
  const attrs = ["Path=/", "HttpOnly", "SameSite=Lax"];
  if (isSecureContext(req)) attrs.push("Secure");
  return attrs.join("; ");
}

/** `Set-Cookie` header value that stores a fresh session for `profile`. */
export function sessionCookieHeader(
  profile: { id: number; passwordHash?: string | null },
  req?: Request,
  opts: { ttlSeconds?: number } = {}
): string {
  const token = signSessionToken(profile, opts);
  const ttl = opts.ttlSeconds ?? SESSION_TTL_SECONDS;
  return `${SESSION_COOKIE}=${token}; ${cookieAttrs(req)}; Max-Age=${ttl}`;
}

/** `Set-Cookie` header value for a token that was signed separately. */
export function sessionCookieFromToken(token: string, req?: Request, ttlSeconds = SESSION_TTL_SECONDS): string {
  return `${SESSION_COOKIE}=${token}; ${cookieAttrs(req)}; Max-Age=${ttlSeconds}`;
}

/** `Set-Cookie` header value that clears the session (logout). */
export function clearSessionCookieHeader(req?: Request): string {
  return `${SESSION_COOKIE}=; ${cookieAttrs(req)}; Max-Age=0`;
}

/** Read the raw session token off a request (cookies() API or Request). */
export function readSessionToken(source: Request | Headers | string | null): string | null {
  let cookieHeader: string | null = null;
  if (typeof source === "string") cookieHeader = source;
  else if (source instanceof Headers) cookieHeader = source.get("cookie");
  else if (source) cookieHeader = source.headers?.get("cookie") ?? null;

  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === SESSION_COOKIE) return part.slice(idx + 1).trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Request-scoped authentication
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Telegram channel tokens (Mini App + bot adapter)
// ---------------------------------------------------------------------------
//
// The Mini App runs inside Telegram's iframe/webview where the site's
// SameSite cookie is not sent, so after the server verified Telegram's signed
// initData it hands out a short-lived bearer token instead. The bot uses the
// same token type (a few seconds of life) to call the existing API routes on
// behalf of the linked profile — one auth system, one set of rules.
//
//   format:  tg1.<base64url(payload)>.<base64url(hmac)>
//   key:     HMAC(SESSION_SECRET, "telegram-channel-v1")  (domain-separated,
//            so a tg1 token can never be replayed as a cookie session)
//   checks:  signature, expiry, and on EVERY request that the Telegram user is
//            still linked to that profile — unlinking revokes access at once.

export interface TelegramChannelPayload {
  pid: number;
  /** Telegram numeric user id, as a decimal string. */
  tgu: string;
  ch: "miniapp" | "bot";
  iat: number;
  exp: number;
  sid: string;
}

/** Mini App session lifetime (1 hour; the page re-authenticates silently). */
export const TELEGRAM_CHANNEL_TTL_SECONDS = 60 * 60;

function channelKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("telegram-channel-v1").digest();
}

export function signTelegramChannelToken(
  input: { profileId: number; telegramUserId: string; channel: "miniapp" | "bot" },
  opts: { ttlSeconds?: number; now?: number; secret?: string } = {}
): string {
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  const payload: TelegramChannelPayload = {
    pid: input.profileId,
    tgu: input.telegramUserId,
    ch: input.channel,
    iat: now,
    exp: now + (opts.ttlSeconds ?? TELEGRAM_CHANNEL_TTL_SECONDS),
    sid: randomBytes(8).toString("base64url"),
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", channelKey(opts.secret ?? sessionSecret())).update(body).digest("base64url");
  return `tg1.${body}.${sig}`;
}

export function verifyTelegramChannelToken(
  token: string | null | undefined,
  opts: { now?: number; secret?: string } = {}
): TelegramChannelPayload | null {
  if (!token || typeof token !== "string" || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "tg1") return null;
  const [, body, sig] = parts;
  const expected = createHmac("sha256", channelKey(opts.secret ?? sessionSecret())).update(body).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(sig, "base64url");
  } catch {
    return null;
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  let payload: TelegramChannelPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload.pid !== "number" || !Number.isInteger(payload.pid) || payload.pid <= 0) return null;
  if (typeof payload.tgu !== "string" || !/^\d{1,20}$/.test(payload.tgu)) return null;
  if (payload.ch !== "miniapp" && payload.ch !== "bot") return null;
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) return null;
  return payload;
}

/** `Authorization: Bearer tg1.…` → the token; any other scheme → null. */
export function readTelegramBearer(req: Request): string | null {
  const header = req.headers?.get("authorization");
  if (!header) return null;
  const m = /^Bearer\s+(tg1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header.trim());
  return m ? m[1] : null;
}

async function authenticateTelegramChannel(token: string): Promise<AuthResult> {
  const payload = verifyTelegramChannelToken(token);
  if (!payload) {
    return { ok: false, status: 401, code: "unauthorized", error: "Your Telegram session expired. Please reopen the app." };
  }
  let row: typeof studentProfiles.$inferSelect | undefined;
  try {
    const rows = await withDbRetry(() =>
      db
        .select({ profile: studentProfiles, linkId: telegramLinks.id })
        .from(telegramLinks)
        .innerJoin(studentProfiles, eq(studentProfiles.id, telegramLinks.profileId))
        .where(and(eq(telegramLinks.profileId, payload.pid), eq(telegramLinks.telegramUserId, payload.tgu)))
        .limit(1)
    );
    row = rows[0]?.profile;
  } catch (err) {
    console.error("[auth] telegram session lookup failed:", err instanceof Error ? err.message : err);
    return { ok: false, status: 503, code: "unavailable", error: "Authentication is temporarily unavailable." };
  }
  if (!row) {
    return {
      ok: false,
      status: 401,
      code: "telegram_unlinked",
      error: "This Telegram account is no longer connected to ScholarBridge.",
    };
  }
  // Same revocation story as web sessions (audit A23).
  const record = await checkSessionRecord(token, row.id, { scope: "telegram" });
  if (record === "revoked") {
    return {
      ok: false,
      status: 401,
      code: "session_revoked",
      error: "This session was revoked. Please connect Telegram again.",
    };
  }
  if (record === "error") {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: "Authentication is temporarily unavailable.",
    };
  }
  const { passwordHash: _secret, ...safeProfile } = row;
  return {
    ok: true,
    session: {
      payload: { pid: payload.pid, iat: payload.iat, exp: payload.exp, fp: "telegram", sid: payload.sid },
      profile: safeProfile,
      // Least privilege: admin powers are only ever granted to a website
      // session (password/code sign-in), never through Telegram.
      isAdmin: false,
      channel: "telegram",
      telegramUserId: payload.tgu,
    },
  };
}

export type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; status: number; error: string; code: string };

/** Body shape used by NextResponse.json for auth failures. */
export function authFailureBody(result: { error: string; code: string }) {
  return { error: result.error, code: result.code };
}

/**
 * Authenticate the caller from the session cookie and re-validate against the
 * database (profile still exists, password unchanged, live admin flag).
 */
export async function authenticate(req: Request): Promise<AuthResult> {
  // The session lookup below selects the whole profile row, so a database that
  // predates a column (e.g. `is_admin`) would fail every authenticated request.
  // Repair the additive core-schema drift first; it is a no-op once up to date.
  await ensureCoreSchema();

  // An explicit Telegram bearer token wins over any cookie on the request.
  const bearer = readTelegramBearer(req);
  if (bearer) return authenticateTelegramChannel(bearer);

  const payload = verifySessionToken(readSessionToken(req));
  if (!payload) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      error: "Sign-in required. Please sign in with your email and password.",
    };
  }

  const tokenForCache = readSessionToken(req);
  if (tokenForCache) {
    const cached = successfulAuthCache.get(sessionTokenHash(tokenForCache));
    if (cached && cached.expiresAt > Date.now()) return cached.result;
    if (cached) successfulAuthCache.delete(sessionTokenHash(tokenForCache));
  }

  let row: typeof studentProfiles.$inferSelect | undefined;
  try {
    // One retry for a dropped pooled connection: a pooler restart must not turn
    // every signed-in request into "Authentication is temporarily unavailable".
    const rows = await withDbRetry(() =>
      db.select().from(studentProfiles).where(eq(studentProfiles.id, payload.pid)).limit(1)
    );
    row = rows[0];
  } catch (err) {
    console.error("[auth] session lookup failed:", err);
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: "Authentication is temporarily unavailable.",
    };
  }

  if (!row) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      error: "This account no longer exists. Please sign in again.",
    };
  }
  if (passwordFingerprint(row.passwordHash) !== payload.fp) {
    return {
      ok: false,
      status: 401,
      code: "session_expired",
      error: "Your password changed — please sign in again.",
    };
  }

  // Individual session revocation (audit A23): a valid signature and password
  // fingerprint are not enough when this session was revoked server-side.
  const token = readSessionToken(req);
  const record = await checkSessionRecord(token ?? "", row.id, {
    scope: "web",
    userAgent: req.headers.get("user-agent"),
    ip: clientIp(req),
  });
  if (record === "revoked") {
    return {
      ok: false,
      status: 401,
      code: "session_revoked",
      error: "This session was revoked. Please sign in again.",
    };
  }
  if (record === "error") {
    return {
      ok: false,
      status: 503,
      code: "unavailable",
      error: "Authentication is temporarily unavailable.",
    };
  }

  const { passwordHash: _secret, ...safeProfile } = row;
  const result: AuthResult = {
    ok: true,
    session: {
      payload,
      profile: safeProfile,
      isAdmin: Boolean(row.isAdmin),
      channel: "web",
    },
  };
  if (token) cacheSuccessfulAuth(token, row.id, result);
  return result;
}

/** Require any signed-in profile. */
export async function requireSession(req: Request): Promise<AuthResult> {
  return authenticate(req);
}

/** Require a signed-in profile whose live `is_admin` flag is true. */
export async function requireAdmin(req: Request): Promise<AuthResult> {
  const auth = await authenticate(req);
  if (!auth.ok) return auth;
  if (auth.session.channel === "telegram") {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Admin tools are only available on the website.",
    };
  }
  if (!auth.session.isAdmin) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      error: "Admin access required.",
    };
  }
  return auth;
}

/**
 * Require access to a specific profile id: the session owner, or an admin.
 *
 * `claimedId` is the id the request is trying to act on (query param / body /
 * route param). It is compared against the session, never trusted on its own.
 */
export async function requireProfileAccess(
  req: Request,
  claimedId: unknown
): Promise<AuthResult & { targetId: number | null }> {
  const auth = await authenticate(req);
  if (!auth.ok) return { ...auth, targetId: null };

  const target = Number(claimedId);
  const hasTarget = claimedId !== null && claimedId !== undefined && claimedId !== "" && Number.isFinite(target) && target > 0;

  if (!hasTarget) {
    // No id supplied → act on the caller's own profile.
    return { ...auth, targetId: auth.session.profile.id };
  }
  if (target === auth.session.profile.id || auth.session.isAdmin) {
    return { ...auth, targetId: target };
  }
  return {
    ok: false,
    status: 403,
    code: "forbidden",
    error: "You can only access your own data.",
    targetId: null,
  };
}

/** Result of an access check where the target id may legitimately be absent. */
export type OptionalAccessResult =
  | { ok: true; targetId: number | null; session: Session | null }
  | { ok: false; status: number; error: string; code: string; targetId: number | null };

/**
 * Same as `requireProfileAccess`, but for routes where the personalisation id
 * is OPTIONAL (anonymous browsing of a course page, "am I premium?" with no
 * account). No id supplied → allowed, `targetId` is null (no personal data is
 * returned). An id supplied → it must belong to the session.
 */
export async function optionalProfileAccess(
  req: Request,
  claimedId: unknown
): Promise<OptionalAccessResult> {
  const target = Number(claimedId);
  const hasTarget =
    claimedId !== null &&
    claimedId !== undefined &&
    claimedId !== "" &&
    Number.isFinite(target) &&
    target > 0;

  if (!hasTarget) {
    return { ok: true, targetId: null, session: null };
  }
  const access = await requireProfileAccess(req, target);
  if (!access.ok) {
    return { ok: false, status: access.status, error: access.error, code: access.code, targetId: null };
  }
  return { ok: true, targetId: access.targetId, session: access.session };
}

/**
 * Authorize access to an existing ROW that carries a `profileId` owner column
 * (saved items, tasks, documents, notifications, payments…). Admins pass; the
 * owner passes; everybody else gets 403 — row ids are guessable, so acting on
 * a row must never be allowed on the id alone.
 */
export async function requireRowAccess(
  req: Request,
  row: { profileId: number | null } | null | undefined
): Promise<AuthResult> {
  const auth = await authenticate(req);
  if (!auth.ok) return auth;
  if (auth.session.isAdmin) return auth;
  if (row && Number(row.profileId) === auth.session.profile.id) return auth;
  if (!row) {
    return {
      ok: false,
      status: 404,
      code: "not_found",
      error: "Record not found.",
    };
  }
  return {
    ok: false,
    status: 403,
    code: "forbidden",
    error: "You can only access your own data.",
  };
}

/** JSON body for an auth failure (used by route handlers). */
export function unauthorizedJson() {
  return {
    error: "Sign-in required. Please sign in with your email and password.",
    code: "unauthorized",
  };
}

/** Sanitized profile safe to return to the browser. */
export function publicProfile(session: Session) {
  return sanitizeProfile(session.profile as unknown as Record<string, unknown>);
}
