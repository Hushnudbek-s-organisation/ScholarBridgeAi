/**
 * Phase U gate — the public catalogue's order and its honesty about dates.
 *
 * Three things are asserted, because all three were wrong or unstated before:
 *
 *  1. THE VERDICT. `deadlineStateOf` must decide from the date, not from the
 *     stored `application_status`. A row that says "open" with a deadline that
 *     passed yesterday is *closed*; that is the bug this gate exists for.
 *
 *  2. THE ORDER. Awards still open come first (soonest deadline first), then
 *     rolling/undated, then closed (most recently closed first); ties break on
 *     `id`, the input is never mutated, and no row is lost.
 *
 *  3. THE WIRING. The public page must actually use the helper. A pure module
 *     that the page silently ignores is the failure mode of every "we fixed the
 *     ordering" commit.
 *
 * Run: npm run test:catalogue-order
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  deadlineStateOf,
  deadlineYmd,
  orderForBrowsing,
  todayYmd,
  type DeadlineFields,
} from "../src/lib/catalogueOrder";

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

const TODAY = "2026-10-30";

function row(over: Partial<DeadlineFields> & { id: number }): DeadlineFields {
  return { deadlineDate: null, deadline: null, applicationStatus: "unknown", deadlineType: "unknown", ...over };
}

console.log("\nPhase U — public catalogue order and deadline state");

/* ------------------------------------------------------------ 1. the verdict */

check("a passed date beats a stored 'open'", () => {
  const state = deadlineStateOf(row({ id: 1, deadlineDate: "2026-10-20", applicationStatus: "open" }), TODAY);
  assert.equal(state, "passed", "an award that closed ten days ago was reported as open");
});

check("the stored status still speaks before the date arrives", () => {
  assert.equal(deadlineStateOf(row({ id: 2, deadlineDate: "2026-11-15", applicationStatus: "open" }), TODAY), "open");
  assert.equal(deadlineStateOf(row({ id: 3, deadlineDate: "2026-11-15", applicationStatus: "upcoming" }), TODAY), "upcoming");
});

check("a deadline today is still open", () => {
  assert.equal(deadlineStateOf(row({ id: 4, deadlineDate: TODAY, applicationStatus: "open" }), TODAY), "open");
});

check("rolling is never 'passed', even with an old date", () => {
  assert.equal(
    deadlineStateOf(row({ id: 5, deadlineDate: "2020-01-01", deadlineType: "rolling" }), TODAY),
    "rolling"
  );
  assert.equal(
    deadlineStateOf(row({ id: 6, deadlineDate: "2020-01-01", applicationStatus: "rolling" }), TODAY),
    "rolling"
  );
});

check("no date means unknown, never a guess", () => {
  assert.equal(deadlineStateOf(row({ id: 7 }), TODAY), "unknown");
  assert.equal(deadlineStateOf(row({ id: 8, deadline: "15 October 2026" }), TODAY), "unknown");
  assert.equal(deadlineStateOf(row({ id: 9, deadline: "not a date" }), TODAY), "unknown");
});

check("deadlineYmd reads a Date, an ISO timestamp and a plain date", () => {
  assert.equal(deadlineYmd({ deadlineDate: new Date("2026-12-01T00:00:00.000Z") }), "2026-12-01");
  assert.equal(deadlineYmd({ deadlineDate: "2026-12-01T10:30:00.000Z" }), "2026-12-01");
  assert.equal(deadlineYmd({ deadlineDate: null, deadline: "2026-12-01" }), "2026-12-01");
  assert.equal(deadlineYmd({ deadlineDate: null, deadline: null }), null);
});

/* -------------------------------------------------------------- 2. the order */

check("open first, closed last, nothing lost", () => {
  const rows = [
    row({ id: 1, deadlineDate: "2026-10-01", applicationStatus: "open" }), // passed
    row({ id: 2, deadlineDate: "2026-12-01", applicationStatus: "open" }),
    row({ id: 3 }), // undated
    row({ id: 4, deadlineDate: "2026-11-01", applicationStatus: "open" }),
    row({ id: 5, deadlineType: "rolling" }), // rolling
    row({ id: 6, deadlineDate: "2026-10-25", applicationStatus: "open" }), // passed recently
  ];
  const ordered = orderForBrowsing(rows, TODAY);
  assert.deepEqual(ordered.map((r) => r.id), [4, 2, 5, 3, 6, 1]);
  assert.equal(ordered.length, rows.length, "a row was lost");
  assert.deepEqual(rows.map((r) => r.id), [1, 2, 3, 4, 5, 6], "the input array was mutated");
});

check("the order is stable when the input is shuffled", () => {
  const shuffled = [
    row({ id: 4, deadlineDate: "2026-11-01" }),
    row({ id: 2, deadlineDate: "2026-12-01" }),
    row({ id: 9, deadlineDate: "2026-11-01" }),
    row({ id: 1 }),
  ];
  const a = orderForBrowsing(shuffled, TODAY).map((r) => r.id);
  const b = orderForBrowsing([...shuffled].reverse(), TODAY).map((r) => r.id);
  assert.deepEqual(a, b, "the same rows produced two different orders");
  assert.deepEqual(a, [4, 9, 2, 1], "ties must break on id, not on arrival");
});

check("the real catalogue slice keeps every row and puts closed ones last", () => {
  const slice = JSON.parse(readFileSync(join(ROOT, "scripts/fixtures/catalogue-slice.json"), "utf8")) as {
    rows: Array<{ id: number; deadlineDate: string | null; applicationStatus?: string }>;
  };
  assert.ok(slice.rows.length >= 40, `the fixture must be the real slice (got ${slice.rows.length})`);
  const rows = slice.rows.map((r) => row({ id: r.id, deadlineDate: r.deadlineDate, applicationStatus: r.applicationStatus }));
  const ordered = orderForBrowsing(rows, "2026-10-30");
  assert.equal(ordered.length, rows.length);
  assert.deepEqual(
    [...ordered.map((r) => r.id)].sort((a, b) => a - b),
    [...rows.map((r) => r.id)].sort((a, b) => a - b),
    "ordering changed the set of rows"
  );
  const states = ordered.map((r) => deadlineStateOf(r, "2026-10-30"));
  const firstPassed = states.indexOf("passed");
  if (firstPassed >= 0) {
    assert.ok(
      states.slice(firstPassed).every((s) => s === "passed"),
      "a closed award appeared above an open one"
    );
  }
  // Everything before the first closed row is in ascending deadline order.
  const openDates = ordered
    .slice(0, firstPassed < 0 ? ordered.length : firstPassed)
    .map((r) => deadlineYmd(r))
    .filter((d): d is string => Boolean(d));
  const sortedDates = [...openDates].sort();
  assert.deepEqual(openDates, sortedDates, "open awards are not ordered by their deadline");
});

/* -------------------------------------------------------------- 3. the wiring */

check("the public page uses the helper and no longer pages by id", () => {
  const page = readFileSync(join(ROOT, "src/app/scholarships/page.tsx"), "utf8");
  assert.ok(page.includes("orderForBrowsing("), "the page does not call orderForBrowsing");
  assert.ok(page.includes("deadlineStateOf("), "the page does not ask for the deadline state");
  assert.ok(
    !/\.sort\(\(a, b\) => a\.id - b\.id\)/.test(page),
    "the insertion-order sort is back"
  );
  assert.ok(!/\.orderBy\(asc\(scholarshipsTable\.id\)\)/.test(page), "the cold-cache path still pages by id");
});

check("the card and the detail page can state a closed deadline", () => {
  const card = readFileSync(join(ROOT, "src/app/scholarships/page.tsx"), "utf8");
  const detail = readFileSync(join(ROOT, "src/app/scholarships/[id]/page.tsx"), "utf8");
  assert.ok(card.includes("copy.deadlinePassed"), "the card never renders the passed state");
  assert.ok(detail.includes("deadlineStateOf("), "the detail page does not ask for the deadline state");
  assert.ok(detail.includes("t.deadlinePassedNote"), "the detail page never explains a closed window");
  const messages = (locale: string) =>
    JSON.parse(readFileSync(join(ROOT, `src/i18n/messages/${locale}.json`), "utf8"));
  for (const locale of ["uz", "ru", "en"]) {
    const m = messages(locale);
    assert.ok(m.publicCatalog.deadlinePassed, `${locale}: publicCatalog.deadlinePassed missing`);
    assert.ok(m.publicCatalog.deadlinePassedHint, `${locale}: publicCatalog.deadlinePassedHint missing`);
    assert.ok(m.scholarshipDetail.deadlinePassedNote, `${locale}: scholarshipDetail.deadlinePassedNote missing`);
  }
});

check("todayYmd is UTC and date-shaped", () => {
  assert.equal(todayYmd(new Date("2026-10-30T23:30:00.000Z")), "2026-10-30");
  assert.match(todayYmd(), /^\d{4}-\d{2}-\d{2}$/);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
