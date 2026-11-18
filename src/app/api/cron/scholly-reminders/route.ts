import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { runSchollyReminderSweep } from "@/lib/scholly-reminder-sweep.server";

async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ ok: true, ...await runSchollyReminderSweep() });
  } catch (error) {
    console.error("/api/cron/scholly-reminders failed:", error);
    return NextResponse.json({ error: "Scholly reminder sweep failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
