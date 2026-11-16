import assert from "node:assert/strict";
import { classifySchollyAudience } from "../src/lib/scholly-audience";
import { markSchollyMessageShown, nextSchollyMessage, schollyMessageText, type SchollyQueuedMessage } from "../src/lib/scholly-messages";

const minute = 60_000;
const day = 1_440 * minute;
const now = Date.parse("2026-11-16T07:00:00Z");
const deadline = { kind: "deadline", key: "test-deadline", daysRemaining: 2 } as const;
const submission = { kind: "submission", key: "test-submission" } as const;
const level = { kind: "level", key: "test-level", name: "$& Explorer" } as const;
const mission = { kind: "mission", key: "test-mission", sizeMin: 2 } as const;
const grant = { kind: "grant", key: "grant:5", match: 75 } as const;
const tip = { kind: "tip", key: "test-tip" } as const;
const pending: SchollyQueuedMessage[] = [tip, grant, mission, level, deadline];
const emptySession = { count: 0, lastShown: 0 };

assert.equal(nextSchollyMessage(pending, {}, emptySession, "full", now)?.message, deadline);
assert.equal(nextSchollyMessage(pending, { [deadline.key]: now }, emptySession, "full", now)?.message, level);
assert.equal(nextSchollyMessage([grant, mission, tip], {}, emptySession, "full", now)?.message, mission);
assert.equal(nextSchollyMessage([tip, grant], {}, emptySession, "full", now)?.message, grant);
assert.equal(nextSchollyMessage(pending, {}, emptySession, "muted", now), null);
assert.equal(nextSchollyMessage([mission], {}, emptySession, "important", now), null);
assert.equal(nextSchollyMessage(pending, {}, emptySession, "important", now)?.message, deadline);
assert.equal(nextSchollyMessage([deadline], { [deadline.key]: now - day + 1 }, emptySession, "full", now), null);
assert.equal(nextSchollyMessage([deadline], { [deadline.key]: now - day }, emptySession, "full", now)?.message, deadline);

const session = markSchollyMessageShown(emptySession, now);
assert.equal(nextSchollyMessage(pending, {}, session, "full", now + 59_000)?.waitMs, 1_000);
assert.equal(nextSchollyMessage(pending, {}, session, "full", now + minute)?.waitMs, 0);
assert.equal(nextSchollyMessage([...pending, submission], {}, session, "full", now + 59_000)?.message, submission);
assert.equal(nextSchollyMessage(pending, {}, { count: 3, lastShown: now }, "full", now + day), null);
assert.match(schollyMessageText(level, "en", "friendly", []), /\$& Explorer/);
assert.equal(schollyMessageText(mission, "en", "friendly", ["active"]), "Today’s mission · 2 min");
assert.match(schollyMessageText(mission, "en", "friendly", ["active", "new"]), /about 2 min/);

const date = (timestamp: number) => new Date(timestamp);
const active = classifySchollyAudience({
  now: date(now), timeZone: "Asia/Tashkent", registeredAt: date(now - 2 * day),
  visits: [date(now - 5 * minute), date(now + 3 * day), date(now - 90 * minute)],
  profileCompleteness: 59, nearestDeadlineDays: 7,
});
assert.deepEqual(active, ["new", "active", "deadline-near", "incomplete-profile"]);
for (const [age, segment] of [[2, "active"], [4, "cooling"], [7, "returned"]] as const) {
  const audience = classifySchollyAudience({
    now: date(now), timeZone: "Asia/Tashkent", registeredAt: date(now - 100 * day),
    visits: [date(now), date(now - age * day)],
    profileCompleteness: 60, nearestDeadlineDays: 8,
  });
  assert.deepEqual(audience, [segment]);
}
console.log("Scholly message priority, timing, mode, localization and audience checks passed.");
