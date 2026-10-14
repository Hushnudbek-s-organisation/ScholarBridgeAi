import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import {
  CLICK_COMPLETE_ACTION,
  activateSubscriptionWithResult,
  clickConfig,
  clickSignString,
  isClickConfigured,
  md5Hex,
  parseClickAmount,
  readClickCallbackBody,
  verifyClickSignature,
} from "@/lib/payments";

export const dynamic = "force-dynamic";

function response(
  clickTransId: string,
  merchantTransId: string,
  error: number,
  errorNote: string,
  extra: Record<string, unknown> = {}
) {
  const clickId = /^\d+$/.test(clickTransId) && Number.isSafeInteger(Number(clickTransId))
    ? Number(clickTransId)
    : clickTransId;
  return NextResponse.json({
    click_trans_id: clickId,
    merchant_trans_id: merchantTransId,
    error,
    error_note: errorNote,
    ...extra,
  });
}

function stringId(value: unknown): string {
  if (typeof value === "string" && /^\d+$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return "";
}

function integer(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/** Click Merchant API v2 step 2: Complete (action=1). */
export async function POST(req: Request) {
  let clickTransId = "";
  let merchantTransId = "";
  try {
    const p = await readClickCallbackBody(req);
    if (!p) return response("", "", -8, "Error in request from CLICK");

    clickTransId = stringId(p.click_trans_id);
    merchantTransId = typeof p.merchant_trans_id === "string" || typeof p.merchant_trans_id === "number"
      ? String(p.merchant_trans_id)
      : "";
    const merchantPrepareId = stringId(p.merchant_prepare_id);
    const paydocId = stringId(p.click_paydoc_id);
    const signTime = typeof p.sign_time === "string" || typeof p.sign_time === "number"
      ? String(p.sign_time)
      : "";
    const sign = typeof p.sign_string === "string" ? p.sign_string : "";

    if (!isClickConfigured()) return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");
    const cfg = clickConfig();
    if (
      !clickTransId || clickTransId.length > 128 || !paydocId || paydocId.length > 128 ||
      !merchantTransId || merchantTransId.length > 128 || !signTime || signTime.length > 64 || !sign
    ) {
      return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");
    }
    const action = integer(p.action);
    if (action !== CLICK_COMPLETE_ACTION) return response(clickTransId, merchantTransId, -3, "Action not found");

    const amount = parseClickAmount(p.amount);
    if (!amount) return response(clickTransId, merchantTransId, -2, "Incorrect parameter amount");

    const serviceId = typeof p.service_id === "string" || typeof p.service_id === "number"
      ? String(p.service_id)
      : "";
    if (serviceId !== cfg.serviceId) return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");

    const paymentId = /^\d+$/.test(merchantTransId) ? Number(merchantTransId) : NaN;
    const prepareId = /^\d+$/.test(merchantPrepareId) ? Number(merchantPrepareId) : NaN;
    if (!Number.isSafeInteger(paymentId) || paymentId <= 0 || String(paymentId) !== merchantTransId) {
      return response(clickTransId, merchantTransId, -5, "User does not exist");
    }
    if (!Number.isSafeInteger(prepareId) || prepareId <= 0 || prepareId !== paymentId) {
      return response(clickTransId, merchantTransId, -6, "Transaction does not exist");
    }

    const expected = md5Hex(clickSignString({
      clickTransId,
      serviceId,
      secretKey: cfg.secretKey,
      merchantTransId,
      merchantPrepareId,
      amount: amount.raw,
      action: CLICK_COMPLETE_ACTION,
      signTime,
    }));
    if (!verifyClickSignature(sign, expected)) {
      return response(clickTransId, merchantTransId, -1, "SIGN CHECK FAILED!");
    }

    const clickError = integer(p.error);
    if (clickError === null || clickError > 0) {
      return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.provider, "click")))
      .limit(1);
    if (!payment) return response(clickTransId, merchantTransId, -5, "User does not exist");
    if (payment.providerTransactionId !== clickTransId) {
      return response(clickTransId, merchantTransId, -6, "Transaction does not exist");
    }
    if (payment.currency !== "UZS" || Number(payment.amount) !== amount.amountUzs) {
      return response(clickTransId, merchantTransId, -2, "Incorrect parameter amount");
    }
    if (payment.status === "paid") return response(clickTransId, merchantTransId, -4, "Already paid");
    if (payment.status === "cancelled" || payment.status === "refunded") {
      return response(clickTransId, merchantTransId, -9, "Transaction cancelled");
    }
    if (payment.status !== "pending") return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");

    // Per Click's SHOP API error contract, a negative provider-side error must
    // be persisted as a cancellation and answered with -9. It must never grant
    // Premium, and a later Complete retry stays a cancellation.
    if (clickError < 0) {
      const result = await db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(payments)
          .where(and(eq(payments.id, paymentId), eq(payments.provider, "click")))
          .limit(1)
          .for("update");
        if (!locked) return "not-found";
        if (locked.providerTransactionId !== clickTransId) return "transaction-mismatch";
        if (Number(locked.amount) !== amount.amountUzs || locked.currency !== "UZS") return "amount-mismatch";
        if (locked.status === "paid") return "paid";
        if (locked.status === "cancelled" || locked.status === "refunded") return "cancelled";
        if (locked.status !== "pending") return "invalid-state";
        const now = new Date();
        await tx
          .update(payments)
          .set({ status: "cancelled", cancelledAt: now, cancelReason: null, updatedAt: now })
          .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")));
        return "cancelled";
      });
      if (result === "not-found") return response(clickTransId, merchantTransId, -5, "User does not exist");
      if (result === "transaction-mismatch") return response(clickTransId, merchantTransId, -6, "Transaction does not exist");
      if (result === "amount-mismatch") return response(clickTransId, merchantTransId, -2, "Incorrect parameter amount");
      if (result === "paid") return response(clickTransId, merchantTransId, -4, "Already paid");
      if (result !== "cancelled") return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");
      return response(clickTransId, merchantTransId, -9, "Transaction cancelled");
    }

    const activation = await activateSubscriptionWithResult(payment.id, payment.profileId, "premium");
    if (!activation) {
      const [latest] = await db.select({ status: payments.status }).from(payments).where(eq(payments.id, payment.id));
      if (latest?.status === "cancelled" || latest?.status === "refunded") {
        return response(clickTransId, merchantTransId, -9, "Transaction cancelled");
      }
      return response(clickTransId, merchantTransId, -7, "Failed to update user");
    }
    if (activation.alreadyActive) return response(clickTransId, merchantTransId, -4, "Already paid");
    return response(clickTransId, merchantTransId, 0, "Success", { merchant_confirm_id: payment.id });
  } catch (error) {
    console.error("POST /api/payments/click/complete error:", error instanceof Error ? error.message : "unknown error");
    return response(clickTransId, merchantTransId, -7, "Failed to update user");
  }
}
