import { NextResponse } from "next/server";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { db } from "@/db";
import { savedScholarships, scholarships } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { enforceFreeCap } from "@/lib/planLimits";
import { clampString, positiveInt, readJsonBody } from "@/lib/request";

const SAVED_SCHOLARSHIP_STATUSES = new Set([
  "Saved",
  "Drafting Essay",
  "Docs Submitted",
  "Awarded",
  "Declined",
]);

function invalidBody(parsed: Awaited<ReturnType<typeof readJsonBody>>) {
  if (parsed.ok) return null;
  return NextResponse.json({ error: parsed.error, code: parsed.code }, { status: parsed.status });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileIdStr = searchParams.get("profileId");

    if (!profileIdStr) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const profileId = positiveInt(profileIdStr);
    if (!profileId) {
      return NextResponse.json({ error: "profileId must be a positive integer" }, { status: 400 });
    }
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const saved = await db
      .select({
        id: savedScholarships.id,
        profileId: savedScholarships.profileId,
        scholarshipId: savedScholarships.scholarshipId,
        status: savedScholarships.status,
        notes: savedScholarships.notes,
        createdAt: savedScholarships.createdAt,
        scholarship: scholarships,
      })
      .from(savedScholarships)
      .innerJoin(scholarships, eq(savedScholarships.scholarshipId, scholarships.id))
      .where(eq(savedScholarships.profileId, profileId));

    return NextResponse.json({ savedScholarships: saved });
  } catch (error) {
    console.error("GET /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to fetch saved scholarships" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 32 * 1024);
    const badBody = invalidBody(parsed);
    if (badBody || !parsed.ok) return badBody!;
    const profileId = positiveInt(parsed.body.profileId);
    const scholarshipId = positiveInt(parsed.body.scholarshipId);
    const status = parsed.body.status === undefined ? "Saved" : parsed.body.status;
    const notes = clampString(parsed.body.notes, 4000);

    if (!profileId || !scholarshipId) {
      return NextResponse.json({ error: "profileId and scholarshipId must be positive integers" }, { status: 400 });
    }
    if (typeof status !== "string" || !SAVED_SCHOLARSHIP_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid saved scholarship status" }, { status: 400 });
    }

    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }

    const [scholarship] = await db
      .select({ id: scholarships.id })
      .from(scholarships)
      .where(eq(scholarships.id, scholarshipId))
      .limit(1);
    if (!scholarship) {
      return NextResponse.json({ error: "Scholarship not found", code: "not_found" }, { status: 404 });
    }

    const existing = await db
      .select()
      .from(savedScholarships)
      .where(
        and(
          eq(savedScholarships.profileId, profileId),
          eq(savedScholarships.scholarshipId, scholarshipId)
        )
      );

    if (existing.length > 0) {
      return NextResponse.json({ saved: existing[0], message: "Already saved" });
    }

    // Free plan: max N saved scholarships (Pro = unlimited).
    const capped = await enforceFreeCap(profileId, "saved_scholarships");
    if (capped) return capped;

    const [newSaved] = await db.insert(savedScholarships).values({
      profileId,
      scholarshipId,
      status,
      notes,
    }).returning();

    return NextResponse.json({ saved: newSaved });
  } catch (error) {
    console.error("POST /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to save scholarship" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const parsed = await readJsonBody<Record<string, unknown>>(req, 32 * 1024);
    const badBody = invalidBody(parsed);
    if (badBody || !parsed.ok) return badBody!;
    const id = positiveInt(parsed.body.id);
    const status = parsed.body.status;
    const notes = parsed.body.notes;

    if (!id) {
      return NextResponse.json({ error: "id must be a positive integer" }, { status: 400 });
    }
    // Row ids are guessable — confirm the row belongs to the caller.
    const [target] = await db.select().from(savedScholarships).where(eq(savedScholarships.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    // Validate mutable fields only after authorization, so a caller cannot
    // use validation differences to probe another student's row.
    if (status !== undefined && (typeof status !== "string" || !SAVED_SCHOLARSHIP_STATUSES.has(status))) {
      return NextResponse.json({ error: "Invalid saved scholarship status" }, { status: 400 });
    }
    if (notes !== undefined && typeof notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 400 });
    }

    const [updated] = await db
      .update(savedScholarships)
      .set({
        status: status !== undefined ? status : undefined,
        notes: notes !== undefined ? clampString(notes, 4000) : undefined,
      })
      .where(eq(savedScholarships.id, id))
      .returning();

    return NextResponse.json({ saved: updated });
  } catch (error) {
    console.error("PATCH /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to update saved scholarship" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (!idStr) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const id = positiveInt(idStr);
    if (!id) {
      return NextResponse.json({ error: "id must be a positive integer" }, { status: 400 });
    }

    // Row ids are guessable — confirm the row belongs to the caller.
    const [target] = await db.select().from(savedScholarships).where(eq(savedScholarships.id, id));
    const rowAccess = await requireRowAccess(req, target);
    if (!rowAccess.ok) {
      return NextResponse.json(
        { error: rowAccess.error, code: rowAccess.code },
        { status: rowAccess.status }
      );
    }

    await db.delete(savedScholarships).where(eq(savedScholarships.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/saved-scholarships error:", error);
    return NextResponse.json({ error: "Failed to delete saved scholarship" }, { status: 500 });
  }
}
