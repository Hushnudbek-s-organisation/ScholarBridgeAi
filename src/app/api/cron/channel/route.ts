import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { resolveChannelRuntime, tashkentDay } from "@/lib/channel/config";
import { ensureChannelTables } from "@/lib/channel/db";
import { runPlanForToday, runPostsNow } from "@/lib/channel/adminActions";
import { loadChannelSettings } from "@/lib/channel/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Channel publisher tick. Call it every 10–30 minutes (Render Cron,
 * cron-job.org) with `Authorization: Bearer $CRON_SECRET`.
 *
 * One tick: build today's plan if it does not exist yet, then send whatever is
 * due. Everything is idempotent — a second tick in the same minute sends
 * nothing twice, and `mode=off/paused/unconfigured` returns `skipped` without
 * touching Telegram.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await ensureChannelTables())) {
      return NextResponse.json({ ok: false, error: "channel tables unavailable" }, { status: 503 });
    }
    const settings = await loadChannelSettings();
    const runtime = resolveChannelRuntime(settings);
    if (runtime.blockedReason) {
      return NextResponse.json({ ok: true, skipped: true, reason: runtime.blockedReason, day: tashkentDay() });
    }
    const plan = await runPlanForToday(null);
    const posts = await runPostsNow(null);
    return NextResponse.json({ ok: true, day: plan.planDate, plan, posts });
  } catch (error) {
    console.error("/api/cron/channel error:", error);
    return NextResponse.json({ error: "Channel tick failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
