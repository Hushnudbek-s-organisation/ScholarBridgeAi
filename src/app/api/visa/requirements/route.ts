import { NextResponse } from "next/server";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { visaRequirements } from "@/db/schema";
import { guardAdmin, guardStudent, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { countriesMatch } from "@/lib/countries";

export const dynamic = "force-dynamic";

/**
 * GET /api/visa/requirements?country=&visaType=
 *
 * Country visa requirements (spec §25).
 *
 * SPEC §25: "Do not let AI invent visa requirements." These rows are written
 * ONLY by admins (POST/PATCH are admin-guarded), and every row carries a
 * source URL + last-verified date. A row without a source is returned with
 * `sourceUrl: null` and the UI renders it as "Not specified".
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get("country") ?? "").trim();
  const visaType = (searchParams.get("visaType") ?? "").trim();
  try {
    // The distinct countries we have published something for. Resolving known
    // aliases against these saved labels keeps the API contract and stored
    // values unchanged while allowing searches such as USA → United States.
    const countries = await db
      .selectDistinct({ country: visaRequirements.country })
      .from(visaRequirements)
      .orderBy(asc(visaRequirements.country));
    const matchedCountry = country
      ? countries.find((entry) => countriesMatch(entry.country, country))?.country ?? country
      : "";

    const conditions = [];
    if (country) conditions.push(ilike(visaRequirements.country, matchedCountry));
    if (visaType) conditions.push(eq(visaRequirements.visaType, visaType));
    const rows = conditions.length
      ? await db
          .select()
          .from(visaRequirements)
          .where(and(...conditions))
          .orderBy(asc(visaRequirements.sortOrder), asc(visaRequirements.id))
          .limit(100)
      : [];

    return NextResponse.json({
      requirements: rows.map((r) => ({
        id: r.id,
        country: r.country,
        visaType: r.visaType,
        title: r.title,
        instructions: r.instructions,
        isRequired: r.isRequired,
        sourceUrl: r.sourceUrl,
        sourceName: r.sourceName,
        sourceType: r.sourceType,
        lastVerifiedAt: r.lastVerifiedAt,
        verificationStatus: r.verificationStatus,
      })),
      countries: countries.map((c) => c.country),
      notice:
        "Requirements are published by our admin team from official government sources. ScholarBridge never generates a visa requirement with AI.",
    });
  } catch (err) {
    return serverError("visa/requirements GET", err);
  }
}

/** POST — admin: publish a visa requirement. */
export async function POST(req: Request) {
  // Authorize BEFORE parsing: an anonymous caller must never be able to
  // probe the shape of an admin payload from the error messages.
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const country = text(b.value.country, 80);
  const visaType = text(b.value.visaType, 80);
  const title = text(b.value.title, 200);
  if (!country || !visaType || !title) return jsonError(400, "country, visaType and title are required", "bad_request");
  try {
    const [row] = await db
      .insert(visaRequirements)
      .values({
        country,
        visaType,
        title,
        instructions: text(b.value.instructions, 2000),
        isRequired: b.value.isRequired == null ? true : !!b.value.isRequired,
        // A requirement without a source is stored as `unverified` on purpose:
        // the UI must be able to say "Not specified" rather than imply authority.
        sourceUrl: text(b.value.sourceUrl, 800),
        sourceName: text(b.value.sourceName, 160),
        sourceType: text(b.value.sourceType, 80),
        lastVerifiedAt: b.value.lastVerifiedAt ? new Date(String(b.value.lastVerifiedAt)) : null,
        verificationStatus: text(b.value.verificationStatus, 40) ?? "unverified",
        sortOrder: Number(b.value.sortOrder) || 0,
      })
      .returning();
    return NextResponse.json({ ok: true, requirement: row });
  } catch (err) {
    return serverError("visa/requirements POST", err);
  }
}

/** PATCH — admin: update a published visa requirement. */
export async function PATCH(req: Request) {
  // Authorize BEFORE parsing: an anonymous caller must never be able to
  // probe the shape of an admin payload from the error messages.
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const [row] = await db.select().from(visaRequirements).where(eq(visaRequirements.id, id)).limit(1);
    if (!row) return jsonError(404, "Requirement not found", "not_found");
    await db
      .update(visaRequirements)
      .set({
        title: b.value.title === undefined ? row.title : text(b.value.title, 200) ?? row.title,
        instructions: b.value.instructions === undefined ? row.instructions : text(b.value.instructions, 2000),
        isRequired: b.value.isRequired == null ? row.isRequired : !!b.value.isRequired,
        sourceUrl: b.value.sourceUrl === undefined ? row.sourceUrl : text(b.value.sourceUrl, 800),
        sourceName: b.value.sourceName === undefined ? row.sourceName : text(b.value.sourceName, 160),
        sourceType: b.value.sourceType === undefined ? row.sourceType : text(b.value.sourceType, 80),
        lastVerifiedAt:
          b.value.lastVerifiedAt === undefined ? row.lastVerifiedAt : new Date(String(b.value.lastVerifiedAt)),
        verificationStatus:
          b.value.verificationStatus === undefined
            ? row.verificationStatus
            : oneOf(b.value.verificationStatus, ["verified", "needs_review", "outdated", "unverified"] as const, row.verificationStatus as "verified"),
        updatedAt: new Date(),
      })
      .where(eq(visaRequirements.id, id));
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("visa/requirements PATCH", err);
  }
}

/** DELETE — admin: withdraw a visa requirement. */
export async function DELETE(req: Request) {
  // Authorize BEFORE parsing: an anonymous caller must never be able to
  // probe the shape of an admin payload from the error messages.
  const g = await guardAdmin(req, { write: true });
  if (!g.ok) return g.response;
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const deleted = await db
      .delete(visaRequirements)
      .where(eq(visaRequirements.id, id))
      .returning({ id: visaRequirements.id });
    if (!deleted.length) return jsonError(404, "Requirement not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("visa/requirements DELETE", err);
  }
}
