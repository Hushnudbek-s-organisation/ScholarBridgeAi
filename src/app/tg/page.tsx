import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import Script from "next/script";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { MiniApp } from "@/components/telegram/MiniApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Telegram",
  robots: { index: false, follow: false },
};

/**
 * Telegram Mini App entry (opened from the bot's menu button / "Open app").
 * telegram-web-app.js is loaded with this request's CSP nonce; everything
 * else is the client component, which exchanges the signed initData for a
 * short-lived session on the server before showing any account data.
 */
export default async function TelegramMiniAppPage() {
  const [requestHeaders, jar] = await Promise.all([headers(), cookies()]);
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  const stored = jar.get(LOCALE_COOKIE)?.value;
  const locale = stored && isLocale(stored) ? stored : defaultLocale;
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" nonce={nonce} />
      <MiniApp initialLang={locale} />
    </>
  );
}
