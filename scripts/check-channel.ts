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
  POLL_EXPLANATION_MAX,
  POLL_OPEN_PERIOD_SEC,
  POLL_OPTIONS_MAX,
  POLL_OPTIONS_MIN,
  POLL_OPTION_MAX,
  POLL_QUESTION_MAX,
  optionSummary,
  parsePollResult,
  parseStoredResults,
  pollHasSignal,
  pollPreviewText,
  pollSendParams,
  pollSendProblem,
  pollSpecByKey,
  pollTeachesPrefs,
  prefTopicFor,
  prefUpdatesFromPoll,
} from "../src/lib/channel/polls";
import {
  channelBlockReason,
  channelConfig,
  resolveChannelRuntime,
  tashkentDay,
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
} from "../src/lib/channel/templates/templates.uz";
import {
  WEEKLY_MAX_CHARS,
  renderWeeklyDeadlines,
  weeklyBlock,
  weeklyTitleLine,
  type WeeklyItem,
} from "../src/lib/channel/templates/weekly.uz";
import { renderScholarshipRich, SOFT_LIMIT, HARD_LIMIT, trimAtWord } from "../src/lib/channel/templates/rich.uz";
import { ctaLine, footerLine, hashtagLine } from "../src/lib/channel/templates/chrome";
import {
  EMPTY_CONTENT,
  contentCompleteness,
  isRichContent,
  normalizeContentForPost,
  type ScholarshipContent,
} from "../src/lib/channel/content";
import { countryDisplay, resolveCountry, CHANNEL_COUNTRIES } from "../src/lib/channel/countries";
import { scholarshipLinkCode, shortLinkView, isValidCustomCode, unsafeDestinationReason } from "../src/lib/channel/links";
import { sanitizeTelegramHtml, validateTelegramHtml } from "../src/lib/channel/sanitize";

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
  esc,
  formatDateUz,
  formatDayWithWeekdayUz,
  majorsUz,
} from "../src/lib/channel/templates/format";
import { lintText, plainText, visibleLength } from "../src/lib/channel/lint";
import { mergeChannelSettings, settingsFromRows, settingsRows } from "../src/lib/channel/settings";
import {
  MAX_POSTS_PER_DAY,
  buildDailyPlan,
  isQuietDay,
  weeklyCandidates,
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

check("every statement starts with a real SQL keyword", () => {
  // A `;` inside a comment used to cut a statement in half and leave a fragment
  // beginning mid-sentence — a failure that only appeared at runtime.
  const keywords = /^(CREATE|ALTER|INSERT|UPDATE|DELETE|DROP|DO|COMMENT)\b/i;
  for (const statement of channelStatements()) {
    assert.match(statement, keywords, `not a statement: ${statement.slice(0, 60)}`);
  }
});

check("CHANNEL_DDL and supabase/add_channel.sql are identical", () => {
  // Strip comments before splitting, exactly like the runtime does.
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const sql = read("supabase/add_channel.sql");
  const want = channelStatements().map(norm).filter(Boolean);
  const have = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
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
  assert.equal(formatDateUz("2026-11-12"), "12-noyabr, 2026");
  assert.equal(formatDateUz("2027-01-03"), "3-yanvar, 2027");
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
  for (const kind of ["urgency", "scholarship_single", "fully_funded", "deadline_digest", "country_spotlight", "tip", "checklist", "poll", "story", "qa", "weekly_deadlines"]) {
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

check("polls respect the cadence and never exceed the daily budget", () => {
  const pollOn = (day: number, history: PlanHistoryRow[]) =>
    buildDailyPlan({ planDate: addDays(PLAN_DATE, day), candidates: [], history, prefs: {} }).filter((i) => i.kind === "poll");

  const day0 = pollOn(0, []);
  assert.ok(day0.length <= 1);
  if (day0.length === 1) {
    const history: PlanHistoryRow[] = [
      { planDate: PLAN_DATE, kind: "poll", scholarshipId: null, templateKey: day0[0].templateKey, pollType: day0[0].pollType, pollKey: String(day0[0].payload.pollKey) },
    ];
    assert.equal(pollOn(1, history).length, 0, "no poll the next day");
    assert.equal(pollOn(2, history).length, 0, "the default cadence is 14 days, not 2");
    const later: PlanHistoryRow[] = [{ ...history[0], planDate: addDays(PLAN_DATE, -15) }];
    assert.equal(pollOn(0, later).length, 1, "a poll 15 days later is allowed");
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

/** Two dated items for the weekly/deadline layouts. */
function weeklyFixture(): WeeklyItem[] {
  return [
    {
      flag: "🇩🇪",
      title: "Namuna granti",
      tagline: "To'liq moliyalashtirish",
      deadlineDayText: "25-oktabr Yakshanba",
      shortLink: shortLinkView(SITE, scholarshipLinkCode(11, "site")),
    },
    {
      flag: "🇯🇵",
      title: "Ikkinchi dastur",
      tagline: null,
      deadlineDayText: "27-oktabr Seshanba",
      shortLink: shortLinkView(SITE, scholarshipLinkCode(12, "site")),
    },
  ];
}

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
    case "scholarship_rich":
      return (
        renderScholarshipRich({
          facts: f,
          content: { ...EMPTY_CONTENT(f.id), taglineUz: "Namuna dastur", fundingTypeUz: "To'liq grant", eligibilityUz: ["Bakalavr"], aboutUz: "Namuna matn." },
          country: countryDisplay("Kanada"),
          chrome: { siteUrl: SITE, shortLink: null, hashtags: ["grant"], footer: [], variant: 0 },
        })?.html ?? null
      );
    case "country_spotlight":
      return renderCountrySpotlight("Kanada", [f, facts({ id: 98, deadlineDate: planDayPlus(9) })], Number(item.payload.variant ?? 0), { siteUrl: SITE })?.html ?? null;
    case "weekly_deadlines":
      return (
        renderWeeklyDeadlines({
          items: weeklyFixture(),
          botUsername: "scholarbridgebot",
          hashtags: ["haftalik_eslatmalar", "reminders"],
          footerSocial: [{ label: "Kanal", url: "https://t.me/scholarbridge" }],
          variant: Number(item.payload.variant ?? 0),
          minItems: 2,
        })?.parts.join("\n\n") ?? null
      );
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
// Golden renders — Patch 3
// ---------------------------------------------------------------------------

section("Rich post golden render");

const RICH_CONTENT: ScholarshipContent = {
  scholarshipId: 1,
  taglineUz: "Kanadada bepul o'qish imkoniyati",
  fundingTypeUz: "To'liq kontrakt + stipendiya",
  languageReqUz: "IELTS 6.5",
  eligibilityUz: ["Bakalavr yo'nalishi", "GPA 3.5 dan yuqori"],
  benefitsUz: ["Kontrakt to'liq qoplanadi", "Oylik stipendiya"],
  aboutUz: "Dastur har yili 20 talabani qabul qiladi.",
  extraHashtags: ["grant"],
};

function richChrome(overrides: Partial<Parameters<typeof renderScholarshipRich>[0]["chrome"]> = {}) {
  return {
    siteUrl: SITE,
    shortLink: shortLinkView(SITE, scholarshipLinkCode(1, "site")),
    hashtags: ["grant", "kanada", "bakalavr"],
    footer: [{ label: "Kanal", url: "https://t.me/scholarbridge" }, { label: "Bot", url: "https://t.me/scholarbridgebot" }],
    variant: 0,
    ...overrides,
  };
}

check("the rich post renders the exact agreed layout", () => {
  const out = renderScholarshipRich({
    facts: facts(),
    content: RICH_CONTENT,
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.ok(out, "rich post did not render");
  assertClean(out.html, "rich v1");
  const code = scholarshipLinkCode(1, "site");
  const expected = [
    "🇨🇦 <b>Global Excellence Scholarship</b> — Kanadada bepul o'qish imkoniyati",
    "Moliyalashtirish: To'liq kontrakt + stipendiya\nTil talabi: IELTS 6.5",
    "<b>Kimlar uchun</b>\n➡️ Bakalavr yo'nalishi\n➡️ GPA 3.5 dan yuqori",
    "<b>Foydali tomonlari</b>\n➡️ Kontrakt to'liq qoplanadi\n➡️ Oylik stipendiya",
    "<b>Dastur haqida</b>\nDastur har yili 20 talabani qabul qiladi.",
    `🕓Oxirgi muddat: 12-noyabr, 2026\n➡️Batafsil: <a href="${SITE}/go/${code}">scholarbridge.example/go/${code}</a>`,
    "#grant #kanada #bakalavr",
    '💼 <a href="https://t.me/scholarbridge">Kanal</a> | <a href="https://t.me/scholarbridgebot">Bot</a>',
  ].join("\n\n");
  assert.equal(out.html, expected);
});

check("an empty section disappears with its heading and its blank line", () => {
  const out = renderScholarshipRich({
    facts: facts(),
    content: { ...RICH_CONTENT, benefitsUz: [], languageReqUz: null, aboutUz: null },
    country: countryDisplay("Canada"),
    chrome: richChrome({ hashtags: [] }),
  });
  assert.ok(out);
  assert.ok(!out.html.includes("Foydali tomonlari"), "empty benefits heading survived");
  assert.ok(!out.html.includes("Dastur haqida"), "empty about heading survived");
  assert.ok(!out.html.includes("Til talabi"), "empty language line survived");
  assert.ok(!out.html.includes("\n\n\n"), "a gap was left behind");
  assert.ok(!out.html.includes("#grant"));
});

check("a post with a tagline but no body is not rich", () => {
  assert.equal(isRichContent({ ...RICH_CONTENT, eligibilityUz: [], benefitsUz: [], aboutUz: null }), false);
  assert.equal(isRichContent({ ...RICH_CONTENT, fundingTypeUz: null }), false);
  assert.equal(isRichContent(RICH_CONTENT), true);
  const out = renderScholarshipRich({
    facts: facts(),
    content: { ...RICH_CONTENT, eligibilityUz: [], benefitsUz: [], aboutUz: null },
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.equal(out, null);
});

check("length policy: trim about → drop about → cut bullets → skip", () => {
  const longAbout = "Bu dastur haqida juda uzun matn. ".repeat(60).trim();
  const trimmed = renderScholarshipRich({
    facts: facts(),
    content: { ...RICH_CONTENT, aboutUz: longAbout },
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.ok(trimmed, "an over-soft-limit post should still render");
  assert.ok(visibleLength(trimmed.html) <= SOFT_LIMIT + 40, `soft limit not applied: ${visibleLength(trimmed.html)}`);
  assert.ok(trimmed.html.includes("…"), "the about block was not trimmed at a word boundary");
  assert.ok(trimmed.html.includes("Dastur haqida"), "trimming must not drop the whole block");

  // Nothing left to trim: the lists are the only thing that can grow.
  const many = Array.from({ length: 30 }, (_, i) => `Band ${i + 1}: ${"tafsilot ".repeat(45)}`);
  const dropped = renderScholarshipRich({
    facts: facts(),
    content: { ...RICH_CONTENT, aboutUz: longAbout, eligibilityUz: many, benefitsUz: many },
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.ok(dropped, "dropping about then cutting bullets should keep the post");
  assert.ok(!dropped.html.includes("Dastur haqida"), "about survived the hard limit");
  const arrows = (dropped.html.match(/➡️ /g) ?? []).length;
  assert.ok(arrows <= 8, `bullet lists were not cut: ${arrows} bullets`);
  assert.ok(visibleLength(dropped.html) < HARD_LIMIT, `${visibleLength(dropped.html)} characters`);

  const impossible = renderScholarshipRich({
    facts: facts(),
    content: {
      ...RICH_CONTENT,
      taglineUz: "x".repeat(150),
      fundingTypeUz: "y".repeat(900),
      languageReqUz: "z".repeat(900),
      eligibilityUz: Array.from({ length: 6 }, () => "w".repeat(500)),
      benefitsUz: Array.from({ length: 6 }, () => "v".repeat(500)),
      aboutUz: null,
    },
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.equal(impossible, null, "an impossible post must be skipped, not truncated");
});

check("trimAtWord never cuts mid-word and marks the cut", () => {
  assert.equal(trimAtWord("Salom dunyo", 100), "Salom dunyo");
  const cut = trimAtWord("Salom dunyo qanday ishlar", 12);
  assert.ok(cut.endsWith("…"));
  assert.ok(!cut.includes("qand"));
});

section("Deadline wording");

check("estimated and rolling deadlines never look exact", () => {
  const estimated = renderScholarshipRich({
    facts: facts({ deadlineType: "rolling", deadlineDate: null }),
    content: RICH_CONTENT,
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.ok(estimated);
  assert.ok(estimated.html.includes("🕓Muddat: rasmiy sahifada ko'rsatilgan"));
  assert.ok(!estimated.html.includes("Oxirgi muddat"));

  const estimated2 = renderScholarshipRich({
    facts: facts({
      deadlineType: "not_announced",
      deadlineDate: null,
      deadlineRangeStart: null,
      deadlineRangeEnd: null,
    }),
    content: RICH_CONTENT,
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.ok(estimated2);
  assert.ok(estimated2.html.includes("taxminan"), "an estimated deadline must say so");
  assert.ok(!estimated2.html.includes("Oxirgi muddat"), "an estimated deadline is not a deadline");

  const ranged = renderScholarshipRich({
    facts: facts({ deadlineType: "range", deadlineDate: null, deadlineRangeEnd: addDays(PLAN_DATE, 40) }),
    content: RICH_CONTENT,
    country: countryDisplay("Canada"),
    chrome: richChrome(),
  });
  assert.ok(ranged);
  assert.ok(ranged.html.includes("🕓Taxminiy muddat:"), "a range end is an estimate, not a deadline");
});

check("rolling and estimated awards never enter an urgency post", () => {
  const rolling = facts({ deadlineType: "rolling", deadlineDate: null });
  const estimated = facts({ deadlineType: "not_announced", deadlineDate: null });
  assert.equal(rolling.deadline.quality, "evergreen");
  assert.equal(renderUrgency(rolling, 3, 0, richChrome()), null);
  assert.notEqual(estimated.deadline.quality, "exact");
  assert.equal(renderUrgency(estimated, 3, 0, richChrome()), null);
});

section("Weekly deadlines post");

function weeklyItems(count: number): WeeklyItem[] {
  return Array.from({ length: count }, (_, i) => ({
    flag: i % 2 === 0 ? "🇩🇪" : "🇯🇵",
    title: esc(`Dastur ${i + 1}`),
    tagline: i % 3 === 0 ? `Qisqa ta'rif ${i + 1}` : null,
    deadlineDayText: formatDayWithWeekdayUz(addDays(PLAN_DATE, i + 1)) ?? "",
    shortLink: shortLinkView(SITE, scholarshipLinkCode(100 + i, "site")),
  }));
}

function weeklyInput(items: WeeklyItem[], overrides: Partial<Parameters<typeof renderWeeklyDeadlines>[0]> = {}) {
  return {
    items,
    botUsername: "scholarbridgebot",
    hashtags: ["haftalik_eslatmalar", "reminders"],
    footerSocial: [{ label: "Instagram", url: "https://instagram.com/scholarbridge" }],
    variant: 0,
    minItems: 2,
    ...overrides,
  };
}

check("the weekly post prints one block per award, in the order given", () => {
  const items = weeklyItems(3);
  const out = renderWeeklyDeadlines(weeklyInput(items));
  assert.ok(out);
  assert.equal(out.parts.length, 1);
  assertClean(out.parts[0], "weekly");
  const blocks = out.parts[0].split("\n\n");
  assert.ok(blocks[0].startsWith("⏳ "), "header first");
  for (const item of items) {
    assert.ok(out.parts[0].includes(`${item.flag} ${item.title}`), `missing block header: ${item.title}`);
    assert.ok(out.parts[0].includes(`[${item.deadlineDayText}]`), `missing day text: ${item.deadlineDayText}`);
    assert.ok(out.parts[0].includes(`👉 <a href="${item.shortLink?.url}">`), "short link missing");
  }
  assert.ok(out.parts[0].includes("@scholarbridgebot"), "bot CTA missing");
  assert.ok(out.parts[0].includes("#haftalik_eslatmalar #reminders"));
});

check("the day text is Uzbek and carries the weekday", () => {
  assert.equal(formatDayWithWeekdayUz("2026-10-25"), "25-oktabr Yakshanba");
  assert.equal(formatDayWithWeekdayUz("2026-11-12"), "12-noyabr Payshanba");
});

check("too few awards means no weekly post at all", () => {
  assert.equal(renderWeeklyDeadlines(weeklyInput(weeklyItems(1))), null);
  assert.ok(renderWeeklyDeadlines(weeklyInput(weeklyItems(2))), "two awards is the minimum");
  assert.equal(renderWeeklyDeadlines(weeklyInput(weeklyItems(5), { minItems: 6 })), null);
});

check("a long weekly list splits without cutting a block, footer only on the last part", () => {
  const items = Array.from({ length: 12 }, (_, i) => ({
    ...weeklyItems(1)[0],
    title: esc(`${"Juda uzun dastur nomi ".repeat(10).trim()} ${i + 1}`),
    tagline: "Tafsilot ".repeat(10).trim(),
    shortLink: shortLinkView(SITE, scholarshipLinkCode(200 + i, "site")),
  }));
  const out = renderWeeklyDeadlines(weeklyInput(items, { variant: 1 }));
  assert.ok(out);
  assert.ok(out.parts.length >= 2, `expected a split, got ${out.parts.length} part(s)`);
  for (const [index, part] of out.parts.entries()) {
    assertClean(part, `weekly part ${index + 1}`);
    assert.ok(part.length <= WEEKLY_MAX_CHARS, `part ${index + 1} too long: ${part.length}`);
    // Every part after the first opens with where this one sits in the series.
    assert.equal(part.startsWith("⏳ Davomi ("), index > 0, `part ${index + 1} continuation marker`);
    if (index > 0) assert.ok(part.startsWith(`⏳ Davomi (${index + 1}/${out.parts.length})`), "wrong part number");
  }
  assert.ok(!out.parts[0].includes("instagram.com"), "footer must appear only on the last part");
  assert.ok(out.parts[out.parts.length - 1].includes("instagram.com"));
  // Every block appears exactly once across the parts.
  for (const item of items) {
    const link = item.shortLink?.url ?? "";
    const matches: number = out.parts.join("\n").split(link).length - 1;
    assert.equal(matches, 1, `block repeated or lost: ${link}`);
  }
});

check("weekly candidates are the open, exact deadlines inside the window", () => {
  const list = weeklyCandidates([
    candidate(1, 0),
    candidate(2, 7),
    candidate(3, 8),
    candidate(4, null),
    candidate(5, -1),
  ]);
  assert.deepEqual(list.map((c) => c.facts.id), [1, 2]);
});

section("Countries");

check("known countries get a flag and a locative form; unknown ones do not", () => {
  const known = countryDisplay("Canada");
  assert.ok(known);
  assert.equal(known.known, true);
  assert.equal(known.flag, "🇨🇦");
  assert.equal(known.locative, "Kanadada");
  assert.equal(known.hashtag, "kanada");

  const unknown = countryDisplay("Neverland");
  assert.ok(unknown);
  assert.equal(unknown.known, false);
  assert.equal(unknown.flag, "");
  assert.equal(unknown.locative, null);
  assert.equal(unknown.name, "Neverland", "an unknown country keeps its stored name");
  assert.equal(unknown.hashtag, null);

  assert.equal(countryDisplay(null), null);
  assert.ok(resolveCountry("kanada"));
  assert.equal(CHANNEL_COUNTRIES.length, 22);
  for (const country of CHANNEL_COUNTRIES) {
    assert.ok(country.key && country.nameUz && country.flag, `incomplete country row: ${country.key}`);
    assert.ok(!country.hashtag.includes("#"), "hashtags are stored without #");
  }
});

check("the rich post silently omits what an unknown country cannot provide", () => {
  const out = renderScholarshipRich({
    facts: facts({ country: "Neverland" }),
    content: RICH_CONTENT,
    country: countryDisplay("Neverland"),
    chrome: richChrome({ hashtags: [] }),
  });
  assert.ok(out);
  assert.ok(!out.html.startsWith("🇨🇦"), "unknown country must not borrow a flag");
  assert.ok(!out.html.includes("Neverlanda"), "unknown country must not get a locative form");
});

section("Short links");

check("codes are stable, short, lowercase and free of ambiguous characters", () => {
  const code = scholarshipLinkCode(42, "site");
  assert.equal(code, scholarshipLinkCode(42, "site"), "codes must be deterministic");
  assert.notEqual(code, scholarshipLinkCode(43, "site"));
  assert.notEqual(code, scholarshipLinkCode(42, "official"));
  assert.ok(code.length >= 5 && code.length <= 7);
  assert.ok(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/.test(code), code);
  assert.ok(!/[01lo]/.test(code), "ambiguous characters are banned");
  const codes = new Set(Array.from({ length: 500 }, (_, id) => scholarshipLinkCode(id, "site")));
  assert.equal(codes.size, 500, "codes collided");
});

check("only https destinations on public hosts are accepted", () => {
  assert.equal(unsafeDestinationReason("https://example.edu/scholarship"), null);
  for (const bad of [
    "http://example.edu",
    "javascript:alert(1)",
    "data:text/html,<script>",
    "https://localhost/admin",
    "https://127.0.0.1/",
    "https://10.0.0.5/",
    "https://169.254.169.254/latest/meta-data",
    "ftp://example.edu",
    "",
    null,
  ]) {
    assert.notEqual(unsafeDestinationReason(bad), null, `accepted ${String(bad)}`);
  }
});

check("custom codes are validated strictly", () => {
  assert.ok(isValidCustomCode("abc23"));
  assert.ok(isValidCustomCode("abcdefg"));
  assert.ok(!isValidCustomCode("abc"));
  assert.ok(!isValidCustomCode("abcdefgh"));
  assert.ok(!isValidCustomCode("ABC123"));
  assert.ok(!isValidCustomCode("abc-12"));
  assert.ok(!isValidCustomCode("abcl23"), "l is ambiguous");
  assert.ok(!isValidCustomCode("abc023"), "0 is ambiguous");
});

check("a short link needs a real site origin", () => {
  assert.equal(shortLinkView("", "abc234"), null);
  assert.equal(shortLinkView(SITE, "bad"), null);
  const view = shortLinkView(`${SITE}/`, "abc234");
  assert.ok(view);
  assert.equal(view.url, `${SITE}/go/abc234`);
  assert.equal(view.visible, "scholarbridge.example/go/abc234");
});

section("Sanitizer");

check("the sanitizer keeps the whitelist and escapes everything else", () => {
  const ok = sanitizeTelegramHtml('<b>Qalin</b> <i>yotiq</i> <a href="https://example.edu">havola</a>');
  assert.deepEqual(ok.changes, []);
  assert.equal(ok.html, '<b>Qalin</b> <i>yotiq</i> <a href="https://example.edu">havola</a>');

  const script = sanitizeTelegramHtml('<script>alert(1)</script><b>x</b>');
  assert.ok(script.html.includes("&lt;script&gt;"));
  assert.ok(!script.html.includes("<script>"));
  assert.ok(script.changes.length > 0);

  const jsLink = sanitizeTelegramHtml('<a href="javascript:alert(1)">x</a>');
  assert.ok(!jsLink.html.includes("javascript:"), "javascript: anchor survived");
  assert.ok(jsLink.html.includes("x"));

  const unbalanced = sanitizeTelegramHtml("<b>ochilmagan");
  assert.equal(unbalanced.html, "<b>ochilmagan</b>", "open tags are closed");

  const ampersand = sanitizeTelegramHtml("A & B <b>ok</b>");
  assert.equal(ampersand.html, "A &amp; B <b>ok</b>");

  assert.deepEqual(validateTelegramHtml('<b>ok</b> <a href="https://example.edu">l</a>'), []);
  assert.ok(validateTelegramHtml("<b>ochiq").length > 0, "unbalanced input must be reported");
  assert.ok(validateTelegramHtml('<a href="javascript:x">l</a>').length > 0);
  assert.ok(validateTelegramHtml("<script>x</script>").length > 0);
});

check("template output always survives the sanitizer unchanged", () => {
  const samples = [
    renderScholarshipRich({ facts: facts(), content: RICH_CONTENT, country: countryDisplay("Canada"), chrome: richChrome() })?.html,
    renderWeeklyDeadlines(weeklyInput(weeklyItems(3)))?.parts[0],
    renderScholarshipSingle(facts(), 0, richChrome())?.html,
    renderUrgency(facts({ deadlineDate: addDays(PLAN_DATE, 1) }), 3, 0, richChrome())?.html,
  ].filter((s): s is string => Boolean(s));
  assert.ok(samples.length >= 4);
  for (const html of samples) {
    const result = sanitizeTelegramHtml(html);
    assert.deepEqual(result.changes, [], `sanitizer had to change template output: ${result.changes.join(", ")}`);
    assert.equal(result.html, html);
  }
});

section("Content completeness");

check("completeness counts the authored fields and flags what is missing", () => {
  const full = contentCompleteness(RICH_CONTENT);
  assert.equal(full.rich, true);
  assert.deepEqual(full.missing, []);
  assert.equal(full.filled, full.total);

  const partial = contentCompleteness({ ...EMPTY_CONTENT(5), taglineUz: "Faqat sarlavha" });
  assert.equal(partial.rich, false);
  assert.equal(partial.filled, 1);
  assert.ok(partial.missing.includes("funding"));
  assert.ok(partial.missing.includes("about"));

  const none = contentCompleteness(null);
  assert.equal(none.filled, 0);
  assert.equal(none.rich, false);
});

check("stored copy is normalised before it reaches a post", () => {
  const long = normalizeContentForPost({
    ...RICH_CONTENT,
    taglineUz: "x".repeat(400),
    aboutUz: "y".repeat(2000),
    eligibilityUz: Array.from({ length: 12 }, (_, i) => `Band ${i}`),
  });
  assert.equal(long.taglineUz?.length, 160);
  assert.equal(long.aboutUz?.length, 900);
  assert.equal(long.eligibilityUz.length, 6);
});

// ---------------------------------------------------------------------------
// 14-day dry-run preview
// ---------------------------------------------------------------------------

section("Fourteen-day dry-run preview");

/**
 * The whole point of Phase 1: two weeks of planning, rendered, with no network
 * and no database. Every invariant an operator relies on is asserted here.
 */
check("fourteen simulated days stay inside every limit", () => {
  const candidates = [
    candidate(1, 0),
    candidate(2, 2),
    candidate(3, 3, { deadlineDate: addDays(PLAN_DATE, 3) }),
    candidate(4, 6, { country: "Germany" }),
    candidate(5, 30, { country: "Germany", coverageType: "Full Tuition" }),
    candidate(6, 40, { country: "Germany", awardBasis: "full_tuition", coverageType: "Full Funding" }),
    candidate(7, 55, { country: "Japan" }),
    candidate(8, 70, { country: "Japan" }),
    candidate(9, 90, { country: "Japan" }),
  ];
  const stories = [{ id: 1, title: "Tajriba", body: "Men hujjatlarni erta tayyorladim." }];
  const history: PlanHistoryRow[] = [];
  const factsById = new Map(candidates.map((c) => [c.facts.id, c.facts]));
  const rendered: { planDate: string; kind: string; html: string }[] = [];
  const kindsByDay: string[][] = [];

  for (let day = 0; day < 14; day++) {
    const planDate = addDays(PLAN_DATE, day);
    const plan = buildDailyPlan({ planDate, candidates, history, prefs: {}, stories, discussionEnabled: true });
    assert.ok(plan.length <= MAX_POSTS_PER_DAY, `${planDate}: ${plan.length} posts`);
    kindsByDay.push(plan.map((item) => item.kind));

    const times = plan.map((item) => item.sendAt);
    assert.deepEqual(times, [...times].sort(), `${planDate}: send times went backwards`);
    for (const item of plan) {
      const [hh, mm] = item.sendAt.split(":").map(Number);
      const minutes = hh * 60 + mm;
      const inMorning = minutes >= 9 * 60 && minutes <= 11 * 60;
      const inEvening = minutes >= 18 * 60 + 30 && minutes <= 21 * 60;
      assert.ok(inMorning || inEvening, `${planDate}: ${item.sendAt} is outside both windows`);
      if (item.kind === "poll") continue;
      const f = factsById.get(item.scholarshipId ?? 1) ?? facts();
      const html = renderPlanned(item, f);
      if (!html) continue;
      const text = Array.isArray(html) ? html.join("\n\n") : html;
      // "Shoshiling" is allowed only in a genuine last-day post.
      const lastDay = f.deadline.daysLeft !== null && f.deadline.daysLeft <= 1;
      assertClean(text, `${planDate} ${item.kind}`, { allowUrgency: item.kind === "urgency" && lastDay });
      if (item.kind === "urgency" && !lastDay) assert.ok(!/shoshiling/iu.test(text), `${planDate}: hurry wording too early`);
      rendered.push({ planDate, kind: item.kind, html: text });
    }

    for (const item of plan) {
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

  assert.ok(rendered.length >= 14, `only ${rendered.length} posts rendered in two weeks`);

  // One quiet day a week: exactly two in fourteen days.
  const quiet = kindsByDay.filter((kinds) => kinds.length === 0).length;
  assert.equal(quiet, 2, `expected two quiet days, got ${quiet}`);

  // The weekly deadlines post is a Sunday-only post.
  for (const [day, kinds] of kindsByDay.entries()) {
    if (!kinds.includes("weekly_deadlines")) continue;
    const weekday = new Date(`${addDays(PLAN_DATE, day)}T00:00:00Z`).getUTCDay();
    assert.equal(weekday, 0, `weekly post planned on ${addDays(PLAN_DATE, day)} — not a Sunday`);
  }

  // A scholarship announced today is not announced again tomorrow.
  const seenByDay = new Map<string, Set<number>>();
  for (const row of history) {
    if (row.scholarshipId === null) continue;
    const set = seenByDay.get(row.planDate) ?? new Set<number>();
    assert.ok(!set.has(row.scholarshipId), `${row.planDate}: scholarship ${row.scholarshipId} announced twice`);
    set.add(row.scholarshipId);
    seenByDay.set(row.planDate, set);
  }
});

check("the preview is deterministic for the same day and differs across days", () => {
  const build = () =>
    buildDailyPlan({
      planDate: PLAN_DATE,
      candidates: [candidate(1, 2), candidate(2, 20), candidate(3, 45, { country: "Germany" })],
      history: [],
      prefs: {},
    });
  assert.deepEqual(build(), build());
  const other = buildDailyPlan({
    planDate: addDays(PLAN_DATE, 1),
    candidates: [candidate(1, 2), candidate(2, 20), candidate(3, 45, { country: "Germany" })],
    history: [],
    prefs: {},
  });
  assert.notDeepEqual(build().map((i) => i.sendAt), other.map((i) => i.sendAt));
});

// ---------------------------------------------------------------------------
// Connection settings and the runtime guard
// ---------------------------------------------------------------------------

section("Connection");

check("the connection block is validated, and anything unusable falls back", () => {
  const good = mergeChannelSettings({
    connection: { channelId: "@scholarbridge_uz", adminChatId: "123456789", mode: "on", pausedUntil: "2026-11-01" },
  });
  assert.equal(good.connection.channelId, "@scholarbridge_uz");
  assert.equal(good.connection.adminChatId, "123456789");
  assert.equal(good.connection.mode, "on");
  assert.equal(good.connection.pausedUntil, "2026-11-01");

  const bad = mergeChannelSettings({
    connection: { channelId: "not a channel", adminChatId: "abc", mode: "yes please", pausedUntil: "tomorrow" },
  });
  assert.equal(bad.connection.channelId, "", "an invalid channel id must not be stored");
  assert.equal(bad.connection.adminChatId, "", "a non-numeric admin chat must not be stored");
  assert.equal(bad.connection.mode, "off", "an unknown mode is always off");
  assert.equal(bad.connection.pausedUntil, null);

  assert.equal(mergeChannelSettings({}).connection.mode, "off", "the default is off");
});

check("settings rows round-trip through the database shape", () => {
  const settings = mergeChannelSettings({
    connection: { channelId: "-1001234567890", adminChatId: "987654321", mode: "dryrun", pausedUntil: null },
    siteUrl: "https://scholarbridge.uz",
    footerSocial: [{ label: "Instagram", url: "https://instagram.com/scholarbridge" }],
  });
  const rows = settingsRows(settings);
  assert.ok(rows.connection, "connection must be persisted");
  const restored = settingsFromRows(
    Object.entries(rows).map(([key, value]) => ({ key, value: JSON.stringify(value) }))
  );
  assert.deepEqual(restored.connection, settings.connection);
  assert.deepEqual(restored.footerSocial, settings.footerSocial);
  assert.equal(restored.siteUrl, "https://scholarbridge.uz");
});

check("the environment kill switch always wins over the admin switch", () => {
  const settings = mergeChannelSettings({
    connection: { channelId: "@scholarbridge_uz", adminChatId: "123456789", mode: "on" },
    siteUrl: "https://scholarbridge.uz",
  });
  const off = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "off" }, new Date("2026-10-26T04:00:00Z"));
  assert.equal(off.mode, "off");
  assert.equal(off.envKillSwitch, true);
  assert.ok(off.blockedReason);

  const live = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "on" }, new Date("2026-10-26T04:00:00Z"));
  assert.equal(live.mode, "on");
  assert.equal(live.envKillSwitch, false);
  assert.equal(live.blockedReason, null);
  assert.equal(live.channelId, "@scholarbridge_uz");
});

check("an unset CHANNEL_AUTOPOST lets the panel decide, an explicit off still kills", () => {
  const settings = mergeChannelSettings({
    connection: { channelId: "@scholarbridge_uz", adminChatId: "123456789", mode: "on" },
    siteUrl: "https://scholarbridge.uz",
  });
  // Absent variable: this is the normal deployment — the panel is in charge.
  const unset = resolveChannelRuntime(settings, {}, new Date("2026-10-26T04:00:00Z"));
  assert.equal(unset.envKillSwitch, false, "an absent variable is not a kill switch");
  assert.equal(unset.envAutopost, null);
  assert.equal(unset.mode, "on", "the panel's mode must win when the env says nothing");
  assert.equal(unset.blockedReason, null);

  // Explicit off wins over the panel.
  const killed = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "off" }, new Date("2026-10-26T04:00:00Z"));
  assert.equal(killed.envKillSwitch, true);
  assert.equal(killed.envAutopost, "off");
  assert.equal(killed.mode, "off");

  // `dryrun` in the environment is a ceiling: the panel cannot reach live.
  const capped = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "dryrun" }, new Date("2026-10-26T04:00:00Z"));
  assert.equal(capped.envKillSwitch, false);
  assert.equal(capped.mode, "dryrun", "an env dryrun must cap a panel \"on\"");
  assert.equal(capped.blockedReason, null);

  // A typo is not "on": it parses as off and therefore kills posting too.
  const typo = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "ture" }, new Date("2026-10-26T04:00:00Z"));
  assert.equal(typo.envKillSwitch, true);
  assert.equal(typo.mode, "off");
});

check("a missing piece blocks the publisher with a readable reason", () => {
  const base = { connection: { channelId: "@scholarbridge_uz", adminChatId: "123456789", mode: "on" as const }, siteUrl: "https://scholarbridge.uz" };
  const noChannel = resolveChannelRuntime(mergeChannelSettings({ ...base, connection: { ...base.connection, channelId: "" } }), { CHANNEL_AUTOPOST: "on" });
  assert.match(noChannel.blockedReason ?? "", /not connected/i);

  const noSite = resolveChannelRuntime(mergeChannelSettings({ ...base, siteUrl: "" }), { CHANNEL_AUTOPOST: "on" });
  assert.match(noSite.blockedReason ?? "", /site URL/i);

  const envFallback = resolveChannelRuntime(mergeChannelSettings({ connection: { mode: "dryrun" } }), {
    CHANNEL_AUTOPOST: "dryrun",
    TELEGRAM_CHANNEL_ID: "@env_channel",
    TELEGRAM_ADMIN_CHAT_ID: "123456789",
    APP_URL: "https://scholarbridge.uz",
  });
  assert.equal(envFallback.channelId, "@env_channel", "an existing env-only deployment keeps working");
  assert.equal(envFallback.blockedReason, null);
});

check("a pause lasts through the end of its day in Tashkent", () => {
  const settings = mergeChannelSettings({
    connection: { channelId: "@scholarbridge_uz", adminChatId: "123456789", mode: "on", pausedUntil: "2026-10-26" },
    siteUrl: "https://scholarbridge.uz",
  });
  const during = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "on" }, new Date("2026-10-26T18:00:00Z"));
  assert.equal(during.paused, true);
  assert.match(during.blockedReason ?? "", /Paused/);

  const after = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "on" }, new Date("2026-10-27T02:00:00Z"));
  assert.equal(after.paused, false, "the pause ends after its last day");
  assert.equal(after.blockedReason, null);
});

check("the Tashkent day rolls over at 19:00 UTC", () => {
  assert.equal(tashkentDay(new Date("2026-10-26T18:59:00Z")), "2026-10-26");
  assert.equal(tashkentDay(new Date("2026-10-26T19:00:00Z")), "2026-10-27");
});

check("footer links accept our own origin, never an external http link", () => {
  const withSite = mergeChannelSettings({
    siteUrl: "http://127.0.0.1:3000",
    footerMain: [
      { label: "Sayt", url: "http://127.0.0.1:3000" },
      { label: "Kanal", url: "https://t.me/scholarbridge_uz" },
      { label: "Begona", url: "http://evil.example.com/x" },
    ],
  });
  assert.deepEqual(withSite.footerMain.map((link) => link.label), ["Sayt", "Kanal"]);
  // Without a configured site there is nothing to be same-origin with.
  const noSite = mergeChannelSettings({ footerMain: [{ label: "Begona", url: "http://evil.example.com/x" }] });
  assert.deepEqual(noSite.footerMain, []);
  // Social links follow the same rule.
  const social = mergeChannelSettings({
    siteUrl: "http://127.0.0.1:3000",
    footerSocial: [
      { label: "Instagram", url: "https://instagram.com/scholarbridge" },
      { label: "Sayt", url: "http://127.0.0.1:3000/blog" },
    ],
  });
  assert.deepEqual(social.footerSocial.map((link) => link.label), ["Instagram", "Sayt"]);
});

check("the admin site URL wins over APP_URL", () => {
  const runtime = resolveChannelRuntime(
    mergeChannelSettings({ siteUrl: "http://127.0.0.1:3000" }),
    { CHANNEL_AUTOPOST: "dryrun", APP_URL: "http://localhost:3000" }
  );
  assert.equal(runtime.siteUrl, "http://127.0.0.1:3000", "the panel value must not be shadowed by the environment");
});

// ---------------------------------------------------------------------------
// Polls: delivery, aggregates and what may be learned from them
// ---------------------------------------------------------------------------

check("poll sendPoll parameters are anonymous and Telegram-legal", () => {
  for (const spec of POLL_DECK) {
    const params = pollSendParams(spec);
    assert.equal(params.is_anonymous, true, `${spec.key}: channel polls must be anonymous`);
    assert.ok(params.question.length > 0 && params.question.length <= POLL_QUESTION_MAX);
    assert.ok(params.options.length >= POLL_OPTIONS_MIN && params.options.length <= POLL_OPTIONS_MAX);
    for (const option of params.options) assert.ok(option.length <= POLL_OPTION_MAX, `${spec.key}: option too long`);
    assert.equal(params.open_period, POLL_OPEN_PERIOD_SEC, "a poll must close by itself, so results always arrive");
    if (spec.type === "quiz_data") {
      assert.equal(params.type, "quiz");
      assert.ok(typeof params.correct_option_id === "number");
      assert.ok((params.explanation ?? "").length <= POLL_EXPLANATION_MAX);
    } else {
      assert.equal(params.type, "regular");
      assert.equal(params.correct_option_id, undefined, "only quizzes carry a correct answer");
    }
    assert.equal(pollSendProblem(spec), null, `${spec.key} must be sendable`);
  }
});

check("poll preview text has the question and every option", () => {
  const spec = pollSpecByKey("pref_country_1");
  assert.ok(spec);
  const text = pollPreviewText(spec.question, spec.options.map((option) => option.text));
  assert.ok(text.includes(spec.question));
  for (const option of spec.options) assert.ok(text.includes(option.text));
});

check("an unknown or broken deck entry is not sendable", () => {
  assert.equal(pollSpecByKey("nope"), null);
  assert.equal(pollSpecByKey(null), null);
  assert.equal(pollSpecByKey(undefined), null);
  const broken = { ...POLL_DECK[0], options: [{ key: "only", text: "bitta" }] };
  assert.match(pollSendProblem(broken) ?? "", /fewer than 2 options/);
  const longQuestion = { ...POLL_DECK[0], question: "x".repeat(POLL_QUESTION_MAX + 1) };
  assert.match(pollSendProblem(longQuestion) ?? "", /question too long/);
});

check("an aggregate is mapped to deck keys by position", () => {
  const spec = pollSpecByKey("pref_country_1")!;
  const result = parsePollResult(spec, {
    id: "p1",
    options: spec.options.map((option, index) => ({ text: option.text, voter_count: index === 0 ? 6 : 2 })),
    total_voter_count: 12,
    is_closed: true,
  });
  assert.equal(result.options.length, spec.options.length);
  assert.deepEqual(
    result.options.map((option) => option.key),
    spec.options.map((option) => option.key)
  );
  assert.equal(result.totalVoters, 12);
  assert.equal(result.closed, true);
  // Options no longer carry a renamed text: the deck key is the stable identity.
  const renamed = parsePollResult(spec, { options: [{ text: "Boshqa nom", voter_count: 3 }], total_voter_count: 3 });
  assert.equal(renamed.options[0].key, spec.options[0].key);
  assert.equal(renamed.options[0].text, "Boshqa nom");
});

check("a stored aggregate survives garbage", () => {
  assert.deepEqual(parseStoredResults("[]"), []);
  assert.deepEqual(parseStoredResults("not json"), []);
  assert.deepEqual(parseStoredResults(null), []);
  const parsed = parseStoredResults('[{"key":"a","text":"A","voters":2.7},{"nope":1}]');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].voters, 2.7);
  assert.equal(parsed[1].key, "option_1", "a row without a key still gets a stable placeholder");
});

check("only preference polls teach the planner", () => {
  const result = {
    options: [
      { key: "canada", text: "Kanada", voters: 3 },
      { key: "germany", text: "Germaniya", voters: 1 },
    ],
    totalVoters: 4,
    closed: true,
  };
  const pref = pollSpecByKey("pref_country_1")!;
  assert.equal(pollTeachesPrefs(pref), true);
  for (const type of ["multi", "self_assess", "this_or_that", "struggle", "stage", "feedback", "quiz_data"]) {
    const spec = POLL_DECK.find((entry) => entry.type === type)!;
    assert.equal(pollTeachesPrefs(spec), false, `${type} must not move a weight`);
    assert.deepEqual(prefUpdatesFromPoll(spec, result, {}), []);
  }
});

check("vote shares become 0.7/0.3-blended weights inside 0.5–2.0", () => {
  const spec = pollSpecByKey("pref_country_1")!;
  const result = {
    options: [
      { key: "canada", text: "Kanada", voters: 30 },
      { key: "germany", text: "Germaniya", voters: 10 },
      { key: "usa", text: "AQSh", voters: 0 },
      { key: "south_korea", text: "Koreya", voters: 0 },
    ],
    totalVoters: 40,
    closed: true,
  };
  const updates = prefUpdatesFromPoll(spec, result, { "country:canada": 1 });
  const byTopic = Object.fromEntries(updates.map((update) => [update.topic, update.weight]));
  assert.deepEqual(Object.keys(byTopic).sort(), ["country:canada", "country:germany", "country:south_korea", "country:usa"]);
  // share 0.75 × 4 options = 3 → 0.7×1 + 0.3×3 = 1.6
  assert.equal(byTopic["country:canada"], 1.6);
  // share 0.25 × 4 = 1 → 0.7 + 0.3 = 1.0
  assert.equal(byTopic["country:germany"], 1);
  // nobody voted for them: 0.7 × base, floored at 0.5
  assert.equal(byTopic["country:usa"], 0.7);
  // the current weight is the base, not always 1
  const again = prefUpdatesFromPoll(spec, result, { "country:canada": 1.5 });
  // 0.7 × 1.5 + 0.3 × 3 = 1.95 — the stored weight is the base, not always 1.
  assert.equal(again.find((update) => update.topic === "country:canada")!.weight, 1.95);
  for (const update of updates) assert.ok(update.weight >= 0.5 && update.weight <= 2);
});

check("a poll with no votes never moves a weight", () => {
  const spec = pollSpecByKey("pref_country_1")!;
  const empty = { options: spec.options.map((option) => ({ key: option.key, text: option.text, voters: 0 })), totalVoters: 0, closed: true };
  assert.equal(pollHasSignal(empty), false);
  assert.deepEqual(prefUpdatesFromPoll(spec, empty, {}), []);
  // An option key that cannot form a topic key is skipped, not guessed.
  assert.equal(prefTopicFor("", "canada"), null);
  assert.equal(prefTopicFor("Country:mixed", "canada"), null, "topic families are lowercase keys");
  assert.equal(prefTopicFor("country:mixed", "Not A Key"), null);
  assert.equal(prefTopicFor("country:mixed", "south_korea"), "country:south_korea");
});

check("poll option shares sum to 1 and clamp at the edges", () => {
  const spec = pollSpecByKey("pref_country_1")!;
  const result = {
    options: spec.options.map((option, index) => ({ key: option.key, text: option.text, voters: index === 0 ? 100 : 0 })),
    totalVoters: 100,
    closed: true,
  };
  const summary = optionSummary(result);
  const total = summary.reduce((sum, row) => sum + row.share, 0);
  assert.equal(Number(total.toFixed(6)), 1);
  // 100% of a 4-option poll is a strong (but clamped) signal.
  const updates = prefUpdatesFromPoll(spec, result, {});
  // 0.7 × 1 + 0.3 × (1.0 × 4 options) = 1.9 — strong, still inside the range.
  assert.equal(updates.find((update) => update.topic === "country:canada")!.weight, 1.9);
  const noVoters = optionSummary({ ...result, totalVoters: 0 });
  assert.equal(noVoters[0].share, 0, "0 voters must not divide by zero");
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
