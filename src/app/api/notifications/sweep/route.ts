import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { runNotificationSweep } from "@/lib/notificationSweep";

/**
 * Deadline notification sweep for ONE profile (spec §20, §21) — called
 * lazily when the app loads. The same logic runs for every Telegram-linked
 * account from /api/cron/notifications and the in-process scheduler, so
 * reminders also arrive when the student does not open the site.
 * Idempotent: see lib/notificationSweep.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const profileId = body.profileId ? Number(body.profileId) : null;
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    if (!profileId) return NextResponse.json({ ok: true, created: 0 });
    const windowDays = Number(body.windowDays) || 14;
    const created = await runNotificationSweep(profileId, windowDays);
    return NextResponse.json({ ok: true, created });
  } catch (error) {
    console.error("POST /api/notifications/sweep error:", error);
    return NextResponse.json({ error: "Notification sweep failed" }, { status: 500 });
  }
}
