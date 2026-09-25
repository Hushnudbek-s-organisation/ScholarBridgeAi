import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";
import { sanitizeProfile } from "@/lib/password";

export const dynamic = "force-dynamic";

/**
 * Current session: who the session cookie authenticates.
 *
 * The client calls this on load instead of trusting a profile id kept in
 * localStorage, so a stale/forged local id can never become an identity.
 *  - 200 + profile when the cookie is valid
 *  - 401 when there is no (valid) session
 */
export async function GET(req: Request) {
  const auth = await authenticate(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, session: null },
      { status: auth.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    {
      session: {
        profileId: auth.session.profile.id,
        isAdmin: auth.session.isAdmin,
        expiresAt: new Date(auth.session.payload.exp * 1000).toISOString(),
      },
      profile: sanitizeProfile(auth.session.profile),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
