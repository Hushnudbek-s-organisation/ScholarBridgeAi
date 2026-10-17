/**
 * Next.js instrumentation hook — runs once per server start.
 * Starts the in-process reminder scheduler on the Node runtime only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startNotificationScheduler } = await import("./lib/scheduler");
    startNotificationScheduler();
    // Pre-warm the in-memory university & scholarship bundles in the background
    // so the very first student request hits warm memory instead of cold SQL.
    void import("./lib/catalogCache")
      .then((m) =>
        Promise.all([
          m.getCachedUniversitiesBundle(),
          m.getCachedScholarshipsBundle(),
        ]),
      )
      .catch(() => {});
  }
}
