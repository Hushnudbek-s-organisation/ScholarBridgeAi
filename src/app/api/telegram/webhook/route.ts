import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { readJsonBody } from "@/lib/request";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/service";
import { ensureTelegramTables } from "@/lib/telegram/db";
import { getBotToken, webhookSecret } from "@/lib/telegram/settings";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Telegram → bot updates. Authenticated by the secret Telegram echoes in
 * `X-Telegram-Bot-Api-Secret-Token` (set by Admin → Telegram bot → Connect
 * webhook). Always answers 200 once authenticated so Telegram never retries
 * an update we already processed.
 */
export async function POST(req: Request) {
  const { token } = await getBotToken();
  if (!token) return NextResponse.json({ ok: false }, { status: 503 });
  const provided = req.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!provided || !sameSecret(provided, webhookSecret(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const parsed = await readJsonBody<TgUpdate>(req, 64 * 1024);
  if (!parsed.ok) return NextResponse.json({ ok: true });
  try {
    if (await ensureTelegramTables()) await handleUpdate(parsed.body);
  } catch (err) {
    console.error("[telegram] webhook update failed:", err);
  }
  return NextResponse.json({ ok: true });
}
