import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { runNotificationSweep } from "@/lib/notificationSweep";
import { positiveInt, readJsonBody } from "@/lib/request";

/**
 * Deadline notification sweep for ONE profile (spec §20, §21) — called
 * lazily when the app loads. The same logic runs for every Telegram-linked
 * account from /api/cron/notifications and the in-process scheduler, so
 * reminders also arrive when the student does not open the site.
 * Idempotent: see lib/notificationSweep.
 */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const profileId = positiveInt(parsed.body.profileId);
    if (!profileId) {
      return NextResponse.json({ error: "profileId must be a positive integer", code: "bad_request" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    // A client cannot turn one lazy app-load sweep into an unbounded historical
    // query. Cron uses the service directly and is unaffected by this cap.
    const requestedWindow = positiveInt(parsed.body.windowDays) ?? 14;
    const windowDays = Math.min(requestedWindow, 90);
    const created = await runNotificationSweep(profileId, windowDays);
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error("POST /api/notifications/sweep error:", error);
    return NextResponse.json({ error: "Notification sweep failed" }, { status: 500 });
  }
}
