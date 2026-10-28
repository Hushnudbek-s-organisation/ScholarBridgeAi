import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/payments";
import { resolveChannelRuntime, tashkentDay } from "@/lib/channel/config";
import { ensureChannelTables } from "@/lib/channel/db";
import { runPlanForToday, runPostsNow } from "@/lib/channel/adminActions";
import { loadChannelSettings } from "@/lib/channel/repo";
import { recordTick } from "@/lib/channel/whyStore";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Channel publisher tick.
 *
 * Point an uptime monitor at this URL and the site stops being idle *and* the
 * publisher keeps running — one monitor does both jobs, which is why the
 * anonymous form below exists:
 *
 *   https://your-site/api/cron/channel?secret=$CRON_SECRET
 *
 * The same endpoint also accepts `Authorization: Bearer $CRON_SECRET`, so a
 * Render cron or cron-job.org keeps working unchanged.
 *
 * Why the query form is needed: most uptime monitors can only call a URL (no
 * custom header without a paid plan), and on a host that sleeps when idle the
 * in-process loop never gets to run. A monitor that only pings `/api/health`
 * keeps the site awake but doesn't tick; this URL does both.
 *
 * Answers:
 *   200 — the tick ran, or the publisher is intentionally quiet (off/paused).
 *         `skipped: true` with a reason. A monitor must not report "down" for a
 *         deliberate switch.
 *   401 — wrong or missing secret.
 *   500 — an unexpected failure (this is what should page you).
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const provided = auth || `Bearer ${url.searchParams.get("secret") ?? ""}`;
  if (!safeEqual(provided, `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  try {
    if (!(await ensureChannelTables())) {
      // 200 on purpose: the app is up, the channel feature is not configured.
      // A monitor that turned red here would hide the real outage later.
      return NextResponse.json({ ok: false, skipped: true, reason: "channel tables unavailable" }, { status: 200 });
    }
    const settings = await loadChannelSettings();
    const runtime = resolveChannelRuntime(settings, process.env, now);
    /**
     * Approval mode without an admin chat is not a reason to stop: the post is
     * parked in the panel's inbox instead. Every other block really is one.
     */
    const panelOnly = runtime.mode === "approval" && runtime.blockedCode === "no_admin_chat";
    if (runtime.blockedReason && !panelOnly) {
      await recordTick("cron", { skipped: runtime.blockedCode });
      return NextResponse.json(
        { ok: true, skipped: true, code: runtime.blockedCode, reason: runtime.blockedReason, day: tashkentDay(now) },
        { status: 200 }
      );
    }
    const plan = await runPlanForToday(null);
    const posts = await runPostsNow(null);
    await recordTick("cron", {
      planned: plan.planned,
      attempted: posts.attempted,
      sent: posts.sent,
      approval: posts.approval,
      failed: posts.failed,
    });
    return NextResponse.json({ ok: true, day: plan.planDate, plan, posts }, { status: 200 });
  } catch (error) {
    console.error("/api/cron/channel error:", error);
    return NextResponse.json({ ok: false, error: "Channel tick failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
