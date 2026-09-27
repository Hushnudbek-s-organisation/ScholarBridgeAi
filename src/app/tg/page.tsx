import type { Metadata } from "next";
import { headers } from "next/headers";
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- must load before the app reads window.Telegram */}
      <script src="https://telegram.org/js/telegram-web-app.js" nonce={nonce} />
      <MiniApp />
    </>
  );
}
