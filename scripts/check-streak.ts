import {
  computeDailyStreak,
  computeSchollyStreak,
  isStreakActivity,
  DAILY_ACTIVITY_REASON,
  STREAK_MILESTONES,
} from "../src/lib/streak";

let passed = 0;
function check(label: string, condition: boolean) {
  if (!condition) throw new Error(label);
  passed++;
  console.log(`  ✓ ${label}`);
}
const now = new Date("2026-10-12T12:00:00.000Z");

console.log("Daily streak");
const empty = computeDailyStreak([], now);
check("empty activity has no streak", empty.current === 0 && empty.longest === 0 && !empty.activeToday);

const active = computeDailyStreak([
  "2026-10-10T08:00:00Z",
  "2026-10-11T09:00:00Z",
  "2026-10-12T10:00:00Z",
  "2026-10-12T11:00:00Z",
], now);
check("duplicate actions in one day count once", active.current === 3);
check("today is marked active", active.activeToday);
check("three-day milestone advances to seven", active.nextMilestone === 7 && active.daysToMilestone === 4);

const grace = computeDailyStreak(["2026-10-10", "2026-10-11"], now);
check("student has the whole current day to continue yesterday's streak", grace.current === 2 && !grace.activeToday);

const broken = computeDailyStreak(["2026-10-07", "2026-10-08", "2026-10-10"], now);
check("a real gap resets current streak", broken.current === 0);
check("longest historical run remains factual", broken.longest === 2);
check("future and invalid dates are ignored", computeDailyStreak(["bad", "2026-10-13"], now).current === 0);
check("recent view always has seven calendar days", active.recentDays.length === 7);

const tashkent = computeDailyStreak(
  ["2026-10-11T20:00:00Z", "2026-10-12T20:30:00Z"],
  new Date("2026-10-13T01:30:00Z"),
  "Asia/Tashkent",
);
check("Tashkent-local midnight starts a new streak day before UTC midnight", tashkent.current === 2 && tashkent.activeToday);
check("recent streak dates use the student's local calendar", tashkent.recentDays.at(-1)?.date === "2026-10-13");
const dateOnlyInLosAngeles = computeDailyStreak(
  ["2026-10-12"],
  new Date("2026-10-13T07:30:00Z"),
  "America/Los_Angeles",
);
check("date-only activity keeps its calendar date across timezones", dateOnlyInLosAngeles.current === 1 && !dateOnlyInLosAngeles.activeToday);
const invalidTimezone = computeDailyStreak(["2026-10-12T10:00:00Z"], now, "Not/A_Timezone");
check("invalid timezone safely falls back to UTC", invalidTimezone.current === 1);
const beforeBoundary = computeDailyStreak(
  ["2026-10-11T12:00:00Z", "2026-10-12T03:59:00Z"],
  new Date("2026-10-12T03:59:30Z"),
  "UTC",
  4,
);
check("activity before 04:00 belongs to the preceding streak day", beforeBoundary.current === 1 && beforeBoundary.activeToday);
const atBoundary = computeDailyStreak(
  ["2026-10-11T12:00:00Z", "2026-10-12T03:59:00Z", "2026-10-12T04:00:00Z"],
  new Date("2026-10-12T04:00:30Z"),
  "UTC",
  4,
);
check("04:00 starts the next streak day", atBoundary.current === 2 && atBoundary.activeToday);
check("milestones are ordered and meaningful", STREAK_MILESTONES.join(",") === "3,7,14,30,60,100,365");

console.log("\nStreak activity definition");

// A day may only be counted for something the student DID. Points received for
// someone else's action must never extend the streak: a like on an old post, or
// a referred friend's progress, used to count as a study day for the author.
for (const selfPerformed of ["lesson_complete", "quiz_passed", "thread_created", "reply_created", "scholly_daily_mission", DAILY_ACTIVITY_REASON]) {
  check(`"${selfPerformed}" counts as the student's own activity`, isStreakActivity(selfPerformed));
}
for (const received of ["content_liked", "referral_referrer", "referral_referred", "admin_award", "profile_created"]) {
  check(`"${received}" does NOT count as activity`, !isStreakActivity(received));
}
check("unknown reasons never count", !isStreakActivity("some_future_reason") && !isStreakActivity(null) && !isStreakActivity(""));
check("the daily marker reason is the one the writer uses", DAILY_ACTIVITY_REASON === "daily_active");

// The card's call to action: a lapsed streak (nothing yesterday or today) must
// present as a fresh start, not as "continue" — current is 0 in that state.
const lapsed = computeDailyStreak(["2026-10-01", "2026-10-02"], now);
check("a lapsed streak reports 0 current days and is not active today", lapsed.current === 0 && !lapsed.activeToday);
check("a lapsed streak still reports the honest record", lapsed.longest === 2 && lapsed.lastActiveDate === "2026-10-02");

// Repeating the same activity on the same day (two videos, one afternoon) must
// never inflate the count.
const repeated = computeDailyStreak(
  Array.from({ length: 12 }, (_, i) => `2026-10-12T0${(i % 9) + 1}:00:00Z`),
  now,
);
check("twelve actions in one day are one streak day", repeated.current === 1 && repeated.longest === 1);

console.log("\nScholly freezes and restore");
const january = (day: number) => `2026-01-${String(day).padStart(2, "0")}`;
const activeDays = (length: number) => Array.from({ length }, (_, index) => january(index + 1));
const snapshot = (day: number, length: number) => computeSchollyStreak(
  activeDays(length), [], january(day), new Date(`${january(day)}T11:00:00Z`),
);
check("the seventh active day earns a freeze", snapshot(7, 7).freezes === 1);
check("a 21-day run respects the two-freeze cap", snapshot(21, 21).freezes === 2);
check("today's unused hours do not spend a freeze", snapshot(8, 7).current === 7 && snapshot(8, 7).freezes === 1);
const frozen = snapshot(9, 7);
check("a missed day spends a freeze and preserves the active-day count", frozen.current === 7 && frozen.freezes === 0);
check("a frozen day is marked without claiming activity", frozen.recentDays.at(-2)?.frozen === true && !frozen.recentDays.at(-2)?.active);
check("a repeated read does not spend another freeze", JSON.stringify(snapshot(9, 7)) === JSON.stringify(frozen));
check("two misses with one freeze reset current but retain the record", snapshot(10, 7).current === 0 && snapshot(10, 7).longest === 7);
check("two owned freezes bridge two missed days", snapshot(17, 14).current === 14 && snapshot(17, 14).freezes === 0);

const repairMissions = [
  { day: january(5), doneAt: new Date("2026-01-05T20:00:00Z") },
  { day: january(6), doneAt: new Date("2026-01-06T19:30:00Z") },
];
const repair = computeSchollyStreak(activeDays(3), repairMissions, january(6), new Date("2026-01-06T20:00:00Z"));
check("two completed missions within 24 hours restore a single missed day", repair.current === 5 && repair.longest === 5);
check("the repaired day is marked without claiming real activity", repair.recentDays.at(-3)?.restored === true && !repair.recentDays.at(-3)?.active);
const pendingRepair = computeSchollyStreak(activeDays(3), repairMissions, january(6), new Date("2026-01-06T19:00:00Z"));
check("the second mission cannot restore a run before it completes", pendingRepair.current === 1 && pendingRepair.longest === 3);
const lateRepair = computeSchollyStreak(activeDays(3), [
  repairMissions[0], { ...repairMissions[1], doneAt: new Date("2026-01-06T20:00:01Z") },
], january(6), new Date("2026-01-06T21:00:00Z"));
check("two missions more than 24 hours apart do not restore a run", lateRepair.current === 2 && lateRepair.longest === 3);

console.log(`\nstreak test passed (${passed} assertions)`);
