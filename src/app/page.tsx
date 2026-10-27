import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { clientMessagesFor } from "@/i18n/messages.server";
import { Home } from "./HomeClient";

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
export default async function Page() {
  const jar = await cookies();
  const hasSessionCookie = Boolean(jar.get(SESSION_COOKIE)?.value);
  const stored = jar.get(LOCALE_COOKIE)?.value;
  const initialLocale = stored && isLocale(stored) ? stored : defaultLocale;
  // English ships inside the client bundle; Uzbek and Russian travel with the
  // page (one language, not all three). This is what keeps the landing page's
  // first load small enough to stay responsive on a phone.
  return <Home hasSessionCookie={hasSessionCookie} initialLocale={initialLocale} initialMessages={clientMessagesFor(initialLocale)} />;
}
