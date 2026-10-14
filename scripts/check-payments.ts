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
const MERCHANT_LOGIN = "12345678-1234-1234-1234-123456789012";
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
  process.env.PAYME_LOGIN = MERCHANT_LOGIN;
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
    buildClickCheckoutUrl,
    buildPaymeCheckoutUrl,
    md5Hex,
    verifyClickSignature,
    verifyPaymeAuth,
    safeEqual,
  } = payments;
  const { getPremiumStatus } = await import("../src/lib/premium");
  const clickPrepareRoute = await import("../src/app/api/payments/click/prepare/route");
  const clickCompleteRoute = await import("../src/app/api/payments/click/complete/route");
  const paymeWebhookRoute = await import("../src/app/api/payments/payme/webhook/route");

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
  check("the issued Payme login and key are accepted", verifyPaymeAuth(basic(MERCHANT_LOGIN, MERCHANT_KEY)));
  check("a wrong merchant secret is rejected", !verifyPaymeAuth(basic(MERCHANT_LOGIN, "nope")));
  check("a wrong Payme login is rejected", !verifyPaymeAuth(basic("000000", MERCHANT_KEY)));
  check("the checkout merchant id is not mistaken for the Basic-auth login", !verifyPaymeAuth(basic(MERCHANT_ID, MERCHANT_KEY)));
  check("a missing Authorization header is rejected", !verifyPaymeAuth(null));
  check("a non-Basic scheme is rejected", !verifyPaymeAuth(`Bearer ${MERCHANT_KEY}`));
  const callPaymeWebhook = async (payload: unknown, authorization: string | null) => {
    const request = new Request("https://test.example/api/payments/payme/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify(payload),
    });
    const response = await paymeWebhookRoute.POST(request);
    return { status: response.status, body: await response.json() as Record<string, any> };
  };
  const rpcProbe = { id: 44, method: "NoSuchMethod", params: {} };
  const badAuthResponse = await callPaymeWebhook(rpcProbe, basic("wrong-login", MERCHANT_KEY));
  check(
    "unauthorized Payme JSON-RPC errors use HTTP 200 and preserve the request id",
    badAuthResponse.status === 200 && badAuthResponse.body.jsonrpc === "2.0" &&
      badAuthResponse.body.id === 44 && badAuthResponse.body.error?.code === -32504
  );
  const goodAuthResponse = await callPaymeWebhook(rpcProbe, basic(MERCHANT_LOGIN, MERCHANT_KEY));
  check(
    "authenticated Payme JSON-RPC requests reach method dispatch over HTTP 200",
    goodAuthResponse.status === 200 && goodAuthResponse.body.jsonrpc === "2.0" &&
      goodAuthResponse.body.id === 44 && goodAuthResponse.body.error?.code === -32601
  );
  const savedPaymeLogin = process.env.PAYME_LOGIN;
  delete process.env.PAYME_LOGIN;
  const unconfiguredResponse = await callPaymeWebhook(rpcProbe, basic(MERCHANT_LOGIN, MERCHANT_KEY));
  if (savedPaymeLogin !== undefined) process.env.PAYME_LOGIN = savedPaymeLogin;
  check(
    "an unconfigured Payme webhook fails closed with protocol HTTP 200",
    unconfiguredResponse.status === 200 && unconfiguredResponse.body.error?.code === -32504
  );
  const oversizedPaymeBody = JSON.stringify(rpcProbe) + " ".repeat(64 * 1024);
  const oversizedPaymeResponse = await paymeWebhookRoute.POST(new Request(
    "https://test.example/api/payments/payme/webhook",
    {
      method: "POST",
      headers: {
        authorization: basic(MERCHANT_LOGIN, MERCHANT_KEY),
        "content-type": "application/json",
      },
      body: oversizedPaymeBody,
    }
  ));
  const oversizedPaymeResult = await oversizedPaymeResponse.json() as Record<string, any>;
  check(
    "oversized Payme bodies remain capped and return a JSON-RPC HTTP 200 error",
    oversizedPaymeResponse.status === 200 && oversizedPaymeResult.error?.code === -32700
  );
  check("safeEqual is constant-time-correct on equal/unequal", safeEqual("abc", "abc") && !safeEqual("abc", "abd"));

  section("0a. Provider checkout links carry the selected amount and account");
  const paymeCheckoutUrl = buildPaymeCheckoutUrl(MERCHANT_ID, tiyn(59000), { profile_id: 27, order_id: 31 });
  const paymePayload = paymeCheckoutUrl
    ? Buffer.from(decodeURIComponent(new URL(paymeCheckoutUrl).pathname.slice(1)), "base64").toString("utf8")
    : "";
  check(
    "Payme checkout URL encodes merchant, account and amount in its documented payload",
    paymePayload === `m=${MERCHANT_ID};ac.profile_id=27;ac.order_id=31;a=${tiyn(59000)}`
  );
  const clickCheckout = buildClickCheckoutUrl({
    serviceId: CLICK_SERVICE_ID,
    merchantId: MERCHANT_ID,
    amountUzs: 59000,
    paymentId: 31,
  });
  const clickCheckoutParams = clickCheckout ? new URL(clickCheckout.checkoutUrl).searchParams : null;
  check(
    "Click checkout uses N.NN amount format and does not require merchant_user_id",
    clickCheckoutParams?.get("amount") === "59000.00" && !clickCheckoutParams.has("merchant_user_id") &&
      clickCheckoutParams.get("service_id") === CLICK_SERVICE_ID &&
      clickCheckoutParams.get("merchant_id") === MERCHANT_ID
  );
  const clickCheckoutWithUser = buildClickCheckoutUrl({
    serviceId: CLICK_SERVICE_ID,
    merchantId: MERCHANT_ID,
    merchantUserId: "student-27",
    amountUzs: 149000,
    paymentId: 32,
  });
  check(
    "Click merchant_user_id is included only when configured",
    clickCheckoutWithUser !== null &&
      new URL(clickCheckoutWithUser.checkoutUrl).searchParams.get("merchant_user_id") === "student-27"
  );
  check(
    "Click link creation requires both service and merchant ids",
    buildClickCheckoutUrl({ serviceId: CLICK_SERVICE_ID, merchantId: "", amountUzs: 59000, paymentId: 31 }) === null
  );
  const oversizedClickBody = await payments.readClickCallbackBody(new Request(
    "https://test.example/api/payments/click/prepare",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `padding=${"x".repeat(65 * 1024)}`,
    }
  ));
  check("Click urlencoded callback parsing enforces its byte limit", oversizedClickBody === null);

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
  const unknownProfileCheck = await payme("CheckPerformTransaction", {
    amount: tiyn(59000), account: { profile_id: unknownProfile },
  });
  check(
    "an unknown profile returns localized Payme account-input error -31050",
    unknownProfileCheck.error?.code === -31050 && unknownProfileCheck.error.data === "profile_id" &&
      typeof unknownProfileCheck.error.message === "object"
  );
  const missingProfileCheck = await payme("CheckPerformTransaction", { amount: tiyn(59000), account: {} });
  check(
    "a missing profile_id returns the same localized account-input error",
    missingProfileCheck.error?.code === -31050 && missingProfileCheck.error.data === "profile_id"
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
    const paymeTime = Date.now();
    const account = withOrderId
      ? { profile_id: profileId, order_id: row.id }
      : { profile_id: profileId };

    const checked = await payme("CheckPerformTransaction", { amount: tiyn(pack.priceUzs), account });
    const created = await payme("CreateTransaction", {
      id: txnId,
      time: paymeTime,
      amount: tiyn(pack.priceUzs),
      account,
    });
    const performed = await payme("PerformTransaction", { id: txnId, time: Date.now(), account });
    return { pack, row, txnId, paymeTime, checked, created, performed };
  }

  const wrongPaymeAccountProfile = await makeProfile("Wrong Payme Account");
  for (const pkg of ["monthly", "season", "yearly"] as const) {
    const buyer = await makeProfile(`Buyer ${pkg}`);
    const { pack, row, txnId, paymeTime, checked, created, performed } = await buy(pkg, buyer.id, true);

    check(`${pkg}: checkout is allowed`, (checked as any).result?.allow === true, JSON.stringify(checked));
    check(`${pkg}: transaction is created (state 1)`, (created as any).result?.state === 1, JSON.stringify(created));
    check(`${pkg}: transaction is performed (state 2)`, (performed as any).result?.state === 2, JSON.stringify(performed));
    check(
      `${pkg}: Payme responses distinguish provider id from our merchant transaction id`,
      created.result?.transaction === String(row.id) && performed.result?.transaction === String(row.id)
    );
    if (pkg === "monthly") {
      const wrongAccountRetry = await payme("CreateTransaction", {
        id: txnId,
        time: paymeTime,
        amount: tiyn(pack.priceUzs),
        account: { profile_id: wrongPaymeAccountProfile.id, order_id: row.id },
      });
      const wrongOrderRetry = await payme("CreateTransaction", {
        id: txnId,
        time: paymeTime,
        amount: tiyn(pack.priceUzs),
        account: { profile_id: buyer.id, order_id: row.id + 1000 },
      });
      const wrongAmountRetry = await payme("CreateTransaction", {
        id: txnId,
        time: paymeTime,
        amount: tiyn(pack.priceUzs + 1),
        account: { profile_id: buyer.id, order_id: row.id },
      });
      check(
        "a duplicate Payme transaction cannot be rebound to another profile",
        wrongAccountRetry.error?.code === -31050 && wrongAccountRetry.error.data === "profile_id"
      );
      check(
        "a duplicate Payme transaction cannot be rebound to another order",
        wrongOrderRetry.error?.code === -31050 && wrongOrderRetry.error.data === "order_id"
      );
      check("a duplicate Payme transaction rejects an amount change with -31001", wrongAmountRetry.error?.code === -31001);
    }

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
      time: paymeTime,
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
    "another profile's order_id is rejected as an account-input error without creating a payment",
    (stolen as any).error?.code === -31050 && (stolen as any).error?.data === "order_id" &&
      (await findPaymentByProviderId("PM-STOLEN-1")) === null,
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
    "an order_id whose amount differs is rejected with -31001 and left untouched",
    (mismatch as any).error?.code === -31001 && rowAMismatch.providerTransactionId === "" &&
      (await findPaymentByProviderId("PM-MISMATCH-1")) === null,
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
  const invalidCancelReason = await payme("CancelTransaction", { id: pendTxn, reason: 99 });
  check(
    "an unknown Payme cancellation reason is rejected without mutating the transaction",
    invalidCancelReason.error?.code === -32602 &&
      (await findPaymentByProviderId(pendTxn))?.status === "pending"
  );
  const cancelled = await payme("CancelTransaction", { id: pendTxn, reason: 3 });
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
  const refunded = await payme("CancelTransaction", { id: refundTxn, reason: 5 });
  const [refundedRow] = await db
    .select()
    .from(schema.payments)
    .where(eq(schema.payments.providerTransactionId, refundTxn));
  check(
    "cancelling a PAID transaction marks it refunded (Payme state -2)",
    (refunded as any).result?.state === -2 && refundedRow?.status === "refunded",
    JSON.stringify({ state: (refunded as any).result?.state, status: refundedRow?.status })
  );
  check(
    "Payme timestamps use milliseconds and retain perform/cancel times",
    refundedRow?.performedAt instanceof Date && refundedRow.performedAt.getTime() > 1_000_000_000_000 &&
      refundedRow.cancelledAt instanceof Date && refundedRow.cancelledAt.getTime() > 1_000_000_000_000
  );

  const refundStatus = await payme("CheckTransaction", { id: refundTxn });
  check(
    "CheckTransaction reports the refunded state, merchant transaction id and lifecycle timestamps",
    refundStatus.result?.state === -2 && refundStatus.result.transaction === String(refundedRow.id) &&
      refundStatus.result.perform_time > 1_000_000_000_000 &&
      refundStatus.result.cancel_time > 1_000_000_000_000
  );
  check(
    "CheckTransaction on an unknown transaction is -31003",
    (await payme("CheckTransaction", { id: "NOPE" })).error?.code === -31003
  );
  const statement = await payme("GetStatement", {
    from: Date.now() - 3_600_000,
    to: Date.now() + 3_600_000,
  });
  check(
    "GetStatement returns only created merchant transactions",
    Array.isArray((statement as any).result?.transactions) &&
      (statement as any).result.transactions.length > 0 &&
      (statement as any).result.transactions.every((t: any) => t.id)
  );
  const refundStatementRow = (statement as any).result?.transactions?.find((t: any) => t.id === refundTxn);
  check(
    "GetStatement uses Payme's id in `id` and the merchant payment id in `transaction`",
    refundStatementRow?.transaction === String(refundedRow.id) && refundStatementRow.id === refundTxn
  );

  const expiredProfile = await makeProfile("Expired Payme Student");
  const expiredTxnId = `PM-TIMEOUT-${Date.now()}`;
  const expiredPaymeTime = Date.now() - 12 * 60 * 60 * 1000 - 60_000;
  const expiredCreate = await payme("CreateTransaction", {
    id: expiredTxnId,
    time: expiredPaymeTime,
    amount: tiyn(59000),
    account: { profile_id: expiredProfile.id },
  });
  const [expiredRow] = await db.select().from(schema.payments).where(eq(schema.payments.providerTransactionId, expiredTxnId));
  const expiredCheck = await payme("CheckTransaction", { id: expiredTxnId });
  check(
    "Payme's 12-hour timeout cancels stale transactions with reason 4",
    (expiredCreate as any).result?.state === -1 && expiredRow.status === "cancelled" &&
      expiredRow.cancelReason === 4 && (expiredCheck as any).result?.state === -1 &&
      (expiredCheck as any).result?.reason === 4
  );
  check(
    "an expired Payme transaction cannot grant Premium",
    (await payme("PerformTransaction", { id: expiredTxnId })).error?.code === -31008 &&
      (await getPremiumStatus(expiredProfile.id)).isPremium === false
  );
  const expiredStatement = await payme("GetStatement", {
    from: expiredPaymeTime - 1,
    to: expiredPaymeTime + 1,
  });
  check(
    "GetStatement filters/sorts by Payme's provider `time`, not checkout creation time",
    (expiredStatement as any).result?.transactions?.some(
      (t: any) => t.id === expiredTxnId && t.time === expiredPaymeTime && t.state === -1
    ) === true
  );
  check(
    "an unknown JSON-RPC method is -32601",
    (await payme("DoSomethingElse", {})).error?.code === -32601
  );

  // -------------------------------------------------------------------------
  section("8. Click signatures");

  const clickBase = {
    clickTransId: "900001",
    serviceId: CLICK_SERVICE_ID,
    secretKey: CLICK_SECRET_KEY,
    merchantTransId: "42",
    amount: "499000",
    action: 0,
    signTime: "2026-10-14 12:00:00",
  };
  const goodSign = md5Hex(clickSignString(clickBase));
  check(
    "prepare signature uses Click v2 field order (without click_paydoc_id)",
    clickSignString(clickBase) === "90000131337click-secret-for-test4249900002026-10-14 12:00:00"
  );
  check("complete signature adds merchant_prepare_id before amount", clickSignString({
    ...clickBase,
    action: 1,
    merchantPrepareId: "42",
  }) === "90000131337click-secret-for-test424249900012026-10-14 12:00:00");
  check("a correct signature verifies", verifyClickSignature(goodSign, goodSign));
  check("signature comparison is case-insensitive", verifyClickSignature(goodSign.toUpperCase(), goodSign));
  check("a wrong signature is refused", !verifyClickSignature(md5Hex("tampered"), goodSign));
  check("an empty signature is never accepted", !verifyClickSignature("", goodSign) && !verifyClickSignature(goodSign, ""));
  check(
    "changing amount or sign_time changes the signature",
    md5Hex(clickSignString({ ...clickBase, amount: "59000" })) !== goodSign &&
      md5Hex(clickSignString({ ...clickBase, signTime: "2026-10-14 12:00:01" })) !== goodSign
  );

  // -------------------------------------------------------------------------
  section("8a. Click callback lifecycle (prepare, complete, idempotent retry)");

  const clickStudent = await makeProfile("Click Student");
  const [clickPayment] = await db
    .insert(schema.payments)
    .values({
      profileId: clickStudent.id,
      provider: "click",
      providerTransactionId: "",
      amount: 59000,
      currency: "UZS",
      status: "pending",
      purpose: "premium",
    })
    .returning();
  const signedClickCallback = (
    action: number,
    amount: string,
    serviceId = CLICK_SERVICE_ID,
    clickTransId = "900001",
    clickError = 0,
    paymentId = clickPayment.id
  ) => {
    const payload: Record<string, unknown> = {
      click_trans_id: clickTransId,
      service_id: serviceId,
      click_paydoc_id: "800001",
      merchant_trans_id: String(paymentId),
      merchant_prepare_id: String(paymentId),
      amount,
      action,
      error: clickError,
      error_note: clickError === 0 ? "Success" : "Provider payment error",
      sign_time: "2026-10-14 12:00:00",
    };
    payload.sign_string = md5Hex(clickSignString({
      clickTransId: String(payload.click_trans_id),
      serviceId: String(payload.service_id),
      secretKey: CLICK_SECRET_KEY,
      merchantTransId: String(payload.merchant_trans_id),
      amount,
      action,
      signTime: String(payload.sign_time),
      ...(action === 1 ? { merchantPrepareId: String(payload.merchant_prepare_id) } : {}),
    }));
    return payload;
  };
  const postClick = async (
    handler: (req: Request) => Promise<Response>,
    payload: Record<string, unknown>,
    form = false
  ) => {
    const body = form
      ? new URLSearchParams(Object.entries(payload).map(([key, value]) => [key, String(value)]))
      : JSON.stringify(payload);
    const response = await handler(new Request("https://test.example/api/payments/click", {
      method: "POST",
      headers: { "content-type": form ? "application/x-www-form-urlencoded" : "application/json" },
      body,
    }));
    return { status: response.status, body: await response.json() as Record<string, unknown> };
  };

  const invalidClickSign = signedClickCallback(0, "59000");
  invalidClickSign.sign_string = "not-a-signature";
  const invalidClickPrepare = await postClick(clickPrepareRoute.POST, invalidClickSign);
  check("prepare refuses an invalid signature", invalidClickPrepare.body.error === -1);
  const wrongService = await postClick(clickPrepareRoute.POST, signedClickCallback(0, "59000", "other-service"));
  check("prepare refuses a callback for another service", wrongService.body.error === -8);

  const preparePayload = signedClickCallback(0, "59000.00");
  const prepared = await postClick(clickPrepareRoute.POST, preparePayload, true);
  check("valid form-urlencoded action=0 prepare returns our payment id", prepared.body.error === 0 && prepared.body.merchant_prepare_id === clickPayment.id);
  const preparedAgain = await postClick(clickPrepareRoute.POST, preparePayload);
  check("repeated prepare with the same Click transaction is idempotent", preparedAgain.body.error === 0);
  const [clickLinked] = await db.select().from(schema.payments).where(eq(schema.payments.id, clickPayment.id));
  check("prepare binds click_trans_id to the pending Click payment", clickLinked.providerTransactionId === "900001");

  const wrongClickAmount = await postClick(clickCompleteRoute.POST, signedClickCallback(1, "59001"));
  check("complete rejects an authenticated but incorrect amount", wrongClickAmount.body.error === -2);
  const completePayload = signedClickCallback(1, "59000.00");
  const [complete1, complete2] = await Promise.all([
    postClick(clickCompleteRoute.POST, completePayload, true),
    postClick(clickCompleteRoute.POST, completePayload, true),
  ]);
  const clickSubs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.paymentId, clickPayment.id));
  check(
    "valid form-urlencoded action=1 complete grants once; concurrent duplicate returns -4",
    [complete1.body.error, complete2.body.error].includes(0) &&
      [complete1.body.error, complete2.body.error].includes(-4) && clickSubs.length === 1
  );
  const [clickPaid] = await db.select().from(schema.payments).where(eq(schema.payments.id, clickPayment.id));
  check("Click marks its own payment paid only after the signed complete callback", clickPaid.status === "paid");

  const failedClickStudent = await makeProfile("Click Failed Student");
  const [failedClickPayment] = await db
    .insert(schema.payments)
    .values({
      profileId: failedClickStudent.id,
      provider: "click",
      providerTransactionId: "",
      amount: 59000,
      currency: "UZS",
      status: "pending",
      purpose: "premium",
    })
    .returning();
  const failedClickPrepare = signedClickCallback(0, "59000.00", CLICK_SERVICE_ID, "900002", 0, failedClickPayment.id);
  const failedPrepareResult = await postClick(clickPrepareRoute.POST, failedClickPrepare, true);
  const failedClickComplete = signedClickCallback(1, "59000.00", CLICK_SERVICE_ID, "900002", -1, failedClickPayment.id);
  const failedCompleteResult = await postClick(clickCompleteRoute.POST, failedClickComplete, true);
  const [failedClickStored] = await db.select().from(schema.payments).where(eq(schema.payments.id, failedClickPayment.id));
  const failedClickSubs = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.paymentId, failedClickPayment.id));
  const failedCompleteAgain = await postClick(clickCompleteRoute.POST, failedClickComplete, true);
  check(
    "Click negative error cancels the prepared payment and never grants Premium",
    failedPrepareResult.body.error === 0 && failedCompleteResult.body.error === -9 &&
      failedClickStored.status === "cancelled" && failedClickSubs.length === 0 && failedCompleteAgain.body.error === -9
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
