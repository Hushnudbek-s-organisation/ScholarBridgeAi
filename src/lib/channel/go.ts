/**
 * `/go/<code>` — the only redirect in the publisher.
 *
 * The destination is read from `channel_links` and nowhere else, so a crafted
 * request cannot turn this into an open redirect. Clicks are aggregated per
 * (code, day): no IP, no user agent, no cookie, no per-visitor row. Telegram's
 * link-preview crawler and HEAD probes are ignored so the numbers stay honest.
 */
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { channelLinks } from "@/db/schema";
import { tashkentDay } from "./config";
import { ensureChannelTables } from "./db";
import { isSameOrigin, isValidCustomCode, unsafeDestinationReason } from "./links";
import { loadChannelSettings, recordClick } from "./repo";

const CACHE = { "Cache-Control": "no-store, max-age=0" };

function crawler(userAgent: string): boolean {
  return /telegrambot|whatsapp|facebookexternalhit|slackbot|discordbot|twitterbot/i.test(userAgent);
}

async function homeUrl(): Promise<string> {
  const settings = await loadChannelSettings();
  const site = (settings.siteUrl || process.env.CHANNEL_SITE_URL || process.env.APP_URL || "").replace(/\/+$/, "");
  return site ? `${site}/` : "/";
}

export async function handleGoRedirect(req: Request, rawCode: string): Promise<Response> {
  const code = (rawCode ?? "").trim().toLowerCase();
  const isHead = req.method === "HEAD";
  const userAgent = req.headers.get("user-agent") ?? "";

  if (!isValidCustomCode(code)) {
    return NextResponse.redirect(new URL(await homeUrl(), req.url), { status: 302, headers: CACHE });
  }

  if (!(await ensureChannelTables())) {
    return NextResponse.redirect(new URL(await homeUrl(), req.url), { status: 302, headers: CACHE });
  }

  let row: { url: string; enabled: boolean; kind: string } | undefined;
  try {
    const rows = await db
      .select({ url: channelLinks.url, enabled: channelLinks.enabled, kind: channelLinks.kind })
      .from(channelLinks)
      .where(eq(channelLinks.code, code))
      .limit(1);
    row = rows[0];
  } catch (err) {
    console.error("[channel] go lookup failed:", err);
  }

  const settings = await loadChannelSettings();
  const site = (settings.siteUrl || process.env.CHANNEL_SITE_URL || process.env.APP_URL || "").replace(/\/+$/, "");

  // Defence in depth: a row edited by hand must still be a safe destination.
  // "site" links never leave the app, so they only have to match its origin;
  // external links must be public HTTPS URLs.
  const destination =
    row && row.enabled
      ? row.kind === "site"
        ? site && isSameOrigin(row.url, site)
          ? row.url
          : null
        : unsafeDestinationReason(row.url) === null
          ? row.url
          : null
      : null;

  if (!destination) {
    return NextResponse.redirect(new URL(await homeUrl(), req.url), { status: 302, headers: CACHE });
  }

  if (!isHead && !crawler(userAgent)) {
    try {
      await recordClick(code, tashkentDay());
    } catch (err) {
      console.error("[channel] click record failed:", err);
    }
  }

  return NextResponse.redirect(destination, { status: 302, headers: CACHE });
}
