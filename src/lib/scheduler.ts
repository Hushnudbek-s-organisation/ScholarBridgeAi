/**
 * In-process reminder scheduler (Node runtime only, started from
 * src/instrumentation.ts).
 *
 * While the server is awake it runs the Telegram reminder sweep every
 * NOTIFICATION_SWEEP_HOURS (default 3) hours, first run 2 minutes after
 * boot. Free hosting tiers put the server to sleep — for those, also call
 * /api/cron/notifications from an external cron (see README).
 *
 * Disable with NOTIFICATION_SCHEDULER=off. Never runs in `next dev` unless
 * NOTIFICATION_SCHEDULER=on (keeps local development quiet).
 */
const g = globalThis as unknown as { __sbSchedulerStarted?: boolean; __sbSweepRunning?: boolean };

export function startNotificationScheduler() {
  const mode = (process.env.NOTIFICATION_SCHEDULER || "").toLowerCase();
  if (mode === "off") return;
  if (process.env.NODE_ENV !== "production" && mode !== "on") return;
  if (!process.env.DATABASE_URL) return;
  if (g.__sbSchedulerStarted) return;
  g.__sbSchedulerStarted = true;

  const hours = Math.min(Math.max(Number(process.env.NOTIFICATION_SWEEP_HOURS) || 3, 0.25), 24);
  const tick = async () => {
    if (g.__sbSweepRunning) return;
    g.__sbSweepRunning = true;
    try {
      const { runScheduledTelegramJobs, recordSweep } = await import("@/lib/notificationSweep");
      const summary = await runScheduledTelegramJobs();
      await recordSweep(summary, "scheduler");
      if (summary.profiles > 0) {
        console.log(`[scheduler] reminder sweep: ${summary.profiles} accounts, ${summary.created} new notifications`);
      }
    } catch (err) {
      console.warn("[scheduler] sweep failed:", err instanceof Error ? err.message : err);
    } finally {
      g.__sbSweepRunning = false;
    }
  };

  const first = setTimeout(tick, 2 * 60_000);
  const every = setInterval(tick, hours * 3_600_000);
  // Never keep the process alive just for the timers.
  first.unref?.();
  every.unref?.();
  console.log(`[scheduler] Telegram reminders every ${hours}h (first run in 2 min)`);
}
