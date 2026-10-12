/**
 * Arrival-plan regression suite (product journey §14.3–14.4).
 *
 * The plan must stay GENERIC guidance: no country-specific rules, no
 * invented requirements, honest locking before acceptance, and full
 * en/uz/ru parity. Runs without a database.
 *
 * Usage: npm run test:arrival
 */
import { readFileSync } from "node:fs";
import {
  ARRIVAL_ITEMS,
  ARRIVAL_WINDOWS,
  buildArrivalPlan,
  isArrivalItemStatus,
  isKnownArrivalItem,
  type ArrivalWindow,
} from "../src/lib/journey/arrival";

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

function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
section("Windows (7 / 30 / 90 days + first study year)");
// ---------------------------------------------------------------------------
check("exactly the four windows exist, in order", JSON.stringify(ARRIVAL_WINDOWS) === JSON.stringify(["d7", "d30", "d90", "year1"]));
for (const w of ARRIVAL_WINDOWS) {
  const n = ARRIVAL_ITEMS.filter((i) => i.window === w).length;
  check(`${w} has at least four items`, n >= 4, String(n));
}
check("item keys are unique", new Set(ARRIVAL_ITEMS.map((i) => i.key)).size === ARRIVAL_ITEMS.length);
check("every item is labelled generic guidance", ARRIVAL_ITEMS.every((i) => i.guidanceOnly === true));
check("first-week items cover registration, housing, orientation, connectivity", ["d7_register", "d7_housing", "d7_orientation", "d7_sim_bank"].every((k) => isKnownArrivalItem(k)));
check("first-month items cover transport, bank, academics, health", ["d30_transport", "d30_bank", "d30_academic_system", "d30_health_insurance"].every((k) => isKnownArrivalItem(k)));
check("first-quarter items cover rhythm, mentor, grant conditions, grades", ["d90_study_rhythm", "d90_mentor", "d90_grant_conditions", "d90_grades"].every((k) => isKnownArrivalItem(k)));
check("first-year items cover semesters, renewal, visa docs, career prep", ["y1_semester_dates", "y1_grant_renewal", "y1_visa_docs", "y1_internship_prep", "y1_cv_portfolio"].every((k) => isKnownArrivalItem(k)));

// ---------------------------------------------------------------------------
section("Honest locking and relevance filtering");
// ---------------------------------------------------------------------------
const before = buildArrivalPlan({ stage: "apply" });
check("the plan stays locked before an offer is accepted", before.unlocked === false);
const after = buildArrivalPlan({ stage: "accepted" });
check("the plan unlocks at the accepted stage", after.unlocked === true);
for (const stage of ["fund", "visa", "depart"]) {
  check(`unlocks for stage ${stage}`, buildArrivalPlan({ stage }).unlocked === true);
}
for (const stage of ["discover", "match", "prepare"]) {
  check(`stays locked for stage ${stage}`, buildArrivalPlan({ stage }).unlocked === false);
}

const withAid = buildArrivalPlan({ stage: "accepted", needScholarship: true });
const noAid = buildArrivalPlan({ stage: "accepted", needScholarship: false });
const unknownAid = buildArrivalPlan({ stage: "accepted", needScholarship: null });
check("scholarship-conditioned items show for aid hunters", withAid.itemKeys.includes("y1_grant_renewal"));
check("…and hide for a student who explicitly needs no aid", !noAid.itemKeys.includes("y1_grant_renewal") && !noAid.itemKeys.includes("d90_grant_conditions"));
check("…and stay visible-but-conditional when unknown (never assumed absent)", unknownAid.itemKeys.includes("y1_grant_renewal"));
check("windows never contain hidden items", after.windows.every((w) => w.items.every((i) => i.applies)));

// ---------------------------------------------------------------------------
section("Validation helpers (API contract)");
// ---------------------------------------------------------------------------
check("known item keys validate", isKnownArrivalItem("d7_register"));
check("unknown item keys are rejected", !isKnownArrivalItem("d7_evade_taxes") && !isKnownArrivalItem(""));
check("status values are strict", isArrivalItemStatus("done") && isArrivalItemStatus("pending") && !isArrivalItemStatus("maybe") && !isArrivalItemStatus(true));

// ---------------------------------------------------------------------------
section("i18n — en/uz/ru parity");
// ---------------------------------------------------------------------------
const locales = ["en", "uz", "ru"] as const;
const messages: Record<string, any> = {};
for (const loc of locales) {
  messages[loc] = JSON.parse(readFileSync(`src/i18n/messages/${loc}.json`, "utf8"));
}
function flatten(obj: any, prefix = "", out: Map<string, string> = new Map()): Map<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out);
    else out.set(key, String(v));
  }
  return out;
}
const flat: Record<string, Map<string, string>> = {};
for (const loc of locales) flat[loc] = flatten(messages[loc]);

for (const loc of locales) {
  let allItems = true;
  for (const item of ARRIVAL_ITEMS) {
    if (!flat[loc].has(`arrival.items.${item.key}`)) allItems = false;
  }
  check(`${loc}: every checklist item is translated`, allItems);
  let allWindows = true;
  for (const w of ARRIVAL_WINDOWS) {
    if (!flat[loc].has(`arrival.windows.${w}`)) allWindows = false;
    if (!flat[loc].has(`arrival.windowsHelp.${w}`)) allWindows = false;
  }
  check(`${loc}: every window label + help text exists`, allWindows);
  for (const key of ["title", "subtitle", "guidanceNote", "lockedTitle", "lockedBody", "progressTitle", "guidanceBadge"]) {
    check(`${loc}: arrival.${key} exists`, flat[loc].has(`arrival.${key}`));
  }
  const note = flat[loc].get("arrival.guidanceNote") ?? "";
  check(`${loc}: guidance note says this is NOT an official rule`, /not an official|rasmiy qoida|не официальное/i.test(note));
}

// ---------------------------------------------------------------------------
section("Static safety checks");
// ---------------------------------------------------------------------------
const src = readFileSync("src/lib/journey/arrival.ts", "utf8");
check("the engine contains no country-specific claims", !/Germany|United States|United Kingdom|Uzbekistan|Россия|German law|USCIS|Home Office/i.test(src));
check("the engine calls no AI provider", !/openai|groq|gemini|generateText|apiKey/i.test(src));
check("the engine performs no network calls", !/fetch\(|axios|http/i.test(src));
const apiSrc = readFileSync("src/app/api/journey/arrival/route.ts", "utf8");
check("the API route is session-guarded", /guardStudent/.test(apiSrc));
check("the API route validates item keys server-side", /isKnownArrivalItem/.test(apiSrc));
check("the API route validates status server-side", /isArrivalItemStatus/.test(apiSrc));
const panelSrc = readFileSync("src/components/journey/ArrivalPlanPanel.tsx", "utf8");
check("the panel shows the general-guidance badge", panelSrc.includes('t("guidanceBadge")'));
check("the panel fetches only relative /api paths", !/fetch\(\s*["'`][a-z]+:/i.test(panelSrc));
check("the panel reads no server secrets", !/process\.env|apiKey\s*[:=]/.test(panelSrc));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("arrival check FAILED");
  process.exit(1);
}
console.log("arrival check passed");
