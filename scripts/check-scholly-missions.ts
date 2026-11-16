import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { selectSchollyDailyGrant } from "../src/lib/scholly-daily-grant";
import {
  buildSchollyMissionHistory,
  missionProgress,
  pickSchollyMission,
  schollyDayKey,
  type SchollyMissionContext,
  type SchollyMissionCriteria,
} from "../src/lib/scholly-missions";

const context: SchollyMissionContext = {
  day: "2026-11-16",
  timezone: "Asia/Tashkent",
  missingProfileFields: ["country", "targetMajor"],
  savedUniversityIds: [4],
  uploadedDocumentIds: [11],
  sopWordCount: 120,
  hasDeadlineWithinSevenDays: true,
  hasIncompleteRequiredDocuments: true,
};
const baseline: SchollyMissionCriteria = {
  missingFields: ["country", "targetMajor"],
  savedUniversityIds: [4],
  uploadedDocumentIds: [11],
  sopWordCount: 120,
};

assert.equal(schollyDayKey(new Date("2026-01-01T22:59:00Z"), "Asia/Tashkent"), "2026-01-01");
assert.equal(schollyDayKey(new Date("2026-01-01T23:00:00Z"), "Asia/Tashkent"), "2026-01-02");
assert.equal(schollyDayKey(new Date("2026-01-01T23:00:00Z"), "bad timezone"), "2026-01-02");

const choice = pickSchollyMission(context);
assert.deepEqual(choice, pickSchollyMission(context));
assert.equal(choice.type, "upload_document");
assert.equal(choice.points, 10);
assert.equal(pickSchollyMission(context, { recentStatuses: ["skipped", "skipped"], completedStreak: 0 }).sizeMin, 1);
assert.equal(pickSchollyMission(context, { recentStatuses: [], completedStreak: 5 }).isStar, true);
assert.equal(pickSchollyMission(context, { recentStatuses: [], completedStreak: 5 }).points, 20);
assert.notEqual(pickSchollyMission(context, undefined, "upload_document").type, "upload_document");
const singleMissingField: SchollyMissionContext = {
  ...context, missingProfileFields: ["country"], hasDeadlineWithinSevenDays: false,
};
const starProfile = pickSchollyMission(
  singleMissingField,
  { recentStatuses: ["done", "done", "done"], completedStreak: 5 },
);
assert.equal(starProfile.type, "fill_profile_fields");
assert.equal(starProfile.targetCount, 1);
assert.equal(starProfile.sizeMin, 5);
assert.equal(pickSchollyMission({ ...context, hasDeadlineWithinSevenDays: false }).sizeMin, 3);

const shortSop = pickSchollyMission(
  { ...context, missingProfileFields: [], savedUniversityIds: [1, 2, 3], hasDeadlineWithinSevenDays: false },
  { recentStatuses: ["missed", "skipped"], completedStreak: 0 },
);
assert.equal(shortSop.type, "sop_paragraph");
assert.equal(shortSop.targetCount, 25);
assert.equal(shortSop.sizeMin, 1);
assert.deepEqual(buildSchollyMissionHistory("2026-11-16", []), { recentStatuses: [], completedStreak: 0 });
assert.deepEqual(buildSchollyMissionHistory("2026-11-16", [
  { day: "2026-11-15", status: "done" },
  { day: "2026-11-14", status: "done" },
  { day: "2026-11-12", status: "done" },
]), { recentStatuses: ["done", "done", "missed"], completedStreak: 2 });
assert.deepEqual(buildSchollyMissionHistory("2026-11-16", [
  { day: "2026-11-15", status: "skipped" },
  { day: "2026-11-14", status: "done" },
]), { recentStatuses: ["skipped", "done", "missed"], completedStreak: 0 });

assert.deepEqual(missionProgress("fill_profile_fields", 2, baseline, {
  ...baseline, missingFields: ["targetMajor"],
}), { progress: 1, target: 2, complete: false });
assert.equal(missionProgress("fill_profile_fields", 2, baseline, {
  ...baseline, missingFields: [],
}).complete, true);
assert.deepEqual(missionProgress("fill_profile_fields", 3, { ...baseline, missingFields: ["country"] }, {
  ...baseline, missingFields: [],
}), { progress: 1, target: 1, complete: true });
assert.equal(missionProgress("sop_paragraph", 25, baseline, {
  ...baseline, sopWordCount: 145,
}).complete, true);
assert.equal(missionProgress("sop_paragraph", 1, baseline, {
  ...baseline, sopWordCount: 145,
}).target, 50);
assert.equal(missionProgress("save_universities", 2, baseline, {
  ...baseline, savedUniversityIds: [4, 8, 9],
}).progress, 2);
assert.equal(missionProgress("upload_document", 1, baseline, {
  ...baseline, uploadedDocumentIds: [11, 12],
}).complete, true);
assert.deepEqual(missionProgress("sop_paragraph", 50, baseline, {
  ...baseline, sopWordCount: 169,
}), { progress: 49, target: 50, complete: false });
assert.equal(missionProgress("sop_paragraph", 50, baseline, {
  ...baseline, sopWordCount: 170,
}).complete, true);

const verifiedGrant = {
  id: 1, verificationStatus: "verified", sourceUrl: "https://university.test/scholarships/example",
  lastVerifiedAt: "2026-11-15T00:00:00Z", deadlineDate: "2026-11-30",
};
const grants = [
  { ...verifiedGrant, id: 5, verificationStatus: "unverified" },
  { ...verifiedGrant, id: 2, sourceUrl: "https://university.test" },
  { ...verifiedGrant, id: 4, deadlineDate: "2026-11-14" },
  { ...verifiedGrant, id: 6, saved: true },
  { ...verifiedGrant, id: 8, lastVerifiedAt: null },
  { ...verifiedGrant, id: 9, sourceUrl: "javascript:void(0)" },
  verifiedGrant,
];
assert.deepEqual(selectSchollyDailyGrant(grants, "2026-11-16"), verifiedGrant);
assert.equal(selectSchollyDailyGrant(grants.slice(0, -1), "2026-11-16"), null);
assert.equal(selectSchollyDailyGrant(grants, "2026-02-30"), null);
const secondGrant = { ...verifiedGrant, id: 3 };
const mondayGrant = selectSchollyDailyGrant([verifiedGrant, secondGrant], "2026-11-16");
assert.deepEqual(selectSchollyDailyGrant([secondGrant, verifiedGrant], "2026-11-16"), mondayGrant);
assert.notEqual(selectSchollyDailyGrant([verifiedGrant, secondGrant], "2026-11-17")?.id, mondayGrant?.id);

const route = readFileSync(resolve(__dirname, "../src/app/api/scholly/mission/route.ts"), "utf8");
assert.match(route, /requireProfileAccess/);
assert.match(route, /for\("update"\)/);
assert.match(route, /awardPoints\(profileId, done\.points, "scholly_daily_mission", done\.id, tx\)/);
assert.match(route, /logSchollyEvent\(profileId, "mission_done"/);
assert.match(route, /logSchollyEvent\(profileId, "mission_skipped"/);
assert.match(route, /logSchollyEvent\(profileId, "mission_another"/);
assert.match(route, /anotherUsed/);

console.log("Scholly mission day boundary, deterministic selection, evidence-based progress and route integrity checks passed.");
