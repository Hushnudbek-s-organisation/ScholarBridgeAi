import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { readJsonBody } from "@/lib/request";
import { handleUpdate, type TgUpdate } from "@/lib/telegram/service";
import { handlePublisherUpdate, type PublisherUpdate } from "@/lib/telegram/publisher";
import { ensureTelegramTables } from "@/lib/telegram/db";
import { isStaticCommand } from "@/lib/telegram/core";
import { getBotToken, webhookSecret } from "@/lib/telegram/settings";
import { getChannelBotToken } from "@/lib/channel/token";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Telegram → bot updates. Authenticated by the secret Telegram echoes in
 * `X-Telegram-Bot-Api-Secret-Token` (set by Admin → Telegram bot → Connect
 * webhook, and by the channel's own self-heal).
 *
 * **Two bots can reach this one endpoint.** A deployment may run a dedicated
 * publisher bot (`TELEGRAM_CHANNEL_BOT_TOKEN`); its approval buttons send their
 * `callback_query` to *that* bot's webhook. Before this, the secret was only
 * ever accepted for the DM bot, so a dedicated publisher's Approve press was
 * answered with 401 and silently retried by Telegram — the "button does
 * nothing" report of 2026-10-29. The publisher's secret is now accepted too,
 * and its updates are handled by the channel-only dispatcher
 * (`lib/telegram/publisher`), which cannot reach student flows.
 *
 * Always answers 200 once authenticated so Telegram never retries an update we
 * already processed.
 */
export async function POST(req: Request) {
  const provided = req.headers.get("x-telegram-bot-api-secret-token") || "";
  const [{ token: mainToken }, publisherToken] = await Promise.all([getBotToken(), getChannelBotToken()]);
  if (!mainToken && !publisherToken.token) return NextResponse.json({ ok: false }, { status: 503 });

  // Which bot sent this? The payload carries no bot identity, so the secret
  // decides. The DM bot is checked first: it is the one every deployment has.
  const forMain = Boolean(mainToken && provided && sameSecret(provided, webhookSecret(mainToken)));
  const forPublisher =
    Boolean(publisherToken.token) &&
    Boolean(provided) &&
    // A dedicated publisher bot has its own secret; without one (the same bot
    // publishing and chatting) this resolves to the DM path anyway.
    publisherToken.token !== mainToken &&
    sameSecret(provided, webhookSecret(publisherToken.token!));

  if (!forMain && !forPublisher) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = await readJsonBody<TgUpdate>(req, 64 * 1024);
  if (!parsed.ok) return NextResponse.json({ ok: true });

  if (forPublisher && !forMain) {
    try {
      await ensureTelegramTables().catch(() => false);
      await handlePublisherUpdate(parsed.body as PublisherUpdate, publisherToken.token!);
    } catch (err) {
      console.error("[telegram] publisher webhook update failed:", err);
    }
    return NextResponse.json({ ok: true });
  }

  try {
    // `/id` is answered from the token alone: during a database problem the
    // operator still needs that number to finish the setup.
    const m = parsed.body.message;
    const staticOnly = Boolean(m && m.chat?.type === "private" && isStaticCommand(m.text));
    if (staticOnly || (await ensureTelegramTables())) await handleUpdate(parsed.body);
  } catch (err) {
    console.error("[telegram] webhook update failed:", err);
  }
  return NextResponse.json({ ok: true });
}
