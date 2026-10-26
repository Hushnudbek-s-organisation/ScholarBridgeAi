/** Shared route plumbing for the Telegram endpoints. */
import { NextResponse } from "next/server";
import { ensureTelegramTables, telegramBootstrapStatus, TELEGRAM_UNAVAILABLE } from "./db";

export function tgJsonError(status: number, error: string, code = "error", extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Tables ready? Returns a 503 response when they could not be prepared. */
export async function tgTablesOr503(): Promise<NextResponse | null> {
  if (await ensureTelegramTables()) return null;
  // Tell the operator *which* layer failed. `reason`/`hint` are stable codes and
  // plain advice — never a driver message, a hostname or a credential.
  const { reason, hint, at } = telegramBootstrapStatus();
  return NextResponse.json({ ...TELEGRAM_UNAVAILABLE, reason, hint, checkedAt: at }, { status: 503 });
}
