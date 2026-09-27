import { NextResponse } from "next/server";
import { getBotToken, getTelegramSettings } from "@/lib/telegram/settings";

export const dynamic = "force-dynamic";

/**
 * Public: what the sign-in window and settings page need to know.
 * Never exposes the token or any admin-only setting.
 */
export async function GET() {
  const [settings, { token }] = await Promise.all([getTelegramSettings(), getBotToken()]);
  const configured = Boolean(token && settings.botUsername);
  return NextResponse.json(
    {
      configured,
      botUsername: configured ? settings.botUsername : null,
      loginEnabled: configured && settings.loginEnabled,
      signupEnabled: configured && settings.signupEnabled,
      notificationsEnabled: configured && settings.notificationsEnabled,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
