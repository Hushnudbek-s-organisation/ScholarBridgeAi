/**
 * Shared security-header policy.
 *
 * Imported by both `next.config.ts` (Node) and `src/proxy.ts` (Edge), so
 * it must stay free of Node-only APIs.
 *
 * The one environment-dependent decision is framing:
 *
 *   production  →  nobody may frame us (clickjacking protection).
 *   development →  the sandboxed preview host may frame us, because that is
 *                  how the app gets shown in the IDE/browser preview. A dev
 *                  server holds no real user data, so this costs nothing.
 *
 * Keeping the two cases explicit (instead of a blanket `frame-ancestors *`)
 * means a production deploy can never accidentally inherit the lax rule.
 */

import { APP_URL_ENV_VARS, normalizeAppUrl } from "./appUrl";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/**
 * Fail-closed: the relaxed framing rule applies ONLY when Next explicitly runs
 * in development (`next dev` sets NODE_ENV=development). Production, test and
 * an unset NODE_ENV all get the strict policy.
 */
function isDevelopment(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "development";
}

/** Hosts allowed to embed the app while running locally. */
export const DEV_FRAME_ANCESTORS = [
  "'self'",
  "https://*.e2b.app",
  "https://*.e2b.dev",
  "https://*.arena.ai",
  "http://localhost:*",
  "http://127.0.0.1:*",
];

/** CSP `frame-ancestors` value for the current environment. */
export function frameAncestors(env: Record<string, string | undefined> = process.env): string[] {
  return isDevelopment(env) ? DEV_FRAME_ANCESTORS : ["'none'"];
}

/**
 * Telegram Web (web.telegram.org/k, /a) shows Mini Apps in an iframe; the
 * mobile and desktop clients use a webview (no framing). Only the Mini App
 * page (/tg) may be framed, and only by Telegram.
 */
export const TELEGRAM_FRAME_ANCESTORS = ["https://web.telegram.org"];

/** True for the Mini App page (also behind a locale prefix: /uz/tg). */
export function isMiniAppPath(pathname: string): boolean {
  return /^\/(?:(?:uz|ru|en)\/)?tg(?:\/|$)/.test(pathname);
}

/** frame-ancestors for the Mini App page. */
export function miniAppFrameAncestors(env: Record<string, string | undefined> = process.env): string[] {
  return isDevelopment(env) ? [...DEV_FRAME_ANCESTORS, ...TELEGRAM_FRAME_ANCESTORS] : [...TELEGRAM_FRAME_ANCESTORS];
}

/**
 * `X-Frame-Options` is the legacy, less flexible cousin of `frame-ancestors`.
 * It cannot express "allow these hosts", so in development we drop it
 * entirely and let the CSP do the job; browsers honour `frame-ancestors` and
 * ignore `X-Frame-Options` when both are present in a CSP-aware browser.
 */
export function xFrameOptions(env: Record<string, string | undefined> = process.env): string | null {
  return isDevelopment(env) ? null : "DENY";
}

/** HSTS is only meaningful over HTTPS and only shipped in production. */
export function strictTransportSecurity(): string | null {
  return IS_PRODUCTION ? "max-age=31536000; includeSubDomains; preload" : null;
}

// ---------------------------------------------------------------------------
// CSRF: cross-site writes to the API
// ---------------------------------------------------------------------------

/**
 * Endpoints called server-to-server by third parties. They carry their own
 * authentication (merchant signatures, Telegram secret token, CRON_SECRET)
 * and never a browser Origin — listed so a future provider change cannot be
 * broken by the Origin rule.
 */
export const CSRF_EXEMPT_API_PREFIXES = ["/api/payments/payme/", "/api/payments/click/", "/api/telegram/webhook", "/api/cron/"];

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hostOf(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Should this API request be refused as a cross-site write?
 *
 * The session cookie is SameSite=Lax, which already stops most cross-site
 * POSTs in browsers; this is the server-side second layer. Browsers send an
 * Origin header on every cross-origin write, so a write whose Origin is not
 * this site is refused. Requests without an Origin (webhooks, curl, server to
 * server) are not browser-driven CSRF and pass through to the route's own
 * authentication. "This site" is the request Host, any X-Forwarded-Host set
 * by the platform proxy, and the configured APP_URL (see lib/appUrl).
 */
export function isCrossSiteApiWrite(req: {
  method: string;
  pathname: string;
  origin: string | null;
  host: string | null;
  forwardedHost: string | null;
  env?: Record<string, string | undefined>;
}): boolean {
  if (!WRITE_METHODS.has(req.method.toUpperCase())) return false;
  if (!req.pathname.startsWith("/api/")) return false;
  if (CSRF_EXEMPT_API_PREFIXES.some((p) => req.pathname.startsWith(p))) return false;
  if (req.origin === null || req.origin === undefined || req.origin === "") return false;
  if (req.origin === "null") return true; // sandboxed iframe / data: URL
  const originHost = hostOf(req.origin);
  if (!originHost) return true;

  const allowed = new Set<string>();
  const add = (v: string | null | undefined) => {
    const h = hostOf(v);
    if (h) allowed.add(h);
  };
  add(req.host);
  for (const h of String(req.forwardedHost ?? "").split(",")) add(h);
  const env = req.env ?? process.env;
  for (const name of APP_URL_ENV_VARS) add(normalizeAppUrl(env[name]));
  return !allowed.has(originHost);
}

/**
 * Largest JSON body any API route may hand to a parser, in bytes.
 *
 * Every route that reads its body through `readJsonBody`/`readBody` already
 * enforces its own (smaller) cap — the biggest legitimate payload in the app is
 * the admin config import at 512 KB. This global ceiling exists for the routes
 * that still call `await request.json()` directly: it is enforced in the
 * middleware, BEFORE the route runs, so an attacker cannot make the server
 * buffer an arbitrarily large JSON document.
 *
 * `multipart/form-data` (the branding logo upload) is exempt — that path has
 * its own file-type and size validation.
 */
export const MAX_API_JSON_BODY_BYTES = 1024 * 1024;

/**
 * Should this API request be refused for carrying an oversized JSON body?
 *
 * Only a *declared* Content-Length can be checked in the middleware (the Edge
 * runtime does not read the body here). That is enough to stop the ordinary
 * attack: a client that streams an unbounded body while declaring nothing is
 * still caught by `readJsonBody`'s streaming cap on the routes that use it.
 */
export function isOversizedApiJsonBody(req: {
  method: string;
  pathname: string;
  contentType: string | null;
  contentLength: string | null;
  limit?: number;
}): boolean {
  if (!req.pathname.startsWith("/api/")) return false;
  if (!WRITE_METHODS.has(req.method.toUpperCase())) return false;
  const type = String(req.contentType ?? "").toLowerCase();
  if (!type.includes("application/json")) return false;
  const declared = Number(req.contentLength ?? "0");
  const limit = req.limit ?? MAX_API_JSON_BODY_BYTES;
  return Number.isFinite(declared) && declared > limit;
}
