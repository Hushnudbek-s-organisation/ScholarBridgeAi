/**
 * Next.js instrumentation hook — runs once per server start.
 * Starts the in-process reminder scheduler and the channel publisher loop on
 * the Node runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNotificationScheduler } = await import("./lib/scheduler");
    startNotificationScheduler();
    // The channel publisher ticks itself every CHANNEL_TICK_MINUTES (default
    // 15). It reads its own settings and refuses when the panel says off, so
    // starting it unconditionally is safe — and it is what makes "connect the
    // channel and it keeps working" true without an external cron.
    const { startChannelAutopilot } = await import("./lib/channel/boot");
    startChannelAutopilot();
    // Warm the server in the BACKGROUND: the seed (idempotent top-ups only
    // when the catalogue already exists) and the in-memory university &
    // scholarship bundles. Nothing here blocks the boot — the first student
    // request still finds warm memory instead of cold SQL, and a database
    // that is still starting up simply retries on the next request.
    void (async () => {
      try {
        const { seedDatabase } = await import("./db/seed");
        await seedDatabase();
      } catch {
        // The catalogue seed is best-effort at boot: the request path retries.
      }
      try {
        const m = await import("./lib/catalogCache");
        await Promise.all([
          m.getCachedUniversitiesBundle(),
          m.getCachedScholarshipsBundle(),
        ]);
      } catch {
        // A cold database at boot is not fatal — the next request warms it.
      }
    })();
  }
}
