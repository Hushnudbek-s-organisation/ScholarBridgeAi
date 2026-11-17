import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { runSchollyTelegramReminders } from "@/lib/scholly-telegram-reminders.server";
import { runSchollyPushReminders } from "@/lib/scholly-push-reminders.server";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { pausedUsers, ...push } = await runSchollyPushReminders();
    const telegram = await runSchollyTelegramReminders(undefined, pausedUsers);
    return NextResponse.json({
      ok: true,
      candidates: push.candidates + telegram.candidates,
      sent: push.sent + telegram.sent,
      failed: push.failed + telegram.failed,
      push, telegram,
    });
  } catch (error) {
    console.error("/api/cron/scholly-reminders failed:", error);
    return NextResponse.json({ error: "Scholly reminder sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
