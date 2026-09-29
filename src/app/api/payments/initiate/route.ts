import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import {
  PREMIUM_CURRENCY,
  paymeConfig,
  clickConfig,
  resolvePremiumPackage,
} from "@/lib/payments";
import { requireProfileAccess } from "@/lib/auth";
import { LIMITS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

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
    const limit = checkRateLimit(`payments:${access.session.profile.id}`, LIMITS.payment);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    // Package + price from app_config (monthly / season / yearly).
    const pack = await resolvePremiumPackage(packageId);
    const priceUzs = pack.priceUzs;

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
    let params: Record<string, any> = {};

    if (provider === "click") {
      const cfg = clickConfig();
      params = {
        service_id: cfg.serviceId,
        merchant_id: cfg.merchantId,
        merchant_user_id: cfg.merchantUserId,
        amount: priceUzs,
        transaction_param: payment.id,
      };
      checkoutUrl = `https://my.click.uz/services/pay?service_id=${cfg.serviceId}&merchant_id=${cfg.merchantId}&amount=${priceUzs}&transaction_param=${payment.id}&merchant_user_id=${cfg.merchantUserId}`;
    } else {
      const cfg = paymeConfig();
      params = {
        merchant: cfg.merchantId,
        amount: priceUzs * 100, // tiyn
        account: { profile_id: payment.profileId },
      };
      checkoutUrl = `https://checkout.payme.uz/${cfg.merchantId}`;
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
