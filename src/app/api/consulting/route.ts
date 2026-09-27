import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { db } from "@/db";
import { consultingRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { clampString, readJsonBody } from "@/lib/request";
import { LIMITS, checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";

/** POST: submit a consulting request (spec §27) — for the caller's own profile only. */
export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 16 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
    }
    const body = parsed.body;
    const access = await requireProfileAccess(req, body.profileId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const limit = checkRateLimit(`consulting:${access.session.profile.id}`, LIMITS.contact);
    if (!limit.ok) return rateLimitedResponse(limit.retryAfterSec);

    const profileId = access.targetId!;
    const topic = clampString(body.topic, 200).trim();
    if (!topic) {
      return NextResponse.json({ error: "profileId and topic are required" }, { status: 400 });
    }
    const [row] = await db
      .insert(consultingRequests)
      .values({
        profileId,
        topic,
        message: clampString(body.message, 4000).trim(),
        preferredContact: clampString(body.preferredContact, 200).trim(),
      })
      .returning();
    return NextResponse.json({ request: row });
  } catch (error) {
    console.error("POST /api/consulting error:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

/** GET: list consulting requests for a profile. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }
    const rows = await db
      .select()
      .from(consultingRequests)
      .where(eq(consultingRequests.profileId, profileId))
      .orderBy(desc(consultingRequests.createdAt));
    return NextResponse.json({ requests: rows });
  } catch (error) {
    console.error("GET /api/consulting error:", error);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}
