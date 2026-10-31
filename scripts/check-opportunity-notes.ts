/**
 * Phase W gate — the opportunities feed speaks the reader's language and tells
 * the truth about dates.
 *
 * Two defects, both measured before they were fixed:
 *
 *  1. LANGUAGE. `scoreOpportunity()` has always emitted finished English
 *     sentences (`"deadline has passed"`, `"limited to Germany"`) and
 *     `OpportunitiesPanel` printed them verbatim — on an Uzbek or Russian page.
 *     Every other catalogue was made trilingual in Phase T; this one was not.
 *     The engine now emits code + parameters alongside the English strings, and
 *     the panel renders the codes.
 *
 *  2. DATES. `sort=deadline` ordered ascending, so last year's competitions sat
 *     at the top of a list a student opened to find something to enter — the
 *     same defect `/scholarships` had in Phase U — and a date-only value
 *     (midnight UTC) was compared with the wall clock, so an opportunity closed
 *     at 00:00:01 on the day it could still be entered (Phase V's rule).
 *
 * Run: npm run test:opportunity-notes
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scoreOpportunity, type OpportunityProfile } from "../src/lib/opportunities";
import {
  hasOpportunityNote,
  renderOpportunityNote,
  renderOpportunityNotes,
  type OpportunityNote,
} from "../src/lib/opportunityNotes";

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

const NOW = new Date("2026-10-30T09:00:00Z");
const profile: OpportunityProfile = { major: "Computer Science", country: "Uzbekistan", degreeLevel: "undergrad" };

/** Every note code the scorer can emit, with realistic parameters. */
const ALL_NOTES: OpportunityNote[] = [
  { kind: "reason", code: "field_all" },
  { kind: "reason", code: "field_match", params: { major: "Computer Science" } },
  { kind: "flag", code: "field_outside", params: { fields: "Biology, Chemistry" } },
  { kind: "flag", code: "field_unknown" },
  { kind: "reason", code: "country_all" },
  { kind: "reason", code: "country_home", params: { country: "Uzbekistan" } },
  { kind: "flag", code: "country_limited", params: { country: "Germany" } },
  { kind: "flag", code: "level_mismatch", params: { wanted: "grad", actual: "undergrad" } },
  { kind: "flag", code: "deadline_recurring" },
  { kind: "flag", code: "deadline_invalid" },
  { kind: "flag", code: "deadline_passed" },
  { kind: "reason", code: "deadline_set", params: { date: "2026-12-01" } },
];

console.log("\nPhase W — opportunity notes: language and dates");

/* --------------------------------------------------------------- 1. language */

check("every note the scorer emits has a uz and a ru rendering", () => {
  for (const note of ALL_NOTES) {
    for (const locale of ["uz", "ru", "en"] as const) {
      const text = renderOpportunityNote(note, locale);
      assert.ok(text.length > 0, `${note.code} rendered empty in ${locale}`);
      // A Russian string must contain Cyrillic, an Uzbek one must not be the
      // English source verbatim (marketing loanwords aside, these are sentences).
      if (locale === "ru") assert.match(text, /[\u0400-\u04FF]/, `${note.code} is not Russian: ${text}`);
      if (locale === "uz") assert.notEqual(text, renderOpportunityNote(note, "en"), `${note.code} is not Uzbek`);
    }
  }
});

check("parameters reach the sentence, in the right language", () => {
  const limited = { kind: "flag", code: "country_limited", params: { country: "Germany" } } as const;
  assert.ok(renderOpportunityNote(limited, "uz").includes("Germany"), "the country disappeared");
  assert.ok(renderOpportunityNote(limited, "ru").includes("Germany"), "the country disappeared (ru)");
  const match = { kind: "reason", code: "field_match", params: { major: "Computer Science" } } as const;
  assert.ok(renderOpportunityNote(match, "uz").includes("Computer Science"));
});

check("an unknown code renders as nothing, never as a guess", () => {
  const stranger = { kind: "flag", code: "some_future_code" } as unknown as OpportunityNote;
  assert.equal(renderOpportunityNote(stranger, "uz"), "");
});

check("the scorer's reasons and flags are derived from its notes, in order", () => {
  const scored = scoreOpportunity(
    { id: 1, type: "internship", title: "X", country: null, fields: null, level: "undergrad", deadlineDate: "2026-12-01" },
    profile,
    NOW
  );
  const reasonsFromNotes = scored.notes.filter((n) => n.kind === "reason").map((n) => renderOpportunityNote(n, "en"));
  const flagsFromNotes = scored.notes.filter((n) => n.kind === "flag").map((n) => renderOpportunityNote(n, "en"));
  assert.deepEqual(reasonsFromNotes, scored.reasons, "the English reasons no longer match their notes");
  assert.deepEqual(flagsFromNotes, scored.flags, "the English flags no longer match their notes");
});

/* ------------------------------------------------------------------ 2. dates */

check("the closing day is still open (Phase V's rule, applied here)", () => {
  const row = {
    id: 2,
    type: "competition",
    title: "Closing today",
    country: null,
    fields: null,
    level: "undergrad",
    deadlineDate: "2026-10-30",
  };
  const scored = scoreOpportunity(row, profile, NOW);
  assert.ok(
    !hasOpportunityNote(scored.notes, "deadline_passed"),
    "an opportunity closing today was reported as closed at 09:00 UTC"
  );
  assert.ok(scored.notes.some((n) => n.code === "deadline_set"), "the deadline points were not awarded");
});

check("yesterday is closed, tomorrow is open", () => {
  const base = { id: 3, type: "competition", title: "X", country: null, fields: null, level: "undergrad" };
  const past = scoreOpportunity({ ...base, deadlineDate: "2026-10-29" }, profile, NOW);
  const future = scoreOpportunity({ ...base, deadlineDate: "2026-10-31" }, profile, NOW);
  assert.ok(hasOpportunityNote(past.notes, "deadline_passed"), "yesterday was not flagged");
  assert.ok(!hasOpportunityNote(future.notes, "deadline_passed"), "tomorrow was flagged");
});

check("expired entries sort last — in both sort modes", () => {
  const route = readFileSync(join(ROOT, "src/app/api/opportunities/route.ts"), "utf8");
  const openFirstUses = route.match(/openFirst\(a, b\)/g) ?? [];
  assert.ok(openFirstUses.length >= 2, "one of the two sort modes ignores the open-first rule");
  assert.ok(route.includes("hasOpportunityNote(a.notes, \"deadline_passed\")"), "the sort does not consult the note");
  assert.ok(
    !/items\.sort\(\(a, b\) => \(a\.deadlineDate \?\? "9999"\)\.localeCompare\(b\.deadlineDate \?\? "9999"\) \|\| a\.title\.localeCompare\(b\.title\)\);/.test(route),
    "the naive deadline sort is back (it puts last year's entries on top)"
  );
});

/* ---------------------------------------------------------------- 3. the UI */

check("the panel renders the notes, not the English strings", () => {
  const panel = readFileSync(join(ROOT, "src/components/OpportunitiesPanel.tsx"), "utf8");
  assert.ok(panel.includes("renderOpportunityNotes("), "the panel still prints the raw strings");
  assert.ok(panel.includes("useLocale()"), "the panel does not know the reader's language");
  assert.ok(panel.includes('t("deadlinePassed")'), "the panel cannot label an expired entry");
  // The old direct prints must be gone from the list rendering.
  assert.ok(!/\+\s*\{r\}\s*<\/li>[\s\S]{0,200}o\.reasons\.slice/.test(panel), "reasons are still printed raw");
});

check("every locale carries the new label", () => {
  for (const locale of ["uz", "ru", "en"]) {
    const messages = JSON.parse(readFileSync(join(ROOT, `src/i18n/messages/${locale}.json`), "utf8"));
    assert.ok(messages.opportunities.deadlinePassed, `${locale}: opportunities.deadlinePassed missing`);
  }
});

check("rendering one kind never returns the other", () => {
  const reasons = renderOpportunityNotes(ALL_NOTES, "uz", "reason");
  const flags = renderOpportunityNotes(ALL_NOTES, "uz", "flag");
  assert.equal(reasons.length, ALL_NOTES.filter((n) => n.kind === "reason").length);
  assert.equal(flags.length, ALL_NOTES.filter((n) => n.kind === "flag").length);
  assert.ok(!flags.some((f) => reasons.includes(f)), "a flag leaked into the reasons");
  assert.deepEqual(renderOpportunityNotes(null, "uz", "reason"), []);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
