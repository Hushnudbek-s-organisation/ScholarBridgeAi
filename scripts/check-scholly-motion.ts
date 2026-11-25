import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { canEnterSchollyMotion, SCHOLLY_MOTION_PRIORITY } from "../src/components/useSchollyMotion";

const root = join(__dirname, "..");

const ordered: (keyof typeof SCHOLLY_MOTION_PRIORITY)[] = [
  "drag", "shake", "celebrate", "proud", "levelup", "happy", "easter", "point",
  "talk", "think", "notice", "wave", "concern", "dock", "look", "sleep", "idle",
];
for (let index = 1; index < ordered.length; index++) {
  assert.ok(
    SCHOLLY_MOTION_PRIORITY[ordered[index - 1]] >= SCHOLLY_MOTION_PRIORITY[ordered[index]],
    `${ordered[index - 1]} must not have lower priority than ${ordered[index]}`,
  );
}
assert.equal(canEnterSchollyMotion("happy", SCHOLLY_MOTION_PRIORITY.happy, SCHOLLY_MOTION_PRIORITY.think, 0), true);
assert.equal(canEnterSchollyMotion("think", SCHOLLY_MOTION_PRIORITY.think, SCHOLLY_MOTION_PRIORITY.happy, 0), false);
assert.equal(canEnterSchollyMotion("wave", SCHOLLY_MOTION_PRIORITY.wave, 0, SCHOLLY_MOTION_PRIORITY.point), false);
assert.equal(canEnterSchollyMotion("idle", SCHOLLY_MOTION_PRIORITY.idle, SCHOLLY_MOTION_PRIORITY.drag, 0), true);

const companion = readFileSync(join(root, "src/components/SchollyCompanion.tsx"), "utf8");
const model = readFileSync(join(root, "src/components/SchollyModel.tsx"), "utf8");
const activityCues = readFileSync(join(root, "src/components/useSchollyActivityCues.ts"), "utf8");
const styles = readFileSync(join(root, "src/app/globals.css"), "utf8");
assert.match(companion, /animation === "easter"/);
assert.match(companion, /animation === "celebrate" \|\| animation === "proud" \|\| animation === "levelup"/);
assert.match(companion, /hardwareConcurrency <= 4/);
assert.match(companion, /quiet \|\| keyboardOpen \|\| hidden/);
assert.match(model, /src="\/scholly\.webp"/);
assert.match(model, /pointermove/);
assert.match(model, /portrait\.current\?\.animate/);
assert.match(model, /new T\.WebGLRenderer/);
assert.match(model, /target\.dataset\.rendering = "3d"/);
assert.match(styles, /\[data-rendering="3d"\] \.sb-scholly-portrait \{ visibility: hidden; \}/);
assert.match(activityCues, /element\.matches\("input, textarea"\) \|\| element\.isContentEditable/);
assert.match(activityCues, /if \(userIsEditing\(\) \|\| document\.hidden\) return/);
assert.match(activityCues, /detail\.daysRemaining < 0 \|\| detail\.daysRemaining > 3/);
assert.match(styles, /\[data-motion="wave"\].*sb-scholly-portrait-wave/);
assert.match(styles, /prefers-reduced-motion: reduce[\s\S]*?\.sb-scholly-confetti \{ display: none; \}/);

console.log("Scholly motion priority and interruption checks passed.");
