import { NextResponse } from "next/server";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { db } from "@/db";
import { savedUniversities, universities, studentProfiles } from "@/db/schema";
import { calculateUniversityMatch } from "@/lib/matching";
import { toMatchProfileWithActivities, toUniversityData } from "@/lib/profileMapping";
import { eq, and } from "drizzle-orm";
import { enforceFreeCap } from "@/lib/planLimits";

const SAVED_UNIVERSITY_STATUSES = new Set([
  "Shortlisted",
  "Preparing Application",
  "Submitted",
  "Accepted",
  "Enrolled",
  "Rejected",
]);

function positiveId(value: unknown): number | null {
  const id = typeof value === "number" ? value : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cleanNotes(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 4000) : "";
}

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
        status: savedUniversities.status,
        notes: savedUniversities.notes,
        createdAt: savedUniversities.createdAt,
        university: universities,
      })
      .from(savedUniversities)
      .innerJoin(universities, eq(savedUniversities.universityId, universities.id))
      .where(eq(savedUniversities.profileId, profileId));

    // Fit is computed from the current profile and available catalogue data;
    // do not persist or return a stale score or an admissions-style tier.
    const matchProfile = profile ? await toMatchProfileWithActivities(profile) : null;
    const withLiveMatch = saved.map((row) => {
      const live = matchProfile
        ? calculateUniversityMatch(matchProfile, toUniversityData(row.university))
        : null;
      return { ...row, matchScore: live?.matchScore ?? null };
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
    const profileId = positiveId(body.profileId);
    const universityId = positiveId(body.universityId);
    const status = body.status === undefined ? "Shortlisted" : body.status;
    const notes = cleanNotes(body.notes);

    if (!profileId || !universityId) {
      return NextResponse.json({ error: "profileId and universityId must be positive integers" }, { status: 400 });
    }
    if (typeof status !== "string" || !SAVED_UNIVERSITY_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid saved university status" }, { status: 400 });
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

    // A saved fit snapshot must come from the canonical engine. Never insert
    // an attractive fallback score/category when either source row is missing.
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId));
    if (!profile) {
      return NextResponse.json({ error: "Profile not found", code: "not_found" }, { status: 404 });
    }
    const [uni] = await db.select().from(universities).where(eq(universities.id, universityId));
    if (!uni) {
      return NextResponse.json({ error: "University not found", code: "not_found" }, { status: 404 });
    }

    const [newSaved] = await db.insert(savedUniversities).values({
      profileId,
      universityId,
      status,
      notes,
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
    const id = positiveId(body.id);
    const status = body.status;
    const notes = body.notes;

    if (!id) {
      return NextResponse.json({ error: "id must be a positive integer" }, { status: 400 });
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

    // Validate mutable fields only after authorization, so a caller cannot
    // use validation differences to probe another student's row.
    if (status !== undefined && (typeof status !== "string" || !SAVED_UNIVERSITY_STATUSES.has(status))) {
      return NextResponse.json({ error: "Invalid saved university status" }, { status: 400 });
    }
    if (notes !== undefined && typeof notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
    }

    const [updated] = await db
      .update(savedUniversities)
      .set({
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? cleanNotes(notes) : undefined,
        // matchCategory/matchScore are engine-owned facts and cannot be
        // overwritten by a client PATCH.
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
