import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { closePoll, pollList } from "@/lib/channel/admin";

export const dynamic = "force-dynamic";

/**
 * Admin → Kanal → So'rovnomalar.
 *
 * GET  → every poll we ever sent, with the aggregate counters Telegram reports.
 * POST → `{ action: "close", id }`: stop the poll and store the final numbers.
 *
 * No endpoint here can read a voter: the Telegram API only ever exposes totals,
 * and the row stores counts only.
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ ok: true, rows: await pollList() });
  } catch (error) {
    return serverError("channel polls", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  const action = String(body.value.action ?? "");
  if (action !== "close") return jsonError(400, "Unknown action", "bad_action");
  const id = Number(body.value.id ?? 0);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "Invalid id", "bad_id");
  try {
    const result = await closePoll(id, guard.value.profile.id);
    if (!result.ok) {
      const status = result.error === "not_found" ? 404 : 409;
      return jsonError(status, result.error === "not_found" ? "Poll not found" : "Poll is already closed", result.error);
    }
    return NextResponse.json({ ok: true, reason: result.reason ?? null, rows: await pollList() });
  } catch (error) {
    return serverError("channel poll close", error);
  }
}
