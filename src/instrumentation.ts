/**
 * Next.js instrumentation hook — runs once per server start.
 * Starts the in-process reminder scheduler on the Node runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNotificationScheduler } = await import("./lib/scheduler");
    startNotificationScheduler();
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
