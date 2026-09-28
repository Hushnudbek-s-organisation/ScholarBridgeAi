/**
 * Next.js instrumentation hook — runs once per server start.
 * Starts the in-process reminder scheduler on the Node runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNotificationScheduler } = await import("./lib/scheduler");
    startNotificationScheduler();
  }
}
