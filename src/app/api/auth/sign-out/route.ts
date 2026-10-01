import { NextResponse } from "next/server";
import { clearSessionCookieHeader, readSessionToken, revokeSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Sign out: clears the signed session cookie. The account itself stays in the
 * database — the student signs back in with email + password.
 */
export async function POST(req: Request) {
  // Revoke the token server-side too (audit A23): clearing the cookie alone
  // would let a copied token stay valid for its full 7-day life.
  await revokeSessionToken(readSessionToken(req));
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookieHeader(req));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
