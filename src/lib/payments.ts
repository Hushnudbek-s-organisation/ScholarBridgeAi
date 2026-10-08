import { createHash, timingSafeEqual } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions, studentProfiles } from "@/db/schema";
import { getConfigNumber } from "@/lib/config";

// Sync fallbacks (kept for backward compatibility) — the real values come
// from app_config (spec §3: no hardcoded business values).
export const PREMIUM_PRICE_UZS = 59000;
export const PREMIUM_CURRENCY = "UZS";
export const PREMIUM_PERIOD_DAYS = 30;

/** Config-driven premium price (UZS). */
export async function getPremiumPriceUzs(): Promise<number> {
  return getConfigNumber("payment_premium_price_uzs", PREMIUM_PRICE_UZS);
}

/** Config-driven premium period (days). */
export async function getPremiumPeriodDays(): Promise<number> {
  return getConfigNumber("payment_premium_days", PREMIUM_PERIOD_DAYS);
}

/** Supported checkout packages — monthly default, plus seasonal/yearly deals. */
export type PremiumPackageId = "monthly" | "season" | "yearly";

export async function resolvePremiumPackage(
  packageId: string | null | undefined
): Promise<{ id: PremiumPackageId; priceUzs: number; days: number; purpose: string }> {
  const id = (packageId === "season" || packageId === "yearly" ? packageId : "monthly") as PremiumPackageId;
  if (id === "season") {
    return {
      id,
      priceUzs: await getConfigNumber("payment_premium_season_price_uzs", 149000),
      days: await getConfigNumber("payment_premium_season_days", 90),
      purpose: "premium_season",
    };
  }
  if (id === "yearly") {
    return {
      id,
      priceUzs: await getConfigNumber("payment_premium_yearly_price_uzs", 499000),
      days: await getConfigNumber("payment_premium_yearly_days", 365),
      purpose: "premium_yearly",
    };
  }
  return {
    id: "monthly",
    priceUzs: await getPremiumPriceUzs(),
    days: await getPremiumPeriodDays(),
    purpose: "premium",
  };
}

/** Days granted for a paid payment purpose (gift routes pass days explicitly). */
export async function periodDaysForPurpose(purpose: string | null | undefined): Promise<number> {
  if (purpose === "premium_season") return getConfigNumber("payment_premium_season_days", 90);
  if (purpose === "premium_yearly") return getConfigNumber("payment_premium_yearly_days", 365);
  return getPremiumPeriodDays();
}

/** Every checkout package with its live (config-driven) price and length. */
export async function allPremiumPackages(): Promise<
  { id: PremiumPackageId; priceUzs: number; days: number; purpose: string }[]
> {
  return [
    await resolvePremiumPackage("monthly"),
    await resolvePremiumPackage("season"),
    await resolvePremiumPackage("yearly"),
  ];
}

/**
 * Which package an amount (in UZS) corresponds to, or null when it matches no
 * configured price.
 *
 * Payme's merchant callbacks carry only the amount and the merchant `account`
 * object — there is no package id. So the price IS the package identifier, and
 * a callback must be checked against EVERY package price, not just the monthly
 * one. Comparing against the monthly price alone made the season and yearly
 * checkouts fail at `CheckPerformTransaction` with "Invalid amount".
 */
export async function packageForAmountUzs(amountUzs: number | null | undefined) {
  if (!Number.isFinite(Number(amountUzs))) return null;
  const value = Number(amountUzs);
  const packs = await allPremiumPackages();
  return packs.find((p) => p.priceUzs === value) ?? null;
}

// ---------------------------------------------------------------------------
// Config helpers
// ---------------------------------------------------------------------------
export function paymeConfig() {
  return {
    merchantId: process.env.PAYME_MERCHANT_ID || "",
    key: process.env.PAYME_KEY || "",
    password: process.env.PAYME_PASSWORD || "",
  };
}

export function clickConfig() {
  return {
    serviceId: process.env.CLICK_SERVICE_ID || "",
    merchantId: process.env.CLICK_MERCHANT_ID || "",
    merchantUserId: process.env.CLICK_MERCHANT_USER_ID || "",
    // NEVER a demo fallback: a hard-coded secret in the repo would let anyone
    // forge a payment callback and grant themselves premium for free.
    secretKey: process.env.CLICK_SECRET_KEY || "",
  };
}

/** True when real Payme merchant credentials are present. */
export function isPaymeConfigured(): boolean {
  const cfg = paymeConfig();
  return Boolean(cfg.merchantId && (cfg.key || cfg.password));
}

/** True when real Click credentials are present. */
export function isClickConfigured(): boolean {
  const cfg = clickConfig();
  return Boolean(cfg.serviceId && cfg.secretKey);
}

/**
 * Verify the Payme merchant credentials sent by Payme on every callback.
 * Payme signs in with HTTP Basic auth (merchant id as the login and the
 * merchant key/password as the secret). Without this check the webhook is an
 * open endpoint that would happily mark any transaction as paid.
 */
export function verifyPaymeAuth(authorizationHeader: string | null): boolean {
  const cfg = paymeConfig();
  if (!cfg.merchantId) return false; // not configured → reject, never "allow all"
  if (!authorizationHeader) return false;

  const match = /^Basic\s+(.+)$/i.exec(authorizationHeader.trim());
  if (!match) return false;
  let decoded: string;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return false;
  const login = decoded.slice(0, idx);
  const secret = decoded.slice(idx + 1);

  const expectedSecret = cfg.password || cfg.key;
  return safeEqual(login, cfg.merchantId) && safeEqual(secret, expectedSecret);
}

/** Constant-time string comparison (no early exit on the first wrong byte). */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const ACCOUNT_KEY = "profile_id";
/** `account.order_id` — the `payments.id` created by /api/payments/initiate. */
export const ORDER_KEY = "order_id";

/**
 * The pending row `/api/payments/initiate` created for this checkout, matched by
 * the `account.order_id` Payme echoes back verbatim.
 *
 * Linking the callback to that row instead of inserting a second one keeps the
 * package `purpose` the student actually chose (and therefore the right
 * subscription length), and stops the payment history from filling up with a
 * permanent "pending" twin of every completed purchase.
 *
 * Deliberately strict: the row must be ours, belong to this profile, still be
 * pending and carry exactly the amount Payme is reporting. Anything else falls
 * through to the amount-based package lookup, never to a wrong row.
 */
export async function findPendingInitiatedPayment(
  orderId: unknown,
  profileId: number | null,
  amountUzs: number
) {
  const id = Number(orderId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, id),
        eq(payments.provider, "payme"),
        eq(payments.status, "pending")
      )
    );
  if (!row) return null;
  if (profileId != null && row.profileId !== Number(profileId)) return null;
  if (Number(row.amount) !== amountUzs) return null;
  return row;
}

// ---------------------------------------------------------------------------
// Payment row helpers
// ---------------------------------------------------------------------------
export async function findPaymentByProviderId(providerTransactionId: string) {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.providerTransactionId, providerTransactionId));
  return rows[0] ?? null;
}

export async function findPaymentById(id: number) {
  const rows = await db.select().from(payments).where(eq(payments.id, id));
  return rows[0] ?? null;
}

/** Activate a subscription (idempotent — never double-credits). */
export async function activateSubscription(paymentId: number, profileId: number | null, plan = "premium") {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId));

  if (!payment) return null;
  // Already credited — do nothing.
  if (payment.status === "paid") {
    return findActiveSubscription(profileId);
  }

  const now = new Date();
  // Package length comes from the payment purpose (monthly / season / yearly).
  const periodDays = await periodDaysForPurpose(payment.purpose);
  const periodEnd = new Date(now.getTime() + periodDays * 86400000);

  await db
    .update(payments)
    .set({ status: "paid", updatedAt: now })
    .where(eq(payments.id, paymentId));

  const targetProfileId = profileId ?? payment.profileId;
  if (targetProfileId == null) {
    return findActiveSubscription(null);
  }
  const [subscription] = await db
    .insert(subscriptions)
    .values({
      profileId: targetProfileId,
      plan,
      status: "active",
      currentPeriodEnd: periodEnd,
      paymentId: paymentId,
    })
    .returning();

  // Mirror the paid period onto the profile columns. They are the denormalised
  // "is this student premium" flag the dashboard badge, the readiness gates and
  // the admin list read — without this, a student who PAID showed as free on
  // their own dashboard while /api/premium/status (subscription-aware) said
  // Premium. The window is the UNION of paid and referral grants: paying must
  // never shorten a referral window the student already earned.
  const [current] = await db
    .select({ premiumUntil: studentProfiles.premiumUntil })
    .from(studentProfiles)
    .where(eq(studentProfiles.id, targetProfileId));
  const existing = current?.premiumUntil ? new Date(current.premiumUntil).getTime() : 0;
  const mergedUntil = new Date(Math.max(existing, periodEnd.getTime()));
  await db
    .update(studentProfiles)
    .set({ isPremium: true, premiumUntil: mergedUntil, updatedAt: now })
    .where(eq(studentProfiles.id, targetProfileId));

  return subscription;
}

/**
 * Recompute the profile premium columns from the PAID side after a change
 * (revoke / expiry) so the flag can never outlive its source. `fallbackUntil`
 * is the referral window the caller wants preserved, if any.
 */
export async function syncProfilePremium(profileId: number, fallbackUntil?: Date | null) {
  const sub = await findActiveSubscription(profileId);
  const paidUntil = subscriptionIsActive(sub) && sub ? new Date(sub.currentPeriodEnd) : null;
  const candidates = [paidUntil, fallbackUntil ?? null].filter((d): d is Date => !!d && d.getTime() > Date.now());
  const until = candidates.length ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null;
  await db
    .update(studentProfiles)
    .set({ isPremium: !!until, premiumUntil: until, updatedAt: new Date() })
    .where(eq(studentProfiles.id, profileId));
  return until;
}

/**
 * The active subscription that defines the student's paid window.
 *
 * An account can legitimately hold several ACTIVE rows at once — a monthly
 * plan bought first and a yearly plan bought later, a referral gift plus a
 * purchase, an admin gift on top of a payment. Every one of them is a real
 * paid/granted window, so "the" active subscription is the one that ends
 * LAST: that is the date the student is actually covered until, and it is
 * exactly the `Math.max` union `activateSubscription` mirrors onto
 * `student_profiles.premium_until`.
 *
 * Ordering by id (the previous behaviour) returned the OLDEST row instead, so
 * `/api/premium/status`, the dashboard badge, the Telegram `/account` card and
 * the admin profile list all showed the first (shortest) purchase's expiry
 * while a longer paid window was still running — a student who bought the
 * yearly plan on top of a monthly one was told Premium ended in 30 days.
 */
export async function findActiveSubscription(profileId: number | null) {
  if (!profileId) return null;
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.profileId, profileId),
        eq(subscriptions.status, "active")
      )
    )
    // Latest period end first; id only breaks exact ties so the result is
    // deterministic.
    .orderBy(desc(subscriptions.currentPeriodEnd), desc(subscriptions.id));
  return sub ?? null;
}

export function subscriptionIsActive(sub: { status: string; currentPeriodEnd: Date } | null): boolean {
  if (!sub) return false;
  if (sub.status !== "active") return false;
  return new Date(sub.currentPeriodEnd).getTime() > Date.now();
}

// ---------------------------------------------------------------------------
// Click — MD5 signature verification (two-step callback flow)
// ---------------------------------------------------------------------------
export function clickSignString(input: {
  clickTransId: string;
  clickPaydocId: string;
  serviceId: string;
  secretKey: string;
  merchantTransId: string;
  amount: number;
  action: number;
}): string {
  return `${input.clickTransId}${input.clickPaydocId}${input.serviceId}${input.secretKey}${input.merchantTransId}${input.amount}${input.action}`;
}

export function md5Hex(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

export function verifyClickSignature(signString: string, expected: string): boolean {
  // Constant-time compare; an empty signature must never match.
  if (!signString || !expected) return false;
  return safeEqual(signString.toLowerCase(), expected.toLowerCase());
}

// ---------------------------------------------------------------------------
// Payme — JSON-RPC merchant methods
// ---------------------------------------------------------------------------
export interface PaymeRequest {
  jsonrpc?: string;
  method: string;
  params: Record<string, any>;
  id?: number;
}

function paymeError(code: number, message: string, data: unknown = null) {
  return { error: { code, message, data } };
}

/**
 * Handle a Payme JSON-RPC request body. Returns the response object to send back.
 * Implements CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction and GetStatement.
 */
export async function handlePaymeRequest(body: PaymeRequest) {
  const { method, params, id } = body;

  const account = params?.account || {};
  const profileId = account[ACCOUNT_KEY];

  if (method === "CheckPerformTransaction") {
    const amount = params.amount;
    if (!Number.isInteger(amount) || amount <= 0) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    if (profileId == null) {
      return { id, ...paymeError(-31003, "Profile not found") };
    }
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, Number(profileId)));
    if (!profile) {
      return { id, ...paymeError(-31003, "Profile not found") };
    }
    const amountUzs = amount / 100;
    // The student may have picked monthly, season or yearly at checkout — the
    // amount identifies which. Checking only the monthly price rejected every
    // season/yearly purchase before Payme would even open the payment page.
    const initiated = await findPendingInitiatedPayment(account[ORDER_KEY], profileId, amountUzs);
    const pack = initiated ? null : await packageForAmountUzs(amountUzs);
    if (!initiated && !pack) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    return {
      id,
      result: {
        allow: true,
        additional: {
          profile_id: Number(profileId),
          purpose: initiated?.purpose ?? pack!.purpose,
          // Echoed back to us on CreateTransaction so the purchase is linked
          // to the row /api/payments/initiate already created.
          [ORDER_KEY]: initiated?.id ?? undefined,
        },
      },
    };
  }

  if (method === "CreateTransaction") {
    const txnId = String(params.id);
    const amount = params.amount;
    if (!Number.isInteger(amount) || amount <= 0) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    const existing = await findPaymentByProviderId(txnId);
    if (existing) {
      // Idempotent: return the existing transaction.
      return {
        id,
        result: {
          create_time: Math.floor(existing.createdAt.getTime() / 1000),
          transaction: String(txnId),
          state: existing.status === "paid" ? 2 : 1,
        },
      };
    }
    if (profileId == null) {
      return { id, ...paymeError(-31003, "Profile not found") };
    }

    const amountUzs = amount / 100;
    // Prefer the row /api/payments/initiate already created for this checkout:
    // it carries the package the student chose, so the subscription gets the
    // right length (30 / 90 / 365 days) instead of always 30.
    const initiated = await findPendingInitiatedPayment(account[ORDER_KEY], profileId, amountUzs);
    let payment;
    if (initiated) {
      const [linked] = await db
        .update(payments)
        .set({ providerTransactionId: txnId, updatedAt: new Date() })
        .where(
          and(eq(payments.id, initiated.id), eq(payments.status, "pending"))
        )
        .returning();
      payment = linked ?? initiated;
    } else {
      const pack = await packageForAmountUzs(amountUzs);
      [payment] = await db
        .insert(payments)
        .values({
          profileId: Number(profileId),
          provider: "payme",
          providerTransactionId: txnId,
          amount: amountUzs,
          currency: "UZS",
          status: "pending",
          purpose: pack?.purpose ?? "premium",
        })
        .returning();
    }

    const createTime = Math.floor(payment.createdAt.getTime() / 1000);
    return {
      id,
      result: {
        create_time: createTime,
        transaction: txnId,
        state: 1,
      },
    };
  }

  if (method === "PerformTransaction") {
    const txnId = String(params.id);
    const payment = await findPaymentByProviderId(txnId);
    if (!payment) {
      return { id, ...paymeError(-31003, "Transaction not found") };
    }
    const now = new Date();
    // Idempotent: if already paid, return paid state without double-crediting.
    if (payment.status === "paid") {
      return {
        id,
        result: {
          perform_time: Math.floor(now.getTime() / 1000),
          transaction: txnId,
          state: 2,
        },
      };
    }
    // activateSubscription marks the payment as paid and provisions the
    // subscription exactly once (idempotent for repeated callbacks).
    await activateSubscription(payment.id, payment.profileId);
    return {
      id,
      result: {
        perform_time: Math.floor(now.getTime() / 1000),
        transaction: txnId,
        state: 2,
      },
    };
  }

  if (method === "CancelTransaction") {
    const txnId = String(params.id);
    const payment = await findPaymentByProviderId(txnId);
    if (!payment) {
      return { id, ...paymeError(-31003, "Transaction not found") };
    }
    if (payment.status === "paid") {
      await db
        .update(payments)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    } else {
      await db
        .update(payments)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
    }
    const now = new Date();
    return {
      id,
      result: {
        cancel_time: Math.floor(now.getTime() / 1000),
        transaction: txnId,
        state: -1,
      },
    };
  }

  if (method === "CheckTransaction") {
    const txnId = String(params.id);
    const payment = await findPaymentByProviderId(txnId);
    if (!payment) {
      return { id, ...paymeError(-31003, "Transaction not found") };
    }
    const state = payment.status === "paid" ? 2 : payment.status === "cancelled" ? -1 : payment.status === "refunded" ? -2 : 1;
    return {
      id,
      result: {
        create_time: Math.floor(payment.createdAt.getTime() / 1000),
        perform_time: 0,
        cancel_time: 0,
        transaction: txnId,
        state,
        reason: null,
      },
    };
  }

  if (method === "GetStatement") {
    const { from, to } = params;
    const fromDate = new Date(from * 1000);
    const toDate = new Date(to * 1000);
    const all = await db.select().from(payments).where(eq(payments.provider, "payme"));
    const transactions = all
      .filter((p) => p.createdAt >= fromDate && p.createdAt <= toDate)
      .map((p) => ({
        id: p.providerTransactionId,
        time: Math.floor(p.createdAt.getTime() / 1000),
        amount: Math.round(p.amount * 100),
        account: { profile_id: p.profileId },
        create_time: Math.floor(p.createdAt.getTime() / 1000),
        perform_time: 0,
        cancel_time: 0,
        transaction: p.providerTransactionId,
        state: p.status === "paid" ? 2 : p.status === "cancelled" ? -1 : 1,
        reason: null,
      }));
    return { id, result: { transactions } };
  }

  return { id, ...paymeError(-32601, "Method not found") };
}
