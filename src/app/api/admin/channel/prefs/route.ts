import { NextResponse } from "next/server";
import { guardAdmin, jsonError, readBody, serverError } from "@/lib/growth/api";
import { prefList, resetAllPrefs, savePref } from "@/lib/channel/admin";

export const dynamic = "force-dynamic";

/**
 * Admin → Kanal → Qiziqishlar.
 *
 * The weights the planner multiplies candidate scores by, learned from poll
 * shares (0.5–2.0, 1.0 = neutral). An admin can correct a weight by hand or put
 * everything back to neutral; both are audited.
 */
export async function GET(req: Request) {
  const guard = await guardAdmin(req);
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ ok: true, rows: await prefList() });
  } catch (error) {
    return serverError("channel prefs", error);
  }
}

export async function POST(req: Request) {
  const guard = await guardAdmin(req, { write: true });
  if (!guard.ok) return guard.response;
  const body = await readBody(req);
  if (!body.ok) return body.response;
  try {
    if (String(body.value.action ?? "") === "reset") {
      const count = await resetAllPrefs(guard.value.profile.id);
      return NextResponse.json({ ok: true, count, rows: await prefList() });
    }
    const topic = String(body.value.topic ?? "");
    const weight = Number(body.value.weight);
    const result = await savePref(topic, weight, guard.value.profile.id);
    if (!result.ok) {
      const message =
        result.error === "invalid_weight" ? "Weight must be between 0.5 and 2" : "Topic must look like family:key";
      return jsonError(400, message, result.error);
    }
    return NextResponse.json({ ok: true, rows: await prefList() });
  } catch (error) {
    return serverError("channel pref save", error);
  }
}
