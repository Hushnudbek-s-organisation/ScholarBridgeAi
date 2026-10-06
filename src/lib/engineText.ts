/**
 * Engine sentences → the language the user is actually reading.
 *
 * The matching/chancing engines are pure TypeScript: they must behave
 * identically for a script, an AI prompt and a browser, so they emit STABLE
 * CODES plus an English sentence (see `ReasonDetail` in src/lib/matching.ts).
 * This module is the one place that turns that pair into a localized string
 * for an HTTP response.
 *
 * Why the API layer and not the components: a match sentence reaches the UI
 * through ~10 routes (universities, universities/[id], saved-universities,
 * scholarships, autopilot, chancing, planning, evaluate-profile,
 * admissions-advisor, notificationSweep). Translating once here means a
 * sentence can never be English in an Uzbek page, and a new consumer gets
 * translated reasons for free.
 *
 * The locale comes from the SAME cookie the UI writes
 * (`scholarbridge_locale`, src/i18n/config.ts), read synchronously from the
 * request — no async cookie store, so it works inside a `.map()`.
 *
 * English is served straight from the engine's own `text`, so an English
 * response is byte-identical to what the engine produced before this module
 * existed (and every existing English assertion keeps passing).
 */
import { dictionaries } from "@/i18n/messages";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import type { ReasonDetail } from "@/lib/matching";

export type ReasonKind = "university" | "scholarship";

/** Read the caller's language from a Request (cookie set by LanguageSwitcher). */
export function localeFromRequest(req: Request): Locale {
  return localeFromCookieHeader(req.headers.get("cookie"));
}

/** A stored preference (`profile.preferredLocale`) → a supported Locale. */
export function asLocale(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : defaultLocale;
}

export function localeFromCookieHeader(header: string | null | undefined): Locale {
  const match = (header ?? "").match(
    new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]*)`)
  );
  const value = match ? decodeURIComponent(match[1]) : "";
  return isLocale(value) ? value : defaultLocale;
}

/** `{name}` → params.name. Missing params stay visible as `{name}` on purpose:
 *  a half-translated sentence must be obvious in review, never silently wrong. */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : whole
  );
}

function lookup(locale: Locale, kind: ReasonKind, code: string): string | null {
  const table = dictionaries[locale] as unknown as {
    matchReasons?: Record<string, Record<string, string>>;
  };
  const value = table.matchReasons?.[kind]?.[code];
  return typeof value === "string" ? value : null;
}

/** One engine reason, in the caller's language. */
export function translateReason(locale: Locale, kind: ReasonKind, detail: ReasonDetail): string {
  if (locale === defaultLocale) return detail.text;
  const template = lookup(locale, kind, detail.code);
  return template ? interpolate(template, detail.params) : detail.text;
}

/**
 * The list an API response should ship: the translated form of every
 * structured reason. Falls back to the plain English list when a caller
 * supplied no details (older payload shape, or a hand-built entry) — the
 * response is never emptier than it was before.
 */
export function translateReasons(
  locale: Locale,
  kind: ReasonKind,
  details: ReasonDetail[] | undefined | null,
  fallback: string[] | undefined | null
): string[] {
  if (details && details.length) {
    return details.map((detail) => translateReason(locale, kind, detail));
  }
  return fallback ?? [];
}

/** Convenience for a payload shaped like the engines' return value. */
export function localizeMatch<
  T extends {
    reasons?: string[];
    potentialIssues?: string[];
    reasonDetails?: ReasonDetail[];
    issueDetails?: ReasonDetail[];
  },
>(locale: Locale, kind: ReasonKind, match: T): T {
  return {
    ...match,
    reasons: translateReasons(locale, kind, match.reasonDetails, match.reasons),
    potentialIssues: translateReasons(locale, kind, match.issueDetails, match.potentialIssues),
  };
}
