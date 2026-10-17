/**
 * Run a NON-CRITICAL task when the browser is idle.
 *
 * The catalogue, the profile and the dashboard are what a student waits for;
 * analytics beacons, notification sweeps and roadmap generation are not. On a
 * slow phone the latter used to compete with the first paint for the network
 * connection and the database pool, which is exactly the wrong order.
 *
 * `requestIdleCallback` is the right tool, but it is not available in every
 * browser (and not at all on the server), so a `setTimeout` fallback keeps the
 * behaviour deterministic everywhere.
 *
 * The returned function cancels the pending task — call it from the effect's
 * cleanup so a component that unmounts before the idle slot arrives does not
 * fire a request for a screen the student already left.
 */

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

/**
 * @param task      The work to run once the browser is idle.
 * @param timeoutMs Upper bound in milliseconds — the task runs even if the
 *                  browser never reports an idle period (busy main thread).
 */
export function scheduleWhenIdle(task: () => void, timeoutMs = 1800): () => void {
  if (typeof window === "undefined") return () => {};

  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === "function") {
    const handle = idleWindow.requestIdleCallback(() => {
      try {
        task();
      } catch {
        // A background task must never break the page it runs behind.
      }
    }, { timeout: timeoutMs });
    return () => {
      idleWindow.cancelIdleCallback?.(handle);
    };
  }

  const handle = window.setTimeout(() => {
    try {
      task();
    } catch {
      // A background task must never break the page it runs behind.
    }
  }, timeoutMs);
  return () => window.clearTimeout(handle);
}
