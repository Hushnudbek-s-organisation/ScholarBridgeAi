import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import {
  ORDER_KEY,
  PREMIUM_CURRENCY,
  buildClickCheckoutUrl,
  buildPaymeCheckoutUrl,
  paymeConfig,
  clickConfig,
  isClickConfigured,
  isPaymeConfigured,
  resolvePremiumPackage,
} from "@/lib/payments";
import { requireProfileAccess } from "@/lib/auth";
import { LIMITS, rateLimitedResponse } from "@/lib/rate-limit";
import { checkSharedRateLimit } from "@/lib/rate-limit-shared";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, provider, package: packageId } = body;

    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    if (!["payme", "click"].includes(provider)) {
      return NextResponse.json({ error: "provider must be 'payme' or 'click'" }, { status: 400 });
    }

    // A payment must be started by the account it belongs to.
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const providerConfig = provider === "click" ? clickConfig() : paymeConfig();
    const providerReady = provider === "click"
      ? isClickConfigured() && Boolean(providerConfig.merchantId)
      : isPaymeConfigured();
    if (!providerReady) {
      return NextResponse.json(
        { error: `${provider} payments are not configured`, code: "payment_provider_not_configured" },
        { status: 503 }
      );
    }

    const limit = await checkSharedRateLimit(`payments:${access.session.profile.id}`, LIMITS.payment);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    // Package + price from app_config (monthly / season / yearly).
    const pack = await resolvePremiumPackage(packageId);
    const priceUzs = pack.priceUzs;
    const amountTiyn = priceUzs * 100;
    if (!Number.isFinite(priceUzs) || priceUzs <= 0 || !Number.isSafeInteger(amountTiyn)) {
      return NextResponse.json(
        { error: "Configured payment package has an invalid amount", code: "invalid_payment_package" },
        { status: 503 }
      );
    }

    const [payment] = await db
      .insert(payments)
      .values({
        profileId: Number(profileId),
        provider,
        providerTransactionId: "",
        amount: priceUzs,
        currency: PREMIUM_CURRENCY,
        status: "pending",
        purpose: pack.purpose,
      })
      .returning();

    let checkoutUrl = "";
    let params: Record<string, unknown> = {};

    if (provider === "click") {
      const cfg = clickConfig();
      const clickCheckout = buildClickCheckoutUrl({
        serviceId: cfg.serviceId,
        merchantId: cfg.merchantId,
        merchantUserId: cfg.merchantUserId,
        amountUzs: priceUzs,
        paymentId: payment.id,
      });
      if (!clickCheckout) throw new Error("Configured Click checkout parameters are invalid");
      params = clickCheckout.params;
      checkoutUrl = clickCheckout.checkoutUrl;
    } else {
      const cfg = paymeConfig();
      const account = { profile_id: Number(profileId), [ORDER_KEY]: payment.id };
      params = {
        merchant: cfg.merchantId,
        amount: amountTiyn, // tiyn
        account,
      };
      // Payme requires the merchant, account and amount inside its documented
      // base64 GET payload; opening only the merchant home page loses this order.
      const paymeCheckout = buildPaymeCheckoutUrl(cfg.merchantId, amountTiyn, account);
      if (!paymeCheckout) throw new Error("Configured Payme checkout parameters are invalid");
      checkoutUrl = paymeCheckout;
    }

    return NextResponse.json({
      payment,
      checkoutUrl,
      params,
      amount: priceUzs,
      currency: PREMIUM_CURRENCY,
      purpose: pack.purpose,
      package: pack.id,
      days: pack.days,
    });
  } catch (error) {
    console.error("POST /api/payments/initiate error:", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
