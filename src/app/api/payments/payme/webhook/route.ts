import { NextResponse } from "next/server";
import {
  handlePaymeRequest,
  isPaymeConfigured,
  verifyPaymeAuth,
  type PaymeRequest,
} from "@/lib/payments";
import { readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

function requestId(value: unknown): number | string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).id;
  return typeof id === "number" || typeof id === "string" || id === null ? id : null;
}

function rpcError(id: number | string | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 200 });
}

/**
 * Payme Merchant API JSON-RPC webhook. Payme requires HTTP 200 for JSON-RPC
 * success and error responses; failures are represented by the `error` object.
 * Authentication uses the separate Payme-issued Basic login plus merchant key.
 */
export async function POST(req: Request) {
  let parsed: Awaited<ReturnType<typeof readJsonBody<unknown>>> | null = null;
  let id: number | string | null = null;
  try {
    parsed = await readJsonBody<unknown>(req, 64 * 1024);
    if (parsed.ok) id = requestId(parsed.body);

    if (!isPaymeConfigured()) {
      console.warn("[payme] webhook called before merchant credentials were configured");
      return rpcError(id, -32504, "Insufficient privileges");
    }
    if (!verifyPaymeAuth(req.headers.get("authorization"))) {
      console.warn("[payme] rejected webhook with invalid merchant credentials");
      return rpcError(id, -32504, "Insufficient privileges");
    }
    if (!parsed.ok) return rpcError(null, -32700, "Parse error");

    const response = await handlePaymeRequest(parsed.body as PaymeRequest);
    return NextResponse.json({ jsonrpc: "2.0", ...response }, { status: 200 });
  } catch (error) {
    console.error("POST /api/payments/payme/webhook error:", error instanceof Error ? error.message : "unknown error");
    return rpcError(id, -32400, "System error");
  }
}
