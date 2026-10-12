import { computeDailyStreak, STREAK_MILESTONES } from "../src/lib/streak";

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
check("milestones are ordered and meaningful", STREAK_MILESTONES.join(",") === "3,7,14,30,60,100,365");

console.log(`\nstreak test passed (${passed} assertions)`);
