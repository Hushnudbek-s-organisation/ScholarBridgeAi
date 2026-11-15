import assert from "node:assert/strict";
import { transitionSchollyOnboarding, type SchollyOnboardingSnapshot } from "../src/lib/scholly-onboarding";

const base: SchollyOnboardingSnapshot = {
  onboardingState: "not_started",
  onboardingStep: "name",
  nameConfirmed: false,
  namePref: null,
  reminderWindow: null,
  tone: "friendly",
  onboardingAnswers: {},
};
const start = transitionSchollyOnboarding(base, { action: "start" });
assert.ok(!("error" in start));
if ("error" in start) throw new Error(String(start.error));
assert.equal(start.patch.onboardingState, "in_progress");
assert.equal(start.event, "onboarding_started");

const inProgress = { ...base, onboardingState: "in_progress" as const };
const confirmedName = transitionSchollyOnboarding(inProgress, { action: "name", confirmed: true });
assert.ok(!("error" in confirmedName));
if ("error" in confirmedName) throw new Error(String(confirmedName.error));
assert.equal(confirmedName.patch.onboardingStep, "reminder");
assert.equal(confirmedName.patch.namePref, null);

const reminder = transitionSchollyOnboarding({ ...inProgress, onboardingStep: "reminder" }, { action: "reminder", value: "not_needed" });
assert.ok(!("error" in reminder));
if ("error" in reminder) throw new Error(String(reminder.error));
assert.equal(reminder.patch.reminderWindow, "not_needed");
assert.deepEqual(reminder.patch.onboardingAnswers, { reminderWindow: "not_needed" });

const tone = transitionSchollyOnboarding({ ...inProgress, onboardingStep: "tone" }, { action: "tone", value: "short" });
assert.ok(!("error" in tone));
if ("error" in tone) throw new Error(String(tone.error));
assert.equal(tone.patch.tone, "short");
assert.equal(tone.patch.onboardingStep, "challenge");

const now = new Date("2026-11-15T12:00:00Z");
const completed = transitionSchollyOnboarding({ ...inProgress, onboardingStep: "challenge" }, { action: "challenge", value: "ielts" }, now);
assert.ok(!("error" in completed));
if ("error" in completed) throw new Error(String(completed.error));
assert.equal(completed.patch.onboardingState, "completed");
assert.equal(completed.patch.onboardingStep, "complete");
assert.equal(completed.patch.onboardedAt, now);
assert.deepEqual(completed.patch.onboardingAnswers, { challenge: "ielts" });
assert.ok("error" in transitionSchollyOnboarding(base, { action: "tone", value: "friendly" }));
assert.ok("error" in transitionSchollyOnboarding(inProgress, { action: "name", confirmed: false, namePref: "   " }));
assert.ok("error" in transitionSchollyOnboarding(inProgress, { action: "reminder", value: "whenever" }));

const skipped = transitionSchollyOnboarding(inProgress, { action: "skip" });
assert.ok(!("error" in skipped));
if ("error" in skipped) throw new Error(String(skipped.error));
assert.equal(skipped.patch.onboardingState, "skipped");
const resumed = transitionSchollyOnboarding({ ...inProgress, onboardingState: "skipped", onboardingStep: "tone" }, { action: "resume" });
assert.ok(!("error" in resumed));
if ("error" in resumed) throw new Error(String(resumed.error));
assert.equal(resumed.patch.onboardingState, "in_progress");
assert.deepEqual(resumed.payload, { step: "tone", resumed: true });
assert.ok("error" in transitionSchollyOnboarding({ ...inProgress, onboardingState: "completed" }, { action: "resume" }));

console.log("Scholly onboarding transition checks passed.");
