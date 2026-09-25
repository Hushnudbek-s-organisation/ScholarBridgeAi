import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, locales } from "@/i18n/config";

/**
 * Cryptographically random nonce using the Web Crypto API (the middleware runs
 * in the Edge runtime, where Node's `crypto` module is unavailable).
 */
function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Middleware: locale routing + security response headers.
 *
 * Two jobs:
 *  1. Locale routing — /uz, /ru, /en paths are rewritten to the locale-agnostic
 *     route and the choice is persisted in a cookie.
 *  2. Security headers for every HTML response, including a Content-Security-
 *     Policy with a per-request nonce. The policy is also placed on the
 *     forwarded request headers: the App Router parses the nonce back out of
 *     the request CSP header and stamps it on the inline scripts it emits, so
 *     the app keeps working while injected scripts stay blocked.
 */

const LOCALE_COOKIE = "scholarbridge_locale";

/**
 * Build the CSP. Nonce-based script-src means an attacker who manages to
 * inject a <script> tag gets nothing executed.
 *
 * Set CSP_REPORT_ONLY=1 to ship the same policy in report-only mode while
 * watching for breakage in the browser console.
 */
export function contentSecurityPolicy(nonce: string): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets the app's own (nonced) bundles load what they need
    // while still refusing any script an attacker injects. React needs
    // 'unsafe-eval' in development only (dev error overlays) — it is not
    // required in production, so it is never shipped there.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(process.env.NODE_ENV === "production" ? [] : ["'unsafe-eval'"]),
    ],
    // Tailwind/React write inline style attributes — 'unsafe-inline' is
    // required for styles, but it cannot execute code.
    "style-src": ["'self'", "'unsafe-inline'"],
    // University/logo imagery comes from CDNs and Supabase Storage.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", "https:"],
    "media-src": ["'self'", "https:", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    // No plugins, no embedding this site in a frame (clickjacking), no
    // relative-base-tag hijacking.
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-src": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

/** Static hardening headers applied to every response. */
function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  const headers = response.headers;
  const headerName = process.env.CSP_REPORT_ONLY === "1"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  headers.set(headerName, csp);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  // Only meaningful over HTTPS; browsers ignore it otherwise.
  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = randomNonce();
  const csp = contentSecurityPolicy(nonce);

  // Hand the policy to Next.js: the App Router reads the nonce out of the
  // *request* Content-Security-Policy header (see
  // next/dist/server/app-render/get-script-nonce-from-header.js) and stamps it
  // on the inline scripts it emits. Without this, dynamically rendered pages
  // would inline flight data with no nonce and the browser would block it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(
    process.env.CSP_REPORT_ONLY === "1"
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy",
    csp
  );

  const hasLocalePrefix = locales.some(
    (loc) => pathname === `/${loc}` || pathname.startsWith(`/${loc}/`)
  );

  if (hasLocalePrefix) {
    const segment = pathname.split("/")[1];
    const locale = isLocale(segment) ? segment : defaultLocale;
    const rest = pathname.slice(locale.length + 1) || "/";

    const url = request.nextUrl.clone();
    url.pathname = rest;
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return applySecurityHeaders(response, csp);
  }

  // For unprefixed requests, seed the default locale cookie if it is missing.
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!existing) {
    response.cookies.set(LOCALE_COOKIE, defaultLocale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return applySecurityHeaders(response, csp);
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
