/**
 * Canonical public URL of this deployment — the ONE place absolute links
 * (referral links, Telegram buttons, Mini App URL, OpenRouter attribution,
 * sitemap/robots/OpenGraph) get their origin from.
 *
 * Moving ScholarBridge to another domain or host is a configuration change:
 * set APP_URL and every generated link follows. Nothing in the code or the
 * database needs rewriting (links are stored as entity id + route and turned
 * into absolute URLs at send time).
 *
 * Priority:
 *   1. APP_URL                        — explicit, read at runtime (preferred)
 *   2. NEXT_PUBLIC_APP_URL            — legacy name, still honoured
 *   3. RENDER_EXTERNAL_URL            — set automatically by Render
 *   4. VERCEL_PROJECT_PRODUCTION_URL  — set automatically by Vercel (host only)
 *   5. ""                             — unknown; callers degrade gracefully
 *
 * Pure (env injected) so it is unit-testable and safe to import anywhere
 * on the server. Client components should use `window.location.origin`.
 */

export type Env = Record<string, string | undefined>;

/** Env vars consulted, in priority order (documented in .env.example). */
export const APP_URL_ENV_VARS = [
  "APP_URL",
  "NEXT_PUBLIC_APP_URL",
  "RENDER_EXTERNAL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
] as const;

/**
 * Normalise a configured base URL: http(s) only, no credentials, no query or
 * fragment, no trailing slash. A bare host ("example.com") is treated as
 * https. Anything unparsable returns "".
 */
export function normalizeAppUrl(raw: string | null | undefined): string {
  let value = String(raw ?? "").trim();
  if (!value) return "";
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "";
  if (url.username || url.password) return "";
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

/** The configured canonical URL, or "" when none is configured. */
export function configuredAppUrl(env: Env = process.env): string {
  for (const name of APP_URL_ENV_VARS) {
    const normalized = normalizeAppUrl(env[name]);
    if (normalized) return normalized;
  }
  return "";
}

/** Which env var supplied the canonical URL (for admin diagnostics). */
export function appUrlSource(env: Env = process.env): (typeof APP_URL_ENV_VARS)[number] | null {
  for (const name of APP_URL_ENV_VARS) {
    if (normalizeAppUrl(env[name])) return name;
  }
  return null;
}

/**
 * Join the canonical base with an app-relative path ("/tg", "/?ref=X").
 * Returns null when no base is configured or the path is not app-relative
 * (absolute or protocol-relative input is refused — no open redirects).
 */
export function absoluteAppUrl(path: string, base: string = configuredAppUrl()): string | null {
  const root = normalizeAppUrl(base);
  if (!root) return null;
  const p = String(path ?? "");
  if (!p.startsWith("/") || p.startsWith("//") || p.includes("\\")) return null;
  return `${root}${p}`;
}

/**
 * Best-effort origin for places that only need a correct-looking URL for
 * the CURRENT request (sitemap, robots, OpenGraph base) when no canonical
 * URL is configured. The Host header is client-controlled, so this must
 * NEVER be used for links that leave the server (Telegram messages,
 * notifications, emails) — those use configuredAppUrl() only.
 */
export function originFromHeaders(host: string | null | undefined, proto: string | null | undefined): string {
  const h = String(host ?? "").trim().toLowerCase();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(h)) return "";
  const p = String(proto ?? "").split(",")[0].trim().toLowerCase() === "http" ? "http" : "https";
  return `${p}://${h}`;
}
