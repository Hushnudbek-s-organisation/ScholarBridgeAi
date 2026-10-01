import { NextResponse } from "next/server";
import { db } from "@/db";
import { scholarships } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { auditRowChanges, writeAudit } from "@/lib/audit";
import { notifyScholarshipDeadlineChanged, notifyScholarshipOpened } from "@/lib/notificationSweep";

function toBool(value: any): boolean {
  return value === true || value === "true";
}

function toJsonField(value: any, fallback: string): string {
  if (value == null || value === "") return fallback;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function validateScholarshipInput(s: any): string | null {
  if (typeof s.title !== "string" || !s.title.trim()) return "Scholarship title is required";
  if (typeof s.provider !== "string" || !s.provider.trim()) return "Provider is required";
  if (typeof s.country !== "string" || !s.country.trim()) return "Provider/host country is required (use Global only when accurate)";
  const sourceUrl = s.websiteUrl || s.sourceUrl;
  try {
    const parsed = new URL(sourceUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) return "A valid HTTP(S) source URL is required";
  } catch {
    return "A valid HTTP(S) source URL is required";
  }
  if (s.awardAmount != null && s.awardAmount !== "") {
    if (!Number.isFinite(Number(s.awardAmount)) || Number(s.awardAmount) < 0) return "Award amount must be a non-negative number";
    if (!/^[A-Za-z]{3}$/.test(String(s.awardCurrency || ""))) return "Use a three-letter currency code for the award amount";
  }
  const validPeriods = ["total", "year", "month", "one_time", "variable"];
  if (s.awardPeriod && !validPeriods.includes(s.awardPeriod)) return "Award period is not supported";
  const validBases = ["fixed", "range", "full_tuition", "need_based", "variable"];
  if (s.awardBasis && !validBases.includes(s.awardBasis)) return "Award basis is not supported";
  if (s.universityId != null && s.universityId !== "" && (!Number.isInteger(Number(s.universityId)) || Number(s.universityId) <= 0)) {
    return "University id must be a positive integer or null for a global award";
  }
  return null;
}

function buildScholarshipValues(s: any) {
  return {
    title: s.title.trim(),
    provider: s.provider.trim(),
    country: s.country.trim(),
    coverageType: s.coverageType || "Unspecified",
    amountUsdValue: s.amountUsdValue === "" || s.amountUsdValue == null || !Number.isFinite(Number(s.amountUsdValue))
      ? null
      : Number(s.amountUsdValue),
    awardAmount: s.awardAmount === "" || s.awardAmount == null || !Number.isFinite(Number(s.awardAmount))
      ? null
      : Number(s.awardAmount),
    awardCurrency: s.awardCurrency ? String(s.awardCurrency).toUpperCase() : null,
    awardPeriod: s.awardPeriod || null,
    awardBasis: s.awardBasis || null,
    deadline: s.deadline || null,
    universityId: s.universityId == null || s.universityId === "" ? null : Number(s.universityId),
    degreeLevels: toJsonField(s.degreeLevels, "[]"),
    eligibleMajors: toJsonField(s.eligibleMajors, "[]"),
    minGpa: s.minGpa === "" || s.minGpa == null ? null : Number(s.minGpa),
    minIelts: s.minIelts === "" || s.minIelts == null ? null : Number(s.minIelts),
    financialNeedBased: s.financialNeedBased == null ? null : toBool(s.financialNeedBased),
    meritBased: s.meritBased == null ? null : toBool(s.meritBased),
    description: s.description || "",
    requirements: s.requirements || "",
    websiteUrl: s.websiteUrl || s.sourceUrl || "",
    // --- Dynamic lifecycle (spec §4) ---
    eligibleCountries: toJsonField(s.eligibleCountries, "[]"),
    fundingType: s.fundingType || "",
    tuitionCoverage: s.tuitionCoverage || "",
    livingAllowance: s.livingAllowance === "" || s.livingAllowance == null ? null : Number(s.livingAllowance),
    travelAllowance: s.travelAllowance === "" || s.travelAllowance == null ? null : Number(s.travelAllowance),
    accommodation: s.accommodation || "",
    applicationFee: s.applicationFee === "" || s.applicationFee == null ? null : Number(s.applicationFee),
    englishRequirements: s.englishRequirements || "",
    requiredDocuments: toJsonField(s.requiredDocuments, "[]"),
    applicationUrl: s.applicationUrl || null,
    openingDate: s.openingDate || null,
    deadlineDate: s.deadlineDate || null,
    deadlineType: s.deadlineType || "unknown",
    deadlineRangeStart: s.deadlineRangeStart || null,
    deadlineRangeEnd: s.deadlineRangeEnd || null,
    rounds: toJsonField(s.rounds, "[]"),
    recurrence: s.recurrence || "none",
    expectedOpeningPeriod: s.expectedOpeningPeriod || null,
    expectedDeadlinePeriod: s.expectedDeadlinePeriod || null,
    sourceUrl: s.sourceUrl || null,
    verificationStatus: s.verificationStatus || "unverified",
    sourceReliability: Number(s.sourceReliability) || 7,
    isActive: s.isActive == null ? true : toBool(s.isActive),
    notes: s.notes || null,
    lastUpdatedAt: new Date(),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const input = body.scholarship || {};
    const validationError = validateScholarshipInput(input);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const [scholarship] = await db
      .insert(scholarships)
      .values(buildScholarshipValues(input))
      .returning();
    await writeAudit({
      entityType: "scholarship",
      entityId: scholarship.id,
      fieldChanged: "created",
      newValue: scholarship.title,
      actor: "ADMIN",
      verificationStatus: "unverified",
    });
    return NextResponse.json({ scholarship });
  } catch (error) {
    console.error("POST /api/admin/scholarships error:", error);
    return NextResponse.json({ error: "Failed to create scholarship" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ error: "Scholarship id is required" }, { status: 400 });
    }
    const [existing] = await db.select().from(scholarships).where(eq(scholarships.id, id));
    if (!existing) {
      return NextResponse.json({ error: "Scholarship not found" }, { status: 404 });
    }
    const input = { ...existing, ...(body.scholarship || {}) };
    const validationError = validateScholarshipInput(input);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const values = buildScholarshipValues(input);
    const [scholarship] = await db
      .update(scholarships)
      .set(values)
      .where(eq(scholarships.id, id))
      .returning();
    await auditRowChanges("scholarship", id, existing, { ...existing, ...values }, { actor: "ADMIN" });
    // Tell everyone who saved it (bell + Telegram). Never fails the save.
    try {
      await notifyScholarshipDeadlineChanged(scholarship, existing.deadlineDate, scholarship.deadlineDate);
      if (existing.applicationStatus !== "open" && scholarship.applicationStatus === "open") {
        await notifyScholarshipOpened(scholarship);
      }
    } catch (err) {
      console.warn("scholarship change notifications failed:", err);
    }
    return NextResponse.json({ scholarship });
  } catch (error) {
    console.error("PATCH /api/admin/scholarships error:", error);
    return NextResponse.json({ error: "Failed to update scholarship" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminProfileId = searchParams.get("adminProfileId");
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    const id = Number(searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Scholarship id is required" }, { status: 400 });
    }
    await db.delete(scholarships).where(eq(scholarships.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/scholarships error:", error);
    return NextResponse.json({ error: "Failed to delete scholarship" }, { status: 500 });
  }
}
