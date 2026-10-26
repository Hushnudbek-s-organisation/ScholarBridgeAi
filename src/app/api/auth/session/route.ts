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
  try {
    const auth = await authenticate(req);
    if (!auth.ok) {
      // A 503 is "the database is not answering yet", not "you are signed out":
      // tell intermediaries and the client's own retry loop how long to wait.
      const headers: Record<string, string> = { "Cache-Control": "no-store" };
      if (auth.status === 503) headers["Retry-After"] = "3";
      return NextResponse.json({ error: auth.error, code: auth.code, session: null }, { status: auth.status, headers });
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
  } catch (error) {
    const missingSessionSecret = error instanceof Error && error.message.includes("SESSION_SECRET");
    console.error("GET /api/auth/session failed:", missingSessionSecret ? "SESSION_SECRET is missing or too short" : (error as Error)?.message);
    return NextResponse.json(
      {
        error: missingSessionSecret
          ? "This deployment needs a SESSION_SECRET of at least 32 characters. Ask the site administrator to add it in Render Environment settings."
          : "The session service could not be reached. Please try again; if this continues, contact the site administrator.",
        code: missingSessionSecret ? "session_secret_required" : "session_service_unavailable",
        session: null,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
