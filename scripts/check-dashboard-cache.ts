import { AsyncTtlCache } from "../src/lib/asyncTtlCache";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main() {
  let now = 1_000;
  const cache = new AsyncTtlCache<string, { profileId: number; value: string }>(100, 2, () => now);
  let computations = 0;
  const compute = (profileId: number, value: string) => async () => {
    computations++;
    return { profileId, value };
  };

  console.log("Dashboard recommendation cache contract");
  const first = cache.getOrCreate("17:en:2026-10-22", compute(17, "CS"));
  const concurrent = cache.getOrCreate("17:en:2026-10-22", compute(17, "ignored"));
  check("concurrent identical keys share one in-flight computation", first === concurrent);
  const [firstResult, concurrentResult] = await Promise.all([first, concurrent]);
  check("the first computation resolves once", computations === 1 && firstResult === concurrentResult);

  const repeated = await cache.getOrCreate("17:en:2026-10-22", compute(17, "ignored again"));
  check("repeated request reuses the cached result before TTL expiry", repeated === firstResult && computations === 1);

  const anotherProfile = await cache.getOrCreate("18:en:2026-10-22", compute(18, "Biology"));
  check("profile-scoped keys do not share a user's recommendation result", anotherProfile.profileId === 18 && anotherProfile.value === "Biology" && anotherProfile !== firstResult);

  cache.invalidate("17:en:2026-10-22");
  const afterInvalidation = await cache.getOrCreate("17:en:2026-10-22", compute(17, "Updated profile"));
  check("explicit invalidation forces recomputation for the selected profile", afterInvalidation.value === "Updated profile" && computations === 3);

  now += 100;
  const afterExpiry = await cache.getOrCreate("18:en:2026-10-22", compute(18, "Fresh after TTL"));
  check("the TTL boundary expires stale entries and reloads them", afterExpiry.value === "Fresh after TTL" && computations === 4);

  let failedOnce = true;
  try {
    await cache.getOrCreate("failure", async () => {
      if (failedOnce) throw new Error("expected test failure");
      return { profileId: 0, value: "recovered" };
    });
  } catch {
    // A rejected computation must not poison the key for its TTL.
  }
  failedOnce = false;
  const recovered = await cache.getOrCreate("failure", async () => ({ profileId: 0, value: "recovered" }));
  check("failed computations are evicted and retryable", recovered.value === "recovered");

  cache.getOrCreate("bounded-a", async () => ({ profileId: 1, value: "a" }));
  cache.getOrCreate("bounded-b", async () => ({ profileId: 2, value: "b" }));
  check("the cache remains bounded", cache.size <= 2);
  cache.clear();
  check("clear removes all entries", cache.size === 0);

  const byProfile = new AsyncTtlCache<string, string>(100, 8, () => now);
  let releasePending: ((value: string) => void) | undefined;
  const pendingInvalidated = byProfile.getOrCreate(
    "17:en:2026-10-22",
    () => new Promise<string>((resolve) => { releasePending = resolve; }),
  );
  byProfile.getOrCreate("17:ru:2026-10-22", async () => "profile-17-ru");
  byProfile.getOrCreate("18:en:2026-10-22", async () => "profile-18-en");
  await Promise.resolve();
  const invalidatedCount = byProfile.invalidateWhere((key) => key.startsWith("17:"));
  const freshAfterInvalidation = byProfile.getOrCreate("17:en:2026-10-22", async () => "fresh-profile-17");
  releasePending?.("stale-pending-result");
  await pendingInvalidated;
  check("profile invalidation removes all of only that profile's locale keys", invalidatedCount === 2 && byProfile.size === 2);
  check("a pending pre-invalidation computation cannot overwrite a fresh result", await freshAfterInvalidation === "fresh-profile-17");
  check("another profile remains isolated during scoped invalidation", await byProfile.getOrCreate("18:en:2026-10-22", async () => "wrong") === "profile-18-en");

  let staleReject: ((error: Error) => void) | undefined;
  const pendingRejection = byProfile.getOrCreate(
    "19:en:2026-10-22",
    () => new Promise<string>((_resolve, reject) => { staleReject = reject; }),
  );
  await Promise.resolve();
  byProfile.invalidateWhere((key) => key.startsWith("19:"));
  const replacement = byProfile.getOrCreate("19:en:2026-10-22", async () => "replacement");
  staleReject?.(new Error("rejected after invalidation"));
  await pendingRejection.catch(() => undefined);
  check("a rejected invalidated promise cannot evict its replacement", await byProfile.getOrCreate("19:en:2026-10-22", async () => "wrong") === "replacement");

  console.log(`\n✅ ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
