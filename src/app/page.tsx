import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { landingMessagesFor, shellMessagesFor } from "@/i18n/messages.server";
import { Home } from "./HomeClient";
import { localizedFlightMarkup } from "@/components/landing/flightMarkup.server";

/**
 * Route entry: decide, on the server, whether this request has a session.
 *
 * The session cookie is HttpOnly, so only the server can tell a returning
 * student from a first-time visitor. With no cookie there is nothing to
 * restore — the client can start straight on the public landing page, which
 * means its full markup is server-rendered (crawlers and social previews see
 * the real content, and the first paint is instant instead of a spinner).
 * The language cookie is resolved here too so the server-rendered page is in
 * the same language as the `<html lang>` the layout already sets.
 */
export default async function Page({
  searchParams,
}: {
  /** `?start=1` — the "start now" link every public page uses. */
  searchParams: Promise<{ start?: string | string[]; save?: string | string[] }>;
}) {
  const params = await searchParams;
  const startParam = Array.isArray(params.start) ? params.start[0] : params.start;
  const startNow = startParam === "1";
  const save = typeof params.save === "string" ? /^(university|scholarship):([1-9]\d{0,9})$/.exec(params.save) : null;
  const saveIntent = save && Number(save[2]) <= 2_147_483_647
    ? { kind: save[1] as "university" | "scholarship", id: Number(save[2]) }
    : null;

  const jar = await cookies();
  const hasSessionCookie = Boolean(jar.get(SESSION_COOKIE)?.value);
  const stored = jar.get(LOCALE_COOKIE)?.value;
  const initialLocale = stored && isLocale(stored) ? stored : defaultLocale;
  return (
    <Home
      hasSessionCookie={hasSessionCookie}
      startNow={startNow}
      saveIntent={saveIntent}
      initialLocale={initialLocale}
      initialMessages={hasSessionCookie || startNow ? shellMessagesFor(initialLocale) : landingMessagesFor(initialLocale)}
      deferredMessages={!hasSessionCookie && !startNow}
      flightMarkup={localizedFlightMarkup(initialLocale)}
    />
  );
}
