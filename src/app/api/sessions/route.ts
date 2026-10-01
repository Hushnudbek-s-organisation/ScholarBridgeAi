import { NextResponse } from "next/server";
import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { requireSession, readSessionToken, sessionTokenHash } from "@/lib/auth";
import { LIMITS, checkRateLimit, clientIp, rateLimitedResponse } from "@/lib/rate-limit";
import { positiveInt, readJsonBody } from "@/lib/request";

/**
 * My sessions — list, revoke one, or revoke all others (audit A23).
 *
 * The session list is the student's own `user_sessions` rows: web sign-ins
 * and Telegram channel sessions, with device (user agent), last seen and a
 * "this device" marker. Revocation is server-side — a copied token stops
 * working immediately, while the owner's other devices keep working.
 *
 * A session can only ever revoke its OWN profile's rows, and it cannot
 * revoke the session it is currently using (sign out for that) — otherwise a
 * page loaded by an attacker could force-log the victim out of everything.
 */

const listSessions = async (profileId: number, currentHash: string) => {
  const rows = await db
    .select({
      id: userSessions.id,
      scope: userSessions.scope,
      userAgent: userSessions.userAgent,
      ip: userSessions.ip,
      createdAt: userSessions.createdAt,
      lastSeenAt: userSessions.lastSeenAt,
      tokenHash: userSessions.tokenHash,
    })
    .from(userSessions)
    .where(and(eq(userSessions.profileId, profileId), isNull(userSessions.revokedAt)))
    .orderBy(asc(userSessions.createdAt))
    .limit(100);

  return rows.map((r) => ({
    id: r.id,
    scope: r.scope,
    userAgent: r.userAgent,
    ip: r.ip,
    createdAt: r.createdAt,
    lastSeenAt: r.lastSeenAt,
    current: r.tokenHash === currentHash,
  }));
};

/** GET /api/sessions — my active sessions. */
export async function GET(req: Request) {
  try {
    const auth = await requireSession(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
    }
    const sessions = await listSessions(auth.session.profile.id, sessionTokenHash(readSessionToken(req) ?? ""));
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("GET /api/sessions error:", error);
    return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
  }
}

/**
 * POST /api/sessions
 * Body: { all: true } — revoke every session except this one;
 *       { sessionId: <id> } — revoke one session (not this one).
 */
export async function POST(req: Request) {
  try {
    const limit = checkRateLimit(`sessions:${clientIp(req)}`, LIMITS.userWrite);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const auth = await requireSession(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error, code: auth.code }, { status: auth.status });
    }
    const profileId = auth.session.profile.id;
    const currentHash = sessionTokenHash(readSessionToken(req) ?? "");

    const parsed = await readJsonBody<Record<string, unknown>>(req, 4 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;

    if (body.all === true) {
      const others = await db
        .select({ id: userSessions.id })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.profileId, profileId),
            isNull(userSessions.revokedAt),
            sql`${userSessions.tokenHash} <> ${currentHash}`
          ));
      if (others.length > 0) {
        await db
          .update(userSessions)
          .set({ revokedAt: new Date() })
          .where(and(eq(userSessions.profileId, profileId), inArray(userSessions.id, others.map((o) => o.id))));
      }
      return NextResponse.json({ revoked: others.length });
    }

    const sessionId = positiveInt(body.sessionId);
    if (!sessionId) {
      return NextResponse.json(
        { error: "Provide { all: true } or { sessionId: <id> }." },
        { status: 400 }
      );
    }

    // Load the row first: ownership and the current-session guard are
    // enforced on the SERVER against the stored hash, never from the client.
    const [row] = await db
      .select({ id: userSessions.id, profileId: userSessions.profileId, tokenHash: userSessions.tokenHash })
      .from(userSessions)
      .where(eq(userSessions.id, sessionId))
      .limit(1);
    if (!row || row.profileId !== profileId) {
      return NextResponse.json({ error: "Session not found.", code: "not_found" }, { status: 404 });
    }
    if (row.tokenHash === currentHash) {
      return NextResponse.json(
        { error: "You cannot revoke the session you are using — sign out instead.", code: "current_session" },
        { status: 400 }
      );
    }

    await db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(userSessions.id, sessionId), eq(userSessions.profileId, profileId)));

    return NextResponse.json({ revoked: 1 });
  } catch (error) {
    console.error("POST /api/sessions error:", error);
    return NextResponse.json({ error: "Failed to revoke session" }, { status: 500 });
  }
}
