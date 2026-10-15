import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { recordSweep, runScheduledTelegramJobs } from "@/lib/notificationSweep";

/**
 * Alias of `/api/cron/notifications` under the name the operations runbook
 * documents (`deadline-notifications`). Both paths run exactly the same job —
 * reminders for every Telegram-linked account, retries of failed deliveries and
 * the Monday micro-action digest (Pillar 5.6) — with the same CRON_SECRET
 * check, so an existing cron entry on either URL keeps working.
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
    console.error("/api/cron/deadline-notifications error:", error);
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
