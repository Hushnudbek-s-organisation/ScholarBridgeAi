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

import { CHANNEL_DDL, channelColumns, channelStatements } from "../src/lib/channel/ddl";
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
  channelEnvChecklist,
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
import {
  dictionaryLine,
  translateCoverage,
  translateEnglishRequirement,
  translateRequirements,
} from "../src/lib/channel/templates/translate.uz";
import {
  LEXICON_META,
  bundledGloss,
  lexiconSize,
  looksEnglish,
  lookup,
  translateFragment,
} from "../src/lib/channel/lexicon";
import { checkGloss } from "../src/lib/channel/lexicon/gloss";
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
  isCountryName,
  majorsUz,
} from "../src/lib/channel/templates/format";
import { lintText, plainText, visibleLength } from "../src/lib/channel/lint";
import { looksLikeChannelId, mergeChannelSettings, settingsFromRows, settingsRows } from "../src/lib/channel/settings";
import {
  APPROVAL_STATUS,
  APPROVAL_TEXTS,
  approvalCallbackData,
  approvalHeader,
  approvalKeyboard,
  approvalTtlHours,
  isApprovalCallback,
  parseApprovalCallback,
  splitApprovalParts,
  PARTS_SEPARATOR,
  CONSUMED_POST_STATUSES,
  sendablePlanRows,
} from "../src/lib/channel/approval";
import {
  INVITE_LINK_HINT,
  canonicalChannelId,
  normalizeChannelIdentifier,
} from "../src/lib/channel/config";
import { describeChannelTokenSource, pickChannelToken } from "../src/lib/channel/token";
import {
  CALLBACK_DATA_MAX,
  fallbackPlainText,
  isKeyboardError,
  isParseError,
  isUsableButtonUrl,
  recoveryAttempt,
  usableButtons,
  type SendAttempt,
} from "../src/lib/channel/recover";
import { isPublicSiteUrl } from "../src/lib/channel/connect";
import {
  DISCOVERY_TEXTS,
  channelCandidateFromUpdate,
  discoveryMessage,
  isNewDiscovery,
} from "../src/lib/channel/discovery";
import {
  cleanPriorityCountries,
  DEFAULT_CHANNEL_SETTINGS,
  DEFAULT_PRIORITY_COUNTRIES,
  parseDiscoveredChannel,
} from "../src/lib/channel/settings";
import { buildWhy, tickIsStale, waitingForWindow, whySummary } from "../src/lib/channel/why";
import { countryPriority, deadlineTier, editorialRank } from "../src/lib/channel/select";
import { AUTOPILOT_DEFAULT_MINUTES,
  AUTOPILOT_TEXTS,
  MODE_LABELS,
  autopilotEnabled,
  autopilotIntervalMinutes,
  cadenceLine,
  connectMessage,
  shouldKickAfterConnect,
} from "../src/lib/channel/autopilot";
import type { ChannelRuntime } from "../src/lib/channel/config";
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
    livingAllowance: null,
    travelAllowance: null,
    requirements: null,
    englishRequirements: null,
    tuitionCoverage: null,
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

/** Chrome for the card checks: tracked link, funding tag, footer. */
function cardChrome() {
  return {
    siteUrl: SITE,
    shortLink: { url: `${SITE}/go/card1`, visible: "scholarbridge.example/go/card1" },
    hashtags: ["grant", "toliq_moliyalashtiriladi"],
    footer: [{ label: "Kanal", url: "https://t.me/scholarbridge" }],
    variant: 0,
  };
}

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

check("the dictionary tables are declared for the database", () => {
  for (const table of ["translation_lexicon", "translation_lexicon_meta"]) {
    assert.ok(CHANNEL_DDL.includes(`CREATE TABLE IF NOT EXISTS ${table} (`), `${table} missing from DDL`);
    assert.ok(new RegExp(`pgTable\\(\\s*"${table}"`).test(read("src/db/schema.ts")), `${table} missing from drizzle schema`);
    assert.ok(read("supabase/add_channel.sql").includes(`CREATE TABLE IF NOT EXISTS ${table} (`), `${table} missing from the SQL file`);
  }
  assert.ok(
    read("src/lib/channel/lexicon/store.ts").includes("installLexicon"),
    "the dictionary must be installed by the channel bootstrap"
  );
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

check("the academic dictionary is bundled, and it knows the channel's terms", () => {
  assert.ok(lexiconSize() >= 12000, `dictionary too small: ${lexiconSize()}`);
  assert.equal(LEXICON_META.pages, 606, "dictionary page count changed — regenerate the asset");
  for (const [term, expected] of [
    ["program", "O'quv dasturi"],
    ["tuition", "O'qish to'lovi"],
    ["motivation letter", "motivatsion xat"],
    ["interview", "suhbat"],
    ["deadline", "Muddat"],
    ["full tuition", "To'liq kontrakt"],
  ] as const) {
    const entry = lookup(term);
    assert.ok(entry, `dictionary lost "${term}"`);
    assert.ok(
      entry.uz.toLowerCase().includes(expected.toLowerCase()),
      `"${term}" → "${entry.uz}", expected to contain "${expected}"`
    );
  }
});

check("the dictionary translates a fragment only when it knows every word", () => {
  const full = translateFragment("bachelor's degree and a motivation letter");
  assert.ok(full, "a fully-known fragment must translate");
  assert.equal(full.uz.toLowerCase().includes("bakalavr"), true, full.uz);
  assert.equal(full.uz.toLowerCase().includes("motivatsion"), true, full.uz);
  for (const token of full.uz.match(/[A-Za-z']+/g) ?? []) {
    assert.ok(!/^(the|and|or|of|must|required)$/i.test(token), `English leftover: ${token}`);
  }
  // One word we do not know cancels the whole fragment — never half a line.
  assert.equal(translateFragment("bachelor's degree and a snorkel"), null, "unknown word must cancel the fragment");
  assert.equal(translateFragment("candidates must hold a degree"), null, "unknown subject noun must cancel it");
  assert.equal(translateFragment(""), null, "empty input");
  // Numbers, amounts and test acronyms pass through instead of blocking.
  const withNumber = translateFragment("minimum GPA 3.2");
  assert.ok(withNumber, "numbers must not block a fragment");
  assert.ok(/3\.2/.test(withNumber.uz), withNumber.uz);
});

check("the dictionary extends the card with terms the patterns miss", () => {
  const sentence =
    "Strong academic record, English proficiency, a motivation letter and 3 recommendation letters from the applicant's professors.";
  const bullets = translateRequirements(sentence, { degrees: null, minGpa: null });
  const joined = bullets.join(" · ").toLowerCase();
  assert.ok(joined.includes("akademik"), `dictionary terms missing from the bullets: ${bullets.join(" | ")}`);
  assert.ok(joined.includes("tavsiyanoma"), `recommendation letters missing: ${bullets.join(" | ")}`);

  // Called on its own (as the card does when the patterns already spoke), the
  // dictionary bullet must not repeat them and must stay short.
  const line = dictionaryLine(sentence, ["Bakalavr darajasi", "Tavsiyanoma"]);
  assert.ok(line, "the dictionary found nothing in a term-heavy sentence");
  assert.ok(line.length <= 120, `dictionary bullet too long: ${line.length}`);
  assert.ok(!line.includes("Bakalavr"), `dictionary bullet repeats the degree: ${line}`);
  for (const word of line.match(/[A-Za-z][A-Za-z'-]{3,}/g) ?? []) {
    assert.ok(
      !/^(?:strong|academic|record|english|proficiency|motivation|letter|letters|recommendation|applicant)$/i.test(word),
      `English leaked into the dictionary bullet: ${word} (${line})`
    );
  }
  // A sentence with nothing the dictionary knows adds no bullet at all.
  assert.equal(dictionaryLine("Lorem ipsum dolor sit amet", []), null, "unknown prose must add nothing");

  // End to end: the card prints those terms in Uzbek and nothing English.
  const card = renderScholarshipSingle(
    facts({
      requirements:
        "Strong academic record, English proficiency, a motivation letter and 3 recommendation letters from the applicant's professors.",
      englishRequirements: "IELTS 6.5 or equivalent English test",
      tuitionCoverage: "Full tuition",
    }),
    0,
    cardChrome()
  );
  assert.ok(card, "card did not render");
  assertClean(card.html, "dictionary card");
  const text = plainText(card.html);
  assert.ok(/Akademik/i.test(text), `card lost the dictionary terms: ${text}`);
  for (const english of ["academic", "recommendation", "professors", "Strong"]) {
    assert.ok(!text.includes(english), `English leaked into the card: ${english}`);
  }
});

check("a reminder post carries the same Uzbek facts as the card", () => {
  /**
   * The real shape that prompted this: a verified award with English prose, no
   * stored IELTS/GPA and no allowances. Before, all four reminder variants were
   * a title, a date and "To'liq moliyalashtirish" — nothing a reader could act
   * on, and one variant did not even say who the award is for.
   */
  const proseOnly = facts({
    id: 437,
    title: "University of Waikato Doctoral Scholarship",
    country: "New Zealand",
    degreeLevels: '["PhD"]',
    eligibleMajors: '["All Majors"]',
    minGpa: null,
    minIelts: null,
    coverageType: "Full Tuition + Stipend",
    englishRequirements: "The scholarship sets no IELTS cutoff; the university's doctoral English-language requirements apply.",
    requirements: "Candidates must be a citizen of New Zealand or an international student with an Offer of Place.",
    tuitionCoverage: "Domestic tuition fees are covered for the tenure.",
    deadlineDate: "2026-11-04",
    deadlineType: "exact",
  });
  for (let v = 0; v < TEMPLATE_VARIANTS.urgency; v++) {
    const out = renderUrgency(proseOnly, 30, v, cardChrome());
    assert.ok(out, `reminder v${v} did not render`);
    assertClean(out.html, `reminder v${out.key}`, { allowUrgency: true });
    const text = plainText(out.html);
    assert.ok(/Til talabi/.test(text), `reminder v${v}: no language line — ${text}`);
    assert.ok(/Kimlar uchun/.test(text), `reminder v${v}: no eligibility block`);
    assert.ok(/Doktorantura/.test(text), `reminder v${v}: degree level missing`);
    // The same rule as the card: the English never reaches the channel.
    for (const english of ["cutoff", "Candidates must", "Domestic tuition", "Offer of Place"]) {
      assert.ok(!text.includes(english), `reminder v${v}: English leaked — ${english}`);
    }
  }
  // A record with no prose at all still renders a reminder, just a shorter one.
  const bare = facts({ minGpa: null, minIelts: null, requirements: null, englishRequirements: null });
  for (let v = 0; v < TEMPLATE_VARIANTS.urgency; v++) {
    const out = renderUrgency(bare, 30, v, cardChrome());
    assert.ok(out, `bare reminder v${v} did not render`);
    assertClean(out.html, `bare reminder v${out.key}`, { allowUrgency: true });
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
    "<b>Moliyalashtirish:</b> To'liq kontrakt + stipendiya\n<b>Til talabi:</b> IELTS 6.5",
    "<b>Kimlar uchun</b>\n➡️ Bakalavr yo'nalishi\n➡️ GPA 3.5 dan yuqori",
    "<b>Foydali tomonlari</b>\n➡️ Kontrakt to'liq qoplanadi\n➡️ Oylik stipendiya",
    "<b>Dastur haqida</b>\nDastur har yili 20 talabani qabul qiladi.",
    `⏰️<b>Oxirgi muddat:</b> 12-noyabr, 2026\n➡️Batafsil: <a href="${SITE}/go/${code}">scholarbridge.example/go/${code}</a>`,
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
  assert.ok(estimated.html.includes("⏰️<b>Muddat:</b> rasmiy sahifada ko'rsatilgan"));
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
  assert.ok(ranged.html.includes("⏰️<b>Taxminiy muddat:</b>"), "a range end is an estimate, not a deadline");
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

check("the panel's environment checklist never leaks the bot token", () => {
  const secret = "987654321:AAFakeTokenValueThatMustNeverBeShown123456";
  const rows = channelEnvChecklist({
    CHANNEL_AUTOPOST: "on",
    TELEGRAM_CHANNEL_ID: "@my_channel",
    TELEGRAM_ADMIN_CHAT_ID: "123456789",
    CHANNEL_SITE_URL: "https://example.org/",
    TELEGRAM_BOT_TOKEN: secret,
  });
  const token = rows.find((r) => r.key === "TELEGRAM_BOT_TOKEN");
  assert.ok(token, "the token must be listed");
  assert.equal(token!.set, true);
  assert.equal(token!.valid, true);
  assert.equal(token!.preview, null, "the token value is never returned");
  assert.ok(!JSON.stringify(rows).includes(secret), "no row may contain the secret");

  const site = rows.find((r) => r.key === "CHANNEL_SITE_URL");
  assert.equal(site!.preview, "https://example.org", "origins are normalised for display");
  const autopost = rows.find((r) => r.key === "CHANNEL_AUTOPOST");
  assert.equal(autopost!.set, true);
  assert.equal(autopost!.preview, "on");

  // Nothing set at all: every row is safe to render, none is "invalid".
  const empty = channelEnvChecklist({});
  assert.equal(empty.find((r) => r.key === "CHANNEL_AUTOPOST")!.set, false);
  assert.equal(empty.find((r) => r.key === "TELEGRAM_CHANNEL_ID")!.valid, false);
  assert.equal(empty.find((r) => r.key === "TELEGRAM_CHANNEL_ID")!.level, "required");
  // A malformed channel id is flagged, a typo'd autopost is not silently "on".
  const bad = channelEnvChecklist({ TELEGRAM_CHANNEL_ID: "my channel!!", CHANNEL_AUTOPOST: "ture" });
  assert.equal(bad.find((r) => r.key === "TELEGRAM_CHANNEL_ID")!.valid, false);
  assert.equal(bad.find((r) => r.key === "CHANNEL_AUTOPOST")!.preview, "off");
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
// Approval mode — read it before it goes public
// ---------------------------------------------------------------------------

section("Approval mode");

check("the panel can select approval, and it survives a settings round trip", () => {
  const merged = mergeChannelSettings({ connection: { mode: "approval" } });
  assert.equal(merged.connection.mode, "approval");
  assert.equal(mergeChannelSettings({ connection: { mode: "nonsense" } }).connection.mode, "off");
});

check("approval mode runs the publisher but never targets the channel", () => {
  const settings = mergeChannelSettings({
    connection: { mode: "approval", channelId: "-1001234567890", adminChatId: "123456789" },
    siteUrl: SITE,
  });
  const runtime = resolveChannelRuntime(settings, {});
  assert.equal(runtime.mode, "approval");
  assert.equal(runtime.blockedReason, null, "an approval deployment must be allowed to build and preview");
});

check("CHANNEL_AUTOPOST=off still kills approval mode", () => {
  const settings = mergeChannelSettings({
    connection: { mode: "approval", channelId: "-1001234567890", adminChatId: "123456789" },
    siteUrl: SITE,
  });
  const runtime = resolveChannelRuntime(settings, { CHANNEL_AUTOPOST: "off" });
  assert.equal(runtime.mode, "off");
  assert.equal(runtime.envKillSwitch, true);
  assert.match(runtime.blockedReason ?? "", /kill switch/i);
});

check("only the three documented buttons parse, and nothing else does", () => {
  assert.deepEqual(parseApprovalCallback("ch:ok:12"), { action: "approve", postId: 12 });
  assert.deepEqual(parseApprovalCallback("ch:no:12"), { action: "reject", postId: 12 });
  assert.deepEqual(parseApprovalCallback("ch:ed:12"), { action: "edit", postId: 12 });
  assert.equal(isApprovalCallback("ch:ok:12"), true);

  for (const bad of ["", "ch:ok:0", "ch:ok:-1", "ch:xx:12", "ch:ok:12 ", "ch:ok:12\n2", "ch:ok", "su:1:2", "ch:ok:9999999999"]) {
    assert.equal(parseApprovalCallback(bad), null, `must reject ${JSON.stringify(bad)}`);
  }
  // The student router's own callbacks must not be mistaken for approvals.
  assert.equal(isApprovalCallback("su:1:2"), false);
  assert.equal(isApprovalCallback(undefined), false);
});

check("callback data round-trips and fits Telegram's 64-byte budget", () => {
  for (const action of ["approve", "reject", "edit"] as const) {
    const data = approvalCallbackData(action, 123456789);
    assert.deepEqual(parseApprovalCallback(data), { action, postId: 123456789 });
    assert.ok(Buffer.byteLength(data, "utf8") <= 64);
  }
});

check("every approval carries approve, reject and edit", () => {
  const rows = approvalKeyboard(7);
  const flat = rows.flat();
  assert.deepEqual(flat.map((b) => b.callback_data), ["ch:ok:7", "ch:no:7", "ch:ed:7"]);
  assert.deepEqual(flat.map((b) => b.text), [
    APPROVAL_TEXTS.buttons.approve,
    APPROVAL_TEXTS.buttons.reject,
    APPROVAL_TEXTS.buttons.edit,
  ]);
  // Two rows: the decision is separated from the "do more work" action.
  assert.equal(rows.length, 2);
});

/* -------------------------------------------------------------------------- */
/* Phase 3: discovery, approval fallback, direct send                         */
/* -------------------------------------------------------------------------- */

check("the bot recognises the channel Telegram tells it about", () => {
  // 1. Promoted in a channel.
  const promoted = channelCandidateFromUpdate({
    my_chat_member: {
      chat: { id: -1001234567890, type: "channel", title: "ScholarBridge", username: "scholarbridge_uz" },
      new_chat_member: { status: "administrator", user: { is_bot: true } },
    },
  });
  assert.deepEqual(promoted, {
    id: "-1001234567890",
    title: "ScholarBridge",
    username: "scholarbridge_uz",
    source: "my_chat_member",
    botIsAdmin: true,
  });

  // 2. A post in a channel the bot manages.
  const posted = channelCandidateFromUpdate({
    channel_post: { chat: { id: -1009876543210, type: "channel", title: "Test" } },
  });
  assert.equal(posted?.id, "-1009876543210");
  assert.equal(posted?.source, "channel_post");

  // 3. An admin forwards a channel post to the bot (old and new Bot API shapes).
  const forwarded = channelCandidateFromUpdate({
    message: {
      chat: { id: 777000111, type: "private" },
      from: { id: 777000111, is_bot: false },
      forward_from_chat: { id: -1001111111111, type: "channel", title: "Forwarded" },
    },
  });
  assert.equal(forwarded?.source, "forward");
  assert.equal(forwarded?.botIsAdmin, false, "a forward says nothing about rights");
  const forwardedNew = channelCandidateFromUpdate({
    message: {
      chat: { id: 777000111, type: "private" },
      from: { id: 777000111, is_bot: false },
      forward_origin: { type: "channel", chat: { id: -1001111111111, type: "channel", title: "Forwarded" } },
    },
  });
  assert.equal(forwardedNew?.id, "-1001111111111");

  // Nothing that is not a channel may be adopted.
  assert.equal(
    channelCandidateFromUpdate({ my_chat_member: { chat: { id: -1001234567890, type: "supergroup" }, new_chat_member: { status: "administrator" } } }),
    null,
    "a supergroup is not a channel"
  );
  assert.equal(
    channelCandidateFromUpdate({ my_chat_member: { chat: { id: 777000111, type: "private" }, new_chat_member: { status: "member" } } }),
    null
  );
  assert.equal(
    channelCandidateFromUpdate({ my_chat_member: { chat: { id: -1001234567890, type: "channel" }, new_chat_member: { status: "left" } } }),
    null,
    "leaving is not a discovery"
  );
  // A forward *to* a group is not a private helper conversation.
  assert.equal(
    channelCandidateFromUpdate({
      message: {
        chat: { id: -1001234567890, type: "group" },
        from: { id: 5 },
        forward_from_chat: { id: -1009999999999, type: "channel" },
      },
    }),
    null
  );
  // An @username is never the candidate: it can be renamed.
  assert.equal(
    channelCandidateFromUpdate({ channel_post: { chat: { id: 0, type: "channel", username: "x" } } } as never),
    null
  );
});

check("discovery is reported once, and says what to do next", () => {
  const candidate = { id: "-1001234567890", title: "Kanal & Co", username: "kanal", source: "forward" as const, botIsAdmin: false };

  // A channel already configured is not news; neither is one already reported.
  assert.equal(isNewDiscovery(candidate, { channelId: "-1001234567890", discoveredId: null }), false);
  assert.equal(isNewDiscovery(candidate, { channelId: "", discoveredId: "-1001234567890" }), false);
  assert.equal(isNewDiscovery(candidate, { channelId: "-1009999999999", discoveredId: "-1001234567890" }), false);
  assert.equal(isNewDiscovery(candidate, { channelId: "", discoveredId: null }), true);
  assert.equal(isNewDiscovery(candidate, { channelId: "-1009999999999", discoveredId: null }), true);

  const message = discoveryMessage({ candidate, connected: false, mode: null, hasAdminChat: true });
  assert.match(message, /Kanal aniqlandi/);
  assert.match(message, /-1001234567890/, "the numeric id is the whole point");
  assert.match(message, /Kanal &amp; Co/, "the title is escaped");
  assert.match(message, /Admin panel/);

  // Adopted + approval mode: say which mode the operator now has.
  const adopted = discoveryMessage({ candidate, connected: true, mode: "approval", hasAdminChat: true });
  assert.match(adopted, /Tasdiqlash bilan/);
  // Adopted without an admin chat: approval has nowhere to go, say so.
  const noChat = discoveryMessage({ candidate, connected: true, mode: "approval", hasAdminChat: false });
  assert.match(noChat, /admin chat ID/i);
  // …and the same line appears when the mode stayed off for that reason, so the
  // reply never claims the channel is ready when nothing can be posted yet.
  const offNoChat = discoveryMessage({ candidate, connected: true, mode: "off", hasAdminChat: false });
  assert.match(offNoChat, /admin chat ID/i);

  // The bot is not an administrator: that must be said, or the first post fails.
  const notAdmin = discoveryMessage({
    candidate: { ...candidate, botIsAdmin: false },
    connected: true,
    mode: "approval",
    hasAdminChat: true,
  });
  assert.match(notAdmin, /administrator emas|«Post messages»/);

  // The stored candidate is validated, never trusted.
  assert.deepEqual(parseDiscoveredChannel({ id: "-1001234567890", title: "T", username: "@u", at: "2026-01-01T00:00:00.000Z" }), {
    id: "-1001234567890",
    title: "T",
    username: "u",
    at: "2026-01-01T00:00:00.000Z",
  });
  assert.equal(parseDiscoveredChannel({ id: "@username" }), null);
  assert.equal(parseDiscoveredChannel("nonsense"), null);
  assert.ok(DISCOVERY_TEXTS.nextInPanel.includes("Admin"));
});

check("the webhook subscribes to the updates discovery needs", () => {
  const route = readFileSync(join(import.meta.dirname, "..", "src/app/api/admin/telegram/route.ts"), "utf8");
  const setWebhook = route.slice(route.indexOf('"setWebhook"'), route.indexOf("drop_pending_updates"));
  for (const update of ["message", "callback_query", "my_chat_member", "channel_post", "poll", "poll_answer"]) {
    assert.ok(setWebhook.includes(`"${update}"`), `setWebhook must request ${update}`);
  }

  const service = readFileSync(join(import.meta.dirname, "..", "src/lib/telegram/service.ts"), "utf8");
  // Discovery must run before the generic message routing, or a forwarded post
  // is answered with the command list.
  const discoveryAt = service.indexOf("await handleChannelDiscovery(update)");
  const msgAt = service.indexOf("const msg = update.message;");
  assert.ok(discoveryAt > 0 && msgAt > discoveryAt, "discovery runs first");
  assert.match(service, /channel_post\?:/, "the update type is typed");

  const handler = readFileSync(join(import.meta.dirname, "..", "src/lib/telegram/channelDiscovery.ts"), "utf8");
  assert.match(handler, /approver\?\.isAdmin/, "only an admin may discover/connect");
  assert.match(handler, /adopt = !current\.channelId/, "an already-configured channel is never swapped");
  assert.match(handler, /nextMode/, "adopting picks a mode explicitly");
});

check("approval without an admin chat lands in the panel, not nowhere", () => {
  const sendSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/send.ts"), "utf8");
  // The preview failing must keep the post OPEN (awaiting_approval), because
  // that is the status the panel lists and can approve.
  assert.match(sendSrc, /panelOnlyApproval/, "a missing admin chat is not treated as fatal");
  assert.match(sendSrc, /status: APPROVAL_STATUS\.awaiting, error: APPROVAL_TEXTS\.panelOnly/);
  assert.match(sendSrc, /status: APPROVAL_STATUS\.awaiting, error: `preview_not_delivered/);
  // It must NOT be marked failed: failed is not in the panel's inbox.
  const approvalBlock = sendSrc.slice(sendSrc.indexOf("async function sendPlanRowForApproval"), sendSrc.indexOf("/** Claim a post for one actor"));
  assert.doesNotMatch(approvalBlock, /status: "failed"[\s\S]{0,40}channelPosts/, "no failed write inside the preview path");

  const actions = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/adminActions.ts"), "utf8");
  assert.match(actions, /blockedCode === "no_admin_chat"/, "the runner still builds the queue in that state");
  // …and send() itself must not skip on that same reason, or the run ends with
  // "attempted 1, approval 0" and nothing lands in the panel inbox.
  const blockPos = sendSrc.indexOf("const panelOnlyApproval");
  const guard = sendSrc.slice(blockPos, sendSrc.indexOf("/** Claim a post for one actor"));
  assert.match(guard, /blockedReason && !panelOnlyApproval/, "that one reason is exempt, the rest still block");
  // And the panel's approve path is the same function the Telegram button uses.
  const api = readFileSync(join(import.meta.dirname, "..", "src/app/api/admin/channel/route.ts"), "utf8");
  assert.match(api, /approveApproval\(postId, actor\)/, "the panel approves through the same guard");
});

check('"Hozir yuborish" publishes even in approval mode', () => {
  const actions = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/adminActions.ts"), "utf8");
  assert.match(actions, /direct: !opts\.toAdminChat/, "Send now bypasses the approval step, Test post does not");
  const sendSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/send.ts"), "utf8");
  assert.match(sendSrc, /opts\.direct && !opts\.toAdminChat \? \("on" as const\)/, "direct forces the channel");
  // A post that is *already* waiting for approval must be published by that
  // same press, not skipped with "waiting for approval" — the queue row shows
  // "Send now" for it too.
  assert.match(sendSrc, /if \(waiting\) return await approveApproval\(waiting\.id/, "send now publishes the waiting post");
  // The scheduled path must still go through the approval branch.
  assert.match(sendSrc, /if \(mode === "approval"\) \{\s*return await sendPlanRowForApproval/);
});

/* -------------------------------------------------------------------------- */
/* Posting order and "why is nothing being posted?"                           */
/* -------------------------------------------------------------------------- */

check("the nearest deadline is always posted before a closer favourite", () => {
  // A candidate pool where the *preferred* topic is far away and an unrelated
  // one closes this week: the near one must win, or the channel announces
  // scholarships the reader can no longer use.
  const near = {
    facts: { id: 1, country: "Germany", deadline: { quality: "exact" as const, daysLeft: 4, date: "2026-11-01" }, fullyFunded: false },
    topics: ["country:germany"],
  };
  const far = {
    facts: { id: 2, country: "United States", deadline: { quality: "exact" as const, daysLeft: 90, date: "2027-01-26" }, fullyFunded: true },
    topics: ["country:united-states"],
  };
  const order = editorialRank([far, near] as never, {
    prefs: { "country:united-states": 3 },
    priorities: ["United States", "Germany"],
    seed: "t",
  });
  assert.equal(order[0].candidate.facts.id, 1, "4 days left beats a 90-day favourite");

  // With both far away, the priority country decides — this is the second half
  // of the order the operator asked for.
  const germany = { facts: { id: 3, country: "Germany", deadline: { quality: "exact" as const, daysLeft: 80 }, fullyFunded: false }, topics: [] };
  const usa = { facts: { id: 4, country: "United States", deadline: { quality: "exact" as const, daysLeft: 80 }, fullyFunded: false }, topics: [] };
  const byCountry = editorialRank([germany, usa] as never, {
    prefs: {},
    priorities: ["United States", "Germany"],
    seed: "t",
  });
  assert.equal(byCountry[0].candidate.facts.id, 4, "the priority country wins when deadlines are equal");

  // Bands, not raw days: 8 days and 13 days are the same urgency for a reader.
  assert.equal(deadlineTier(near.facts as never), 0);
  assert.equal(deadlineTier(far.facts as never), 4);
  assert.equal(deadlineTier({ deadline: { quality: "exact", daysLeft: 8 } } as never), 1);
  assert.equal(deadlineTier({ deadline: { quality: "estimated", daysLeft: 30 } } as never), 6);
  assert.equal(deadlineTier({ deadline: { quality: "evergreen", daysLeft: null } } as never), 8);
});

check("the country order is read from the stored name, not the printed label", () => {
  /**
   * Regression: `editorialRank` fed `facts.country` — the *Uzbek* label — into
   * `countryPriority`, which matches English names. Every country therefore
   * scored "not in the list" (14) and the operator's order did nothing at all.
   */
  const dates = { now: new Date("2026-10-29T12:00:00Z"), siteUrl: "https://example.test" };
  const make = (country: string, id: number) =>
    buildFacts(
      {
        id,
        title: "T",
        provider: "P",
        country,
        deadlineDate: "2026-11-05",
        deadlineType: "fixed",
        isActive: true,
        verificationStatus: "verified",
        lastVerifiedAt: "2026-10-26",
      } as never,
      dates
    );
  const japan = make("Japan", 1);
  const usa = make("United States", 2);
  const list = DEFAULT_PRIORITY_COUNTRIES;
  assert.equal(japan.country, "Yaponiya", "the label is Uzbek");
  assert.equal(usa.country, "AQSh");
  // The stored name ranks correctly…
  assert.equal(countryPriority(japan.countryRaw, list), 4);
  assert.equal(countryPriority(usa.countryRaw, list), 0);
  // …and the label must not quietly rank last either (defence in depth).
  assert.equal(countryPriority(japan.country, list), 4, "the Uzbek label resolves too");
  assert.equal(countryPriority(usa.country, list), 0);
  assert.equal(countryPriority("Yangi Zelandiya", list), list.length, "an unlisted country stays unlisted");
});

check("inside an urgency band, the nearest deadline still wins", () => {
  /**
   * The other half of the operator's rule: the country order breaks ties, it
   * does not let a favourite country jump a nearer award. Both are tier 0.
   */
  const nearNz = {
    facts: { id: 10, country: "Yangi Zelandiya", countryRaw: "New Zealand", deadline: { quality: "exact" as const, daysLeft: 1 } },
    topics: [],
  };
  const farUs = {
    facts: { id: 11, country: "AQSh", countryRaw: "United States", deadline: { quality: "exact" as const, daysLeft: 6 } },
    topics: [],
  };
  const order = editorialRank([farUs, nearNz] as never, {
    prefs: {},
    priorities: DEFAULT_PRIORITY_COUNTRIES,
    seed: "t",
  });
  assert.equal(order[0].candidate.facts.id, 10, "a 1-day award beats a 6-day favourite");
  // Same deadline → the favourite country comes first, every time.
  const sameDay = editorialRank(
    [
      { facts: { id: 12, country: "Yangi Zelandiya", countryRaw: "New Zealand", deadline: { quality: "exact" as const, daysLeft: 3 } }, topics: [] },
      { facts: { id: 13, country: "Germaniya", countryRaw: "Germany", deadline: { quality: "exact" as const, daysLeft: 3 } }, topics: [] },
    ] as never,
    { prefs: {}, priorities: DEFAULT_PRIORITY_COUNTRIES, seed: "t" }
  );
  assert.equal(sameDay[0].candidate.facts.id, 13, "Germany (priority 2) is ahead of New Zealand (unlisted)");
});

check("when two awards close the same day, the favourite country gets the urgency post", () => {
  // Same deadline, one country in the operator's list and one not. The urgent
  // lane used to tie-break on the topic score, so the winner depended on
  // rotation history rather than on what the audience applies to.
  const mk = (id: number, countryRaw: string, label: string) => ({
    id,
    title: `T${id}`,
    provider: "P",
    country: countryRaw,
    degreeLevels: '["Master\'s"]',
    deadlineDate: "2026-11-12",
    deadlineType: "fixed",
    coverageType: "Full Tuition",
    awardBasis: null,
    rounds: null,
    recurrence: null,
    eligibleCountries: "[]",
    isActive: true,
    verificationStatus: "verified",
    lastVerifiedAt: "2026-10-26",
    __label: label,
  });
  const now = new Date("2026-11-10T12:00:00+05:00");
  const candidates = [mk(60, "Thailand", "Thailand"), mk(61, "Germany", "Germany")].map((r) => ({
    facts: buildFacts(r as never, { now, siteUrl: "https://example.test" }),
    topics: topicKeys({ country: r.country, degreeLevels: r.degreeLevels, eligibleMajors: null, fullyFunded: true }),
  }));
  const settings = mergeChannelSettings({ plan: { dailyCap: 1, budgetMin: 1, budgetMax: 1 } });
  const plan = buildDailyPlan({ planDate: "2026-11-10", candidates, settings });
  assert.equal(plan[0]?.kind, "urgency", `expected an urgency post, got ${plan[0]?.kind}`);
  assert.equal(plan[0]?.scholarshipId, 61, "Germany (priority 2) must take the urgency slot over unlisted Thailand");
});

check("the real catalogue slice is planned nearest-deadline-first", () => {
  // A 45-row excerpt of the live Supabase catalogue (2026-10-29), used as a
  // fixture so the ordering rules are checked against real data, not invented
  // numbers. Regenerate with the SQL in docs/CHANNEL.md §4d.
  const slice = JSON.parse(read("scripts/fixtures/catalogue-slice.json")) as { rows: FactsRow[] };
  const now = new Date("2026-10-29T15:00:00+05:00");
  const candidates = slice.rows
    .filter((row) => publishable(row as never, now).ok)
    .map((row) => ({
      facts: buildFacts(row, { now, siteUrl: "https://example.test" }),
      topics: topicKeys({
        country: row.country,
        degreeLevels: row.degreeLevels,
        eligibleMajors: row.eligibleMajors,
        fullyFunded: isFullyFunded(row as never),
      }),
    }));
  assert.ok(candidates.length >= 40, `only ${candidates.length} candidates survived the gate`);

  const plan = buildDailyPlan({ planDate: "2026-10-30", candidates, settings: DEFAULT_CHANNEL_SETTINGS });
  const scholarshipItems = plan.filter((item) => item.scholarshipId !== null);
  assert.ok(scholarshipItems.length >= 1, "the slice produced no post");

  const chosen = candidates.find((c) => c.facts.id === scholarshipItems[0].scholarshipId);
  const nearest = Math.min(...candidates.map((c) => c.facts.deadline.daysLeft ?? Infinity));
  assert.equal(chosen?.facts.deadline.daysLeft, nearest, "the first post is not the nearest deadline");
  // The whole plan is non-decreasing in days-left, ignoring the poll.
  const days = scholarshipItems.map(
    (item) => candidates.find((c) => c.facts.id === item.scholarshipId)?.facts.deadline.daysLeft ?? Infinity
  );
  assert.deepEqual(days, [...days].sort((a, b) => a - b), `the plan is not nearest-first: ${days.join(", ")}`);
  // And nothing unverified/inactive ever enters it (the fixture is all-verified,
  // so this asserts the gate ran, not the fixture).
  for (const row of slice.rows) {
    const check = publishable(row as never, now);
    assert.equal(check.ok, true, `${row.id} should be publishable: ${check.reason}`);
  }
});

check("country priority tolerates how the country is actually spelled", () => {
  const list = ["United States", "Germany", "South Korea"];
  assert.equal(countryPriority("United States", list), 0);
  assert.equal(countryPriority("usa", list), 0, "the alias table knows USA");
  assert.equal(countryPriority("US", list), 0);
  assert.equal(countryPriority("Korea", list), 2, "Korea is South Korea");
  assert.equal(countryPriority("United States of America", list), 0);
  assert.equal(countryPriority("germany", list), 1, "case does not matter");
  assert.equal(countryPriority("Canada", list), list.length, "unlisted countries sort after");
  assert.equal(countryPriority(null, list), list.length + 1, "no country sorts last");
  assert.equal(countryPriority("Canada", []), 0, "an empty list has no influence");

  // The operator's list is cleaned, never trusted.
  assert.deepEqual(cleanPriorityCountries("Germany\n usa ,  germany ", []), ["Germany", "usa"]);
  assert.deepEqual(cleanPriorityCountries(undefined, DEFAULT_PRIORITY_COUNTRIES), [...DEFAULT_PRIORITY_COUNTRIES]);
  assert.deepEqual(cleanPriorityCountries([], ["X"]), [], "an empty list is a valid choice");
  assert.equal(cleanPriorityCountries(Array.from({ length: 50 }, (_, i) => `C${i}`), []).length, 30);
});

/** A healthy snapshot; each test breaks exactly one field. */
function whyInput(overrides: Record<string, unknown> = {}) {
  return {
    now: new Date("2026-10-28T09:30:00.000Z"),
    mode: "approval" as const,
    pausedUntil: null,
    envAutopost: null,
    hasToken: true,
    channelId: "-1009876543210",
    adminChatId: "777000111",
    siteUrl: "https://example.org",
    connection: {
      channelConfigured: true,
      channelReachable: true,
      channelType: "channel",
      canPost: true,
      adminChatReachable: true,
    },
    catalogue: { total: 20, active: 18, verified: 12, stale: 2, publishable: 10, withExactDeadline: 6 },
    plan: { date: "2026-10-28", planned: 2, open: 1, sent: 1, awaiting: 0, nextSendAt: "18:30" },
    tick: { lastTickAt: new Date("2026-10-28T09:00:00.000Z"), intervalMinutes: 15 },
    lastDeliveredAt: new Date("2026-10-28T09:05:00.000Z"),
    lastFailure: null,
    ...overrides,
  };
}

check('"why is nothing being posted?" names the one thing to fix', () => {
  // Healthy: nothing blocks, and the next send time is reported.
  const healthy = buildWhy(whyInput() as never);
  assert.equal(healthy.ready, true);
  assert.equal(healthy.blocked, null);
  assert.equal(healthy.nextSendAt, "18:30");

  // Every block, one at a time, and the code that names it.
  const cases: [Record<string, unknown>, string][] = [
    [{ hasToken: false }, "token_missing"],
    [{ envAutopost: "off" }, "env_off"],
    [{ mode: "off" }, "mode_off"],
    [{ pausedUntil: "2026-11-05" }, "paused"],
    [{ channelId: "" }, "channel_missing"],
    [{ connection: { channelConfigured: true, channelReachable: false, channelType: null, canPost: false, adminChatReachable: true } }, "channel_unreachable"],
    [{ connection: { channelConfigured: true, channelReachable: true, channelType: "supergroup", canPost: false, adminChatReachable: true } }, "channel_wrong_type"],
    [{ connection: { channelConfigured: true, channelReachable: true, channelType: "channel", canPost: false, adminChatReachable: true } }, "no_post_permission"],
    [{ adminChatId: "" }, "admin_chat_missing"],
    [{ catalogue: { total: 0, active: 0, verified: 0, stale: 0, publishable: 0, withExactDeadline: 0 } }, "catalogue_empty"],
    [{ catalogue: { total: 20, active: 18, verified: 0, stale: 0, publishable: 0, withExactDeadline: 0 } }, "catalogue_stale"],
  ];
  for (const [patch, expected] of cases) {
    const verdict = buildWhy(whyInput(patch) as never);
    assert.equal(verdict.ready, false, expected);
    assert.equal(verdict.blocked?.id, expected, `expected ${expected}, got ${verdict.blocked?.id}`);
    assert.equal(whySummary(verdict).startsWith(`blocked:${expected}`), true);
  }

  // A pause that already ended is not a pause.
  assert.equal(buildWhy(whyInput({ pausedUntil: "2026-10-01" }) as never).blocked, null);
});

check("a thin catalogue and a silent scheduler are reported, not hidden", () => {
  // The catalogue answer: "is the data the problem?"
  const thin = buildWhy(whyInput({ catalogue: { total: 4, active: 4, verified: 2, stale: 0, publishable: 2, withExactDeadline: 0 } }) as never);
  assert.equal(thin.ready, true, "two publishable programmes still post");
  assert.ok(thin.warnings.some((w) => w.id === "catalogue_no_deadlines"), "no exact deadline is worth saying");

  // The scheduler answer: nothing has ticked for hours.
  const stale = buildWhy(
    whyInput({ tick: { lastTickAt: new Date("2026-10-27T18:00:00.000Z"), intervalMinutes: 15 } }) as never
  );
  assert.ok(stale.warnings.some((w) => w.id === "cron_stale"), "a stale tick is the classic cause");
  assert.equal(tickIsStale({ lastTickAt: null, intervalMinutes: 15 }, new Date()), true, "never having ticked counts as stale");
  assert.equal(
    tickIsStale({ lastTickAt: new Date("2026-10-28T09:20:00.000Z"), intervalMinutes: 15 }, new Date("2026-10-28T09:30:00.000Z")),
    false,
    "ten minutes on a 15-minute interval is fine"
  );

  // The window answer: the plan exists, the post is simply not due yet.
  const waiting = buildWhy(whyInput() as never);
  assert.ok(waiting.steps.some((s) => s.id === "waiting_for_time"));
  assert.equal(waitingForWindow("18:30", new Date("2026-10-28T10:00:00.000Z")), true); // 15:00 in Tashkent
  assert.equal(waitingForWindow("18:30", new Date("2026-10-28T14:00:00.000Z")), false); // 19:00 in Tashkent

  // A quiet day explains an empty plan, and is not a failure.
  const quiet = buildWhy(whyInput({ plan: { date: "2026-11-01", planned: 0, open: 0, sent: 0, awaiting: 0, nextSendAt: null } }) as never);
  assert.equal(quiet.ready, true);
});

check("the welcome message never reports normal operation as a fault", () => {
  const boot = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/boot.ts"), "utf8");
  assert.match(boot, /const BENIGN_SKIP = \["Waiting for approval in the admin chat", "Already sent earlier"\]/);
  assert.match(boot, /BENIGN_SKIP\.some/, "the kick skips those before calling it a problem");
});

check("the diagnosis offers the fix where there is one", () => {
  const ui = readFileSync(join(import.meta.dirname, "..", "src/components/admin/ChannelManager.tsx"), "utf8");
  // Mode Off is the default after install and the most common silence; it gets
  // a button, and that button never goes straight to Live.
  assert.match(ui, /why\?\.why\.blocked\?\.id === "mode_off"/);
  assert.match(ui, /mode: conn\.mode === "off" \? \("approval" as const\) : conn\.mode/);
  assert.match(ui, /why\?\.why\.blocked\?\.id === "plan_empty"/);
  // The verdict comes with the first load (server-side `?why=1`), not from a
  // setState-in-effect, which the lint gate rejects.
  assert.match(ui, /withWhy \? "why=1" : ""/);
  assert.match(ui, /void load\(false, true\)/);
  const route = readFileSync(join(import.meta.dirname, "..", "src/app/api/admin/channel/route.ts"), "utf8");
  assert.match(route, /url\.searchParams\.get\("why"\) === "1"/);
  assert.match(route, /why: wantWhy \? await whyPayload\(\) : null/);
});

check("the cron endpoint can be driven by an uptime monitor", () => {
  const route = readFileSync(join(import.meta.dirname, "..", "src/app/api/cron/channel/route.ts"), "utf8");
  // A monitor that can only call a URL still has to authenticate — and the
  // comparison must stay constant-time.
  assert.match(route, /url\.searchParams\.get\("secret"\)/);
  assert.match(route, /safeEqual\(provided, `Bearer \$\{secret\}`\)/);
  assert.match(route, /recordTick\("cron"/, "every tick leaves a heartbeat");
  // A deliberate switch must not turn the monitor red.
  assert.match(route, /skipped: true, code: runtime\.blockedCode/, "off/paused answers 200 with a reason");
  // Approval without an admin chat still has to build the queue.
  assert.match(route, /runtime\.blockedCode === "no_admin_chat"/);
  const boot = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/boot.ts"), "utf8");
  assert.match(boot, /recordTick\("loop"/, "the in-process loop leaves one too");
  assert.match(boot, /blockedCode === "no_admin_chat"/, "…and does not skip the panel queue");
});

/* -------------------------------------------------------------------------- */
/* Phase 4: the quick-connect wizard                                          */
/* -------------------------------------------------------------------------- */

check("the quick-connect field parses with the server's own normaliser", () => {
  const ui = readFileSync(join(import.meta.dirname, "..", "src/components/admin/ChannelManager.tsx"), "utf8");
  // One parser, not two: if the panel re-implemented the rules they would drift
  // and the live preview would promise something the server refuses.
  assert.match(ui, /import \{ normalizeChannelIdentifier \} from "@\/lib\/channel\/config"/);
  assert.equal((ui.match(/normalizeChannelIdentifier\(/g) ?? []).length >= 2, true, "used in preview and on submit");

  // The preview must be live (derived from state), not a message after saving.
  assert.match(ui, /const quickParsed = useMemo\(\(\) => normalizeChannelIdentifier\(quick\), \[quick\]\)/);
  // The button is dead until the address is usable.
  assert.match(ui, /disabled=\{!quickParsed\.ok \|\| saving \|\| busy\}/);

  // Every rejection the normaliser can produce has its own sentence, and the
  // invite-link one says what to do instead.
  for (const key of ["errEmpty", "errInvite", "errNotChannel"]) assert.ok(ui.includes(`connect.quick.${key}`), key);
  assert.match(ui, /quickParsed\.reason === "invite_link"/);

  // Connecting from the wizard must not leave the publisher off (nothing would
  // ever be sent) nor start publishing unread: approval is the only choice that
  // does both.
  assert.match(ui, /mode: conn\.mode === "off" \? \("approval" as const\) : conn\.mode/);
  // …and the @username is kept in brand so the bot link can be built.
  assert.match(ui, /channelUsername: parsed\.value\.replace\(\/\^@\/, ""\)/);
  // One press = save + the five-step check.
  assert.match(ui, /await act\("verify"\)/);
});

check("a failing step is shown as an instruction, not as a code", () => {
  const ui = readFileSync(join(import.meta.dirname, "..", "src/components/admin/ChannelManager.tsx"), "utf8");
  // The red list is built only from steps the server actually failed, and each
  // one carries the translated sentence — which is where @bot_username appears.
  assert.match(ui, /const failing = steps\.filter\(\(step\) => !step\.ok && step\.message\)/);
  assert.match(ui, /connect\.quick\.fixTitle/);
  assert.match(ui, /connect\.quick\.ready/);

  const messages = JSON.parse(readFileSync(join(import.meta.dirname, "..", "src/i18n/messages/uz.json"), "utf8"));
  const diag = messages.adminChannel.connect.diag as Record<string, string>;
  // The two errors an operator actually hits must name the bot by @username,
  // because "the bot is not an administrator" is useless without knowing which.
  assert.match(diag.bot_not_admin, /\{botUsername\}/);
  assert.match(diag.no_post_permission, /\{botUsername\}/);
  assert.match(diag.bot_not_admin, /Post messages/);
  // Every connection code the server can return has a sentence in every language.
  const codes = [
    "ok",
    "token_missing",
    "token_invalid",
    "channel_missing",
    "channel_invalid",
    "channel_not_found",
    "channel_wrong_type",
    "bot_not_admin",
    "no_post_permission",
    "admin_chat_missing",
    "admin_chat_unreachable",
    "site_missing",
    "site_not_public",
  ];
  for (const lang of ["uz", "ru", "en"]) {
    const d = JSON.parse(readFileSync(join(import.meta.dirname, "..", `src/i18n/messages/${lang}.json`), "utf8"))
      .adminChannel.connect.diag as Record<string, string>;
    for (const code of codes) {
      assert.equal(typeof d[code], "string", `${lang}: diag.${code} is missing`);
      // "ok" is a one-word verdict; the others must actually explain the fix.
      if (code !== "ok") assert.ok(d[code].length > 10, `${lang}: diag.${code} says nothing`);
    }
  }
});

check("the quick-connect wizard is translated everywhere", () => {
  const langs = ["uz", "ru", "en"] as const;
  const read = (l: string) =>
    JSON.parse(readFileSync(join(import.meta.dirname, "..", `src/i18n/messages/${l}.json`), "utf8")).adminChannel.connect.quick as Record<
      string,
      string
    >;
  const uz = read("uz");
  const keys = Object.keys(uz).sort();
  assert.ok(keys.length >= 15, `found ${keys.length} keys`);
  for (const lang of langs) {
    const block = read(lang);
    assert.deepEqual(Object.keys(block).sort(), keys, `${lang}: key parity`);
    for (const [key, value] of Object.entries(block)) {
      assert.equal(typeof value, "string", `${lang}.${key}`);
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
      const placeholder = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");
      assert.equal(placeholder(value), placeholder(uz[key]), `${lang}.${key}: placeholders`);
    }
  }
});

/* -------------------------------------------------------------------------- */
/* Phase 2: connection diagnostics, button URLs, send recovery                 */
/* -------------------------------------------------------------------------- */

check("a button URL is only usable when Telegram will accept it", () => {
  // The failure this exists for: a deployment configured with the dev origin.
  assert.equal(isUsableButtonUrl("http://localhost:3000/go/abc"), false);
  assert.equal(isUsableButtonUrl("https://localhost:3000/go/abc"), false);
  assert.equal(isUsableButtonUrl("https://127.0.0.1/go/abc"), false);
  assert.equal(isUsableButtonUrl("https://192.168.1.5/x"), false);
  assert.equal(isUsableButtonUrl("https://10.0.0.4/x"), false);
  assert.equal(isUsableButtonUrl("http://example.org/x"), false, "https only");
  assert.equal(isUsableButtonUrl("/go/abc"), false, "relative");
  assert.equal(isUsableButtonUrl("example.org"), false);
  assert.equal(isUsableButtonUrl(""), false);
  assert.equal(isUsableButtonUrl(null), false);
  assert.equal(isUsableButtonUrl("https://example.org/go/abc"), true);
  assert.equal(isUsableButtonUrl("https://t.me/scholarbridge"), true);
});

check("unusable buttons are dropped, the rest of the keyboard survives", () => {
  const rows = [
    [
      { text: "✅ Tasdiqlash", callback_data: "ch:ok:1" },
      { text: "Sayt", url: "http://localhost:3000/" },
    ],
    [{ text: "Mini App", web_app: { url: "https://localhost/app" } }],
    [{ text: "Kanal", url: "https://t.me/scholarbridge" }],
  ];
  const { rows: clean, dropped } = usableButtons(rows);
  assert.deepEqual(
    clean.map((row) => row.map((b) => b.text)),
    [["✅ Tasdiqlash"], ["Kanal"]],
    "the decision button keeps working, the broken row disappears"
  );
  assert.equal(dropped.length, 2);
  assert.ok(dropped.some((d) => d.includes("url:http://localhost:3000/")));
  assert.ok(dropped.some((d) => d.startsWith("web_app:")));

  // A row that becomes empty is removed, not rendered as a gap.
  assert.deepEqual(usableButtons([[{ text: "x", url: "http://localhost/" }]]).rows, []);

  // Telegram's own limits are enforced before the request, not by a 400.
  const long = usableButtons([[{ text: "a".repeat(100), url: "https://example.org" }]]);
  assert.equal(long.rows[0][0].text.length, 64);
  const bigCallback = usableButtons([[{ text: "x", callback_data: "c".repeat(CALLBACK_DATA_MAX + 1) }]]);
  assert.deepEqual(bigCallback.rows, []);
});

check("the recovery ladder keeps a post that is only badly formatted", () => {
  // "wrong HTTP URL" / BUTTON_URL_INVALID → drop the keyboard, keep the text.
  for (const description of [
    "Bad Request: BUTTON_URL_INVALID",
    "Bad Request: Inline keyboard button URL is invalid",
    "Bad Request: wrong HTTP URL",
    "Bad Request: REPLY_MARKUP_INVALID",
  ]) {
    assert.equal(isKeyboardError(description), true, description);
  }
  const withKeys: SendAttempt = { kind: "html", text: "<b>x</b>", withKeyboard: true };
  assert.deepEqual(recoveryAttempt(withKeys, "Bad Request: BUTTON_URL_INVALID"), {
    kind: "html",
    text: "<b>x</b>",
    withKeyboard: false,
  });

  // "can't parse entities" → plain text, still with the keyboard.
  assert.equal(isParseError("Bad Request: can't parse entities: Unclosed start tag at byte offset 12"), true);
  assert.equal(isParseError('Bad Request: unsupported start tag "span" at byte offset 3'), true);
  assert.deepEqual(recoveryAttempt(withKeys, "Bad Request: can't parse entities"), {
    kind: "plain",
    text: "x",
    withKeyboard: true,
  });

  // Not recoverable: retrying the same content would only waste a request.
  assert.equal(recoveryAttempt(withKeys, "Forbidden: bot was blocked by the user"), null);
  assert.equal(recoveryAttempt(withKeys, "Bad Request: chat not found"), null);
  assert.equal(recoveryAttempt(withKeys, undefined), null);
  // A plain-text attempt cannot fall further.
  assert.equal(recoveryAttempt({ kind: "plain", text: "x", withKeyboard: false }, "can't parse entities"), null);

  // The fallback text is readable, not a pile of tags.
  assert.equal(fallbackPlainText("<b>Kanal</b> &amp; <a href=\"https://x.org\">Bot</a>"), "Kanal & Bot");
});

check("every send path goes through the recovery ladder", () => {
  const sendSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/send.ts"), "utf8");
  assert.match(sendSrc, /async function sendMessageWithRecovery/, "one helper owns the retry logic");
  // Both the plain and the keyboard send must go through it: every raw
  // `sendMessage` in the file has to sit inside the helper (the 429 retry is
  // the second one, and it reuses the same body).
  const helperStart = sendSrc.indexOf("async function sendMessageWithRecovery");
  const helperEnd = sendSrc.indexOf("async function sendPart(");
  assert.ok(helperStart > 0 && helperEnd > helperStart, "the helper must exist on its own");
  const outside = [...sendSrc.slice(0, helperStart), ...sendSrc.slice(helperEnd)].filter((chunk) =>
    chunk.includes('"sendMessage"')
  );
  assert.deepEqual(outside, [], "no sendMessage call may bypass the recovery ladder");
  assert.match(sendSrc, /usableButtons\(initialButtons\)/, "buttons are validated before the request");
  assert.match(sendSrc, /recoveryAttempt\(attempt, last\.description\)/, "failures try the documented fallbacks");
  assert.match(sendSrc, /async function sendPartWithKeyboard[\s\S]*sendMessageWithRecovery/, "keyboard sends use it too");
});

check("the connection check reports five translatable steps", () => {
  const connectSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/connect.ts"), "utf8");
  // Each step is a code, not an English sentence: the panel translates it.
  for (const code of [
    "token_missing",
    "token_invalid",
    "channel_missing",
    "channel_invalid",
    "channel_not_found",
    "channel_wrong_type",
    "bot_not_admin",
    "no_post_permission",
    "admin_chat_missing",
    "admin_chat_unreachable",
    "site_missing",
    "site_not_public",
  ]) {
    assert.ok(connectSrc.includes(code), `missing code ${code}`);
  }
  // The permission message has to name the bot: "make it admin" is useless without it.
  assert.match(connectSrc, /botUsername: botName/, "the bot's @username is passed to the message");
  // A group/supergroup id is refused instead of silently accepted.
  assert.match(connectSrc, /channel_wrong_type/, "non-channel ids are reported");
  // …and the resolved numeric id can be pinned by the explicit verify action.
  assert.match(connectSrc, /export async function saveResolvedChannel/);

  const route = readFileSync(join(import.meta.dirname, "..", "src/app/api/admin/channel/route.ts"), "utf8");
  assert.match(route, /saveResolvedChannel\(connection\.channel\.id, actor\)/, "verify stores the resolved id");

  const panel = readFileSync(join(import.meta.dirname, "..", "src/components/admin/ChannelManager.tsx"), "utf8");
  assert.match(panel, /t\(`diag\.\$\{step\.code\}`/, "the panel translates the code");

  // Every code has a message in all three locales.
  for (const locale of ["uz", "ru", "en"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${locale}.json`));
    const diag = messages.adminChannel?.connect?.diag ?? {};
    for (const code of ["token_missing", "channel_not_found", "bot_not_admin", "no_post_permission", "site_not_public"]) {
      assert.ok(typeof diag[code] === "string" && diag[code].length > 10, `${locale}: diag.${code}`);
    }
    assert.ok(messages.adminChannel?.steps?.permission, `${locale}: steps.permission`);
  }
});

check("a local site URL is called out before it costs a post", () => {
  assert.equal(isPublicSiteUrl("https://example.org"), true);
  assert.equal(isPublicSiteUrl("http://example.org"), true);
  assert.equal(isPublicSiteUrl("http://localhost:3000"), false);
  assert.equal(isPublicSiteUrl("https://127.0.0.1:3000"), false);
  assert.equal(isPublicSiteUrl("http://intranet"), false);
  assert.equal(isPublicSiteUrl(""), false);
  assert.equal(isPublicSiteUrl(null), false);
});

/* -------------------------------------------------------------------------- */
/* Phase 1: identifiers, tokens, schema shape                                 */
/* -------------------------------------------------------------------------- */

check("a pasted channel link becomes the id Telegram accepts", () => {
  const eq = (raw: string, want: string, kind: "id" | "username") => {
    const result = normalizeChannelIdentifier(raw);
    assert.ok(result.ok, `${raw} should be accepted`);
    assert.equal(result.value, want, `${raw} → ${result.value}`);
    assert.equal(result.kind, kind, `${raw} kind`);
  };

  eq("https://t.me/scholarbridge", "@scholarbridge", "username");
  eq("http://t.me/scholarbridge", "@scholarbridge", "username");
  eq("t.me/scholarbridge", "@scholarbridge", "username");
  eq("telegram.me/scholarbridge", "@scholarbridge", "username");
  eq("https://t.me/s/scholarbridge", "@scholarbridge", "username"); // web preview link
  eq("https://t.me/scholarbridge/", "@scholarbridge", "username"); // trailing slash
  eq("https://t.me/scholarbridge?single=1", "@scholarbridge", "username"); // query
  eq("scholarbridge_uz", "@scholarbridge_uz", "username"); // bare username
  eq("@scholarbridge_uz", "@scholarbridge_uz", "username");
  eq("  @scholarbridge_uz  ", "@scholarbridge_uz", "username"); // pasted with spaces
  eq("\u200B@scholarbridge_uz", "@scholarbridge_uz", "username"); // zero-width junk
  eq("-1001234567890", "-1001234567890", "id");
  eq("-1009876543210", "-1009876543210", "id");
  // A message link carries the internal id, which Telegram wants with the -100 prefix.
  eq("https://t.me/c/1234567890/42", "-1001234567890", "id");
  eq("t.me/c/1234567890", "-1001234567890", "id");
});

check("an invite link is refused with a fix, not with silence", () => {
  for (const raw of ["https://t.me/+AbCdEfGhIjK", "t.me/+AbCdEfGhIjK", "t.me/joinchat/AAAAAExyz", "https://t.me/joinchat/AAAAAExyz"]) {
    const result = normalizeChannelIdentifier(raw);
    assert.equal(result.ok, false, raw);
    if (result.ok) continue;
    assert.equal(result.reason, "invite_link", raw);
    // The hint has to say what to do instead — that was the whole complaint.
    assert.match(result.hint, /taklif havolasini emas/, raw);
    assert.match(result.hint, /-100/, raw);
    assert.match(result.hint, /forward/, raw);
    assert.equal(result.hint, INVITE_LINK_HINT);
  }
});

check("junk is separated from a real channel reference", () => {
  const empty = normalizeChannelIdentifier("");
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.reason, "empty");
  assert.equal(normalizeChannelIdentifier(null).ok, false);
  assert.equal(normalizeChannelIdentifier("   ").ok, false);

  for (const raw of ["my channel", "https://example.com/scholarbridge", "ab", "@ab", "t.me/"]) {
    const result = normalizeChannelIdentifier(raw);
    assert.equal(result.ok, false, `${raw} must not pass`);
    if (!result.ok) assert.equal(result.reason, "not_a_channel", raw);
  }
});

check("the same rules hold in the settings merge, the env and the runtime", () => {
  assert.equal(validChannelId("https://t.me/scholar_bridge"), true);
  assert.equal(validChannelId("t.me/scholar_bridge"), true);
  assert.equal(validChannelId("scholar_bridge"), true);
  assert.equal(canonicalChannelId("https://t.me/scholar_bridge"), "@scholar_bridge");
  assert.equal(canonicalChannelId("my channel"), "my channel", "unusable input is returned unchanged");
  assert.equal(looksLikeChannelId("https://t.me/scholar_bridge"), true);
  assert.equal(looksLikeChannelId("t.me/+AbCdEf"), false, "an invite link is never a stored id");

  // A legacy settings row holding a link still resolves to the canonical form…
  const merged = mergeChannelSettings({ connection: { channelId: "https://t.me/scholar_bridge", mode: "on" } });
  assert.equal(merged.connection.channelId, "@scholar_bridge");

  // …and so does the environment, whether or not the panel is configured.
  assert.equal(channelConfig({ TELEGRAM_CHANNEL_ID: "https://t.me/scholar_bridge" }).channelId, "@scholar_bridge");
  const runtime = resolveChannelRuntime(
    mergeChannelSettings({ connection: { mode: "on" }, siteUrl: SITE }),
    { TELEGRAM_CHANNEL_ID: "t.me/scholar_bridge", TELEGRAM_ADMIN_CHAT_ID: "123456789" }
  );
  assert.equal(runtime.channelId, "@scholar_bridge");
  assert.equal(runtime.blockedReason, null, "a link form must count as a connected channel");

  const fromSettings = resolveChannelRuntime(
    mergeChannelSettings({ connection: { channelId: "-1001234567890", adminChatId: "123456789", mode: "approval" }, siteUrl: SITE }),
    {}
  );
  assert.equal(fromSettings.channelId, "-1001234567890");
});

check("the channel publisher takes the token in a documented order", () => {
  const dedicated = "123456789:" + "A".repeat(35);
  const mainEnv = "987654321:" + "B".repeat(35);

  // 1. The channel-only bot wins…
  assert.deepEqual(pickChannelToken({ channelEnv: dedicated, main: { token: mainEnv, source: "env" } }), {
    token: dedicated,
    dedicated: true,
    source: "channel_env",
  });
  // 2. …otherwise the main bot the operator already connected in Admin → Telegram…
  assert.deepEqual(pickChannelToken({ channelEnv: "", main: { token: mainEnv, source: "admin" } }), {
    token: mainEnv,
    dedicated: false,
    source: "admin",
  });
  // 3. …and nothing at all is reported as nothing, never as a silent fallback.
  assert.deepEqual(pickChannelToken({ main: { token: null, source: "none" } }), {
    token: null,
    dedicated: false,
    source: "none",
  });
  // A typo in the channel-specific variable must not disable publishing.
  assert.equal(pickChannelToken({ channelEnv: "not-a-token", main: { token: mainEnv, source: "env" } }).token, mainEnv);

  assert.match(describeChannelTokenSource("channel_env"), /TELEGRAM_CHANNEL_BOT_TOKEN/);
  assert.match(describeChannelTokenSource("admin"), /Admin → Telegram/);
  assert.match(describeChannelTokenSource("none"), /topilmadi/);

  // The channel modules must not reach for the DM bot directly: one resolver.
  for (const file of ["send.ts", "connect.ts", "boot.ts", "admin.ts"]) {
    const src = readFileSync(join(import.meta.dirname, "..", "src/lib/channel", file), "utf8");
    assert.doesNotMatch(src, /getBotToken\(/, `${file} must use getChannelBotToken`);
  }
  const tokenSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/token.ts"), "utf8");
  assert.match(tokenSrc, /await import\("@\/lib\/telegram\/settings"\)/, "the DB module is imported lazily");
});

check("the schema check covers columns, not just tables", () => {
  const columns = channelColumns();
  const has = (table: string, column: string) => columns.some((c) => c.table === table && c.column === column);

  // Columns added by later ALTERs are exactly the ones a table-only check missed.
  for (const column of ["lane", "origin", "text_override", "pinned", "skip_reason", "postponed_to"]) {
    assert.ok(has("channel_plan", column), `channel_plan.${column} must be verified`);
  }
  for (const column of ["part", "text_override", "lane", "status", "html"]) {
    assert.ok(has("channel_posts", column), `channel_posts.${column} must be verified`);
  }
  // Constraints are not columns.
  assert.ok(!has("channel_plan", "unique"));
  assert.ok(!has("channel_link_clicks", "primary"));
  assert.ok(columns.length > 100, `expected the whole schema, got ${columns.length} column(s)`);

  const dbSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/db.ts"), "utf8");
  assert.match(dbSrc, /columnExistenceVerify\(channelColumns\(\)\)/, "the bootstrap must verify columns");
  assert.match(dbSrc, /createTableBootstrap\([\s\S]*verifyChannelSchema/, "and pass them to the memoised bootstrap");
});

check("saving the connection normalises before it validates", () => {
  const route = readFileSync(join(import.meta.dirname, "..", "src/app/api/admin/channel/route.ts"), "utf8");
  const normalizeAt = route.indexOf("normalizeChannelIdentifier(String(value.channelId");
  const saveAt = route.indexOf("updateSettingsBlock(key as SettingsKey, value");
  assert.ok(normalizeAt > 0 && saveAt > normalizeAt, "the id is normalised before the block is saved");
  assert.match(route, /jsonError\(400, normalized\.hint, normalized\.reason\)/, "an invite link returns its hint");

  const adminSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/admin.ts"), "utf8");
  assert.match(adminSrc, /const normalized = normalizeChannelIdentifier\(String\(obj\.channelId/, "the block validator normalises too");
  const settingsSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/settings.ts"), "utf8");
  assert.match(settingsSrc, /return normalizeChannelIdentifier\(raw\)\.ok/, "one definition of a channel id");
});

check("the stored body splits back into exactly the parts that were sent", () => {
  const parts = ["Birinchi qism", "Ikkinchi qism", "Uchinchi qism"];
  const stored = parts.join(PARTS_SEPARATOR);
  assert.deepEqual(splitApprovalParts(stored), parts);
  assert.deepEqual(splitApprovalParts(null), []);
  assert.deepEqual(splitApprovalParts(""), []);
  // A single-part post must not gain a phantom part.
  assert.deepEqual(splitApprovalParts("bitta qism"), ["bitta qism"]);
});

check("the approval window is bounded and configurable", () => {
  assert.equal(approvalTtlHours({}), 6);
  assert.equal(approvalTtlHours({ CHANNEL_APPROVAL_TTL_HOURS: "12" }), 12);
  assert.equal(approvalTtlHours({ CHANNEL_APPROVAL_TTL_HOURS: "0" }), 1, "never instant");
  assert.equal(approvalTtlHours({ CHANNEL_APPROVAL_TTL_HOURS: "999" }), 48, "never longer than two days");
  assert.equal(approvalTtlHours({ CHANNEL_APPROVAL_TTL_HOURS: "abc" }), 6);
});

check("the header states what happens and never repeats the body", () => {
  const multi = approvalHeader({ kind: "scholarship_rich", slot: 2, partCount: 3, ttlHours: 6 });
  assert.match(multi, /Tasdiqlash kerak/);
  assert.match(multi, /3 qismda/);
  assert.match(multi, /6 soat/);
  const poll = approvalHeader({ kind: "poll", slot: null, partCount: 1, ttlHours: 6 });
  assert.match(poll, /so'rovnoma/);
});

check("the approval code paths exist where they are claimed to", () => {
  const sendSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/send.ts"), "utf8");
  // The approval branch must run BEFORE the generic send path.
  const approvalBranch = sendSrc.indexOf('if (mode === "approval")');
  const pollBranch = sendSrc.indexOf('if (row.kind === "poll") {');
  assert.ok(approvalBranch > 0 && pollBranch > approvalBranch, "approval must be decided before anything is sent");
  assert.match(sendSrc, /export async function approveApproval/);
  assert.match(sendSrc, /export async function rejectApproval/);
  assert.match(sendSrc, /export async function applyApprovalEdit/);
  // Approval must publish the STORED body, not a fresh render.
  assert.match(sendSrc, /splitApprovalParts\(post\.html\)/);
  // A double press must not publish twice.
  assert.match(sendSrc, /async function claimApproval/);
  assert.match(
    sendSrc,
    /inArray\(channelPosts\.status, \[\.\.\.OPEN_APPROVAL_STATUSES\]\)/,
    "the conditional UPDATE must only claim an open post"
  );

  const serviceSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/telegram/service.ts"), "utf8");
  assert.match(serviceSrc, /isApprovalCallback\(data\)/, "the webhook must route approval buttons");
  assert.match(serviceSrc, /handlePendingChannelEdit/, "a typed message must be able to become the new body");

  const telegramApproval = readFileSync(join(import.meta.dirname, "..", "src/lib/telegram/approval.ts"), "utf8");
  assert.match(telegramApproval, /approver\.isAdmin/, "only an admin may approve");
  assert.match(telegramApproval, /ensureChannelTables/, "the tables are ensured before any write");
  // The student router stays untouched: an approval button is never a student command.
  const botSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/telegram/bot.ts"), "utf8");
  assert.doesNotMatch(botSrc, /ch:\(ok\|no\|ed\)/, "approval buttons must not enter the link-scoped router");
});

check("approval statuses are named once and reused", () => {
  assert.equal(APPROVAL_STATUS.awaiting, "awaiting_approval");
  assert.equal(APPROVAL_STATUS.editing, "editing");
  assert.equal(APPROVAL_STATUS.rejected, "rejected");
  assert.equal(APPROVAL_STATUS.expired, "expired");
  // No copy of the literal strings anywhere else.
  const sendSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/send.ts"), "utf8");
  assert.doesNotMatch(sendSrc, /"awaiting_approval"/, "use APPROVAL_STATUS, not a literal");
});

check("a plan row that already produced a post is not offered again", () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  // Row 2 is already waiting for a human (or was sent/rejected/expired).
  assert.deepEqual(sendablePlanRows(rows, [2], 5).map((r) => r.id), [1, 3]);
  assert.deepEqual(sendablePlanRows(rows, [null, 1, 2, 3], 5), [], "nulls are not ids");
  assert.deepEqual(sendablePlanRows(rows, [], 2).map((r) => r.id), [1, 2], "the limit still applies");
  // The approval statuses are exactly the ones that stop a retry.
  assert.deepEqual(
    [...CONSUMED_POST_STATUSES].sort(),
    ["awaiting_approval", "editing", "expired", "rejected", "sent"],
    "a failed post must stay retryable"
  );

  const sendSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/send.ts"), "utf8");
  assert.match(sendSrc, /inArray\(channelPosts\.status, \[\.\.\.CONSUMED_POST_STATUSES\]\)/);
  assert.match(sendSrc, /const scan = limit \* 4/, "filtering must not starve a due row");
});

/* -------------------------------------------------------------------------- */
/* Autopilot: connecting the channel must start the publisher                 */
/* -------------------------------------------------------------------------- */

/** A runtime built from panel settings, exactly like the route does it. */
function runtimeFor(connection: Partial<{ channelId: string; adminChatId: string; mode: string; pausedUntil: string | null }>): ChannelRuntime {
  const settings = mergeChannelSettings({
    connection: {
      channelId: "-1001234567890",
      adminChatId: "777000111",
      mode: "approval",
      pausedUntil: null,
      ...connection,
    },
    siteUrl: "https://example.org",
  });
  return resolveChannelRuntime(settings, {}, new Date("2026-03-10T09:00:00+05:00"));
}

check("the tick interval is bounded, so a typo cannot silence or flood the channel", () => {
  assert.equal(autopilotIntervalMinutes({}), AUTOPILOT_DEFAULT_MINUTES);
  assert.equal(autopilotIntervalMinutes({ CHANNEL_TICK_MINUTES: "30" }), 30);
  assert.equal(autopilotIntervalMinutes({ CHANNEL_TICK_MINUTES: "1" }), 5, "never faster than 5 minutes");
  assert.equal(autopilotIntervalMinutes({ CHANNEL_TICK_MINUTES: "9999" }), 120, "never slower than 2 hours");
  assert.equal(autopilotIntervalMinutes({ CHANNEL_TICK_MINUTES: "abc" }), AUTOPILOT_DEFAULT_MINUTES);
  assert.equal(autopilotIntervalMinutes({ CHANNEL_TICK_MINUTES: "0" }), AUTOPILOT_DEFAULT_MINUTES);
});

check("the loop is off in development and switchable in production", () => {
  const prod = { NODE_ENV: "production", DATABASE_URL: "postgres://x" };
  assert.equal(autopilotEnabled(prod), true);
  assert.equal(autopilotEnabled({ ...prod, CHANNEL_AUTOPILOT: "off" }), false, "explicit off wins");
  assert.equal(autopilotEnabled({ ...prod, NODE_ENV: "development" }), false, "next dev stays quiet");
  assert.equal(autopilotEnabled({ ...prod, NODE_ENV: "development", CHANNEL_AUTOPILOT: "on" }), true);
  assert.equal(autopilotEnabled({ NODE_ENV: "production" }), false, "no database, no loop");
});

check("connecting kicks the publisher, re-saving does not", () => {
  const off = runtimeFor({ mode: "off" });
  const approval = runtimeFor({});
  const live = runtimeFor({ mode: "on" });
  const paused = runtimeFor({ pausedUntil: "2026-03-11" });

  assert.equal(shouldKickAfterConnect(off, approval), true, "off → approval starts it");
  assert.equal(shouldKickAfterConnect(off, live), true);
  assert.equal(shouldKickAfterConnect(runtimeFor({ channelId: "" }), live), true, "not connected → connected");
  assert.equal(shouldKickAfterConnect(approval, approval), false, "saving the same values again stays silent");
  assert.equal(shouldKickAfterConnect(paused, live), true, "resuming after a pause");
  assert.equal(shouldKickAfterConnect(approval, off), false, "turning it off must not send anything");
  assert.equal(shouldKickAfterConnect(approval, paused), false, "pausing must not send anything");
  assert.equal(shouldKickAfterConnect(approval, runtimeFor({ channelId: "-1009999999999" })), true, "another channel");
});

check("the connect message says what happened and what happens next", () => {
  const base = {
    channelId: "-1001234567890",
    siteUrl: "https://example.org",
    problems: [],
    hasPost: true,
    minutes: 15,
  };
  const approvalMsg = connectMessage({ ...base, mode: "approval" });
  assert.match(approvalMsg, /Kanal ulandi/);
  assert.match(approvalMsg, new RegExp(MODE_LABELS.approval));
  assert.match(approvalMsg, /Tasdiqlash/);
  assert.ok(approvalMsg.includes(cadenceLine(15)), "the cadence is spelled out");
  assert.match(approvalMsg, /-1001234567890/);

  // A quiet day must not promise a post that will never come.
  const quiet = connectMessage({ ...base, mode: "approval", hasPost: false });
  assert.match(quiet, /navbatda post yo'q/);
  assert.ok(!quiet.includes("Birinchi post pastda"));

  // Live mode must not read like the approval flow.
  const liveMsg = connectMessage({ ...base, mode: "on" });
  assert.ok(!liveMsg.includes("Tasdiqlash"), "live mode has no approve button to explain");
  assert.match(liveMsg, new RegExp(MODE_LABELS.on));

  // Problems are listed, and the whole thing stays inside one Telegram message.
  const withProblems = connectMessage({ ...base, mode: "approval", problems: [AUTOPILOT_TEXTS.problemNoChannelAdmin] });
  assert.match(withProblems, /administrator/);
  assert.ok(Buffer.byteLength(withProblems, "utf8") < 4096, "one message, never a flood");

  // Escaped like every other operator-visible string.
  const escaped = connectMessage({ ...base, mode: "approval", channelId: "@a<b>" });
  assert.ok(!escaped.includes("<b>@a"));
});

check("the autopilot paths exist where they are claimed to", () => {
  const routeSrc = readFileSync(join(import.meta.dirname, "..", "src/app/api/admin/channel/route.ts"), "utf8");
  // The kick must be tied to the connection block, not to every settings save.
  assert.match(routeSrc, /key === "connection" \? resolveChannelRuntime/, "only the connection save checks the runtime");
  assert.match(routeSrc, /shouldKickAfterConnect\(before, resolveChannelRuntime\(result\.settings\)\)/);
  assert.match(routeSrc, /kickChannelAutopilot\(guard\.value\.profile\.id\)/, "the save starts the publisher");

  const instr = readFileSync(join(import.meta.dirname, "..", "src/instrumentation.ts"), "utf8");
  assert.match(instr, /startChannelAutopilot\(\)/, "the loop must start with the server");

  const bootSrc = readFileSync(join(import.meta.dirname, "..", "src/lib/channel/boot.ts"), "utf8");
  // It may not invent its own sending path, and it may not outlive the process.
  assert.match(bootSrc, /sendPlanRow\(row, \{ force: true, actorProfileId \}\)/, "the kick uses the normal publisher");
  assert.match(bootSrc, /unref\?\.\(\)/, "timers must not keep the process alive");
  assert.match(bootSrc, /runtime\.blockedReason/, "a blocked runtime must stop the kick");
  // Exactly one post on connect, never a batch.
  assert.doesNotMatch(bootSrc, /runDuePosts\(/, "the kick hands over one post, the loop does the rest");
});

check("yesterday's queue is retired instead of pretending to wait", () => {
  const store = read("src/lib/channel/store.ts");
  // The sender is date-scoped on purpose (no stale news under today's date), so
  // nothing else would ever touch an older row: it stayed `planned` forever and
  // the panel showed work that could never run.
  const fn = /export async function retireStalePlans[\s\S]*?\n}/.exec(store)?.[0] ?? "";
  assert.ok(fn, "retireStalePlans must exist");
  assert.match(fn, /lt\(channelPlan\.planDate, today\)/, "only earlier days");
  assert.match(fn, /eq\(channelPlan\.status, "planned"\)/, "only unprocessed rows");
  assert.match(fn, /skipReason: "date_passed"/, "the reason is stored, not guessed");
  // A row that already produced a post is history, not queue.
  assert.match(fn, /channelPosts/, "rows with a post are left alone");

  const actions = read("src/lib/channel/adminActions.ts");
  assert.match(actions, /retireStalePlans\(tashkentDay\(\)\)/, "the tick retires them");
  assert.match(actions, /retired,/, "and the summary reports the count");
  assert.match(actions, /retired: number;/, "the field is typed");
});

check("Tables this app creates at runtime are not left open to the anon key", () => {
  const lockdown = read("src/lib/db/lockdown.ts");
  assert.match(lockdown, /ENABLE ROW LEVEL SECURITY/);
  assert.match(lockdown, /REVOKE ALL ON TABLE/);
  // No anon role on a plain Postgres → the revoke must be conditional.
  assert.match(lockdown, /FROM pg_roles WHERE rolname IN \('anon', 'authenticated'\)/);
  // Identifiers are interpolated into DDL, so they are validated first.
  assert.match(lockdown, /SAFE_NAME/);
  // Best-effort: a restrictive role must not break the publisher.
  assert.doesNotMatch(lockdown, /throw /, "lockdown never throws");

  for (const file of ["src/lib/channel/db.ts", "src/lib/telegram/db.ts"]) {
    assert.match(read(file), /lockDownTables\(tablesInStatements\(/, `${file} locks its tables down`);
  }
  const bootstrap = read("src/lib/db/bootstrap.ts");
  assert.match(bootstrap, /after\?\s*:\s*\(\)\s*=>\s*Promise<unknown>/, "the bootstrap has the hook");
  assert.match(bootstrap, /await after\(\)\.catch/, "and it can never fail the bootstrap");
});

check("the standard card follows the published shape, in order", () => {
  const f = facts({ livingAllowance: 1400, travelAllowance: 500, eligibleCountries: '["Uzbekistan"]' });
  const out = renderScholarshipSingle(f, 0, cardChrome());
  assert.ok(out, "card did not render");
  assertClean(out.html, "card");
  const lines = out.html.split("\n");
  const idx = (needle: string) => lines.findIndex((line) => line.includes(needle));
  assert.ok(idx("🏛 Example University") > idx("<b>Global Excellence Scholarship</b>"), "provider follows the title");
  assert.ok(idx("<b>Moliyalashtirish:</b>") > idx("🏛 Example University"), "funding before the sections");
  assert.ok(idx("<b>Til talabi:</b>") > idx("<b>Moliyalashtirish:</b>"), "language under funding");
  assert.ok(idx("<b>Kimlar uchun</b>") > idx("<b>Til talabi:</b>"));
  assert.ok(idx("<b>Foydali tomonlari</b>") > idx("<b>Kimlar uchun</b>"));
  assert.ok(idx("⏰️<b>Oxirgi muddat:</b>") > idx("<b>Foydali tomonlari</b>"), "deadline after the sections");
  assert.ok(idx("Rasmiy manba") > idx("⏰️<b>"), "the official source sits under the deadline");
  assert.ok(idx("➡️Batafsil:") > idx("Rasmiy manba"), "the tracked link is the last content line");
  assert.match(out.html, /^➡️ /m, "bullets use the published arrow");
  assert.match(out.html, /\n\n#/, "hashtags are their own block");
});

check("the card prints stored facts and never English database prose", () => {
  const f = facts({ livingAllowance: 1400, travelAllowance: 500, eligibleCountries: '["Uzbekistan"]' });
  const text = plainText(renderScholarshipSingle(f, 0, cardChrome())?.html ?? "");
  for (const expected of ["Moliyalashtirish: To'liq", "Til talabi: IELTS 6.5+", "Bakalavr", "GPA 3.5+", "Yashash uchun to'lov: $1,400", "Yo'l xarajatlari: $500", "🇺🇿 O'zbekistonliklar uchun ochiq", "17 kun qoldi"]) {
    assert.ok(text.includes(expected), `missing: ${expected}`);
  }
  // The row's `description`/`requirements` are English in production and must
  // never reach an Uzbek post — the card is built from structured facts only.
  // The raw English must never reach the post: it is read by the translator and
  // re-stated in Uzbek. `description` has no translator at all — it is authored
  // copy only.
  const source = read("src/lib/channel/templates/card.uz.ts").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!source.includes("description"), "description is authored copy only");
  assert.ok(!/\.requirementsRaw\b(?!\s*\))/.test(source.replace(/translateRequirements\([^)]*\)/g, "")), "requirementsRaw goes through the translator");
  // A number without a stored period may not be given one.
  assert.ok(!/oylik|yillik|yiliga/i.test(text), "never invents a payment period");
});

check("a thin record produces a short honest card", () => {
  const out = renderScholarshipSingle(MINIMAL, 0, cardChrome());
  assert.ok(out, "the minimal record still renders");
  const text = plainText(out.html);
  assert.ok(!text.includes("Kimlar uchun"), "no empty audience section");
  assert.ok(!text.includes("Foydali tomonlari"), "no empty benefits section");
  assert.ok(!text.includes("Dastur haqida"), "no empty about section");
  assert.ok(!text.includes("📍"), "no country flag line without a country");
  assert.ok(!out.html.includes("\n\n\n"), "no gap where a section was dropped");
  // No tagline, no dangling separator.
  assert.ok(!/<b>[^<]*<\/b>\s*[—-]\s*$/.test(out.html.split("\n")[0]), "no orphaned dash");
});

check("authored Uzbek copy replaces the structured sections", () => {
  const out = renderScholarshipSingle(facts(), 0, cardChrome(), { content: RICH_CONTENT, country: countryDisplay("Canada") });
  assert.ok(out);
  const text = plainText(out.html);
  assert.ok(text.includes("Kanadada bepul o'qish imkoniyati"), "the authored tagline leads the headline");
  assert.ok(text.includes("Bakalavr yo'nalishi"), "authored eligibility wins");
  assert.ok(text.includes("Kontrakt to'liq qoplanadi"), "authored benefits win");
  assert.ok(text.includes("Dastur haqida"), "authored about appears");
  assert.ok(out.html.startsWith("🇨🇦"), "the flag comes from the country table");
});

check("English data becomes Uzbek lines, not English leftovers", () => {
  const cases: Array<[string, string | null]> = [
    ["IELTS 6.5 or equivalent English test", "IELTS 6.5+ yoki ekvivalent imtihon"],
    ["IELTS 6.5 / TOEFL 85 / DET 115", "IELTS 6.5+ · TOEFL 85+ · DET 115+"],
    ["A Chinese-taught programme requires HSK level 4.", "HSK 4-daraja"],
    ["The scholarship sets no separate English score; the degree programme requirement applies.", "Yagona til balli yo'q — talab tanlangan dasturga bog'liq"],
    ["Not verified for this row: the institution page could not be read.", null],
  ];
  for (const [english, expected] of cases) {
    const got = translateEnglishRequirement(english);
    assert.equal(got, expected, `english requirement: ${english}`);
    if (got) assertClean(got, `translated: ${english}`);
  }

  const coverage: Array<[string, string | null]> = [
    ["Full tuition", "Kontrakt to'liq qoplanadi"],
    ["Partial tuition", "Kontraktning bir qismi qoplanadi"],
    // "100%" would trip the absolute-claim lint, so a range ending at the full
    // fee is worded out loud instead.
    ["Between 50% and 100% of the amount payable", "Kontraktning 50%idan to'liq qismigacha qoplanadi"],
    ["100% of annual tuition fees", "Kontrakt to'liq qoplanadi"],
    ["The scheme pays a stipend of HK$344,400 a year", "Stipendiya: HK$344,400 (yiliga)"],
    ["None", null],
  ];
  for (const [english, expected] of coverage) {
    assert.equal(translateCoverage(english), expected, `coverage: ${english}`);
  }
});

check("translation restates facts and never invents a number", () => {
  const samples = [
    "Be a citizen of a partner country and be nominated by the ministry of education. Minimum GPA of 3.2 required.",
    "Applicants aged 30 or under, with at least a 70 per cent average and two recommendation letters.",
    "Master's or PhD applicants; submit a research proposal and a CV; interview may be required.",
  ];
  for (const english of samples) {
    const lines = translateRequirements(english, { degrees: null, minGpa: null });
    assert.ok(lines.length > 0, `nothing translated from: ${english}`);
    // Every digit in the output must already exist in the source text.
    for (const line of lines) {
      for (const digit of line.match(/\d+(?:[.,]\d+)?/g) ?? []) {
        assert.ok(english.includes(digit.replace(",", ".")) || english.includes(digit), `invented number ${digit} in "${line}"`);
      }
      // No English sentence may survive: an Uzbek line never ends a word with
      // the English "-tion", never contains "the", "must", "required".
      assert.ok(!/\b(?:the|must|required|applicants?|students?)\b/i.test(line), `English leftover in "${line}"`);
      assertClean(line, `translated line: ${line}`);
    }
  }
  assert.deepEqual(translateRequirements("", {}), [], "empty input yields nothing");
  assert.deepEqual(translateRequirements(null, {}), [], "null input yields nothing");
});

check("a record with only English fields still posts Uzbek sections", () => {
  const englishOnly = facts({
    requirements: "Be a citizen of a partner country, aged 30 or under, with at least 3.0 GPA. Submit a motivation letter and a CV.",
    englishRequirements: "IELTS 6.5 or equivalent English test",
    tuitionCoverage: "Between 50% and 100% of the amount payable",
    degreeLevels: '["Master\'s"]',
    eligibleMajors: '["Economics"]',
    minGpa: null,
    minIelts: null,
    livingAllowance: null,
    travelAllowance: null,
  });
  const out = renderScholarshipSingle(englishOnly, 0, cardChrome());
  assert.ok(out, "card did not render");
  assertClean(out.html, "english-only card");
  const text = plainText(out.html);
  for (const expected of [
    "Til talabi: IELTS 6.5+ yoki ekvivalent imtihon",
    "Yosh chegarasi: 30 yoshgacha",
    "Motivatsion xat",
    "CV",
    "Kontraktning 50%idan to'liq qismigacha qoplanadi",
  ]) {
    assert.ok(text.includes(expected), `missing: ${expected}`);
  }
  // The raw English must be gone from the post itself.
  for (const english of ["citizen", "aged", "Submit a motivation", "or equivalent English test", "amount payable"]) {
    assert.ok(!text.includes(english), `English leaked into the post: ${english}`);
  }
});

check("Uzbek apostrophes are not mistaken for English words", () => {
  // JS counts `'` as a word boundary, so a plain /\bor\b/ flags `ilg'or` and
  // silently dropped 74 legitimate glosses — every "advanced …" phrase among
  // them. The lookbehind in ENGLISH_LEFTOVER is what keeps them.
  assert.equal(looksEnglish("ilg'or"), false, "ilg'or is Uzbek, not English");
  assert.equal(looksEnglish("Ilg'or kompyuter fanlari"), false);
  assert.equal(looksEnglish("O'qish to'lovi"), false);
  assert.equal(looksEnglish("American University of Beirut moliyaviy yordam"), true, "a real English name is caught");
  assert.equal(looksEnglish("the tuition fee"), true);
  // …and the term survives the whole translator, not just the guard.
  const advanced = translateFragment("advanced computer science");
  assert.ok(advanced, "a legitimate gloss was dropped by the leftover rule");
  assert.match(advanced.uz, /kompyuter/i);
  const gloss = checkGloss("Ilg'or daraja");
  assert.equal(gloss.ok, true, "the gloss validator uses the same rule");
});

check("a place is not a requirement, and a floor without a value is not a fact", () => {
  // Live prose (University of Waikato, 2026-10-29) produced exactly these two
  // bad bullets: "Yangi Zelandiya" (the country was already in the header) and
  // "Minimal GPA" (a floor with no number). Both are refused now.
  const waikato =
    "Candidates must: be a New Zealand citizen, permanent resident or residence-class visa holder, OR an international student. " +
    "Selection is based on academic merit - a minimum GPA of A- on the qualification used for entry is required - plus research experience.";
  const bullets = translateRequirements(waikato, { minGpa: null });
  assert.ok(!bullets.includes("Yangi Zelandiya"), `a country became a requirement: ${bullets.join(" | ")}`);
  assert.ok(!bullets.some((b) => /^minimal gpa$/i.test(b)), `a valueless floor was posted: ${bullets.join(" | ")}`);
  // The grade is in the text, so it is printed with it.
  assert.ok(bullets.includes("Minimal GPA: A-"), `the letter-grade floor was lost: ${bullets.join(" | ")}`);
  // A numeric floor still wins over the letter reader.
  const numeric = translateRequirements("A minimum GPA of 3.5 is required.", { minGpa: null });
  assert.ok(numeric.includes("GPA 3.5+"), `numeric floor broken: ${numeric.join(" | ")}`);

  // A country name is recognised in both languages, and a real requirement is not.
  assert.equal(isCountryName("Yangi Zelandiya"), true);
  assert.equal(isCountryName("New Zealand"), true);
  assert.equal(isCountryName("Motivatsion xat"), false);
  assert.equal(countryUz("Poland"), "Polsha", "the Uzbek name for Poland must match channel_countries");
});

check("an operator's gloss is what the post will say — and nothing else can be typed", () => {
  // The rule the admin API rejects with is the renderer's own rule, so it is
  // asserted here rather than duplicated: a short Uzbek/Russian phrase passes,
  // an English sentence, an empty box and a number do not.
  assert.deepEqual(checkGloss("Kontrakt to'lovi"), { ok: true, uz: "Kontrakt to'lovi" });
  assert.equal(checkGloss("  Kontrakt   to'lovi  ").ok, true, "whitespace is normalised, not rejected");
  const normalised = checkGloss("  Kontrakt   to'lovi  ");
  assert.equal(normalised.ok && normalised.uz, "Kontrakt to'lovi", "inner whitespace is collapsed");
  for (const bad of ["", "   ", "123", "the tuition fee", "students must submit"]) {
    assert.equal(checkGloss(bad).ok, false, `accepted a non-gloss: ${JSON.stringify(bad)}`);
  }
  // Over-long text is cut, never posted whole.
  const long = checkGloss("a".repeat(400));
  assert.ok(long.ok, "long text is still a gloss");
  if (long.ok) assert.equal(long.uz.length, 120, "a gloss is capped at 120 characters");
});

check("the dictionary can be corrected from the admin panel, without a deploy", () => {
  const routeSrc = read("src/app/api/admin/channel/lexicon/route.ts");
  // Reading and writing both go through the admin guard; writes are rate-limited.
  assert.match(routeSrc, /guardAdmin\(req\)/, "GET must be admin-only");
  assert.match(routeSrc, /guardAdmin\(req, \{ write: true \}\)/, "POST must be an admin write");
  // The only thing a caller may set is the gloss: `source` is never taken from
  // the body, so a request cannot mark a row as someone else's or as bundled.
  assert.match(routeSrc, /source: "admin"/, "operator rows are stamped, not supplied");
  assert.doesNotMatch(routeSrc, /body\.value\.source/, "the source column is not client-controlled");
  assert.match(routeSrc, /onConflictDoUpdate/, "correcting an existing term must not fail on the PK");
  assert.match(routeSrc, /checkGloss\(body\.value\.uz\)/, "the gloss is validated, not trusted");
  assert.match(routeSrc, /action !== "install" && action !== "save" && action !== "reset"/, "unknown actions are refused up front");
  // Searching "tuition" must not bury `tuition` under longer phrases.
  assert.match(routeSrc, /translationLexicon\.key} = \$\{q\.toLowerCase\(\)\}/, "the exact headword ranks first");
  // "Restore original" puts the dictionary's own gloss back instead of deleting
  // the row: an earlier version deleted it, and two terms were quietly lost
  // from the table the first time an operator corrected and then reverted them.
  assert.match(routeSrc, /bundledGloss\(key\)/, "reset must consult the bundled gloss first");
  assert.match(routeSrc, /source: "pdf"/, "a restored row is a dictionary row again");
  assert.match(
    routeSrc,
    /eq\(translationLexicon\.source, "admin"\)/,
    "deleting is limited to rows the operator added"
  );
  assert.ok(bundledGloss("tuition"), "the bundle must answer for its own terms");
  assert.equal(bundledGloss("colloquium"), null, "a word the dictionary lacks has no bundled gloss");
  assert.match(routeSrc, /refreshOverlay\(\)/, "a correction takes effect on the next render");
  assert.match(routeSrc, /writeChannelAudit\(/, "every dictionary change is logged");
  // Installing is idempotent and versioned, so the button is safe to press.
  const storeSrc = read("src/lib/channel/lexicon/store.ts");
  assert.match(storeSrc, /installedVersion\(\)/, "an install compares the version first");
  assert.match(storeSrc, /eq\(translationLexicon\.source, "pdf"\)/, "an import replaces bundled rows only");
  // ...and an operator's corrections survive a re-import, which is the whole
  // point of the two sources.
  assert.doesNotMatch(storeSrc, /delete\(translationLexicon\)(?!\s*\.where\(eq\(translationLexicon\.source, "pdf"\)\))/, "an import may only delete bundled rows");
});

check("the dictionary has a tab in the panel, in all three languages", () => {
  const ui = read("src/components/admin/ChannelManager.tsx");
  assert.match(ui, /\| "lexicon"/, "the tab is in the Tab union");
  assert.match(ui, /\n  "lexicon",\n/, "and in the TABS list");
  assert.match(ui, /tab === "lexicon" && <LexiconTab/, "the tab renders its component");
  // The panel talks to the dictionary API only, and shows the honest count.
  assert.match(ui, /\/api\/admin\/channel\/lexicon/, "the panel uses the dictionary API");
  for (const call of ["install", "save", "reset"]) {
    assert.match(ui, new RegExp(`action: "${call}"`), `the panel cannot ${call}`);
  }
  for (const loc of ["en", "uz", "ru"]) {
    const messages = JSON.parse(read(`src/i18n/messages/${loc}.json`)) as {
      adminChannel?: { tabs?: Record<string, string>; lexicon?: Record<string, string> };
    };
    assert.ok(messages.adminChannel?.tabs?.lexicon, `${loc}: tab label missing`);
    const keys = Object.keys(messages.adminChannel?.lexicon ?? {});
    assert.ok(keys.length >= 24, `${loc}: only ${keys.length} dictionary strings`);
    for (const key of ["title", "hint", "search", "edit", "reset", "import", "notInstalled"]) {
      assert.ok(keys.includes(key), `${loc}: lexicon.${key} missing`);
    }
  }
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
