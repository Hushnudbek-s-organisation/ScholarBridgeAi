import { NextResponse } from "next/server";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { db } from "@/db";
import { savedUniversities, universities, studentProfiles } from "@/db/schema";
import { calculateUniversityMatch } from "@/lib/matching";
import { eq, and } from "drizzle-orm";
import { enforceFreeCap } from "@/lib/planLimits";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");

    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profileId = parseInt(profileIdStr, 10);
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.id, profileId));

    const saved = await db
      .select({
        id: savedUniversities.id,
        profileId: savedUniversities.profileId,
        universityId: savedUniversities.universityId,
        matchCategory: savedUniversities.matchCategory,
        matchScore: savedUniversities.matchScore,
        status: savedUniversities.status,
        notes: savedUniversities.notes,
        createdAt: savedUniversities.createdAt,
        university: universities,
      })
      .from(savedUniversities)
      .innerJoin(universities, eq(savedUniversities.universityId, universities.id))
      .where(eq(savedUniversities.profileId, profileId));

    // The row stores the fit score AT SAVE TIME. The fit engine is the single
    // source of truth, so the response recomputes it (a scorer change or a
    // profile edit must never leave this list contradicting the Explorer /
    // Chancing screens). The stored pair is kept for audit.
    const withLiveMatch = saved.map((row) => {
      if (!profile) return row;
      const live = calculateUniversityMatch(profile, row.university);
      return {
        ...row,
        matchScore: live.matchScore,
        matchCategory: live.matchCategory,
        storedMatchScore: row.matchScore,
        storedMatchCategory: row.matchCategory,
      };
    });

    return NextResponse.json({ savedUniversities: withLiveMatch });
  } catch (error) {
    console.error("GET /api/saved-universities error:", error);
    return NextResponse.json({ error: "Failed to fetch saved universities" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { profileId, universityId, status, notes } = body;

    if (!profileId || !universityId) {
      return NextResponse.json({ error: "profileId and universityId are required" }, { status: 400 });
    }

    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    // Check if already saved
    const existing = await db
      .select()
      .from(savedUniversities)
      .where(
        and(
          eq(savedUniversities.profileId, profileId),
          eq(savedUniversities.universityId, universityId)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ saved: existing[0], message: "Already saved" });
    }

    // Free plan: max N saved universities (Pro = unlimited).
    const capped = await enforceFreeCap(profileId, "saved_universities");
    if (capped) return capped;

    // Get profile & university for match score calculation
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    const [uni] = await db.select().from(universities).where(eq(universities.id, universityId));

    let score = 80;
    let cat: "Reach" | "Match" | "Safety" = "Match";

    if (profile && uni) {
      const match = calculateUniversityMatch(profile, uni);
      score = match.matchScore;
      cat = match.matchCategory;
    }

    const [newSaved] = await db.insert(savedUniversities).values({
      profileId,
      universityId,
      matchCategory: cat,
      matchScore: score,
      status: status || "Shortlisted",
      notes: notes || "",
    }).returning();

    return NextResponse.json({ saved: newSaved });
  } catch (error) {
    console.error("POST /api/saved-universities error:", error);
    return NextResponse.json({ error: "Failed to save university" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, notes, matchCategory } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Row ids are guessable — confirm the row belongs to the caller.
    const [target] = await db.select().from(savedUniversities).where(eq(savedUniversities.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    const [updated] = await db
      .update(savedUniversities)
      .set({
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? notes : undefined,
        matchCategory: matchCategory !== undefined ? matchCategory : undefined,
      })
      .where(eq(savedUniversities.id, id))
      .returning();

    return NextResponse.json({ saved: updated });
  } catch (error) {
    console.error("PATCH /api/saved-universities error:", error);
    return NextResponse.json({ error: "Failed to update saved university" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const id = parseInt(idStr, 10);

    // Row ids are guessable — confirm the row belongs to the caller.
    const [target] = await db.select().from(savedUniversities).where(eq(savedUniversities.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    await db.delete(savedUniversities).where(eq(savedUniversities.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/saved-universities error:", error);
    return NextResponse.json({ error: "Failed to delete saved university" }, { status: 500 });
  }
}
