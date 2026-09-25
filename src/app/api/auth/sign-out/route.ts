import { NextResponse } from "next/server";
import { clearSessionCookieHeader } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Sign out: clears the signed session cookie. The account itself stays in the
 * database — the student signs back in with email + password.
 */
export async function POST(req: Request) {
  const response = NextResponse.json({ success: true });
  response.headers.set("Set-Cookie", clearSessionCookieHeader(req));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
