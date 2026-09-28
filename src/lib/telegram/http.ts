/** Shared route plumbing for the Telegram endpoints. */
import { NextResponse } from "next/server";
import { ensureTelegramTables, TELEGRAM_UNAVAILABLE } from "./db";

export function tgJsonError(status: number, error: string, code = "error", extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, code, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

/** Tables ready? Returns a 503 response when they could not be prepared. */
export async function tgTablesOr503(): Promise<NextResponse | null> {
  return (await ensureTelegramTables()) ? null : NextResponse.json(TELEGRAM_UNAVAILABLE, { status: 503 });
}
