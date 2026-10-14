import { createHash, timingSafeEqual } from "crypto";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, subscriptions, studentProfiles } from "@/db/schema";
import { CONFIG_DEFAULTS, getConfigNumber } from "@/lib/config";
import { readTextBody } from "@/lib/request";

// Fallbacks ONLY for when app_config is unreadable. They are read from the one
// defaults table (CONFIG_DEFAULTS), never typed twice. The real values are the
// admin-saved app_config rows (spec §3: no hardcoded business values).
export const PREMIUM_PRICE_UZS = Number(CONFIG_DEFAULTS.payment_premium_price_uzs);
export const PREMIUM_CURRENCY = "UZS";
export const PREMIUM_PERIOD_DAYS = Number(CONFIG_DEFAULTS.payment_premium_days);
const PREMIUM_SEASON_PRICE_UZS = Number(CONFIG_DEFAULTS.payment_premium_season_price_uzs);
const PREMIUM_SEASON_DAYS = Number(CONFIG_DEFAULTS.payment_premium_season_days);
const PREMIUM_YEARLY_PRICE_UZS = Number(CONFIG_DEFAULTS.payment_premium_yearly_price_uzs);
const PREMIUM_YEARLY_DAYS = Number(CONFIG_DEFAULTS.payment_premium_yearly_days);

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
      priceUzs: await getConfigNumber("payment_premium_season_price_uzs", PREMIUM_SEASON_PRICE_UZS),
      days: await getConfigNumber("payment_premium_season_days", PREMIUM_SEASON_DAYS),
      purpose: "premium_season",
    };
  }
  if (id === "yearly") {
    return {
      id,
      priceUzs: await getConfigNumber("payment_premium_yearly_price_uzs", PREMIUM_YEARLY_PRICE_UZS),
      days: await getConfigNumber("payment_premium_yearly_days", PREMIUM_YEARLY_DAYS),
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
  if (purpose === "premium_season") return getConfigNumber("payment_premium_season_days", PREMIUM_SEASON_DAYS);
  if (purpose === "premium_yearly") return getConfigNumber("payment_premium_yearly_days", PREMIUM_YEARLY_DAYS);
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
    // Payme's HTTP Basic login is issued separately from the checkout merchant id.
    login: process.env.PAYME_LOGIN || "",
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
  return Boolean(cfg.merchantId && cfg.login && (cfg.key || cfg.password));
}

/** True when real Click credentials are present. */
export function isClickConfigured(): boolean {
  const cfg = clickConfig();
  return Boolean(cfg.serviceId && cfg.secretKey);
}

/**
 * Verify the Payme merchant credentials sent by Payme on every callback.
 * Payme's HTTP Basic login is issued separately from the checkout merchant id;
 * its merchant key/password is the secret. Without this check the webhook is
 * an open endpoint that would happily mark any transaction as paid.
 */
export function verifyPaymeAuth(authorizationHeader: string | null): boolean {
  const cfg = paymeConfig();
  if (!cfg.login) return false; // not configured → reject, never "allow all"
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
  if (!expectedSecret) return false;
  return safeEqual(login, cfg.login) && safeEqual(secret, expectedSecret);
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

/** Build the Payme GET checkout link using Payme's documented base64 payload. */
export function buildPaymeCheckoutUrl(
  merchantId: string,
  amountTiyn: number,
  account: Record<string, string | number>
): string | null {
  if (!merchantId || /[;=\u0000-\u0020\u007f]/.test(merchantId) || !Number.isSafeInteger(amountTiyn) || amountTiyn <= 0) return null;
  const accountFields: string[] = [];
  for (const [key, value] of Object.entries(account)) {
    if (!/^[A-Za-z0-9_]+$/.test(key) || !["string", "number"].includes(typeof value)) return null;
    const fieldValue = String(value);
    if (!fieldValue || /[;=]/.test(fieldValue)) return null;
    accountFields.push(`ac.${key}=${fieldValue}`);
  }
  const payload = [`m=${merchantId}`, ...accountFields, `a=${amountTiyn}`].join(";");
  const encoded = encodeURIComponent(Buffer.from(payload, "utf8").toString("base64"));
  return `https://checkout.paycom.uz/${encoded}`;
}

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
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const [row] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.id, id),
        eq(payments.provider, "payme"),
        eq(payments.status, "pending"),
        eq(payments.providerTransactionId, "")
      )
    )
    .limit(1);
  if (!row) return null;
  if (profileId != null && row.profileId !== Number(profileId)) return null;
  if (Number(row.amount) !== amountUzs) return null;
  return row;
}

// ---------------------------------------------------------------------------
// Payment row helpers
// ---------------------------------------------------------------------------

/** Payme automatically cancels unperformed transactions after 12 hours. */
export const PAYME_TRANSACTION_TTL_MS = 12 * 60 * 60 * 1000;

function paymeTransactionExpired(payment: typeof payments.$inferSelect, nowMs = Date.now()): boolean {
  const providerCreatedAt = payment.providerCreatedAt ?? payment.createdAt;
  return payment.status === "pending" && nowMs - providerCreatedAt.getTime() >= PAYME_TRANSACTION_TTL_MS;
}

export async function findPaymentByProviderId(providerTransactionId: string, provider = "payme") {
  if (!providerTransactionId) return null;
  const [row] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.providerTransactionId, providerTransactionId), eq(payments.provider, provider)))
    .limit(1);
  return row ?? null;
}

export async function findPaymentById(id: number) {
  const rows = await db.select().from(payments).where(eq(payments.id, id));
  return rows[0] ?? null;
}

/**
 * Activate a subscription exactly once and atomically with its payment state.
 *
 * Locking the payment row serializes duplicate/concurrent provider callbacks.
 * The subscription row and denormalized profile entitlement are committed in
 * the same transaction as `payments.status = 'paid'`; a failure at any point
 * rolls all three changes back so a retry can safely recover.
 */
export async function activateSubscriptionWithResult(
  paymentId: number,
  profileId: number | null,
  plan = "premium"
): Promise<{ subscription: typeof subscriptions.$inferSelect; alreadyActive: boolean } | null> {
  // Read the immutable package purpose outside the transaction because config
  // reads may use their own pooled connection. The locked row is rechecked below.
  const [snapshot] = await db
    .select({ purpose: payments.purpose })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!snapshot) return null;
  const periodDays = await periodDaysForPurpose(snapshot.purpose);
  if (!Number.isFinite(periodDays) || periodDays <= 0) return null;

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .for("update");
    if (!payment || payment.profileId == null) return null;
    if (profileId != null && Number(profileId) !== payment.profileId) return null;
    // A provider cannot reactivate a transaction that was cancelled/refunded,
    // or complete a Payme transaction after its documented 12-hour timeout.
    if (payment.status === "cancelled" || payment.status === "refunded") return null;
    if (payment.status !== "pending" && payment.status !== "paid") return null;
    if (payment.provider === "payme" && paymeTransactionExpired(payment)) {
      const expiredAt = new Date();
      await tx
        .update(payments)
        .set({ status: "cancelled", cancelledAt: expiredAt, cancelReason: 4, updatedAt: expiredAt })
        .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")));
      return null;
    }

    const targetProfileId = payment.profileId;
    const [current] = await tx
      .select({ premiumUntil: studentProfiles.premiumUntil })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, targetProfileId))
      .for("update");
    if (!current) return null;

    const [existingSubscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paymentId, paymentId))
      .limit(1);

    if (existingSubscription && existingSubscription.status !== "active") return null;
    const alreadyActive = payment.status === "paid" && Boolean(existingSubscription);
    const now = new Date();
    let subscription = existingSubscription;
    if (!subscription) {
      // Repair a legacy paid row whose earlier non-transactional activation was
      // interrupted after setting the payment paid. The original `updatedAt`
      // is the closest available activation time for those older rows.
      const activatedAt = payment.status === "paid" ? payment.performedAt ?? payment.updatedAt : now;
      const periodEnd = new Date(activatedAt.getTime() + periodDays * 86_400_000);
      [subscription] = await tx
        .insert(subscriptions)
        .values({
          profileId: targetProfileId,
          plan,
          status: "active",
          currentPeriodEnd: periodEnd,
          paymentId,
        })
        .returning();
    }

    if (payment.status !== "paid") {
      await tx
        .update(payments)
        .set({ status: "paid", performedAt: now, updatedAt: now })
        .where(eq(payments.id, paymentId));
    }

    // The profile row is locked before insertion/update: different payments
    // cannot race their Math.max merge and shorten a longer entitlement.
    const existingUntil = current.premiumUntil ? new Date(current.premiumUntil).getTime() : 0;
    const paidUntil = new Date(subscription.currentPeriodEnd).getTime();
    const mergedUntil = new Date(Math.max(existingUntil, paidUntil));
    await tx
      .update(studentProfiles)
      .set({ isPremium: mergedUntil.getTime() > Date.now(), premiumUntil: mergedUntil, updatedAt: now })
      .where(eq(studentProfiles.id, targetProfileId));

    return { subscription, alreadyActive };
  });
}

/** Activate a payment and return just the subscription row for existing callers. */
export async function activateSubscription(paymentId: number, profileId: number | null, plan = "premium") {
  const result = await activateSubscriptionWithResult(paymentId, profileId, plan);
  return result?.subscription ?? null;
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
// Click — provider-specific MD5 signature verification (two-step callback)
// ---------------------------------------------------------------------------
export const CLICK_PREPARE_ACTION = 0;
export const CLICK_COMPLETE_ACTION = 1;

export interface ClickSignatureInput {
  clickTransId: string;
  serviceId: string;
  secretKey: string;
  merchantTransId: string;
  /** Keep the provider's original decimal spelling when building the signature. */
  amount: string | number;
  action: number;
  signTime: string;
  /** Included by Click for action=1, omitted from action=0 signature. */
  merchantPrepareId?: string;
}

/**
 * Click Merchant API v2 signature order.
 * Prepare (action=0): click_trans_id + service_id + secret_key +
 * merchant_trans_id + amount + action + sign_time.
 * Complete (action=1): the same sequence with merchant_prepare_id between
 * merchant_trans_id and amount. `click_paydoc_id` is a request field but is NOT
 * part of Click's signature formula.
 */
export function clickSignString(input: ClickSignatureInput): string {
  const prefix = `${input.clickTransId}${input.serviceId}${input.secretKey}${input.merchantTransId}`;
  const prepared = input.action === CLICK_COMPLETE_ACTION ? `${input.merchantPrepareId ?? ""}` : "";
  return `${prefix}${prepared}${input.amount}${input.action}${input.signTime}`;
}

/** Validate Click's UZS amount while preserving its original signature spelling. */
export function parseClickAmount(value: unknown): { raw: string; amountUzs: number } | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const raw = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amountUzs = Number(raw);
  if (!Number.isSafeInteger(amountUzs) || amountUzs <= 0) return null;
  return { raw, amountUzs };
}

export function buildClickCheckoutUrl(input: {
  serviceId: string;
  merchantId: string;
  merchantUserId?: string;
  amountUzs: number;
  paymentId: number;
}): { checkoutUrl: string; params: Record<string, string> } | null {
  if (
    !input.serviceId || !input.merchantId || !Number.isSafeInteger(input.paymentId) || input.paymentId <= 0 ||
    !Number.isFinite(input.amountUzs) || input.amountUzs <= 0 ||
    !Number.isSafeInteger(Math.round(input.amountUzs * 100))
  ) return null;
  const params: Record<string, string> = {
    service_id: input.serviceId,
    merchant_id: input.merchantId,
    amount: input.amountUzs.toFixed(2),
    transaction_param: String(input.paymentId),
  };
  if (input.merchantUserId) params.merchant_user_id = input.merchantUserId;
  return {
    checkoutUrl: `https://my.click.uz/services/pay?${new URLSearchParams(params).toString()}`,
    params,
  };
}

/** Click SHOP API sends URL-encoded form data (JSON remains useful for tests). */
export async function readClickCallbackBody(req: Request): Promise<Record<string, unknown> | null> {
  const read = await readTextBody(req, 64 * 1024);
  if (!read.ok || !read.body.trim()) return null;
  const mediaType = (req.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (mediaType === "application/json") {
    try {
      const body: unknown = JSON.parse(read.body);
      return isRecord(body) ? body : null;
    } catch {
      return null;
    }
  }
  if (mediaType !== "application/x-www-form-urlencoded") return null;
  const params = new URLSearchParams(read.body);
  const body: Record<string, unknown> = {};
  for (const [key, value] of params) {
    if (Object.hasOwn(body, key)) return null;
    body[key] = value;
  }
  return Object.keys(body).length ? body : null;
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
  params: Record<string, unknown>;
  id?: number | string | null;
}

function paymeError(code: number, message: string, data: unknown = null) {
  return { error: { code, message, data } };
}

function paymeAccountError(message: { en: string; ru: string; uz: string }, field: string) {
  return { error: { code: -31050, message, data: field } };
}

function paymeProfileNotFound() {
  return paymeAccountError(
    { en: "The specified profile was not found", ru: "Указанный профиль не найден", uz: "Ko'rsatilgan profil topilmadi" },
    ACCOUNT_KEY
  );
}

function paymeProfileMismatch() {
  return paymeAccountError(
    {
      en: "The transaction does not belong to the specified profile",
      ru: "Транзакция не принадлежит указанному профилю",
      uz: "Tranzaksiya ko'rsatilgan profilga tegishli emas",
    },
    ACCOUNT_KEY
  );
}

function paymeOrderNotAvailable() {
  return paymeAccountError(
    { en: "The specified order is unavailable", ru: "Указанный заказ недоступен", uz: "Ko'rsatilgan buyurtma mavjud emas" },
    ORDER_KEY
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function positiveInteger(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function paymeState(status: string): number {
  if (status === "paid") return 2;
  if (status === "cancelled") return -1;
  if (status === "refunded") return -2;
  return 1;
}

function paymeTransactionResult(payment: typeof payments.$inferSelect) {
  return {
    create_time: payment.createdAt.getTime(),
    perform_time: payment.performedAt?.getTime() ?? 0,
    cancel_time: payment.cancelledAt?.getTime() ?? 0,
    // `id` in GetStatement is Payme's id; `transaction` is our merchant id.
    transaction: String(payment.id),
    state: paymeState(payment.status),
    reason: payment.cancelReason ?? null,
  };
}

/**
 * Handle Payme's JSON-RPC merchant methods. Payme timestamps are Unix
 * milliseconds; payment state changes and entitlement activation are guarded
 * by DB row locks so provider retries/concurrent callbacks are idempotent.
 */
export async function handlePaymeRequest(body: PaymeRequest) {
  const id = body?.id;
  const method = typeof body?.method === "string" ? body.method : "";
  const params = isRecord(body?.params) ? body.params : {};
  const account = isRecord(params.account) ? params.account : {};
  const profileId = positiveInteger(account[ACCOUNT_KEY]);

  if (!method || (body.jsonrpc !== undefined && body.jsonrpc !== "2.0")) {
    return { id, ...paymeError(-32600, "Invalid request") };
  }

  if (method === "CheckPerformTransaction") {
    const amount = params.amount;
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    if (!profileId) return { id, ...paymeProfileNotFound() };
    const [profile] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId))
      .limit(1);
    if (!profile) return { id, ...paymeProfileNotFound() };

    const amountUzs = amount / 100;
    const orderValue = account[ORDER_KEY];
    const hasOrderId = orderValue !== undefined && orderValue !== null && orderValue !== "";
    if (hasOrderId) {
      const orderId = positiveInteger(orderValue);
      if (!orderId) return { id, ...paymeOrderNotAvailable() };
      const [initiated] = await db
        .select()
        .from(payments)
        .where(and(
          eq(payments.id, orderId),
          eq(payments.profileId, profileId),
          eq(payments.provider, "payme")
        ))
        .limit(1);
      if (!initiated || initiated.status !== "pending" || initiated.providerTransactionId !== "") {
        return { id, ...paymeOrderNotAvailable() };
      }
      if (initiated.currency !== PREMIUM_CURRENCY || Number(initiated.amount) !== amountUzs) {
        return { id, ...paymeError(-31001, "Invalid amount") };
      }
      return {
        id,
        result: {
          allow: true,
          additional: { profile_id: profileId, purpose: initiated.purpose, [ORDER_KEY]: initiated.id },
        },
      };
    }

    const pack = await packageForAmountUzs(amountUzs);
    if (!pack) return { id, ...paymeError(-31001, "Invalid amount") };
    return {
      id,
      result: { allow: true, additional: { profile_id: profileId, purpose: pack.purpose } },
    };
  }

  if (method === "CreateTransaction") {
    const rawTxnId = params.id;
    const txnId = typeof rawTxnId === "string" || typeof rawTxnId === "number" ? String(rawTxnId) : "";
    const amount = params.amount;
    if (!txnId || txnId.length > 128) return { id, ...paymeError(-32600, "Invalid request") };
    if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount <= 0) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    const providerTime = params.time;
    if (
      typeof providerTime !== "number" || !Number.isSafeInteger(providerTime) || providerTime <= 0 ||
      !Number.isFinite(new Date(providerTime).getTime())
    ) {
      return { id, ...paymeError(-32600, "Invalid request") };
    }
    const providerCreatedAt = new Date(providerTime);
    if (!profileId) return { id, ...paymeProfileNotFound() };

    const amountUzs = amount / 100;
    const orderValue = account[ORDER_KEY];
    const hasOrderId = orderValue !== undefined && orderValue !== null && orderValue !== "";
    const orderId = hasOrderId ? positiveInteger(orderValue) : null;
    const packageForLegacyOrder = hasOrderId ? null : await packageForAmountUzs(amountUzs);
    if (!hasOrderId && !packageForLegacyOrder) {
      return { id, ...paymeError(-31001, "Invalid amount") };
    }
    if (hasOrderId && !orderId) return { id, ...paymeOrderNotAvailable() };

    return db.transaction(async (tx) => {
      // Serialize duplicate create calls across all application instances.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`payme:${txnId}`}))`);

      const [existing] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.provider, "payme"), eq(payments.providerTransactionId, txnId)))
        .limit(1)
        .for("update");
      if (existing) {
        if (existing.profileId !== profileId) return { id, ...paymeProfileMismatch() };
        if (hasOrderId && orderId !== existing.id) return { id, ...paymeOrderNotAvailable() };
        if (existing.currency !== PREMIUM_CURRENCY || Number(existing.amount) !== amountUzs) {
          return { id, ...paymeError(-31001, "Invalid amount") };
        }
        if (existing.providerCreatedAt && existing.providerCreatedAt.getTime() !== providerTime) {
          return { id, ...paymeError(-31008, "Transaction parameters do not match") };
        }
        let current = existing;
        const now = new Date();
        if (paymeTransactionExpired(current, now.getTime())) {
          const [expired] = await tx
            .update(payments)
            .set({ status: "cancelled", cancelledAt: now, cancelReason: 4, updatedAt: now })
            .where(and(eq(payments.id, current.id), eq(payments.status, "pending")))
            .returning();
          current = expired ?? current;
        } else if (!current.providerCreatedAt) {
          const [backfilled] = await tx
            .update(payments)
            .set({ providerCreatedAt, updatedAt: now })
            .where(eq(payments.id, current.id))
            .returning();
          current = backfilled ?? current;
        }
        return { id, result: paymeTransactionResult(current) };
      }

      const [profile] = await tx
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, profileId))
        .limit(1);
      if (!profile) return { id, ...paymeProfileNotFound() };

      const now = new Date();
      const expiredAtCreate = now.getTime() - providerTime >= PAYME_TRANSACTION_TTL_MS;
      let payment: typeof payments.$inferSelect | undefined;
      if (hasOrderId && orderId) {
        const [initiated] = await tx
          .select()
          .from(payments)
          .where(
            and(
              eq(payments.id, orderId),
              eq(payments.profileId, profileId),
              eq(payments.provider, "payme"),
              eq(payments.status, "pending"),
              eq(payments.providerTransactionId, "")
            )
          )
          .limit(1)
          .for("update");
        if (!initiated) return { id, ...paymeOrderNotAvailable() };
        if (Number(initiated.amount) !== amountUzs || initiated.currency !== PREMIUM_CURRENCY) {
          return { id, ...paymeError(-31001, "Invalid amount") };
        }
        const [linked] = await tx
          .update(payments)
          .set({
            providerTransactionId: txnId,
            providerCreatedAt,
            createdAt: now,
            status: expiredAtCreate ? "cancelled" : "pending",
            cancelledAt: expiredAtCreate ? now : null,
            cancelReason: expiredAtCreate ? 4 : null,
            updatedAt: now,
          })
          .where(
            and(
              eq(payments.id, initiated.id),
              eq(payments.status, "pending"),
              eq(payments.providerTransactionId, "")
            )
          )
          .returning();
        if (!linked) return { id, ...paymeOrderNotAvailable() };
        payment = linked;
      } else {
        const [created] = await tx
          .insert(payments)
          .values({
            profileId,
            provider: "payme",
            providerTransactionId: txnId,
            providerCreatedAt,
            amount: amountUzs,
            currency: PREMIUM_CURRENCY,
            status: expiredAtCreate ? "cancelled" : "pending",
            cancelledAt: expiredAtCreate ? now : null,
            cancelReason: expiredAtCreate ? 4 : null,
            purpose: packageForLegacyOrder!.purpose,
          })
          .returning();
        payment = created;
      }
      return { id, result: paymeTransactionResult(payment) };
    });
  }

  if (method === "PerformTransaction") {
    const rawTxnId = params.id;
    const txnId = typeof rawTxnId === "string" || typeof rawTxnId === "number" ? String(rawTxnId) : "";
    if (!txnId || txnId.length > 128) return { id, ...paymeError(-31008, "Invalid transaction") };
    const payment = await findPaymentByProviderId(txnId, "payme");
    if (!payment) return { id, ...paymeError(-31003, "Transaction not found") };
    if (payment.status === "cancelled" || payment.status === "refunded") {
      return { id, ...paymeError(-31008, "Transaction cannot be performed") };
    }
    if (payment.status !== "paid") {
      const subscription = await activateSubscription(payment.id, payment.profileId);
      if (!subscription) return { id, ...paymeError(-31008, "Transaction cannot be performed") };
    }
    const updated = await findPaymentByProviderId(txnId, "payme");
    const now = Date.now();
    return {
      id,
      result: {
        perform_time: updated?.performedAt?.getTime() ?? now,
        transaction: String(updated?.id ?? payment.id),
        state: 2,
      },
    };
  }

  if (method === "CancelTransaction") {
    const rawTxnId = params.id;
    const txnId = typeof rawTxnId === "string" || typeof rawTxnId === "number" ? String(rawTxnId) : "";
    if (!txnId || txnId.length > 128) return { id, ...paymeError(-31008, "Invalid transaction") };

    return db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.provider, "payme"), eq(payments.providerTransactionId, txnId)))
        .limit(1)
        .for("update");
      if (!payment) return { id, ...paymeError(-31003, "Transaction not found") };

      const state = paymeState(payment.status);
      if (state === -1 || state === -2) {
        return {
          id,
          result: {
            cancel_time: payment.cancelledAt?.getTime() ?? 0,
            transaction: String(payment.id),
            state,
          },
        };
      }
      if (payment.status !== "pending" && payment.status !== "paid") {
        return { id, ...paymeError(-31008, "Transaction cannot be cancelled") };
      }

      const reasonValue = params.reason;
      const validReasons = new Set([1, 2, 3, 4, 5, 10]);
      const requestedReason = typeof reasonValue === "number" && Number.isSafeInteger(reasonValue) &&
        validReasons.has(reasonValue) ? reasonValue : null;
      if (reasonValue !== undefined && reasonValue !== null && requestedReason === null) {
        return { id, ...paymeError(-32602, "Invalid params") };
      }
      const now = new Date();
      const reason = paymeTransactionExpired(payment, now.getTime()) ? 4 : requestedReason;
      if (reason === null) return { id, ...paymeError(-32602, "Invalid params") };
      const status = payment.status === "paid" ? "refunded" : "cancelled";
      const [cancelled] = await tx
        .update(payments)
        .set({ status, cancelledAt: now, cancelReason: reason, updatedAt: now })
        .where(eq(payments.id, payment.id))
        .returning();
      return {
        id,
        result: {
          cancel_time: cancelled?.cancelledAt?.getTime() ?? now.getTime(),
          transaction: String(cancelled?.id ?? payment.id),
          state: paymeState(status),
        },
      };
    });
  }

  if (method === "CheckTransaction") {
    const rawTxnId = params.id;
    const txnId = typeof rawTxnId === "string" || typeof rawTxnId === "number" ? String(rawTxnId) : "";
    if (!txnId || txnId.length > 128) return { id, ...paymeError(-32602, "Invalid params") };
    return db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(and(eq(payments.provider, "payme"), eq(payments.providerTransactionId, txnId)))
        .limit(1)
        .for("update");
      if (!payment) return { id, ...paymeError(-31003, "Transaction not found") };
      if (paymeTransactionExpired(payment)) {
        const now = new Date();
        const [expired] = await tx
          .update(payments)
          .set({ status: "cancelled", cancelledAt: now, cancelReason: 4, updatedAt: now })
          .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
          .returning();
        return { id, result: paymeTransactionResult(expired ?? payment) };
      }
      return { id, result: paymeTransactionResult(payment) };
    });
  }

  if (method === "GetStatement") {
    const from = params.from;
    const to = params.to;
    if (
      typeof from !== "number" || !Number.isSafeInteger(from) ||
      typeof to !== "number" || !Number.isSafeInteger(to) ||
      from < 0 || to < from || to > 8_640_000_000_000_000 || to - from > 366 * 86_400_000
    ) {
      return { id, ...paymeError(-32602, "Invalid statement interval") };
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const now = new Date();
    const expiredBefore = new Date(now.getTime() - PAYME_TRANSACTION_TTL_MS);
    await db
      .update(payments)
      .set({ status: "cancelled", cancelledAt: now, cancelReason: 4, updatedAt: now })
      .where(and(
        eq(payments.provider, "payme"),
        eq(payments.status, "pending"),
        sql`COALESCE(${payments.providerCreatedAt}, ${payments.createdAt}) <= ${expiredBefore}`
      ));
    const providerTime = sql`COALESCE(${payments.providerCreatedAt}, ${payments.createdAt})`;
    const rows = await db
      .select()
      .from(payments)
      .where(and(
        eq(payments.provider, "payme"),
        sql`${payments.providerTransactionId} <> ''`,
        sql`${providerTime} BETWEEN ${fromDate} AND ${toDate}`
      ))
      .orderBy(asc(providerTime), asc(payments.id));
    return {
      id,
      result: {
        transactions: rows.map((payment) => ({
          id: payment.providerTransactionId,
          time: (payment.providerCreatedAt ?? payment.createdAt).getTime(),
          amount: Math.round(payment.amount * 100),
          account: { profile_id: payment.profileId, [ORDER_KEY]: payment.id },
          ...paymeTransactionResult(payment),
        })),
      },
    };
  }

  return { id, ...paymeError(-32601, "Method not found") };
}
