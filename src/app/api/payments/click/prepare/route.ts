import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { payments } from "@/db/schema";
import {
  CLICK_PREPARE_ACTION,
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

/** Click Merchant API v2 step 1: Prepare (action=0). */
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
    if (action !== CLICK_PREPARE_ACTION) return response(clickTransId, merchantTransId, -3, "Action not found");

    const amount = parseClickAmount(p.amount);
    if (!amount) return response(clickTransId, merchantTransId, -2, "Incorrect parameter amount");

    const serviceId = typeof p.service_id === "string" || typeof p.service_id === "number"
      ? String(p.service_id)
      : "";
    if (serviceId !== cfg.serviceId) return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");

    const paymentId = /^\d+$/.test(merchantTransId) ? Number(merchantTransId) : NaN;
    if (!Number.isSafeInteger(paymentId) || paymentId <= 0 || String(paymentId) !== merchantTransId) {
      return response(clickTransId, merchantTransId, -5, "User does not exist");
    }

    const expected = md5Hex(clickSignString({
      clickTransId,
      serviceId,
      secretKey: cfg.secretKey,
      merchantTransId,
      amount: amount.raw,
      action: CLICK_PREPARE_ACTION,
      signTime,
    }));
    if (!verifyClickSignature(sign, expected)) {
      return response(clickTransId, merchantTransId, -1, "SIGN CHECK FAILED!");
    }

    const clickError = integer(p.error);
    if (clickError === null || clickError > 0) {
      return response(clickTransId, merchantTransId, -8, "Error in request from CLICK");
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1)
        .for("update");
      if (!payment || payment.provider !== "click") return { error: -5, note: "User does not exist" };
      if (payment.currency !== "UZS" || Number(payment.amount) !== amount.amountUzs) {
        return { error: -2, note: "Incorrect parameter amount" };
      }
      if (payment.status === "paid") return { error: -4, note: "Already paid" };
      if (payment.status === "cancelled" || payment.status === "refunded") {
        return { error: -9, note: "Transaction cancelled" };
      }
      if (payment.status !== "pending") return { error: -8, note: "Error in request from CLICK" };
      if (payment.providerTransactionId && payment.providerTransactionId !== clickTransId) {
        return { error: -8, note: "Transaction already prepared" };
      }

      const [claimed] = await tx
        .select({ id: payments.id })
        .from(payments)
        .where(and(
          eq(payments.provider, "click"),
          eq(payments.providerTransactionId, clickTransId),
        ))
        .limit(1);
      if (claimed && claimed.id !== payment.id) return { error: -8, note: "Error in request from CLICK" };

      const now = new Date();
      if (clickError < 0) {
        await tx
          .update(payments)
          .set({
            providerTransactionId: clickTransId,
            status: "cancelled",
            cancelledAt: now,
            cancelReason: null,
            updatedAt: now,
          })
          .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
        return { error: -9, note: "Transaction cancelled" };
      }

      if (!payment.providerTransactionId) {
        await tx
          .update(payments)
          .set({ providerTransactionId: clickTransId, updatedAt: now })
          .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")));
      }
      return { error: 0, note: "Success", prepareId: payment.id };
    });

    if (result.error !== 0) return response(clickTransId, merchantTransId, result.error, result.note);
    return response(clickTransId, merchantTransId, 0, "Success", { merchant_prepare_id: result.prepareId });
  } catch (error) {
    console.error("POST /api/payments/click/prepare error:", error instanceof Error ? error.message : "unknown error");
    return response(clickTransId, merchantTransId, -7, "Failed to update user");
  }
}
