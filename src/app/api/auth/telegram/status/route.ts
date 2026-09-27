import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/request";
import { requestStatus } from "@/lib/telegram/service";
import { tgJsonError, tgTablesOr503 } from "@/lib/telegram/http";

export const dynamic = "force-dynamic";

/**
 * POST { id, nonce } → attempt status for the sign-in window's polling
 * (POST so the nonce never lands in URLs or access logs).
 */
export async function POST(req: Request) {
  const unavailable = await tgTablesOr503();
  if (unavailable) return unavailable;
  const parsed = await readJsonBody<{ id?: unknown; nonce?: unknown }>(req, 4096);
  if (!parsed.ok) return tgJsonError(parsed.status, parsed.error, parsed.code);
  try {
    const status = await requestStatus(parsed.body.id, parsed.body.nonce);
    if (!status) return tgJsonError(404, "Sign-in attempt not found.", "not_found");
    return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("POST /api/auth/telegram/status error:", err);
    return tgJsonError(500, "Could not read the sign-in status.");
  }
}
