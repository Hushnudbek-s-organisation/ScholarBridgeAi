import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isSchollyLocale, isSupportedTimeZone } from "../src/lib/scholly-profile";

assert.equal(isSupportedTimeZone("Asia/Tashkent"), true);
assert.equal(isSupportedTimeZone("America/Los_Angeles"), true);
assert.equal(isSupportedTimeZone("UTC"), true);
assert.equal(isSupportedTimeZone("Not/A_Timezone"), false);
assert.equal(isSupportedTimeZone(""), false);
assert.equal(isSupportedTimeZone("x".repeat(101)), false);
assert.equal(isSchollyLocale("uz"), true);
assert.equal(isSchollyLocale("ru"), true);
assert.equal(isSchollyLocale("en"), true);
assert.equal(isSchollyLocale("fr"), false);
const root = resolve(__dirname, "..");
const gamificationRoute = readFileSync(resolve(root, "src/app/api/gamification/route.ts"), "utf8");
const preferenceRoute = readFileSync(resolve(root, "src/app/api/scholly/profile/route.ts"), "utf8");
assert.match(gamificationRoute, /schollyProfiles\.tz/);
assert.doesNotMatch(gamificationRoute, /searchParams\.get\("timeZone"\)/);
assert.match(preferenceRoute, /isSupportedTimeZone\(body\.tz\)/);
assert.match(preferenceRoute, /tz: hasTimezone \? body\.tz/);

console.log("Scholly timezone and locale validation checks passed.");
