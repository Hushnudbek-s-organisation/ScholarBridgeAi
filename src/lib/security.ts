/**
 * Shared security-header policy.
 *
 * Imported by both `next.config.ts` (Node) and `src/middleware.ts` (Edge), so
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
