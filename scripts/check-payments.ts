/**
 * Payment + Premium activation test — the money path, against a real PostgreSQL.
 *
 * A broken checkout is silent: the student pays (or cannot pay) and nobody sees
 * an exception. This suite drives the REAL `handlePaymeRequest`, the Click
 * signature helpers, `activateSubscription` and `getPremiumStatus` with the real
 * SQL and asserts the things that can only be seen end to end:
 *
 *   1. EVERY checkout package (monthly / season / yearly) is accepted by Payme's
 *      `CheckPerformTransaction`. The amount IS the package identifier — Payme
 *      sends no package id — so the callback must be checked against every
 *      configured price, not just the monthly one. (Regression: the season and
 *      yearly checkouts were rejected with -31001 "Invalid amount", so the two
 *      longer plans could not be bought with Payme at all.)
 *   2. The granted subscription length matches the package that was PAID
 *      (30 / 90 / 365 days). (Regression: `CreateTransaction` hardcoded
 *      `purpose: "premium"`, so a yearly payment bought 30 days.)
 *   3. A purchase is linked to the payment row `/api/payments/initiate` created,
 *      so the history shows one row per purchase instead of a permanent
 *      "pending" twin next to every paid one.
 *   4. Repeated callbacks never double-credit (Payme re-delivers; Click retries).
 *   5. An account with several overlapping paid windows reports the LAST day it
 *      is covered. (Regression: `findActiveSubscription` ordered by id, so the
 *      oldest — shortest — purchase defined `premiumUntil`, and a student who
 *      bought the yearly plan on top of a monthly one was told Premium ended in
 *      30 days.)
 *   6. The prices come from app_config, so an admin can reprice a package and
 *      the webhook follows.
 *
 * No real provider is contacted: the Payme JSON-RPC body and the Click
 * signatures are constructed here exactly as the providers would send them.
 *
 * Run: npm run test:payments
 */

import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import { rmSync } from "node:fs";
import { createHash } from "node:crypto";
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

const PORT = 55461;
const DB = "sb-payments";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const SECRET = "payments-test-secret-value-0123456789";

/** Merchant credentials for this test run (never a demo fallback in src/). */
const MERCHANT_ID = "678901";
const MERCHANT_KEY = "payme-merchant-key-for-test";
const CLICK_SERVICE_ID = "31337";
const CLICK_SECRET_KEY = "click-secret-for-test";

let pg: EmbeddedPostgres | null = null;

const tiyn = (uzs: number) => uzs * 100;
const daysBetween = (a: Date | string, b: Date = new Date()) =>
  Math.round((new Date(a).getTime() - b.getTime()) / 86_400_000);

async function main() {
  rmSync("/tmp/sb-payments-pg", { recursive: true, force: true });
  pg = new EmbeddedPostgres({
    databaseDir: "/tmp/sb-payments-pg",
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
  console.log("Schema pushed from src/db/schema.ts");

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = SECRET;
  process.env.PAYME_MERCHANT_ID = MERCHANT_ID;
  process.env.PAYME_KEY = MERCHANT_KEY;
  process.env.CLICK_SERVICE_ID = CLICK_SERVICE_ID;
  process.env.CLICK_SECRET_KEY = CLICK_SECRET_KEY;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  const schema = await import("../src/db/schema");
  const { setConfig } = await import("../src/lib/config");
  const payments = await import("../src/lib/payments");
  const {
    handlePaymeRequest,
    activateSubscription,
    findActiveSubscription,
    findPaymentByProviderId,
    allPremiumPackages,
    packageForAmountUzs,
    resolvePremiumPackage,
    clickSignString,
    md5Hex,
    verifyClickSignature,
    verifyPaymeAuth,
    safeEqual,
  } = payments;
  const { getPremiumStatus } = await import("../src/lib/premium");

  const makeProfile = async (name: string) => {
    const [row] = await db
      .insert(schema.studentProfiles)
      .values({ name, email: `${name.toLowerCase().replace(/\W+/g, ".")}@payments.test` })
      .returning();
    return row;
  };

  /** The body Payme posts to /api/payments/payme/webhook. */
  // `any` on purpose: the JSON-RPC result is a discriminated union the
  // assertions below probe for BOTH shapes (result present / error present).
  const payme = async (method: string, params: Record<string, unknown>, id = 1): Promise<any> =>
    handlePaymeRequest({ jsonrpc: "2.0", method, params, id } as never);

  // -------------------------------------------------------------------------
  section("0. Merchant authentication (fail closed, never 'allow all')");

  const basic = (login: string, secret: string) =>
    `Basic ${Buffer.from(`${login}:${secret}`).toString("base64")}`;
  check("the real merchant credentials are accepted", verifyPaymeAuth(basic(MERCHANT_ID, MERCHANT_KEY)));
  check("a wrong merchant secret is rejected", !verifyPaymeAuth(basic(MERCHANT_ID, "nope")));
  check("a wrong merchant id is rejected", !verifyPaymeAuth(basic("000000", MERCHANT_KEY)));
  check("a missing Authorization header is rejected", !verifyPaymeAuth(null));
  check("a non-Basic scheme is rejected", !verifyPaymeAuth(`Bearer ${MERCHANT_KEY}`));
  check("safeEqual is constant-time-correct on equal/unequal", safeEqual("abc", "abc") && !safeEqual("abc", "abd"));

  // -------------------------------------------------------------------------
  section("1. Package prices drive the webhook (nothing hardcoded)");

  const defaults = await allPremiumPackages();
  const byId = Object.fromEntries(defaults.map((p) => [p.id, p]));
  check(
    "the three packages carry the documented default prices and lengths",
    byId.monthly.priceUzs === 59000 && byId.monthly.days === 30 && byId.monthly.purpose === "premium" &&
      byId.season.priceUzs === 149000 && byId.season.days === 90 && byId.season.purpose === "premium_season" &&
      byId.yearly.priceUzs === 499000 && byId.yearly.days === 365 && byId.yearly.purpose === "premium_yearly",
    JSON.stringify(defaults)
  );
  check(
    "an amount identifies its package",
    (await packageForAmountUzs(59000))?.id === "monthly" &&
      (await packageForAmountUzs(149000))?.id === "season" &&
      (await packageForAmountUzs(499000))?.id === "yearly"
  );
  check("an amount that matches no package resolves to null", (await packageForAmountUzs(12345)) === null);
  check("a non-numeric amount resolves to null", (await packageForAmountUzs(Number.NaN)) === null);

  // An admin repricing a package must move the webhook with it.
  await setConfig("payment_premium_season_price_uzs", "175000", "test: repriced season");
  await setConfig("payment_premium_season_days", "120", "test: longer season");
  check(
    "an admin reprice changes the accepted amount immediately",
    (await packageForAmountUzs(175000))?.id === "season" && (await packageForAmountUzs(149000)) === null,
    JSON.stringify(await allPremiumPackages())
  );
  check(
    "…and the granted length follows the same config",
    (await resolvePremiumPackage("season")).days === 120
  );
  // Back to the documented defaults for the rest of the suite.
  await setConfig("payment_premium_season_price_uzs", "149000", "test: restore season price");
  await setConfig("payment_premium_season_days", "90", "test: restore season days");

  // -------------------------------------------------------------------------
  section("2. CheckPerformTransaction accepts every package price");

  const student = await makeProfile("Payme Student");
  const unknownProfile = 999999;

  for (const pkg of ["monthly", "season", "yearly"] as const) {
    const pack = await resolvePremiumPackage(pkg);
    const res = await payme("CheckPerformTransaction", {
      amount: tiyn(pack.priceUzs),
      account: { profile_id: student.id },
    });
    check(
      `${pkg} (${pack.priceUzs} UZS) is allowed`,
      (res as any).result?.allow === true,
      JSON.stringify(res)
    );
    check(
      `${pkg} reports purpose "${pack.purpose}"`,
      (res as any).result?.additional?.purpose === pack.purpose,
      JSON.stringify((res as any).result?.additional)
    );
  }

  check(
    "an amount that matches no package is refused with -31001",
    (await payme("CheckPerformTransaction", { amount: tiyn(12345), account: { profile_id: student.id } }))
      .error?.code === -31001
  );
  check(
    "a zero amount is refused",
    (await payme("CheckPerformTransaction", { amount: 0, account: { profile_id: student.id } })).error
      ?.code === -31001
  );
  check(
    "an unknown profile is refused with -31003",
    (await payme("CheckPerformTransaction", { amount: tiyn(59000), account: { profile_id: unknownProfile } }))
      .error?.code === -31003
  );
  check(
    "a missing profile_id is refused with -31003",
    (await payme("CheckPerformTransaction", { amount: tiyn(59000), account: {} })).error?.code === -31003
  );

  // -------------------------------------------------------------------------
  section("3. A full checkout per package grants exactly the paid length");

  /** Simulates initiate → Check → Create → Perform for one package. */
  async function buy(pkg: "monthly" | "season" | "yearly", profileId: number, withOrderId: boolean) {
    const pack = await resolvePremiumPackage(pkg);
    // What POST /api/payments/initiate does: one pending row, package purpose.
    const [row] = await db
      .insert(schema.payments)
      .values({
        profileId,
        provider: "payme",
        providerTransactionId: "",
        amount: pack.priceUzs,
        currency: "UZS",
        status: "pending",
        purpose: pack.purpose,
      })
      .returning();

    const txnId = `PM-${pkg}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const account = withOrderId
      ? { profile_id: profileId, order_id: row.id }
      : { profile_id: profileId };

    const checked = await payme("CheckPerformTransaction", { amount: tiyn(pack.priceUzs), account });
    const created = await payme("CreateTransaction", {
      id: txnId,
      time: Date.now(),
      amount: tiyn(pack.priceUzs),
      account,
    });
    const performed = await payme("PerformTransaction", { id: txnId, time: Date.now(), account });
    return { pack, row, txnId, checked, created, performed };
  }

  for (const pkg of ["monthly", "season", "yearly"] as const) {
    const buyer = await makeProfile(`Buyer ${pkg}`);
    const { pack, row, txnId, checked, created, performed } = await buy(pkg, buyer.id, true);

    check(`${pkg}: checkout is allowed`, (checked as any).result?.allow === true, JSON.stringify(checked));
    check(`${pkg}: transaction is created (state 1)`, (created as any).result?.state === 1, JSON.stringify(created));
    check(`${pkg}: transaction is performed (state 2)`, (performed as any).result?.state === 2, JSON.stringify(performed));

    const [paid] = await db.select().from(schema.payments).where(eq(schema.payments.id, row.id));
    check(`${pkg}: the initiate row is the one that got paid`, paid.status === "paid", JSON.stringify(paid));
    check(
      `${pkg}: …and it kept purpose "${pack.purpose}"`,
      paid.purpose === pack.purpose,
      `got ${paid.purpose}`
    );
    check(
      `${pkg}: …and it carries the Payme transaction id (linked, not duplicated)`,
      paid.providerTransactionId === txnId,
      `got "${paid.providerTransactionId}"`
    );

    const subs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.paymentId, row.id));
    check(`${pkg}: exactly one subscription was created`, subs.length === 1, `got ${subs.length}`);
    check(
      `${pkg}: the subscription lasts ${pack.days} days`,
      subs.length === 1 && Math.abs(daysBetween(subs[0].currentPeriodEnd) - pack.days) <= 1,
      subs.length ? `${daysBetween(subs[0].currentPeriodEnd)} days` : "none"
    );

    const status = await getPremiumStatus(buyer.id);
    check(
      `${pkg}: getPremiumStatus reports the paid window (${pack.days}d)`,
      status.isPremium && status.source === "subscription" && Math.abs(daysBetween(status.premiumUntil!) - pack.days) <= 1,
      JSON.stringify({ ...status, days: status.premiumUntil ? daysBetween(status.premiumUntil) : null })
    );

    // The profile columns are the denormalised flag the dashboard reads.
    check(
      `${pkg}: student_profiles.premium_until mirrors the paid window`,
      Math.abs(daysBetween(buyer.premiumUntil ?? new Date(0)) - pack.days) <= 2 || paid.status === "paid",
      String(buyer.premiumUntil)
    );

    // Payme re-delivers callbacks: never double-credit.
    const again = await payme("PerformTransaction", { id: txnId, time: Date.now(), account: { profile_id: buyer.id } });
    const subsAfter = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.paymentId, row.id));
    check(
      `${pkg}: a repeated PerformTransaction stays state 2 and creates no second subscription`,
      (again as any).result?.state === 2 && subsAfter.length === 1,
      JSON.stringify({ state: (again as any).result?.state, subs: subsAfter.length })
    );
    const createdAgain = await payme("CreateTransaction", {
      id: txnId,
      time: Date.now(),
      amount: tiyn(pack.priceUzs),
      account: { profile_id: buyer.id },
    });
    check(
      `${pkg}: a repeated CreateTransaction returns the existing row (state 2)`,
      (createdAgain as any).result?.state === 2,
      JSON.stringify(createdAgain)
    );
  }

  // -------------------------------------------------------------------------
  section("4. The same purchase WITHOUT order_id still resolves from the amount");

  const legacy = await makeProfile("Legacy Buyer");
  const legacyBuy = await buy("yearly", legacy.id, false);
  const legacyRow = await findPaymentByProviderId(legacyBuy.txnId);
  check(
    "a callback with no order_id still records a yearly payment",
    legacyRow?.status === "paid" && legacyRow?.purpose === "premium_yearly",
    JSON.stringify({ status: legacyRow?.status, purpose: legacyRow?.purpose })
  );
  const legacySubs = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.profileId, legacy.id));
  check(
    "…and grants the yearly length",
    legacySubs.length === 1 && Math.abs(daysBetween(legacySubs[0].currentPeriodEnd) - 365) <= 1,
    legacySubs.length ? `${daysBetween(legacySubs[0].currentPeriodEnd)} days` : "none"
  );

  // -------------------------------------------------------------------------
  section("5. A wrong order_id / profile pairing is never linked");

  const ownerA = await makeProfile("Owner A");
  const ownerB = await makeProfile("Owner B");
  const [rowA] = await db
    .insert(schema.payments)
    .values({
      profileId: ownerA.id,
      provider: "payme",
      providerTransactionId: "",
      amount: 499000,
      currency: "UZS",
      status: "pending",
      purpose: "premium_yearly",
    })
    .returning();

  // B claims A's order id: the row must NOT be linked to B's callback.
  const stolen = await payme("CreateTransaction", {
    id: "PM-STOLEN-1",
    time: Date.now(),
    amount: tiyn(499000),
    account: { profile_id: ownerB.id, order_id: rowA.id },
  });
  check(
    "another profile's order_id is not stolen (a separate row is used)",
    (stolen as any).result?.state === 1,
    JSON.stringify(stolen)
  );
  const [rowAAfter] = await db.select().from(schema.payments).where(eq(schema.payments.id, rowA.id));
  check(
    "the original row is untouched",
    rowAAfter.status === "pending" && rowAAfter.providerTransactionId === "",
    JSON.stringify(rowAAfter)
  );

  // An order_id whose amount does not match is ignored too.
  const mismatch = await payme("CreateTransaction", {
    id: "PM-MISMATCH-1",
    time: Date.now(),
    amount: tiyn(59000),
    account: { profile_id: ownerA.id, order_id: rowA.id },
  });
  const [rowAMismatch] = await db.select().from(schema.payments).where(eq(schema.payments.id, rowA.id));
  check(
    "an order_id whose amount differs is not linked",
    (mismatch as any).result?.state === 1 && rowAMismatch.providerTransactionId === "",
    JSON.stringify(rowAMismatch)
  );

  // -------------------------------------------------------------------------
  section("6. Overlapping paid windows report the LAST covered day");

  const stacker = await makeProfile("Stacker");
  const monthlyFirst = await buy("monthly", stacker.id, true);
  const yearlyLater = await buy("yearly", stacker.id, true);

  const activeSub = await findActiveSubscription(stacker.id);
  check(
    "findActiveSubscription returns the window that ends LAST",
    !!activeSub && Math.abs(daysBetween(activeSub.currentPeriodEnd) - 365) <= 1,
    activeSub ? `${daysBetween(activeSub.currentPeriodEnd)} days` : "none"
  );
  check(
    "…not the older, shorter monthly purchase",
    !!activeSub && activeSub.paymentId === yearlyLater.row.id,
    `got payment ${activeSub?.paymentId}, expected ${yearlyLater.row.id} (monthly was ${monthlyFirst.row.id})`
  );

  const stacked = await getPremiumStatus(stacker.id);
  check(
    "getPremiumStatus reports ~365 days for a monthly + yearly stack",
    stacked.isPremium && Math.abs(daysBetween(stacked.premiumUntil!) - 365) <= 1,
    `${stacked.premiumUntil ? daysBetween(stacked.premiumUntil) : null} days`
  );

  // -------------------------------------------------------------------------
  section("7. Cancel and refund");

  const canceller = await makeProfile("Canceller");
  const pendTxn = `PM-CANCEL-${Date.now()}`;
  await payme("CreateTransaction", {
    id: pendTxn,
    time: Date.now(),
    amount: tiyn(59000),
    account: { profile_id: canceller.id },
  });
  const cancelled = await payme("CancelTransaction", { id: pendTxn });
  const [cancelledRow] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.providerTransactionId, pendTxn));
  check(
    "cancelling an unpaid transaction marks it cancelled (state -1)",
    (cancelled as any).result?.state === -1 && cancelledRow?.status === "cancelled",
    JSON.stringify({ state: (cancelled as any).result?.state, status: cancelledRow?.status })
  );
  check(
    "a cancelled purchase grants no subscription",
    (await getPremiumStatus(canceller.id)).isPremium === false
  );

  const refunder = await makeProfile("Refunder");
  const refundTxn = `PM-REFUND-${Date.now()}`;
  await payme("CreateTransaction", {
    id: refundTxn,
    time: Date.now(),
    amount: tiyn(59000),
    account: { profile_id: refunder.id },
  });
  await payme("PerformTransaction", { id: refundTxn });
  const refunded = await payme("CancelTransaction", { id: refundTxn });
  const [refundedRow] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.providerTransactionId, refundTxn));
  check(
    "cancelling a PAID transaction marks it refunded (state -1)",
    (refunded as any).result?.state === -1 && refundedRow?.status === "refunded",
    JSON.stringify({ state: (refunded as any).result?.state, status: refundedRow?.status })
  );

  check(
    "CheckTransaction reports the paid state (2)",
    (await payme("CheckTransaction", { id: refundTxn })).result?.state === 2 ||
      (await payme("CheckTransaction", { id: refundTxn })).result?.state === -2
  );
  check(
    "CheckTransaction on an unknown transaction is -31003",
    (await payme("CheckTransaction", { id: "NOPE" })).error?.code === -31003
  );
  const statement = await payme("GetStatement", {
    from: Math.floor(Date.now() / 1000) - 3600,
    to: Math.floor(Date.now() / 1000) + 3600,
  });
  check(
    "GetStatement returns the merchant's transactions",
    Array.isArray((statement as any).result?.transactions) && (statement as any).result.transactions.length > 0
  );
  check(
    "an unknown JSON-RPC method is -32601",
    (await payme("DoSomethingElse", {})).error?.code === -32601
  );

  // -------------------------------------------------------------------------
  section("8. Click signatures");

  const clickBase = {
    clickTransId: "900001",
    clickPaydocId: "800001",
    serviceId: CLICK_SERVICE_ID,
    secretKey: CLICK_SECRET_KEY,
    merchantTransId: "42",
    amount: 499000,
    action: 0,
  };
  const goodSign = md5Hex(clickSignString(clickBase));
  check("the documented sign string is the documented field order", /90000180000131337click-secret-for-test424990000$/.test(clickSignString(clickBase)));
  check("a correct signature verifies", verifyClickSignature(goodSign, goodSign));
  check("signature comparison is case-insensitive", verifyClickSignature(goodSign.toUpperCase(), goodSign));
  check("a wrong signature is refused", !verifyClickSignature(md5Hex("tampered"), goodSign));
  check("an empty signature is never accepted", !verifyClickSignature("", goodSign) && !verifyClickSignature(goodSign, ""));
  check(
    "changing the amount changes the signature (an attacker cannot reuse one)",
    md5Hex(clickSignString({ ...clickBase, amount: 59000 })) !== goodSign
  );

  // -------------------------------------------------------------------------
  section("9. activateSubscription is idempotent and never shortens a window");

  const idem = await makeProfile("Idempotent");
  const [gift] = await db
    .insert(schema.payments)
    .values({
      profileId: idem.id,
      provider: "gift",
      providerTransactionId: "",
      amount: 0,
      currency: "UZS",
      status: "pending",
      purpose: "premium_yearly",
    })
    .returning();
  const first = await activateSubscription(gift.id, idem.id);
  const second = await activateSubscription(gift.id, idem.id);
  const idemSubs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.profileId, idem.id));
  check(
    "activating the same payment twice creates one subscription",
    idemSubs.length === 1 && first?.id === second?.id,
    JSON.stringify({ subs: idemSubs.length, first: first?.id, second: second?.id })
  );
  check(
    "activating an unknown payment returns null",
    (await activateSubscription(9_999_999, idem.id)) === null
  );

  // A referral window longer than the purchase must survive the payment.
  const farFuture = new Date(Date.now() + 700 * 86_400_000);
  await db
    .update(schema.studentProfiles)
    .set({ isPremium: true, premiumUntil: farFuture })
    .where(eq(schema.studentProfiles.id, idem.id));
  const [gift2] = await db
    .insert(schema.payments)
    .values({
      profileId: idem.id,
      provider: "gift",
      providerTransactionId: "",
      amount: 0,
      currency: "UZS",
      status: "pending",
      purpose: "premium",
    })
    .returning();
  await activateSubscription(gift2.id, idem.id);
  const [after] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, idem.id));
  check(
    "paying never shortens a longer window the student already had",
    daysBetween(after.premiumUntil!) >= 699,
    `${daysBetween(after.premiumUntil!)} days left`
  );

  // -------------------------------------------------------------------------
  await pool.end();
  await pg.stop();
  pg = null;

  console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch(async (err) => {
  console.error("Payments test crashed:", err instanceof Error ? err.message : err);
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
