/**
 * Phase AB gate — the landing page never states a ranking it cannot support.
 *
 * The first screen of the product is a marquee of 24 university cards, each
 * with a blue `QS #N` badge. It is server-rendered, so those badges are what a
 * crawler and a first-time visitor read before anything else on the site.
 *
 * The numbers were hand-typed when the marquee was designed and had drifted
 * from the edition the catalogue itself was corrected to
 * (`docs/QS2026_RANK_VERIFICATION_2026-10-23.md`, source table
 * `data/qs2026_top1500.csv`). Measured 2026-10-30 against that table, 5 of the
 * 24 cards were wrong:
 *
 *   UC Berkeley   labelled #18   official 17
 *   TUM           labelled #23   official 22
 *   Univ. Sydney  labelled #26   official 25
 *   Univ. Tokyo   labelled #37   official 36
 *   KAIST & SNU   labelled #39–53 — SNU is 38, and KAIST is not in the QS 2026
 *                                  table at all (it was removed), so the range
 *                                  claimed a rank for a university the edition
 *                                  does not rank.
 *
 * The badge is now rendered from `qsRank`, a number, and this gate compares every
 * card with the official CSV. A future edit that types a rank by hand fails the
 * build instead of shipping a false claim.
 *
 * Run: npm run test:landing-ranks
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MARQUEE_ROW_1, MARQUEE_ROW_2, MARQUEE_ROW_3 } from "../src/components/LandingPage";

const ROOT = join(__dirname, "..");
let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
  }
}

/** Minimal CSV reader — the official QS 2026 table has quoted names only. */
function readOfficialTable(): Map<string, string> {
  const raw = readFileSync(join(ROOT, "data/qs2026_top1500.csv"), "utf8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(",");
  const nameIndex = header.indexOf("Name");
  const rankIndex = header.indexOf("Rank");
  assert.ok(nameIndex >= 0 && rankIndex >= 0, "the official table lost its Rank/Name columns");
  const out = new Map<string, string>();
  for (const line of lines.slice(1)) {
    // Names contain commas only inside quotes; a small state machine is enough.
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        cells.push(cell);
        cell = "";
      } else cell += char;
    }
    cells.push(cell);
    const name = (cells[nameIndex] ?? "").trim();
    const rank = (cells[rankIndex] ?? "").trim();
    if (name) out.set(name, rank);
  }
  return out;
}

const OFFICIAL = readOfficialTable();
const ROWS = [MARQUEE_ROW_1, MARQUEE_ROW_2, MARQUEE_ROW_3];
const ALL = ROWS.flat();

/* ------------------------------------------------------------ the claims */

check("every card states the official QS 2026 position", () => {
  const wrong: string[] = [];
  for (const item of ALL) {
    const official = OFFICIAL.get(item.qsName);
    if (official == null) {
      wrong.push(`${item.name}: "${item.qsName}" is not in the QS 2026 table`);
      continue;
    }
    if (official !== String(item.qsRank)) {
      wrong.push(`${item.name}: card says #${item.qsRank}, official ${official}`);
    }
  }
  assert.deepEqual(wrong, [], wrong.join("; "));
});

check("no card claims a rank for a university the edition does not rank", () => {
  // KAIST was removed from the QS 2026 table; its card was replaced by SNU's.
  assert.equal(OFFICIAL.has("KAIST"), false, "KAIST reappeared in the official table — revisit the card");
  for (const item of ALL) {
    assert.ok(OFFICIAL.has(item.qsName), `${item.name}: not in the official table`);
  }
});

check("the badge is a position, never a range", () => {
  for (const item of ALL) {
    assert.equal(typeof item.qsRank, "number", `${item.name}: the rank is not a number`);
    assert.ok(Number.isInteger(item.qsRank) && item.qsRank > 0, `${item.name}: bad rank`);
  }
});

check("the catalogue's own top-10 agrees with this table", () => {
  // MIT, Imperial, Stanford, Oxford, Harvard, Cambridge, ETH, NUS, UCL, Caltech
  const expected = [
    ["Massachusetts Institute of Technology (MIT)", 1],
    ["Imperial College London", 2],
    ["Stanford University", 3],
    ["University of Oxford", 4],
    ["Harvard University", 5],
    ["University of Cambridge", 6],
  ] as const;
  for (const [name, rank] of expected) {
    assert.equal(OFFICIAL.get(name), String(rank), `${name} moved in the official table`);
  }
});

/* -------------------------------------------------------------- the design */

check("the marquee is still three rows of eight", () => {
  assert.equal(MARQUEE_ROW_1.length, 8);
  assert.equal(MARQUEE_ROW_2.length, 8);
  assert.equal(MARQUEE_ROW_3.length, 8);
  assert.equal(ALL.length, 24);
});

check("no institution appears twice", () => {
  const names = ALL.map((item) => item.qsName);
  assert.equal(new Set(names).size, names.length);
  const urls = ALL.map((item) => item.url);
  assert.equal(new Set(urls).size, urls.length, "two cards share a photo");
});

check("rows stay in ascending order, so the marquee reads as a ranking", () => {
  for (const row of ROWS) {
    for (let i = 1; i < row.length; i++) {
      assert.ok(
        row[i].qsRank >= row[i - 1].qsRank,
        `row out of order: ${row[i - 1].name} #${row[i - 1].qsRank} then ${row[i].name} #${row[i].qsRank}`
      );
    }
  }
});

check("every card keeps its photo and landmark", () => {
  for (const item of ALL) {
    assert.match(item.url, /^https:\/\/upload\.wikimedia\.org\//, `${item.name}: photo is not a Commons URL`);
    assert.ok(item.landmark.trim().length > 0, `${item.name}: no landmark`);
    assert.ok(item.country.trim().length > 0, `${item.name}: no country`);
  }
});

/* ---------------------------------------------------------------- wiring */

check("the badge renders the number, not a stored string", () => {
  const source = readFileSync(join(ROOT, "src/components/LandingPage.tsx"), "utf8");
  assert.match(source, /\{`QS #\$\{university\.qsRank\}`\}/, "the badge still prints a hand-typed label");
  assert.doesNotMatch(source, /rank: "QS #/, "a hardcoded QS label survived in the data");
});

check("the item type cannot carry a free-form ranking string", () => {
  const source = readFileSync(join(ROOT, "src/components/LandingPage.tsx"), "utf8");
  const iface = /export interface MarqueeUniversityItem \{([\s\S]*?)\n\}/.exec(source);
  assert.ok(iface, "the marquee item type is gone");
  assert.match(iface[1], /qsRank: number;/, "the rank is not a number");
  assert.doesNotMatch(iface[1], /^\s*rank:/m, "a free-form rank field is back");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
