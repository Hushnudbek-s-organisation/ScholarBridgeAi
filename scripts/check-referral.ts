/**
 * Referral system test — the full chain against a real PostgreSQL.
 *
 * The referral program is the one feature that hands out a paid product
 * (Premium) for free, so "it looks fine in the UI" is not enough. This suite
 * drives the real functions with the real SQL and asserts the things that can
 * only be seen end to end:
 *
 *   1. EVERY reward rule comes from app_config — an admin can change how many
 *      referrals buy a Premium grant, how many days it is worth, what both
 *      sides earn in points and how complete the invited profile must be, and
 *      the engine follows immediately (no hardcoded 5 anywhere).
 *   2. A referral is applied to exactly one student, once: invalid codes are
 *      rejected, self-referral is impossible, a second code is ignored.
 *   3. The reward fires only when the invited profile is genuinely filled in
 *      past the configured bar — a bare signup cannot mint Premium.
 *   4. It is idempotent (PATCH + POST racing must not pay twice) and the
 *      premium window STACKS instead of resetting.
 *   5. `/api/referral`'s payload is what the student card renders, so the card
 *      can never show a number the engine does not use.
 *
 * Run: npm run test:referral
 */

import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import { rmSync } from "node:fs";
import { eq } from "drizzle-orm";

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

const PORT = 55442;
const DB = "sb-referral";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const SECRET = "referral-test-secret-value-0123456789";

let pg: EmbeddedPostgres | null = null;

async function main() {
  rmSync("/tmp/sb-referral-pg", { recursive: true, force: true });
  pg = new EmbeddedPostgres({
    databaseDir: "/tmp/sb-referral-pg",
    user: "test",
    password: "test",
    port: PORT,
    persistent: false,
    onLog: () => {},
    onError: () => {},
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  console.log(`Postgres running on :${PORT}, database "${DB}"`);

  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: URL_ },
    encoding: "utf8",
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 240000,
  });
  console.log("Schema pushed from src/db/schema.ts\n");

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = SECRET;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { setConfig } = await import("../src/lib/config");
  const {
    REFERRAL_PREMIUM_MULTIPLE,
    REFERRAL_PREMIUM_DAYS,
    REFERRAL_POINTS_REFERRER,
    REFERRAL_POINTS_REFERRED,
    REFERRAL_ACTIVATION_COMPLETENESS,
    referralRules,
    referralsToNextGrant,
    ensureReferralCode,
    applyReferralCodeToProfile,
    activateReferralReward,
    referralCompleteness,
    getReferralStatus,
    referralPremiumActive,
  } = await import("../src/lib/referrals");
  const { activateSubscription } = await import("../src/lib/payments");
  const { getPremiumStatus } = await import("../src/lib/premium");

  const activated0 = referralCompleteness;

  const makeProfile = async (name: string, email: string) => {
    const [row] = await db.insert(schema.studentProfiles).values({ name, email }).returning();
    return row;
  };

  // -------------------------------------------------------------------------
  section("1. Reward rules are admin-configurable (nothing hardcoded)");

  const defaults = await referralRules();
  check(
    "defaults match the documented fallbacks",
    defaults.premiumMultiple === REFERRAL_PREMIUM_MULTIPLE &&
      defaults.premiumDays === REFERRAL_PREMIUM_DAYS &&
      defaults.referrerPoints === REFERRAL_POINTS_REFERRER &&
      defaults.referredPoints === REFERRAL_POINTS_REFERRED &&
      defaults.activationCompleteness === REFERRAL_ACTIVATION_COMPLETENESS &&
      REFERRAL_ACTIVATION_COMPLETENESS === 50,
    JSON.stringify(defaults)
  );

  await setConfig("referral_premium_multiple", "2", "test: 2 referrals per grant");
  await setConfig("referral_premium_days", "7", "test: 7 days per grant");
  await setConfig("referral_points_referrer", "30", "test: referrer points");
  await setConfig("referral_points_referred", "15", "test: referred points");
  await setConfig("referral_activation_completeness", "50", "test: activation bar");

  const configured = await referralRules();
  check(
    "an admin edit changes the live rules",
    configured.premiumMultiple === 2 &&
      configured.premiumDays === 7 &&
      configured.referrerPoints === 30 &&
      configured.referredPoints === 15,
    JSON.stringify(configured)
  );

  await setConfig("referral_premium_multiple", "0", "test: invalid multiple");
  const floored = await referralRules();
  check(
    "a nonsense multiple falls back instead of dividing by zero",
    floored.premiumMultiple === REFERRAL_PREMIUM_MULTIPLE,
    String(floored.premiumMultiple)
  );
  await setConfig("referral_premium_multiple", "2", "test: back to 2");

  check(
    "next-grant helper counts from the configured multiple",
    referralsToNextGrant(0, configured) === 2 &&
      referralsToNextGrant(1, configured) === 1 &&
      referralsToNextGrant(2, configured) === 2,
    `${referralsToNextGrant(0, configured)}, ${referralsToNextGrant(1, configured)}, ${referralsToNextGrant(2, configured)}`
  );

  // -------------------------------------------------------------------------
  section("2. A code is created, shared and applied exactly once");

  const referrer = await makeProfile("Referrer One", "referrer.one@example.test");
  const anchor = await ensureReferralCode(referrer.id);
  const code = anchor?.referralCode ?? "";
  check("a referral code is generated", code.length >= 6, code);
  const again = await ensureReferralCode(referrer.id);
  check("the same code is reused on the next call", again?.referralCode === code);

  const invited = await makeProfile("Invited Student", "invited.one@example.test");
  const badCode = await applyReferralCodeToProfile(invited.id, "NOPE-000");
  check("an unknown code is rejected", badCode.error === "INVALID", JSON.stringify(badCode));

  const selfReferral = await applyReferralCodeToProfile(referrer.id, code);
  check("self-referral is rejected", selfReferral.error === "SELF", JSON.stringify(selfReferral));
  const [referrerAfterSelf] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, referrer.id));
  check("a rejected self-referral writes nothing", referrerAfterSelf.referredBy === null);

  const applied = await applyReferralCodeToProfile(invited.id, code.toLowerCase());
  check("a valid code applies case-insensitively", applied.ok === true, JSON.stringify(applied));
  const secondApply = await applyReferralCodeToProfile(invited.id, code);
  check("a second code cannot be applied", secondApply.error === "EXISTS", JSON.stringify(secondApply));

  // -------------------------------------------------------------------------
  section("3. The activation bar decides when a referral counts");

  const beforeFill = await activateReferralReward(invited.id);
  check(
    "a bare signup earns nothing",
    beforeFill.ok === false && beforeFill.reason === "NOT_ACTIVE_YET",
    JSON.stringify(beforeFill)
  );
  const [referrerBeforeFill] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, referrer.id));
  check("no points and no premium before activation", referrerBeforeFill.referralPoints === 0 && !referrerBeforeFill.isPremium);

  // Fill the profile the way the wizard does — only real, student-entered data.
  await db
    .update(schema.studentProfiles)
    .set({
      targetMajor: "Computer Science",
      degreeLevel: "Master",
      gpa: 3.6,
      gpaScale: 4,
      ieltsScore: 7,
      budgetAnnualUsd: 20000,
      country: "Uzbekistan",
      extracurriculars: "Robotics club lead",
      workExperienceYears: 2,
      researchPublications: 0,
      onboardingCompleted: true,
    })
    .where(eq(schema.studentProfiles.id, invited.id));

  const [invitedRow] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, invited.id));
  check(
    "the bar is measured with the same completeness number the profile page shows",
    activated0(invitedRow) === 58 && configured.activationCompleteness === 50,
    `${activated0(invitedRow)}% vs bar ${configured.activationCompleteness}%`
  );

  // A student who entered only a couple of fields is still below the bar.
  const halfFilled = await makeProfile("Half Filled", "half.filled@example.test");
  await applyReferralCodeToProfile(halfFilled.id, code);
  await db
    .update(schema.studentProfiles)
    .set({ targetMajor: "Biology", gpa: 3.4, gpaScale: 4 })
    .where(eq(schema.studentProfiles.id, halfFilled.id));
  const halfResult = await activateReferralReward(halfFilled.id);
  check(
    "a half-filled profile still earns nothing",
    halfResult.ok === false && halfResult.reason === "NOT_ACTIVE_YET" && (halfResult.completeness ?? 99) < 50,
    JSON.stringify(halfResult)
  );

  const activated = await activateReferralReward(invited.id);
  check("crossing the bar pays out", activated.ok === true, JSON.stringify({ ok: activated.ok, reason: activated.reason }));
  check("the referrer's counter advances by one", activated.points === 1, String(activated.points));
  check("no premium before the configured multiple is reached", activated.premiumGranted === false);

  const repeat = await activateReferralReward(invited.id);
  check(
    "activation is idempotent (a racing call pays nothing)",
    repeat.ok === false && repeat.reason === "ALREADY_REWARDED",
    JSON.stringify(repeat)
  );
  const [referrerAfterOne] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, referrer.id));
  check("the counter was not advanced twice", referrerAfterOne.referralPoints === 1, String(referrerAfterOne.referralPoints));

  // -------------------------------------------------------------------------
  section("4. Points land on both sides, once each");

  const ledger = await db.select().from(schema.pointsLedger);
  const referrerGrants = ledger.filter((l) => l.profileId === referrer.id && l.reason === "referral_referrer");
  const referredGrants = ledger.filter((l) => l.profileId === invited.id && l.reason === "referral_referred");
  check("the referrer earns the configured points", referrerGrants.length === 1 && referrerGrants[0].points === 30, JSON.stringify(referrerGrants.map((g) => g.points)));
  check("the invited student earns the configured points", referredGrants.length === 1 && referredGrants[0].points === 15, JSON.stringify(referredGrants.map((g) => g.points)));
  check(
    "both grants are tied to the invited profile (idempotency key)",
    referrerGrants[0]?.relatedEntityId === invited.id && referredGrants[0]?.relatedEntityId === invited.id
  );

  // Both sides must SEE it in the bell: the promise is "you both earn".
  const notes = await db.select().from(schema.notifications);
  const referrerNotes = notes.filter((n) => n.profileId === referrer.id && n.type === "referral");
  const referredNotes = notes.filter((n) => n.profileId === invited.id && n.type === "referral");
  check("the referrer is notified exactly once", referrerNotes.length === 1, String(referrerNotes.length));
  check("the invited student is notified exactly once", referredNotes.length === 1, String(referredNotes.length));
  check(
    "the notification names the invited student and the points",
    !!referrerNotes[0] && referrerNotes[0].body.includes("Invited Student") && referrerNotes[0].body.includes("+30"),
    referrerNotes[0]?.body ?? "(none)"
  );
  check(
    "the invited student's notification names the referrer and their bonus",
    !!referredNotes[0] && referredNotes[0].body.includes(referrer.name) && referredNotes[0].body.includes("+15"),
    referredNotes[0]?.body ?? "(none)"
  );

  // The texts are rendered in the RECIPIENT's language; `uz` is the market the
  // program is built for, so it must not fall back to English.
  const { NOTIFY_TEXTS } = await import("../src/lib/notificationTexts");
  const uzRewarded = NOTIFY_TEXTS.referralRewarded("uz", { name: "Dilnoza", points: 30, premiumDays: 0 });
  const uzWelcome = NOTIFY_TEXTS.referralWelcome("uz", { points: 15, referrerName: "Sardor" });
  check(
    "the reward notification is written in Uzbek for uz-locale students",
    uzRewarded.title.includes("Taklifingiz") && uzRewarded.body.includes("Dilnoza") && uzRewarded.body.includes("+30"),
    JSON.stringify(uzRewarded)
  );
  check(
    "the welcome notification is written in Uzbek too",
    uzWelcome.body.includes("Sardor") && uzWelcome.body.includes("+15") && !/[A-Za-z]{4,} (points|profile|invited)/.test(uzWelcome.body),
    JSON.stringify(uzWelcome)
  );
  const ruWelcome = NOTIFY_TEXTS.referralWelcome("ru", { points: 15, referrerName: "Sardor" });
  check("Russian is covered as well", ruWelcome.title.includes("Добро пожаловать"), ruWelcome.title);

  // A repeat activation must NOT add a second notification.
  const repeatAgain = await activateReferralReward(invited.id);
  const notesAfterRepeat = await db.select().from(schema.notifications);
  check(
    "a repeat activation adds no duplicate notification",
    repeatAgain.ok === false &&
      notesAfterRepeat.filter((n) => n.profileId === referrer.id && n.type === "referral").length === 1,
    String(repeatAgain.reason)
  );

  // -------------------------------------------------------------------------
  section("5. The Premium grant follows the configured multiple and days");

  const invited2 = await makeProfile("Invited Two", "invited.two@example.test");
  await applyReferralCodeToProfile(invited2.id, code);
  await db
    .update(schema.studentProfiles)
    .set({
      targetMajor: "Data Science",
      degreeLevel: "Master",
      gpa: 3.8,
      gpaScale: 4,
      ieltsScore: 7.5,
      budgetAnnualUsd: 30000,
      country: "Uzbekistan",
      extracurriculars: "Kaggle competitions",
      onboardingCompleted: true,
    })
    .where(eq(schema.studentProfiles.id, invited2.id));
  const second = await activateReferralReward(invited2.id);
  check("the second referral reaches the configured milestone (2)", second.premiumGranted === true, JSON.stringify({ points: second.points, granted: second.premiumGranted }));
  check("the grant is worth the configured days", second.premiumDays === 7, String(second.premiumDays));
  const until = second.premiumUntil ? new Date(second.premiumUntil).getTime() : 0;
  const expected = Date.now() + 7 * 86400000;
  check("the premium window is ~7 days from now", Math.abs(until - expected) < 120000, new Date(until).toISOString());

  const [referrerAfterGrant] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, referrer.id));
  check("isPremium is set with the window", referrerAfterGrant.isPremium === true && referralPremiumActive(referrerAfterGrant));

  // A third activation must STACK on the existing window, not reset it.
  const invited3 = await makeProfile("Invited Three", "invited.three@example.test");
  await applyReferralCodeToProfile(invited3.id, code);
  await db
    .update(schema.studentProfiles)
    .set({
      targetMajor: "Physics",
      degreeLevel: "PhD",
      gpa: 3.9,
      gpaScale: 4,
      ieltsScore: 7,
      budgetAnnualUsd: 25000,
      country: "Uzbekistan",
      awards: "Physics olympiad",
      onboardingCompleted: true,
    })
    .where(eq(schema.studentProfiles.id, invited3.id));
  const third = await activateReferralReward(invited3.id);
  check("every later referral keeps counting", third.ok === true && third.points === 3, JSON.stringify({ ok: third.ok, points: third.points }));
  check("no extra grant between milestones (3 is not a multiple of 2)", third.premiumGranted === false);
  const [referrerAfterThird] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, referrer.id));
  check(
    "the existing premium window was preserved",
    new Date(referrerAfterThird.premiumUntil!).getTime() === until,
    `${referrerAfterThird.premiumUntil} vs ${new Date(until).toISOString()}`
  );

  const invited4 = await makeProfile("Invited Four", "invited.four@example.test");
  await applyReferralCodeToProfile(invited4.id, code);
  await db
    .update(schema.studentProfiles)
    .set({
      targetMajor: "Economics",
      degreeLevel: "Master",
      gpa: 3.5,
      gpaScale: 4,
      ieltsScore: 6.5,
      budgetAnnualUsd: 18000,
      country: "Uzbekistan",
      leadership: "Debate club president",
      onboardingCompleted: true,
    })
    .where(eq(schema.studentProfiles.id, invited4.id));
  const fourth = await activateReferralReward(invited4.id);
  const stacked = fourth.premiumUntil ? new Date(fourth.premiumUntil).getTime() : 0;
  check("the next milestone stacks 7 more days", fourth.premiumGranted === true && Math.abs(stacked - (until + 7 * 86400000)) < 120000, new Date(stacked).toISOString());

  // -------------------------------------------------------------------------
  section("5b. A PAID subscription and a referral grant agree everywhere");

  // The dashboard badge, the readiness gates and the admin list read the
  // profile columns, while /api/premium/status reads the subscription table.
  // Both sides must report the same student as Premium — and paying must
  // never SHORTEN a window the student already earned by referring.
  const paid = await makeProfile("Paying Student", "paying.student@example.test");
  await db
    .update(schema.studentProfiles)
    .set({ isPremium: true, premiumUntil: new Date(Date.now() + 60 * 86400000) })
    .where(eq(schema.studentProfiles.id, paid.id));
  const [paidPayment] = await db
    .insert(schema.payments)
    .values({
      profileId: paid.id,
      provider: "click",
      providerTransactionId: "test-paid-1",
      amount: 99000,
      currency: "UZS",
      status: "pending",
      purpose: "premium",
    })
    .returning();
  await activateSubscription(paidPayment.id, paid.id, "premium");
  const [paidRow] = await db
    .select()
    .from(schema.studentProfiles)
    .where(eq(schema.studentProfiles.id, paid.id));
  const paidUntilMs = paidRow.premiumUntil ? new Date(paidRow.premiumUntil).getTime() : 0;
  check(
    "a paid subscription sets the profile premium flag (dashboard agrees)",
    paidRow.isPremium === true && paidUntilMs > Date.now() + 25 * 86400000,
    `${paidRow.premiumUntil}`
  );
  check(
    "paying does not shorten an earned referral window",
    paidUntilMs > Date.now() + 55 * 86400000,
    new Date(paidUntilMs).toISOString()
  );
  const paidStatus = await getPremiumStatus(paid.id);
  check(
    "the status endpoint reports paid premium as a subscription",
    paidStatus.isPremium === true && paidStatus.source === "subscription",
    JSON.stringify(paidStatus)
  );
  const referralStatusForPaid = await getReferralStatus(paid.id);
  check(
    "the referral card agrees the student is premium",
    referralStatusForPaid?.isPremium === true && referralStatusForPaid?.referralPoints === 0,
    JSON.stringify({ premium: referralStatusForPaid?.isPremium })
  );



  await setConfig("referral_premium_multiple", "3", "test: three per grant");
  await setConfig("referral_premium_days", "14", "test: fourteen days");
  const status = await getReferralStatus(referrer.id);
  check("the payload carries the live rules", status?.rules.premiumMultiple === 3 && status?.rules.premiumDays === 14, JSON.stringify(status?.rules));
  // 4 points, multiple 3 → the bar points at 6, two more activations to go.
  check(
    "the progress bar target follows the configured multiple",
    status?.nextMilestone === 6 && status?.toNextGrant === 2,
    JSON.stringify({ next: status?.nextMilestone, toNext: status?.toNextGrant })
  );
  check(
    "the referred list reports activation, not a signup flag",
    status?.referredUsers.length === 5 &&
      status.referredUsers.filter((u) => u.isActive).length === 4 &&
      status.referredUsers.some((u) => u.name === "Half Filled" && !u.isActive),
    JSON.stringify(status?.referredUsers.map((u) => ({ name: u.name, active: u.isActive })))
  );
  check("each referred row carries its completeness for the progress line", status?.referredUsers.every((u) => typeof u.completeness === "number" && u.completeness > 0) === true);
  check("the share link points at this profile's code", status?.link.includes(`?ref=${status?.code}`) === true, status?.link);

  // -------------------------------------------------------------------------
  section("7. The student card cannot display a number the engine ignores");

  const { readFileSync } = await import("node:fs");
  const card = readFileSync(new URL("../src/components/ReferralProgramCard.tsx", import.meta.url), "utf8");
  check(
    "no hardcoded milestone constant in the card (comments excluded)",
    !/^\s*(const|let|var)\s+MILESTONE\s*=/m.test(card)
  );
  check(
    "no hardcoded reward sentence (days/multiple) in the card",
    !/(Har\s+\d+\s+ta|\+\d+\s*kun Premium|every\s+\d+\s+(activated\s+)?referrals)/i.test(card)
  );
  check(
    "the reward text is built from the server rules",
    /t\("refRule",\s*\{\s*multiple:\s*rules\.premiumMultiple,\s*days:\s*rules\.premiumDays\s*\}\)/.test(card)
  );
  check("the card is localized (not Uzbek-only)", /useTranslations\("rewards"\)/.test(card));

  // A share link built from the SERVER's loopback address must never reach a
  // friend's clipboard when the app is opened through a tunnel / preview host.
  const clientUrl = readFileSync(new URL("../src/lib/clientUrl.ts", import.meta.url), "utf8");
  check(
    "the share link is rewritten away from the server's own localhost",
    /LOOPBACK_ORIGIN/.test(clientUrl) &&
      /window\.location\.origin/.test(clientUrl) &&
      /absolutizeLink/.test(card)
  );

  const apiRoute = readFileSync(new URL("../src/app/api/referral/route.ts", import.meta.url), "utf8");
  check("the API returns the rules with the status", /getReferralStatus/.test(apiRoute));

  const engine = readFileSync(new URL("../src/lib/referrals.ts", import.meta.url), "utf8");
  check(
    "the engine reads every rule from config",
    /referral_premium_multiple/.test(engine) &&
      /referral_premium_days/.test(engine) &&
      /referral_points_referrer/.test(engine) &&
      /referral_points_referred/.test(engine) &&
      /referral_activation_completeness/.test(engine)
  );
  check("the reward grant locks the row it read-modify-writes", /\.for\("update"\)/.test(engine));

  await pool.end();
  await pg.stop();
  pg = null;

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(async (err) => {
  console.error("Referral test crashed:", err instanceof Error ? err.message : err);
  try {
    const { pool } = await import("../src/db");
    await pool.end();
  } catch {
    // ignore
  }
  try {
    await pg?.stop();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});
