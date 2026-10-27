import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { readJsonBody } from "@/lib/request";
import { dbDiagnostics } from "@/lib/db/health";
import {
  channelBootstrapStatus,
  forceChannelRepair,
} from "@/lib/channel/db";
import { forceTelegramRepair, telegramBootstrapStatus } from "@/lib/telegram/db";
import { forceCoreSchemaRepair } from "@/lib/core/db";
import { forceJourneyRepair } from "@/lib/journey/db";
import { forceGrowthRepair } from "@/lib/growth/db";
import { forceOwnershipRepair } from "@/lib/ownership/db";
import { schemaGateSnapshot } from "@/lib/schemaGate";
import { requestSeedingPolicy } from "@/lib/db/requestSeeding";
import { getBotToken } from "@/lib/telegram/settings";

export const dynamic = "force-dynamic";

/**
 * Admin → System → Diagnostics.
 *
 * Deliberately independent of the table bootstraps: when the bot says
 * "temporarily unavailable", this endpoint is the only thing that can still
 * explain *why*. It needs a session and nothing else — no telegram_* table is
 * queried here, so it answers on a database that refuses to create tables.
 *
 * It reports booleans, stable reason codes and advice. Never a DSN, a role
 * name, a hostname or the bot token.
 */
async function snapshot() {
  const database = await dbDiagnostics();
  let token: { set: boolean; source: "admin" | "env" | "none" } = { set: false, source: "none" };
  try {
    const info = await getBotToken();
    token = { set: Boolean(info.token), source: info.source };
  } catch {
    // app_config unreadable — that is itself part of the diagnosis.
  }
  return {
    database,
    schema: {
      telegram: telegramBootstrapStatus(),
      channel: channelBootstrapStatus(),
      // Which schema areas this process has resolved, how (real DDL or a
      // read-only verification because SCHEMA_AUTO_REPAIR=off), and what a
      // verification found missing. No DSNs, no role names.
      gate: schemaGateSnapshot(),
    },
    // `auto` (seeds outside production only) / `on` / `off`.
    seeding: requestSeedingPolicy(),
    token,
    checkedAt: new Date().toISOString(),
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
}

/** `{ action: "retry" }` — forget the memoised failure and try the DDL again. */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status, headers: { "Cache-Control": "no-store" } });
  }
  const parsed = await readJsonBody<{ action?: unknown }>(req, 4 * 1024);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
  if (parsed.body.action !== "retry") {
    return NextResponse.json({ error: "Unknown action.", code: "bad_action" }, { status: 400 });
  }
  // Explicit operator action: run the real DDL for every area, whatever
  // `SCHEMA_AUTO_REPAIR` says about the request path.
  await Promise.all([
    forceCoreSchemaRepair(),
    forceJourneyRepair(),
    forceGrowthRepair(),
    forceOwnershipRepair(),
    forceTelegramRepair(),
    forceChannelRepair(),
  ]);
  return NextResponse.json(await snapshot(), { headers: { "Cache-Control": "no-store" } });
}
