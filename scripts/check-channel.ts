/**
 * Channel publisher — Phase 1 checks. Deterministic, no database, no network.
 *
 * Covers:
 *   - schema drift: `CHANNEL_DDL` == `supabase/add_channel.sql`, and every
 *     column in the DDL exists in the drizzle schema
 *   - configuration: env parsing, validation, dryrun targeting
 *   - publishability: active + verified + verified ≤ 60 days, eligibility
 *   - deadline quality: exact / estimated / evergreen / unknown, including
 *     month, year and leap-day boundaries
 *   - templates: every kind × every variant × partial data — escaped, under
 *     the Telegram limit, and lint-clean (no "kafolat", no "100%", no promise,
 *     "shoshiling" only on the last day)
 *   - banks: ≥ 5 variants, unique keys, all lint-clean
 *   - poll deck: every type covered, Telegram limits respected, 28-day cooldown
 *     and type rotation
 *   - preference formula: 0.5–2.0 clamping, vote blend, weekly click blend
 *   - the daily plan: determinism, one quiet day a week, ≤ 3 messages, send
 *     windows, urgency priority, rotation, poll cadence, unique dedupe keys
 *
 * Run:  npm run test:channel
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { CHANNEL_DDL, channelStatements } from "../src/lib/channel/ddl";
import {
  channelBlockReason,
  channelConfig,
  normalizeSiteUrl,
  parseAutopost,
  targetChatId,
  validAdminChatId,
  validChannelId,
} from "../src/lib/channel/config";
import {
  CHANNEL_TZ,
  URGENCY_RUNGS,
  VERIFICATION_MAX_AGE_DAYS,
  ageInDays,
  deadlineInfo,
  eligibility,
  isFullyFunded,
  publishable,
  urgencyRung,
  type ScholarshipLike,
} from "../src/lib/channel/model";
import { buildFacts, type Facts, type FactsRow } from "../src/lib/channel/templates/facts";
import {
  CHECKLIST_BANK,
  QA_BANK,
  TEMPLATE_VARIANTS,
  TIP_BANK,
  renderChecklist,
  renderCountrySpotlight,
  renderDeadlineDigest,
  renderFullyFunded,
  renderQa,
  renderScholarshipSingle,
  renderStory,
  renderTip,
  renderUrgency,
  renderWeeklySummary,
} from "../src/lib/channel/templates/templates.uz";
import {
  POLL_COOLDOWN_DAYS,
  POLL_DECK,
  POLL_TYPES,
  pollTypeCounts,
  validatePoll,
} from "../src/lib/channel/templates/polls.uz";
import {
  countryUz,
  coverageUz,
  daysLeftUz,
  degreesUz,
  formatDateUz,
  majorsUz,
} from "../src/lib/channel/templates/format";
import { lintText, plainText, visibleLength } from "../src/lib/channel/lint";
import {
  MAX_POSTS_PER_DAY,
  buildDailyPlan,
  isQuietDay,
  planDedupeKey,
  timeWindows,
  type PlanHistoryRow,
  type PlannedItem,
} from "../src/lib/channel/plan";
import {
  choosePoll,
  daysBetween,
  isoWeekNumber,
  nextBankEntry,
  seeded,
  topicKeys,
  validPlanDate,
  weekdayOf,
  type Candidate,
} from "../src/lib/channel/select";
import {
  budgetBias,
  blendClickWeight,
  clampWeight,
  effectiveWeight,
  nextWeight,
  voteShare,
} from "../src/lib/channel/prefs";

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    failures.push(`${name} — ${detail}`);
    console.log(`  ✗ ${name}\n      ${detail}`);
  }
}

const section = (title: string) => console.log(`\n${title}`);
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SITE = "https://scholarbridge.example";
const PLAN_DATE = "2026-10-26"; // Monday, not a quiet day (ISO week 44 → quiet = Wednesday)
const NOW = new Date("2026-10-26T04:00:00Z"); // 09:00 in Asia/Tashkent

function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function row(overrides: Partial<FactsRow> = {}): FactsRow {
  return {
    id: 1,
    title: "Global Excellence Scholarship",
    provider: "Example University",
    country: "Canada",
    isActive: true,
    verificationStatus: "verified",
    lastVerifiedAt: new Date("2026-10-20T10:00:00Z"),
    deadlineDate: "2026-11-12",
    deadlineType: "exact",
    deadlineRangeStart: null,
    deadlineRangeEnd: null,
    rounds: "[]",
    recurrence: "none",
    eligibleCountries: "[]",
    awardBasis: null,
    coverageType: "Full Tuition + Stipend",
    degreeLevels: '["Bachelor\'s"]',
    eligibleMajors: '["All Majors"]',
    minGpa: 3.5,
    minIelts: 6.5,
    websiteUrl: "https://example.edu/scholarship",
    applicationUrl: null,
    ...overrides,
  };
}

function facts(overrides: Partial<FactsRow> = {}, now: Date = NOW): Facts {
  return buildFacts(row(overrides), { now, siteUrl: SITE });
}

function candidate(id: number, daysLeft: number | null, extra: Partial<FactsRow> = {}): Candidate {
  const deadlineDate = daysLeft === null ? null : addDays(PLAN_DATE, daysLeft);
  const source = row({ id, deadlineDate, deadlineType: deadlineDate ? "exact" : "rolling", ...extra });
  const f = buildFacts(source, { now: NOW, siteUrl: SITE });
  return {
    facts: f,
    topics: topicKeys({
      country: source.country,
      degreeLevels: source.degreeLevels,
      eligibleMajors: source.eligibleMajors,
      fullyFunded: isFullyFunded(source),
    }),
  };
}

const minutesOf = (time: string) => {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  assert.ok(m, `bad send_at ${time}`);
  return Number(m[1]) * 60 + Number(m[2]);
};

function assertClean(html: string, label: string, opts: { allowUrgency?: boolean } = {}) {
  const issues = lintText(html, opts);
  assert.deepEqual(issues, [], `${label}: ${issues.map((i) => `${i.code} (${i.detail})`).join(", ")}`);
  const length = visibleLength(html);
  assert.ok(length < 4096, `${label}: ${length} characters`);
  assert.ok(!/<script/i.test(html), `${label}: raw <script>`);
}

// ---------------------------------------------------------------------------
// 1. Schema
// ---------------------------------------------------------------------------

section("Schema");

check("CHANNEL_DDL and supabase/add_channel.sql are identical", () => {
  const norm = (s: string) => s.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const sql = read("supabase/add_channel.sql");
  const want = channelStatements().map(norm).filter(Boolean);
  const have = sql
    .split(";")
    .map(norm)
    .filter(Boolean);
  for (const stmt of want) assert.ok(have.includes(stmt), `missing in SQL file: ${stmt.slice(0, 70)}…`);
  assert.equal(want.length, have.length, "unexpected extra statements in supabase/add_channel.sql");
});

check("the six channel tables are declared", () => {
  const tables = ["channel_plan", "channel_posts", "channel_polls", "channel_prefs", "channel_clicks", "channel_stories"];
  for (const table of tables) {
    assert.ok(CHANNEL_DDL.includes(`CREATE TABLE IF NOT EXISTS ${table} (`), `${table} missing from DDL`);
    assert.ok(new RegExp(`pgTable\\(\\s*"${table}"`).test(read("src/db/schema.ts")), `${table} missing from drizzle schema`);
  }
});

check("every DDL column exists in the drizzle schema", () => {
  const schema = read("src/db/schema.ts");
  for (const table of ["channel_plan", "channel_posts", "channel_polls", "channel_prefs", "channel_clicks", "channel_stories"]) {
    const block = CHANNEL_DDL.slice(CHANNEL_DDL.indexOf(`CREATE TABLE IF NOT EXISTS ${table} (`));
    const body = block.slice(0, block.indexOf(");"));
    const start = schema.search(new RegExp(`pgTable\\(\\s*"${table}"`));
    assert.ok(start > 0, `${table} not in schema.ts`);
    const next = schema.indexOf("export const ", start + 10);
    const schemaBlock = schema.slice(start, next > 0 ? next : undefined);
    for (const line of body.split("\n")) {
      const match = /^\s{2}([a-z_]+)\s+(SERIAL|INTEGER|BIGINT|TEXT|BOOLEAN|DOUBLE PRECISION|TIMESTAMP|DATE)/.exec(line);
      if (!match) continue;
      const column = match[1];
      if (column === "id") continue;
      assert.ok(schemaBlock.includes(`"${column}"`), `${table}.${column} missing from schema.ts`);
    }
  }
});

check("the identity of a post is unique and dedupe_key is NOT NULL", () => {
  assert.ok(/dedupe_key TEXT NOT NULL UNIQUE/.test(CHANNEL_DDL), "dedupe_key must be NOT NULL UNIQUE");
  assert.ok(CHANNEL_DDL.includes("UNIQUE (kind, scholarship_id, rung, plan_date, slot)"), "identity constraint missing");
});

// ---------------------------------------------------------------------------
// 2. Configuration
// ---------------------------------------------------------------------------

section("Configuration");

check("CHANNEL_AUTOPOST defaults to off and rejects anything unrecognised", () => {
  assert.equal(parseAutopost(undefined), "off");
  assert.equal(parseAutopost(""), "off");
  assert.equal(parseAutopost("ON"), "on"); // case does not matter…
  assert.equal(parseAutopost("onn"), "off"); // …but a typo never enables posting
  assert.equal(parseAutopost("true"), "off");
  assert.equal(parseAutopost("dryrun"), "dryrun");
  assert.equal(parseAutopost(" on "), "on");
});

check("a half-configured deployment stays silent", () => {
  const off = channelConfig({});
  assert.equal(off.mode, "off");
  assert.match(channelBlockReason(off) ?? "", /off/);

  const noChannel = channelConfig({ CHANNEL_AUTOPOST: "on", TELEGRAM_ADMIN_CHAT_ID: "123456789", CHANNEL_SITE_URL: SITE });
  assert.match(channelBlockReason(noChannel) ?? "", /TELEGRAM_CHANNEL_ID/);

  const noAdmin = channelConfig({ CHANNEL_AUTOPOST: "on", TELEGRAM_CHANNEL_ID: "-1001234567890", CHANNEL_SITE_URL: SITE });
  assert.match(channelBlockReason(noAdmin) ?? "", /TELEGRAM_ADMIN_CHAT_ID/);

  const noSite = channelConfig({ CHANNEL_AUTOPOST: "on", TELEGRAM_CHANNEL_ID: "-1001234567890", TELEGRAM_ADMIN_CHAT_ID: "123456789" });
  assert.match(channelBlockReason(noSite) ?? "", /CHANNEL_SITE_URL/);

  const ready = channelConfig({
    CHANNEL_AUTOPOST: "on",
    TELEGRAM_CHANNEL_ID: "-1001234567890",
    TELEGRAM_ADMIN_CHAT_ID: "123456789",
    CHANNEL_SITE_URL: SITE,
  });
  assert.equal(channelBlockReason(ready), null);
  assert.equal(targetChatId(ready), "-1001234567890");
});

check("dryrun always targets the admin chat, never the channel", () => {
  const dry = channelConfig({
    CHANNEL_AUTOPOST: "dryrun",
    TELEGRAM_CHANNEL_ID: "-1001234567890",
    TELEGRAM_ADMIN_CHAT_ID: "123456789",
    CHANNEL_SITE_URL: SITE,
  });
  assert.equal(dry.mode, "dryrun");
  assert.equal(targetChatId(dry), "123456789");
  assert.equal(channelBlockReason(dry), null);
});

check("ids and site URLs are validated", () => {
  assert.equal(validChannelId("-1001234567890"), true);
  assert.equal(validChannelId("@scholar_bridge"), true);
  assert.equal(validChannelId("1234"), false);
  assert.equal(validChannelId("my channel"), false);
  assert.equal(validAdminChatId("123456789"), true);
  assert.equal(validAdminChatId("@someone"), false);
  assert.equal(normalizeSiteUrl("https://example.com/"), "https://example.com");
  assert.equal(normalizeSiteUrl("ftp://example.com"), "");
  assert.equal(normalizeSiteUrl("not a url"), "");
});

check("discussion flag is opt-in", () => {
  assert.equal(channelConfig({}).discussionEnabled, false);
  assert.equal(channelConfig({ CHANNEL_DISCUSSION_ENABLED: "1" }).discussionEnabled, true);
});

// ---------------------------------------------------------------------------
// 3. Publishability
// ---------------------------------------------------------------------------

section("Publishability");

check("a fresh verified row is publishable", () => {
  assert.deepEqual(publishable(row(), NOW), { ok: true, reason: null });
  assert.equal(VERIFICATION_MAX_AGE_DAYS, 60);
});

check("inactive, unverified, stale and incomplete rows are rejected", () => {
  assert.equal(publishable(row({ isActive: false }), NOW).reason, "inactive");
  assert.equal(publishable(row({ verificationStatus: "unverified" }), NOW).reason, "unverified");
  assert.equal(publishable(row({ lastVerifiedAt: null }), NOW).reason, "never_verified");
  assert.equal(publishable(row({ lastVerifiedAt: new Date("2026-08-01T10:00:00Z") }), NOW).reason, "verification_stale");
  assert.equal(publishable(row({ lastVerifiedAt: new Date("2026-11-30T10:00:00Z") }), NOW).reason, "verified_in_the_future");
  assert.equal(publishable(row({ title: "   " }), NOW).reason, "incomplete");
  assert.equal(publishable(row({ deadlineDate: null, deadlineType: "unknown" }), NOW).reason, "no_reliable_deadline");
});

check("exactly 60 days of verification is allowed, 61 is not", () => {
  const exactly = new Date("2026-08-27T04:00:00Z"); // 60 calendar days before 2026-10-26
  assert.equal(ageInDays(exactly, NOW), 60);
  assert.equal(publishable(row({ lastVerifiedAt: exactly }), NOW).ok, true);
  const stale = new Date("2026-08-26T04:00:00Z");
  assert.equal(ageInDays(stale, NOW), 61);
  assert.equal(publishable(row({ lastVerifiedAt: stale }), NOW).ok, false);
});

check("verification age is counted on the Tashkent calendar", () => {
  // 2026-12-31 20:00 UTC is already 2027-01-01 in Tashkent.
  const ts = new Date("2026-12-31T20:00:00Z");
  assert.equal(CHANNEL_TZ, "Asia/Tashkent");
  assert.equal(ageInDays(ts, new Date("2027-01-05T04:00:00Z")), 4);
});

check("eligibility is three-state and never assumed", () => {
  assert.equal(eligibility({ eligibleCountries: "[]" }), "open");
  assert.equal(eligibility({ eligibleCountries: null }), "open");
  assert.equal(eligibility({ eligibleCountries: '["Uzbekistan","Kazakhstan"]' }), "uz_eligible");
  assert.equal(eligibility({ eligibleCountries: '["O\'zbekiston"]' }), "uz_eligible");
  assert.equal(eligibility({ eligibleCountries: '["Kenya"]' }), "not_eligible");
  assert.equal(publishable(row({ eligibleCountries: '["Kenya"]' }), NOW).reason, "not_open_to_uzbekistan");
});

check("fully funded only comes from an explicit full-coverage statement", () => {
  assert.equal(isFullyFunded(row({ awardBasis: "full_tuition", coverageType: "Unspecified" })), true);
  assert.equal(isFullyFunded(row({ awardBasis: null, coverageType: "Full Funding" })), true);
  assert.equal(isFullyFunded(row({ awardBasis: null, coverageType: "full tuition + stipend" })), true);
  assert.equal(isFullyFunded(row({ awardBasis: null, coverageType: "Partial Tuition" })), false);
  assert.equal(isFullyFunded(row({ awardBasis: null, coverageType: "Unspecified" })), false);
  assert.equal(isFullyFunded(row({ awardBasis: "need_based", coverageType: "Full Funding" })), false);
  assert.equal(isFullyFunded(row({ verificationStatus: "unverified", coverageType: "Full Funding" })), false);
});

// ---------------------------------------------------------------------------
// 4. Deadlines
// ---------------------------------------------------------------------------

section("Deadlines and urgency");

check("deadline quality follows the typed columns, never the free-text field", () => {
  assert.equal(deadlineInfo(row(), NOW).quality, "exact");
  assert.equal(deadlineInfo(row({ deadlineType: "rolling", deadlineDate: null }), NOW).quality, "evergreen");
  assert.equal(deadlineInfo(row({ deadlineDate: null, deadlineType: "not_announced" }), NOW).quality, "estimated");
  assert.equal(deadlineInfo(row({ deadlineDate: null, deadlineType: "unknown" }), NOW).quality, "unknown");
  const expired = deadlineInfo(row({ deadlineDate: "2026-01-01" }), NOW);
  assert.equal(expired.quality, "unknown");
  assert.equal(expired.daysLeft, null);
  const range = deadlineInfo(row({ deadlineDate: null, deadlineRangeStart: "2026-11-01", deadlineRangeEnd: "2026-11-20", deadlineType: "range" }), NOW);
  assert.equal(range.quality, "estimated");
  assert.equal(range.daysLeft, 25);
});

check("a passed exact deadline with a future round is still exact", () => {
  const info = deadlineInfo(
    row({
      deadlineDate: "2026-01-01",
      deadlineType: "multiple_rounds",
      rounds: JSON.stringify([{ deadline: "2026-01-01" }, { deadline: "2026-12-01" }]),
    }),
    NOW
  );
  assert.equal(info.quality, "exact");
  assert.equal(info.date, "2026-12-01");
  assert.equal(info.daysLeft, 36);
});

check("urgency rungs use the real number of days left", () => {
  const rungFor = (daysLeft: number) => urgencyRung(deadlineInfo(row({ deadlineDate: addDays(PLAN_DATE, daysLeft) }), NOW));
  assert.equal(rungFor(40), null);
  assert.equal(rungFor(30), 30);
  assert.equal(rungFor(17), 30);
  assert.equal(rungFor(14), 14);
  assert.equal(rungFor(10), 14);
  assert.equal(rungFor(5), 7);
  assert.equal(rungFor(2), 3);
  assert.equal(rungFor(1), 1);
  assert.equal(rungFor(0), 0);
  assert.deepEqual([...URGENCY_RUNGS], [30, 14, 7, 3, 1, 0]);
});

check("urgency is null for estimated and evergreen deadlines", () => {
  assert.equal(urgencyRung(deadlineInfo(row({ deadlineDate: null, deadlineType: "not_announced" }), NOW)), null);
  assert.equal(urgencyRung(deadlineInfo(row({ deadlineType: "rolling", deadlineDate: null }), NOW)), null);
});

check("day counts cross month, year and leap boundaries", () => {
  const at = (nowIso: string) => new Date(nowIso);
  const days = (deadline: string, nowIso: string) =>
    deadlineInfo(row({ deadlineDate: deadline }), at(nowIso)).daysLeft;
  assert.equal(days("2027-01-03", "2026-12-31T04:00:00Z"), 3);
  assert.equal(days("2027-01-01", "2026-12-31T04:00:00Z"), 1);
  assert.equal(days("2026-11-02", "2026-10-31T04:00:00Z"), 2);
  assert.equal(days("2028-03-01", "2028-02-28T04:00:00Z"), 2); // leap year
  assert.equal(days("2027-03-01", "2027-02-28T04:00:00Z"), 1); // non-leap
  // 01:00 on 1 Jan in Tashkent (20:00 UTC on 31 Dec) → two days to 3 Jan.
  assert.equal(days("2027-01-03", "2026-12-31T20:00:00Z"), 2);
});

// ---------------------------------------------------------------------------
// 5. Formatting
// ---------------------------------------------------------------------------

section("Formatting");

check("Uzbek dates and countdowns", () => {
  assert.equal(formatDateUz("2026-11-12"), "12-noyabr 2026");
  assert.equal(formatDateUz("2027-01-03"), "3-yanvar 2027");
  assert.equal(formatDateUz("nonsense"), null);
  assert.equal(daysLeftUz(0), "bugun oxirgi kun");
  assert.equal(daysLeftUz(1), "ertaga oxirgi kun");
  assert.equal(daysLeftUz(12), "12 kun qoldi");
  assert.equal(daysLeftUz(-1), null);
});

check("only known coverage, degree and country labels are translated", () => {
  assert.equal(coverageUz("Full Tuition + Stipend"), "to'liq kontrakt va stipendiya");
  assert.equal(coverageUz("Partial Funding"), "qisman moliyalashtirish");
  assert.equal(coverageUz("Unspecified"), null);
  assert.equal(coverageUz("Something New"), null);
  assert.equal(degreesUz('["Bachelor\'s"]'), "bakalavr");
  assert.equal(degreesUz('["Master\'s","PhD"]'), "magistratura, doktorantura (PhD)");
  assert.equal(degreesUz('["Diploma"]'), null);
  assert.equal(majorsUz('["All Majors"]'), "barcha yo'nalishlar");
  assert.equal(majorsUz('["Mathematics","Physics"]'), "Mathematics, Physics");
  assert.equal(majorsUz("[]"), null);
  assert.equal(countryUz("United States"), "AQSh");
  assert.equal(countryUz("Canada"), "Kanada");
  assert.equal(countryUz("Wakanda"), "Wakanda"); // stored value, never transliterated
});

// ---------------------------------------------------------------------------
// 6. Templates
// ---------------------------------------------------------------------------

section("Templates");

const FULL = facts();
const MINIMAL = facts({ deadlineDate: null, deadlineType: "rolling", coverageType: "Unspecified", degreeLevels: "[]", eligibleMajors: "[]", minGpa: null, minIelts: null, country: "" });
const ESTIMATED = facts({ deadlineDate: null, deadlineType: "not_announced", awardBasis: null, coverageType: "Partial Tuition" });
const EVIL = facts({ title: '<script>alert("x")</script> & co', provider: "A & B <b>", country: "Côte d'Ivoire" });
const LONG = facts({ title: "A very long scholarship title ".repeat(8) });
const NO_SITE = buildFacts(row(), { now: NOW, siteUrl: "" });

const FACT_SETS: [string, Facts][] = [
  ["full", FULL],
  ["minimal", MINIMAL],
  ["estimated", ESTIMATED],
  ["hostile data", EVIL],
  ["very long title", LONG],
  ["no site url", NO_SITE],
];

check("every scholarship template variant renders clean for every data shape", () => {
  for (const [label, f] of FACT_SETS) {
    for (let v = 0; v < TEMPLATE_VARIANTS.scholarship_single; v++) {
      const out = renderScholarshipSingle(f, v);
      assert.ok(out, `${label}: single v${v} did not render`);
      assertClean(out.html, `${label}: single ${out.key}`);
    }
    for (let v = 0; v < TEMPLATE_VARIANTS.fully_funded; v++) {
      const out = renderFullyFunded(f, v);
      if (f.fullyFunded) {
        assert.ok(out, `${label}: fully_funded v${v} did not render`);
        assertClean(out.html, `${label}: ${out.key}`);
      } else {
        assert.equal(out, null, `${label}: fully_funded must be silent for a partial award`);
      }
    }
    for (let v = 0; v < TEMPLATE_VARIANTS.urgency; v++) {
      const daysLeft = f.deadline.daysLeft;
      const out = renderUrgency(f, 30, v);
      if (f.deadline.quality === "exact" && daysLeft !== null && daysLeft <= 30) {
        assert.ok(out, `${label}: urgency v${v} did not render`);
        assertClean(out.html, `${label}: ${out.key}`, { allowUrgency: daysLeft <= 1 });
      } else {
        assert.equal(out, null, `${label}: urgency must not render without an exact deadline`);
      }
    }
  }
});

check("digest, spotlight, weekly, story and Q&A variants render clean", () => {
  const items = [FULL, facts({ id: 2, title: "Second award", deadlineDate: "2026-11-02" }), facts({ id: 3, title: "Third award", deadlineDate: "2026-11-20" })];
  for (let v = 0; v < TEMPLATE_VARIANTS.deadline_digest; v++) {
    const out = renderDeadlineDigest(items, v, { siteUrl: SITE });
    assert.ok(out, `digest v${v} did not render`);
    assertClean(out.html, `digest ${out.key}`);
  }
  assert.equal(renderDeadlineDigest([items[0]], 0, { siteUrl: SITE }), null, "a digest needs at least two dated awards");

  for (let v = 0; v < TEMPLATE_VARIANTS.country_spotlight; v++) {
    const out = renderCountrySpotlight("Kanada", items, v, { siteUrl: SITE });
    assert.ok(out, `spotlight v${v} did not render`);
    assertClean(out.html, `spotlight ${out.key}`);
  }
  assert.equal(renderCountrySpotlight("Kanada", [items[0]], 0, { siteUrl: SITE }), null, "a spotlight needs at least two awards");

  const stats = { published: 9, closingSoon: 4, newThisWeek: 12, top: { title: "Sample <b>", daysLeft: 3 } };
  for (let v = 0; v < TEMPLATE_VARIANTS.weekly_summary; v++) {
    const out = renderWeeklySummary(stats, v, { siteUrl: SITE });
    assert.ok(out, `weekly v${v} did not render`);
    assertClean(out.html, `weekly ${out.key}`);
  }
  assert.equal(renderWeeklySummary({ published: null, closingSoon: null, newThisWeek: null, top: null }, 0, { siteUrl: SITE }), null, "a recap without numbers must not render");

  for (let v = 0; v < TEMPLATE_VARIANTS.story; v++) {
    const out = renderStory({ title: "Tajriba <yo'li>", body: "Men hujjatlarni erta tayyorladim.", authorLabel: "Aziza" }, v);
    assert.ok(out, `story v${v} did not render`);
    assertClean(out.html, `story ${out.key}`);
  }
  assert.equal(renderStory({ title: "Bo'sh", body: "   " }, 0), null, "an empty story must not render");

  for (const entry of QA_BANK) {
    for (let v = 0; v < 3; v++) {
      const out = renderQa(entry, v, { siteUrl: SITE, discussionUrl: null });
      assert.ok(out, `qa ${entry.key} v${v} did not render`);
      assertClean(out.html, `qa ${entry.key} v${v}`);
    }
    const withDiscussion = renderQa(entry, 0, { siteUrl: SITE, discussionUrl: "https://t.me/c/123" });
    assert.ok(withDiscussion && /izohlarda/.test(plainText(withDiscussion.html)), "the comment CTA belongs only to the discussion variant");
    assert.ok(!/izohlarda/.test(plainText(entry.answer)), "bank copy must not claim comments exist");
  }
});

check("missing data drops the line instead of printing a placeholder", () => {
  const minimal = renderScholarshipSingle(MINIMAL, 0);
  assert.ok(minimal);
  const text = plainText(minimal.html);
  assert.ok(!/Muddat:/.test(text) || /doimiy qabul/i.test(text), "rolling shows evergreen wording");
  assert.ok(!/Kim uchun/.test(text), "no audience line without degree/major data");
  assert.ok(!/Minimal talab/.test(text), "no requirements line without GPA/IELTS");
  assert.ok(!/O'zbekistonliklar uchun/.test(text), "never claims UZ eligibility when the list is empty");
  const noSite = renderScholarshipSingle(NO_SITE, 0);
  assert.ok(noSite);
  assert.ok(!noSite.html.includes(SITE), "no link to our site without a configured URL");
  assert.ok(noSite.html.includes("example.edu"), "the provider's own official link is data and stays");
});

check("estimated deadlines say taxminan and never pretend to be exact", () => {
  const out = renderScholarshipSingle(ESTIMATED, 0);
  assert.ok(out);
  const text = plainText(out.html);
  assert.match(text, /taxminan/i);
  assert.ok(!/kun qoldi/.test(text), "no countdown for an estimated deadline");
});

check("data is escaped", () => {
  const out = renderScholarshipSingle(EVIL, 0);
  assert.ok(out);
  assert.ok(!/<script/i.test(out.html));
  assert.ok(out.html.includes("&lt;script&gt;"));
  assert.ok(out.html.includes("A &amp; B"));
  assertClean(out.html, "hostile data");
});

check('"shoshiling" appears only in the last-day urgency post', () => {
  const lastDay = facts({ deadlineDate: planDayPlus(0) });
  const threeDays = facts({ deadlineDate: planDayPlus(3) });
  let lastDayHasIt = false;
  for (let v = 0; v < TEMPLATE_VARIANTS.urgency; v++) {
    const urgent = renderUrgency(lastDay, 3, v);
    assert.ok(urgent);
    if (/shoshiling/i.test(plainText(urgent.html))) lastDayHasIt = true;
    const soon = renderUrgency(threeDays, 3, v);
    assert.ok(soon);
    assert.ok(!/shoshiling/i.test(plainText(soon.html)), `urgency v${v} must not hurry the reader at 3 days`);
  }
  assert.ok(lastDayHasIt, "the last-day post uses the one allowed urgency phrase");
});

check("urgency refuses deadlines beyond its rung", () => {
  const in17 = facts({ deadlineDate: planDayPlus(17) });
  assert.ok(renderUrgency(in17, 30, 0), "17 days fits the 30-day rung");
  assert.equal(renderUrgency(in17, 7, 0), null, "17 days must not use the 7-day rung");
});

function planDayPlus(days: number): string {
  return addDays(PLAN_DATE, days);
}

// ---------------------------------------------------------------------------
// 7. Lint
// ---------------------------------------------------------------------------

section("Lint");

check("forbidden wording is caught", () => {
  const cases: [string, string][] = [
    ["<b>Kafolat beramiz</b>", "forbidden_guarantee"],
    ["100% natija", "forbidden_hundred_percent"],
    ["Albatta olasiz", "forbidden_sure_admission"],
    ["Hech qanday talab yo'q", "forbidden_no_requirements"],
    ["Grantni utasiz", "forbidden_win_promise"],
    ["Siz qabul qilinasiz", "forbidden_admitted_promise"],
    ["Shoshiling, muddat tugadi", "forbidden_hurry"],
  ];
  for (const [text, code] of cases) {
    const issues = lintText(text);
    assert.ok(issues.some((i) => i.code === code), `${text} → ${issues.map((i) => i.code).join(",") || "clean"}`);
  }
  assert.deepEqual(lintText("Shoshiling!", { allowUrgency: true }), []);
});

check("structural problems are caught", () => {
  assert.ok(lintText("<b>unclosed").some((i) => i.code === "tag_unclosed"));
  assert.ok(lintText("<i>x</b>").some((i) => i.code === "tag_mismatch"));
  assert.ok(lintText("<script>alert(1)</script>").some((i) => i.code === "tag_not_allowed"));
  assert.ok(lintText("narx < 100").some((i) => i.code === "unescaped_lt"));
  assert.ok(lintText("qiymat: undefined").some((i) => i.code === "placeholder_value"));
  assert.ok(lintText("Salom {name}").some((i) => i.code === "unfilled_template"));
  assert.ok(lintText("").some((i) => i.code === "empty"));
  assert.ok(lintText("a".repeat(4200)).some((i) => i.code === "too_long"));
});

// ---------------------------------------------------------------------------
// 8. Banks
// ---------------------------------------------------------------------------

section("Banks");

check("tip and checklist banks have at least five unique entries", () => {
  assert.ok(TIP_BANK.length >= 5, `tips: ${TIP_BANK.length}`);
  assert.ok(CHECKLIST_BANK.length >= 5, `checklists: ${CHECKLIST_BANK.length}`);
  assert.ok(QA_BANK.length >= 5, `qa: ${QA_BANK.length}`);
  for (const bank of [TIP_BANK, CHECKLIST_BANK, QA_BANK]) {
    assert.equal(new Set(bank.map((e) => e.key)).size, bank.length, "duplicate bank keys");
  }
});

check("every bank entry renders and passes lint", () => {
  for (const entry of TIP_BANK) {
    const out = renderTip(entry, { siteUrl: SITE });
    assert.ok(out);
    assertClean(out.html, `tip ${entry.key}`);
  }
  for (const entry of CHECKLIST_BANK) {
    const out = renderChecklist(entry, { siteUrl: SITE });
    assert.ok(out);
    assertClean(out.html, `checklist ${entry.key}`);
    assert.ok(out.html.includes("☐ "), "checklist items are tickable");
  }
});

check("bank rotation prefers the longest-unused entry", () => {
  const history = TIP_BANK.slice(0, 4).map((entry, index) => ({ templateKey: entry.key, planDate: addDays(PLAN_DATE, index - 4) }));
  const next = nextBankEntry(TIP_BANK, history, PLAN_DATE, 21);
  assert.ok(next);
  assert.ok(!history.some((h) => h.templateKey === next.key), "the next tip must be unused inside the window");
  // Nothing used yet → the first entry wins.
  assert.equal(nextBankEntry(TIP_BANK, [], PLAN_DATE, 21)?.key, TIP_BANK[0].key);
});

// ---------------------------------------------------------------------------
// 9. Poll deck
// ---------------------------------------------------------------------------

section("Poll deck");

check("every poll type has entries and every poll respects Telegram limits", () => {
  const counts = pollTypeCounts();
  for (const type of POLL_TYPES) {
    assert.ok(counts[type] >= 2, `${type} has only ${counts[type]} polls`);
    assert.ok(POLL_DECK.some((p) => p.type === type), `${type} missing from the deck`);
  }
  assert.ok(POLL_DECK.length >= 16, `deck size ${POLL_DECK.length}`);
  assert.equal(new Set(POLL_DECK.map((p) => p.key)).size, POLL_DECK.length, "duplicate poll keys");
  for (const poll of POLL_DECK) {
    assert.deepEqual(validatePoll(poll), [], `${poll.key}: ${validatePoll(poll).join(", ")}`);
  }
});

check("quizzes carry a correct answer that points at a real option", () => {
  for (const poll of POLL_DECK.filter((p) => p.type === "quiz_data")) {
    assert.equal(typeof poll.correctIndex, "number");
    const option = poll.options[poll.correctIndex as number];
    assert.ok(option, `${poll.key}: correctIndex out of range`);
    assert.ok(validatePoll(poll).length === 0);
  }
});

check("poll cooldown and type rotation", () => {
  const first = choosePoll([], PLAN_DATE);
  assert.ok(first);
  assert.equal(choosePoll([{ key: first.key, type: first.type, planDate: addDays(PLAN_DATE, -1) }], PLAN_DATE)?.key === first.key, false, "a poll used yesterday is on cooldown");
  assert.equal(choosePoll([{ key: first.key, type: first.type, planDate: addDays(PLAN_DATE, -(POLL_COOLDOWN_DAYS - 1)) }], PLAN_DATE)?.key === first.key, false);
  const afterCooldown = choosePoll([{ key: first.key, type: first.type, planDate: addDays(PLAN_DATE, -POLL_COOLDOWN_DAYS) }], PLAN_DATE);
  assert.ok(afterCooldown);
  // Filling the cooldown with one type pushes the chooser to another type.
  const prefHistory = POLL_DECK.filter((p) => p.type === "pref").map((p) => ({ key: p.key, type: p.type, planDate: addDays(PLAN_DATE, -1) }));
  const next = choosePoll(prefHistory, PLAN_DATE);
  assert.ok(next);
  assert.notEqual(next.type, "pref", "the next poll should come from a different type");
});

// ---------------------------------------------------------------------------
// 10. Preferences
// ---------------------------------------------------------------------------

section("Preferences");

check("weights clamp to 0.5–2.0", () => {
  assert.equal(clampWeight(0), 0.5);
  assert.equal(clampWeight(9), 2);
  assert.equal(clampWeight(1.25), 1.25);
  assert.equal(clampWeight(Number.NaN), 1);
});

check("the vote formula matches the spec and cannot run away", () => {
  assert.equal(voteShare(3, 4), 0.75);
  assert.equal(voteShare(1, 0), 0);
  // 0.7 × 1 + 0.3 × (1 × 4) = 1.9
  assert.equal(Number(nextWeight(1, 1, 4).toFixed(4)), 1.9);
  // 0.7 × 1 + 0.3 × 0 = 0.7
  assert.equal(Number(nextWeight(1, 0, 4).toFixed(4)), 0.7);
  let w = 1;
  for (let i = 0; i < 25; i++) w = nextWeight(w, 1, 5);
  assert.equal(w, 2);
  let low = 1;
  for (let i = 0; i < 25; i++) low = nextWeight(low, 0, 5);
  assert.equal(low, 0.5);
});

check("weekly clicks blend in gently and budget bias stays in range", () => {
  assert.equal(Number(blendClickWeight(1, 1).toFixed(4)), 1);
  assert.equal(Number(blendClickWeight(1, 2).toFixed(4)), 1.2);
  assert.equal(Number(blendClickWeight(2, 2).toFixed(4)), 2);
  assert.equal(budgetBias(0), 0.8);
  assert.equal(budgetBias(1), 1.4);
  assert.equal(budgetBias(0.5), 1.1);
});

check("effective weight takes the best matching topic", () => {
  assert.equal(effectiveWeight(["country:canada", "degree:master"], { "degree:master": 1.5 }, 1), 1.5);
  assert.equal(effectiveWeight([], {}, 1), 1);
  assert.equal(effectiveWeight(["country:canada"], { "country:canada": 2 }, 2), 2, "already at the ceiling");
});

check("topic keys describe the row without guessing", () => {
  const topics = topicKeys({
    country: "Canada",
    degreeLevels: '["Master\'s"]',
    eligibleMajors: '["Computer Science"]',
    fullyFunded: true,
  });
  assert.ok(topics.includes("country:canada"));
  assert.ok(topics.includes("degree:master"));
  assert.ok(topics.includes("field:engineering"));
  assert.ok(topics.includes("funding:full"));
  assert.deepEqual(
    topicKeys({ country: "Global", degreeLevels: "[]", eligibleMajors: '["All Majors"]', fullyFunded: false }),
    []
  );
});

// ---------------------------------------------------------------------------
// 11. The daily plan
// ---------------------------------------------------------------------------

section("Daily plan");

check("plan dates, weekdays and quiet days", () => {
  assert.equal(validPlanDate(PLAN_DATE), true);
  assert.equal(validPlanDate("2026-02-30"), false);
  assert.equal(weekdayOf(PLAN_DATE), 0, "2026-10-26 is a Monday");
  assert.equal(isoWeekNumber(PLAN_DATE), 44);
  assert.equal(isQuietDay(PLAN_DATE), false);
  assert.equal(isQuietDay("2026-10-28"), true, "week 44 % 7 = Wednesday");
  // Every ISO week has exactly one quiet day.
  for (const start of ["2026-10-26", "2026-11-02", "2026-12-28", "2027-01-04"]) {
    const quiet = [0, 1, 2, 3, 4, 5, 6].filter((offset) => isQuietDay(addDays(start, offset)));
    assert.equal(quiet.length, 1, `week starting ${start} has ${quiet.length} quiet days`);
  }
});

check("the same inputs always produce the same plan", () => {
  const input = { planDate: PLAN_DATE, candidates: [candidate(1, 20), candidate(2, 2), candidate(3, 60)], history: [], prefs: {} };
  assert.deepEqual(buildDailyPlan(input), buildDailyPlan(input));
});

check("a quiet day plans nothing at all", () => {
  const plan = buildDailyPlan({ planDate: "2026-10-28", candidates: [candidate(1, 2)], history: [], prefs: {} });
  assert.deepEqual(plan, []);
});

check("no more than three messages, all inside the two windows, in order", () => {
  const input = { planDate: PLAN_DATE, candidates: [candidate(1, 2), candidate(2, 40), candidate(3, 80)], history: [], prefs: {} };
  const plan = buildDailyPlan(input);
  assert.ok(plan.length >= 1 && plan.length <= MAX_POSTS_PER_DAY, `${plan.length} messages`);
  let previous = -1;
  for (const item of plan) {
    const minutes = minutesOf(item.sendAt);
    const morning = minutes >= 9 * 60 && minutes <= 11 * 60;
    const evening = minutes >= 18 * 60 + 30 && minutes <= 21 * 60;
    assert.ok(morning || evening, `${item.sendAt} outside 09:00–11:00 / 18:30–21:00`);
    assert.ok(minutes > previous, "send times must increase");
    previous = minutes;
  }
  assert.deepEqual(
    timeWindows(3).map((w) => [w.start, w.span]),
    [
      [9 * 60, 120],
      [18 * 60 + 30, 75],
      [18 * 60 + 30 + 75, 75],
    ]
  );
});

check("every planned item has a unique, stable dedupe key", () => {
  const plan = buildDailyPlan({ planDate: PLAN_DATE, candidates: [candidate(1, 2), candidate(2, 40), candidate(3, 80)], history: [], prefs: {} });
  const keys = plan.map((item) => planDedupeKey(item, PLAN_DATE, item.slot));
  assert.equal(new Set(keys).size, keys.length, "duplicate dedupe keys in one plan");
  assert.equal(keys[0], `${plan[0].kind}|${plan[0].scholarshipId ?? "-"}|${plan[0].rung ?? "-"}|${PLAN_DATE}|0`);
  assert.deepEqual(buildDailyPlan({ planDate: PLAN_DATE, candidates: [candidate(1, 2)], history: [], prefs: {} }).map((i) => planDedupeKey(i, PLAN_DATE, i.slot)), buildDailyPlan({ planDate: PLAN_DATE, candidates: [candidate(1, 2)], history: [], prefs: {} }).map((i) => planDedupeKey(i, PLAN_DATE, i.slot)));
});

check("an imminent deadline always wins the first slot", () => {
  const plan = buildDailyPlan({ planDate: PLAN_DATE, candidates: [candidate(1, 2), candidate(2, 45), candidate(3, 70)], history: [], prefs: {} });
  assert.equal(plan[0].kind, "urgency");
  assert.equal(plan[0].scholarshipId, 1);
  assert.equal(plan[0].rung, 3);
  assert.equal(plan[0].payload.daysLeft, 2);
  // A 3-day deadline beats a 45-day favourite.
  const preferred = buildDailyPlan({
    planDate: PLAN_DATE,
    candidates: [candidate(1, 2), candidate(2, 45)],
    history: [],
    prefs: { "country:canada": 2 },
  });
  assert.equal(preferred[0].scholarshipId, 1);
});

check("a scholarship on cooldown is not planned again", () => {
  const history: PlanHistoryRow[] = [
    { planDate: addDays(PLAN_DATE, -5), kind: "scholarship_single", scholarshipId: 1, templateKey: "single_v1" },
  ];
  const plan = buildDailyPlan({ planDate: PLAN_DATE, candidates: [candidate(1, 60)], history, prefs: {} });
  assert.ok(plan.every((item) => item.scholarshipId !== 1 || item.kind !== "scholarship_single"), "repeats inside 30 days");
});

check("the plan rotates through the whole kind repertoire over two weeks", () => {
  const candidates = [
    candidate(1, 2),
    candidate(2, 5),
    candidate(3, 45, { title: "Full funding award", coverageType: "Full Funding" }),
    candidate(4, 50, { title: "Full funding award two", coverageType: "Full Tuition" }),
    candidate(5, 12, { title: "Germany award", country: "Germany" }),
    candidate(6, 18, { title: "Germany award two", country: "Germany" }),
    candidate(7, 25, { title: "Germany award three", country: "Germany" }),
  ];
  const stories = [{ id: 1, title: "Tajriba", body: "Men hujjatlarni erta tayyorladim." }];
  const seen = new Set<string>();
  const history: PlanHistoryRow[] = [];
  for (let day = 0; day < 21; day++) {
    const planDate = addDays(PLAN_DATE, day);
    const plan = buildDailyPlan({ planDate, candidates, history, prefs: {}, stories, discussionEnabled: true });
    assert.ok(plan.length <= MAX_POSTS_PER_DAY);
    for (const item of plan) {
      seen.add(item.kind);
      history.push({
        planDate,
        kind: item.kind,
        scholarshipId: item.scholarshipId,
        templateKey: item.templateKey,
        topic: item.topic,
        pollType: item.pollType,
        pollKey: typeof item.payload.pollKey === "string" ? item.payload.pollKey : null,
        storyId: typeof item.payload.storyId === "number" ? item.payload.storyId : null,
      });
    }
  }
  for (const kind of ["urgency", "scholarship_single", "fully_funded", "deadline_digest", "country_spotlight", "tip", "checklist", "poll", "story", "qa", "weekly_summary"]) {
    assert.ok(seen.has(kind), `no ${kind} post in three weeks`);
  }
});

check("Q&A only appears when the discussion group is enabled", () => {
  const withoutQa = (() => {
    const seen = new Set<string>();
    for (let day = 0; day < 30; day++) {
      for (const item of buildDailyPlan({ planDate: addDays(PLAN_DATE, day), candidates: [], history: [], prefs: {}, discussionEnabled: false })) {
        seen.add(item.kind);
      }
    }
    return seen;
  })();
  assert.ok(!withoutQa.has("qa"), "qa must stay silent without a discussion group");
});

check("polls keep a two-day cadence and never exceed the daily budget", () => {
  const pollOn = (day: number, history: PlanHistoryRow[]) =>
    buildDailyPlan({ planDate: addDays(PLAN_DATE, day), candidates: [], history, prefs: {} }).filter((i) => i.kind === "poll");

  const day0 = pollOn(0, []);
  assert.ok(day0.length <= 1);
  if (day0.length === 1) {
    const history: PlanHistoryRow[] = [
      { planDate: PLAN_DATE, kind: "poll", scholarshipId: null, templateKey: day0[0].templateKey, pollType: day0[0].pollType, pollKey: String(day0[0].payload.pollKey) },
    ];
    assert.equal(pollOn(1, history).length, 0, "no poll the next day");
    const later: PlanHistoryRow[] = [{ ...history[0], planDate: addDays(PLAN_DATE, -2) }];
    assert.equal(pollOn(0, later).length, 1, "a poll two days later is allowed");
  }
});

check("every planned day is lint-clean end to end", () => {
  const candidates = [candidate(1, 2), candidate(2, 45, { coverageType: "Full Funding" }), candidate(3, 60, { country: "Germany" }), candidate(4, 62, { country: "Germany" })];
  for (let day = 0; day < 10; day++) {
    const plan = buildDailyPlan({ planDate: addDays(PLAN_DATE, day), candidates, history: [], prefs: {}, discussionEnabled: true });
    assert.ok(plan.length <= MAX_POSTS_PER_DAY);
    for (const item of plan) {
      if (item.kind === "poll") continue; // rendered by the sender from the poll deck
      const html = renderPlanned(item, facts({ id: item.scholarshipId ?? 1 }));
      if (!html) continue;
      assertClean(html, `${addDays(PLAN_DATE, day)} ${item.kind}/${item.templateKey}`);
    }
  }
});

/** Render a planned item through the same templates the sender will use. */
function renderPlanned(item: PlannedItem, f: Facts): string | null {
  switch (item.kind) {
    case "urgency":
      return renderUrgency(f, item.rung ?? 3, Number(item.payload.variant ?? 0))?.html ?? null;
    case "scholarship_single":
      return renderScholarshipSingle(f, Number(item.payload.variant ?? 0))?.html ?? null;
    case "fully_funded":
      return renderFullyFunded(f, Number(item.payload.variant ?? 0))?.html ?? null;
    case "deadline_digest":
      return renderDeadlineDigest([f, facts({ id: 99, deadlineDate: planDayPlus(9) })], Number(item.payload.variant ?? 0), { siteUrl: SITE })?.html ?? null;
    case "country_spotlight":
      return renderCountrySpotlight("Kanada", [f, facts({ id: 98, deadlineDate: planDayPlus(9) })], Number(item.payload.variant ?? 0), { siteUrl: SITE })?.html ?? null;
    case "weekly_summary":
      return renderWeeklySummary(
        { published: null, closingSoon: 4, newThisWeek: 6, top: { title: "Namuna", daysLeft: 4 } },
        Number(item.payload.variant ?? 0),
        { siteUrl: SITE }
      )?.html ?? null;
    case "story":
      return renderStory({ title: "Tajriba", body: "Hujjatlarni erta tayyorladim." }, Number(item.payload.variant ?? 0))?.html ?? null;
    case "qa": {
      const entry = QA_BANK.find((e) => e.key === item.templateKey) ?? QA_BANK[0];
      return renderQa(entry, 0, { siteUrl: SITE, discussionUrl: null })?.html ?? null;
    }
    case "tip": {
      const entry = TIP_BANK.find((e) => e.key === item.templateKey) ?? TIP_BANK[0];
      return renderTip(entry, { siteUrl: SITE })?.html ?? null;
    }
    case "checklist": {
      const entry = CHECKLIST_BANK.find((e) => e.key === item.templateKey) ?? CHECKLIST_BANK[0];
      return renderChecklist(entry, { siteUrl: SITE })?.html ?? null;
    }
    default:
      return null;
  }
}

check("the seeded RNG is stable across runs", () => {
  const a = seeded("plan|2026-10-26");
  const b = seeded("plan|2026-10-26");
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  assert.equal(daysBetween("2026-10-26", "2026-11-02"), 7);
  assert.equal(daysBetween("bad", "2026-11-02"), null);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
