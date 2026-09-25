import { NextResponse } from "next/server";
import {
  handlePaymeRequest,
  isPaymeConfigured,
  verifyPaymeAuth,
  type PaymeRequest,
} from "@/lib/payments";
import { readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

/**
 * Payme merchant webhook (JSON-RPC over HTTP).
 * Implements CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction and GetStatement with correct error codes
 * and idempotency so repeated callbacks never double-credit a subscription.
 *
 * Authentication: Payme calls this endpoint with HTTP Basic auth using the
 * merchant id + merchant key. The request is rejected (401) when those
 * credentials are missing or wrong, and the endpoint is disabled entirely
 * until real merchant credentials are configured — an unauthenticated payment
 * callback would otherwise let anyone mark a transaction as paid.
 */
export async function POST(req: Request) {
  try {
    if (!isPaymeConfigured()) {
      return NextResponse.json(
        { error: { code: -32000, message: "Payme is not configured", data: null } },
        { status: 503 }
      );
    }

    if (!verifyPaymeAuth(req.headers.get("authorization"))) {
      console.warn("[payme] rejected webhook with invalid merchant credentials");
      return NextResponse.json(
        {
          error: { code: -32504, message: "Unauthorized merchant", data: null },
        },
        { status: 401, headers: { "WWW-Authenticate": 'Basic realm="payme-merchant"' } }
      );
    }

    const parsed = await readJsonBody<PaymeRequest>(req, 64 * 1024);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: { code: -32700, message: "Parse error", data: null } },
        { status: 400 }
      );
    }

    const response = await handlePaymeRequest(parsed.body);
    return NextResponse.json(response);
  } catch (error) {
    console.error("POST /api/payments/payme/webhook error:", error);
    return NextResponse.json(
      { error: { code: -32700, message: "Parse error", data: null } },
      { status: 400 }
    );
  }
}
