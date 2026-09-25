import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { opportunities, studentProfiles } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { countByType, rankOpportunities } from "@/lib/opportunities";

export const dynamic = "force-dynamic";

/**
 * #26/#27/#28 — Personalized opportunities feed.
 *
 * GET /api/opportunities?type=competition&sort=match
 *
 * Public catalog. When the caller is signed in, each entry is scored for
 * their profile (field / country / level / deadline); anonymous callers get
 * the catalog with match = null. Counts by type power the "NEW FOR YOU" row.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type")?.trim();
    const sort = url.searchParams.get("sort")?.trim() || "match";

    const where = type ? and(eq(opportunities.type, type)) : undefined;
    const rows = await db.select().from(opportunities).where(where).orderBy(asc(opportunities.title));

    // Optional profile scoring — the session decides, never a claimed id.
    // Anonymous callers get the plain catalog (match: null).
    let profile: { major: string | null; country: string | null; degreeLevel: string | null } | null = null;
    const auth = await authenticate(req);
    if (auth.ok) {
      const pRows = await db
        .select({ targetMajor: studentProfiles.targetMajor, country: studentProfiles.country, degreeLevel: studentProfiles.degreeLevel })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, auth.session.profile.id))
        .limit(1);
      if (pRows[0]) {
        // The matcher speaks "major" — the schema column is targetMajor.
        profile = { major: pRows[0].targetMajor, country: pRows[0].country, degreeLevel: pRows[0].degreeLevel };
      }
    }

    const now = new Date();
    const items = rows.map((r) => {
      const opp = {
        id: r.id,
        type: r.type,
        title: r.title,
        provider: r.provider,
        country: r.country,
        fields: r.fields,
        level: r.level,
        deadlineDate: r.deadlineDate || null,
        url: r.url,
        isVerified: r.isVerified,
      };
      const scored = profile ? rankOpportunities([opp], profile, now)[0] : null;
      return {
        ...opp,
        match: scored ? scored.match : null,
        reasons: scored ? scored.reasons : [],
        flags: scored ? scored.flags : [],
      };
    });

    if (sort === "deadline") {
      items.sort((a, b) => (a.deadlineDate ?? "9999").localeCompare(b.deadlineDate ?? "9999") || a.title.localeCompare(b.title));
    } else {
      items.sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || a.title.localeCompare(b.title));
    }

    return NextResponse.json({
      count: items.length,
      counts: countByType(rows),
      items,
      scoredFor: profile ? profile.major ?? "your profile" : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  }
}
