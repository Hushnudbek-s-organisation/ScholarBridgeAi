/**
 * Phase V gate — one clock, whole-day deadlines.
 *
 * The project has two engines that answer "can this be applied to today?":
 *
 *   · `computeScholarshipStatus()` in `src/lib/scholarshipStatus.ts` — the
 *     six-state filter vocabulary (open / upcoming / closed / rolling /
 *     not_announced / unknown). It is also **written back** into
 *     `scholarships.application_status` by `runRefresh()`.
 *   · `deadlineStateOf()` in `src/lib/catalogueOrder.ts` — the five-state
 *     verdict the public catalogue renders (Phase U).
 *
 * They disagreed, and both were wrong the same way: a `date` column arrives as
 * midnight UTC, and the code compared it with `new Date()`. At 00:00:01 on the
 * day an award closes, `now <= deadline` is already false — so the app said
 * CLOSED on the one day a student could still apply, the refresh job wrote that
 * verdict into the database, and the public page said the opposite.
 *
 * This gate pins the whole-day rule, the agreement of the two engines, and the
 * call sites that would silently bring the bug back.
 *
 * Run: npm run test:deadline-day
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeScholarshipStatus } from "../src/lib/scholarshipStatus";
import { daysBetweenYmd, deadlineStateOf, todayYmd, ymdOf } from "../src/lib/catalogueOrder";
import { daysUntil as countdownDays } from "../src/lib/nextActions";

const ROOT = join(__dirname, "..");
let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}

/** A row with every date field the status engine reads, all empty. */
function row(over: Record<string, unknown> = {}) {
  return {
    openingDate: null,
    deadlineDate: null,
    deadlineType: "exact",
    deadlineRangeStart: null,
    deadlineRangeEnd: null,
    rounds: null,
    recurrence: null,
    expectedOpeningPeriod: null,
    expectedDeadlinePeriod: null,
    isActive: true,
    ...over,
  } as Parameters<typeof computeScholarshipStatus>[0];
}

/** A fixed "now" at a chosen UTC wall-clock time on a chosen day. */
function at(ymd: string, time = "07:00:00"): Date {
  return new Date(`${ymd}T${time.replace(/Z$/, "")}Z`);
}

const DAY = "2026-10-30";
const BEFORE = "2026-10-29";
const AFTER = "2026-10-31";

console.log("\nPhase V — one clock, whole-day deadlines");

/* ------------------------------------------------ 1. the closing day is open */

check("an award closing today is OPEN at every hour of that day", () => {
  for (const time of ["00:00:01", "07:00:00", "12:00:00", "18:30:00", "23:59:59"]) {
    assert.equal(
      computeScholarshipStatus(row({ deadlineDate: DAY }), at(DAY, time)),
      "open",
      `closed at ${time} on its own deadline day`
    );
  }
});

check("it is OPEN the day before and CLOSED the day after", () => {
  assert.equal(computeScholarshipStatus(row({ deadlineDate: DAY }), at(BEFORE)), "open");
  assert.equal(computeScholarshipStatus(row({ deadlineDate: DAY }), at(AFTER)), "closed");
});

check("a date range keeps its last day open", () => {
  const range = { deadlineType: "range", deadlineRangeStart: "2026-10-01", deadlineRangeEnd: DAY };
  assert.equal(computeScholarshipStatus(row(range), at(DAY, "23:00:00")), "open", "range closed on its last day");
  assert.equal(computeScholarshipStatus(row(range), at(AFTER)), "closed");
  assert.equal(computeScholarshipStatus(row(range), at("2026-09-30")), "upcoming");
});

check("the latest round decides, and its own day counts", () => {
  const rounds = JSON.stringify([
    { deadline: "2026-09-01" },
    { deadline: DAY },
  ]);
  assert.equal(computeScholarshipStatus(row({ deadlineType: "multiple_rounds", rounds }), at(DAY, "22:00:00")), "open");
  assert.equal(computeScholarshipStatus(row({ deadlineType: "multiple_rounds", rounds }), at(AFTER)), "closed");
});

check("a future opening date still makes it upcoming, not open", () => {
  assert.equal(
    computeScholarshipStatus(row({ deadlineDate: "2026-12-01", openingDate: "2026-11-01" }), at(DAY)),
    "upcoming"
  );
  assert.equal(
    computeScholarshipStatus(row({ deadlineDate: "2026-12-01", openingDate: "2026-10-01" }), at(DAY)),
    "open"
  );
});

check("rolling and not-announced are unaffected by any date", () => {
  assert.equal(computeScholarshipStatus(row({ deadlineType: "rolling" }), at(DAY)), "rolling");
  assert.equal(computeScholarshipStatus(row({ deadlineType: "not_announced" }), at(DAY)), "not_announced");
  assert.equal(
    computeScholarshipStatus(row({ recurrence: "annual", expectedDeadlinePeriod: "March" }), at(DAY)),
    "not_announced"
  );
});

check("the engine is clock-injectable (no hidden `new Date()`)", () => {
  const a = computeScholarshipStatus(row({ deadlineDate: DAY }), at(AFTER));
  const b = computeScholarshipStatus(row({ deadlineDate: DAY }), at(BEFORE));
  assert.equal(a, "closed");
  assert.equal(b, "open");
  assert.notEqual(a, b, "the verdict ignored the injected clock");
});

/* ------------------------------------------- 2. the two engines agree, always */

check("`computeScholarshipStatus` and `deadlineStateOf` never contradict", () => {
  const slice = JSON.parse(readFileSync(join(ROOT, "scripts/fixtures/catalogue-slice.json"), "utf8")) as {
    rows: Array<{
      id: number;
      deadlineDate: string | null;
      deadlineType?: string | null;
      applicationStatus?: string | null;
    }>;
  };
  assert.ok(slice.rows.length >= 40, `the fixture must be the real slice (got ${slice.rows.length})`);
  const days = ["2026-10-01", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-15", "2026-12-31", "2027-03-01"];
  const openStates = new Set(["open", "upcoming", "rolling", "not_announced"]);
  for (const day of days) {
    for (const r of slice.rows) {
      const engine = computeScholarshipStatus(
        row({
          deadlineDate: r.deadlineDate,
          deadlineType: r.deadlineType ?? "exact",
        }),
        at(day, "06:00:00")
      );
      const catalogue = deadlineStateOf(
        {
          id: r.id,
          deadlineDate: r.deadlineDate,
          deadline: null,
          applicationStatus: r.applicationStatus ?? "unknown",
          deadlineType: r.deadlineType ?? "exact",
        },
        day
      );
      const engineOpen = openStates.has(engine);
      const catalogueOpen = catalogue !== "passed";
      assert.equal(
        engineOpen,
        catalogueOpen,
        `row ${r.id} on ${day}: app says "${engine}", catalogue says "${catalogue}"`
      );
    }
  }
});

check("the day countdown and the verdict agree at zero", () => {
  // The dashboard counts days with `daysUntil`; the card says open/closed. On
  // the deadline day the countdown is 0 and the award must be open.
  assert.equal(countdownDays(at(DAY), DAY), 0, "the dashboard countdown is not day-based");
  assert.equal(daysBetweenYmd(DAY, DAY), 0);
  assert.equal(computeScholarshipStatus(row({ deadlineDate: DAY }), at(DAY)), "open");
  assert.equal(daysBetweenYmd(DAY, AFTER), 1);
  assert.equal(daysBetweenYmd(DAY, BEFORE), -1);
});

/* ---------------------------------------------------------- 3. the call sites */

check("the refresh job cannot close an award on its own deadline day", () => {
  // `runRefresh` writes `computeScholarshipStatus` into `application_status`.
  // A nightly run at 00:05 UTC on the deadline day must not do it.
  const verdict = computeScholarshipStatus(row({ deadlineDate: DAY }), at(DAY, "00:05:00"));
  assert.equal(verdict, "open", "the nightly refresh would close the award on its deadline day");
  const source = readFileSync(join(ROOT, "src/lib/refresh.ts"), "utf8");
  assert.ok(
    source.includes("computeScholarshipStatus("),
    "refresh.ts stopped using the shared engine — the write-back could drift again"
  );
});

check("no timestamp comparison survives in the status engine", () => {
  const source = readFileSync(join(ROOT, "src/lib/scholarshipStatus.ts"), "utf8");
  const body = source.slice(source.indexOf("export function computeScholarshipStatus"));
  const head = body.slice(0, body.indexOf("\n}", body.indexOf("return \"unknown\"")));
  // `new Date()` is allowed exactly once — as the *default value* of the
  // injectable `now` parameter. Anywhere else it is a hidden clock.
  const bodyOnly = head.slice(head.indexOf(") {") + 2);
  assert.ok(
    !/new Date\(\)/.test(bodyOnly),
    "computeScholarshipStatus creates its own clock inside the function body"
  );
  assert.ok(/now: Date = new Date\(\)/.test(head), "the `now` parameter lost its default");
  assert.ok(
    !/\bnow\s*(<=|>=|<|>)\s*(deadline|rangeEnd|rangeStart)\b/.test(head),
    "a timestamp comparison is back — a date column is midnight UTC, so the closing day would read closed"
  );
  assert.ok(head.includes("daysUntil("), "the engine no longer compares whole days");
});

check("every consumer passes through the shared engine", () => {
  for (const file of ["src/app/api/deadlines/route.ts", "src/lib/refresh.ts", "src/app/api/scholarships/route.ts"]) {
    const source = readFileSync(join(ROOT, file), "utf8");
    assert.ok(
      source.includes("computeScholarshipStatus") || source.includes("withStatus"),
      `${file} computes a status of its own`
    );
  }
});

check("ymdOf and todayYmd are UTC and total", () => {
  assert.equal(ymdOf(new Date("2026-10-30T23:30:00.000Z")), "2026-10-30");
  assert.equal(ymdOf("2026-10-30T23:30:00.000Z"), "2026-10-30");
  assert.equal(ymdOf("not a date"), null);
  assert.equal(ymdOf(null), null);
  assert.match(todayYmd(), /^\d{4}-\d{2}-\d{2}$/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
