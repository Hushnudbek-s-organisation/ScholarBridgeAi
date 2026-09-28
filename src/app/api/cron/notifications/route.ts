import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { recordSweep, runScheduledTelegramJobs } from "@/lib/notificationSweep";

/**
 * Scheduled reminders — runs the notification sweep for every account that
 * connected Telegram, so deadline / task / scholarship alerts reach the
 * phone even when the student never opens the site.
 *
 * Call it every 1–3 hours from Render Cron / cron-job.org with the header
 * `Authorization: Bearer $CRON_SECRET` (same secret as /api/cron/refresh).
 * The app also runs it by itself every few hours while the server is awake
 * (src/instrumentation.ts); this endpoint covers sleeping free instances.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured — set it to enable scheduled reminders" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runScheduledTelegramJobs();
    await recordSweep(summary, "cron");
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error("/api/cron/notifications error:", error);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
