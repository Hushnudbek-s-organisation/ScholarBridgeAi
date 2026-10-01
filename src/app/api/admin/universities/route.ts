import { NextResponse } from "next/server";
import { db } from "@/db";
import { universities } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { auditRowChanges, writeAudit } from "@/lib/audit";

type Input = Record<string, unknown>;
type UniversityValues = Record<string, unknown>;

const STRING_FIELDS: Record<string, string> = {
  name: "name",
  country: "country",
  city: "city",
  flagEmoji: "flagEmoji",
  degreeLevel: "degreeLevel",
  programMajor: "programMajor",
  universityType: "universityType",
  address: "address",
  officialWebsiteUrl: "officialWebsiteUrl",
  admissionsUrl: "admissionsUrl",
  internationalAdmissionsUrl: "internationalAdmissionsUrl",
  undergraduateAdmissionsUrl: "undergraduateAdmissionsUrl",
  applicationUrl: "applicationUrl",
  description: "description",
  highlights: "highlights",
  websiteUrl: "websiteUrl",
  imageUrl: "imageUrl",
  sourceUrl: "sourceUrl",
  shortName: "shortName",
  canonicalName: "canonicalName",
  countryCode: "countryCode",
  dataSource: "dataSource",
  verificationStatus: "verificationStatus",
  tuitionCurrency: "tuitionCurrency",
  tuitionPeriod: "tuitionPeriod",
  livingCostCurrency: "livingCostCurrency",
  livingCostPeriod: "livingCostPeriod",
  accommodationCostCurrency: "accommodationCostCurrency",
  accommodationCostPeriod: "accommodationCostPeriod",
  applicationFeeCurrency: "applicationFeeCurrency",
  postStudyVisaNote: "postStudyVisaNote",
  undergraduateUrl: "undergraduateUrl",
  internationalUrl: "internationalUrl",
  applicationPlatform: "applicationPlatform",
};

const NUMBER_FIELDS: Record<string, { key: string; integer?: boolean }> = {
  worldRanking: { key: "worldRanking", integer: true },
  qsRankYear: { key: "qsRankYear", integer: true },
  foundedYear: { key: "foundedYear", integer: true },
  annualTuitionUsd: { key: "annualTuitionUsd", integer: true },
  annualLivingEstUsd: { key: "annualLivingEstUsd", integer: true },
  accommodationCostUsd: { key: "accommodationCostUsd", integer: true },
  annualTuition: { key: "annualTuition" },
  annualLivingEst: { key: "annualLivingEst" },
  accommodationCost: { key: "accommodationCost" },
  applicationFee: { key: "applicationFee", integer: true },
  minGpa: { key: "minGpa" },
  minIelts: { key: "minIelts" },
  minSat: { key: "minSat", integer: true },
  minToefl: { key: "minToefl", integer: true },
  minDuolingo: { key: "minDuolingo", integer: true },
  minAct: { key: "minAct", integer: true },
  acceptanceRate: { key: "acceptanceRate" },
  postStudyWorkVisaYears: { key: "postStudyWorkVisaYears" },
  internationalStudentsCount: { key: "internationalStudentsCount", integer: true },
  internationalStudentsPercentage: { key: "internationalStudentsPercentage" },
  internationalStudentsPct: { key: "internationalStudentsPercentage" },
  sourceReliability: { key: "sourceReliability", integer: true },
};

const BOOLEAN_FIELDS: Record<string, string> = {
  isActive: "isActive",
  isEnglishTaught: "isEnglishTaught",
};

function has(input: Input, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(input, key);
}

function optionalString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function optionalNumber(value: unknown, integer = false): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || (integer && !Number.isInteger(n))) {
    throw new Error("Numeric fields must contain a valid number");
  }
  return n;
}

function validUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:" || new URL(value).protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeValues(input: Input, creating: boolean): UniversityValues {
  const values: UniversityValues = {};

  for (const [inputKey, dbKey] of Object.entries(STRING_FIELDS)) {
    if (has(input, inputKey)) values[dbKey] = optionalString(input[inputKey]);
  }
  for (const [inputKey, config] of Object.entries(NUMBER_FIELDS)) {
    if (has(input, inputKey)) values[config.key] = optionalNumber(input[inputKey], config.integer);
  }
  for (const [inputKey, dbKey] of Object.entries(BOOLEAN_FIELDS)) {
    if (has(input, inputKey)) {
      const value = input[inputKey];
      if (typeof value !== "boolean") throw new Error(`${inputKey} must be true or false`);
      values[dbKey] = value;
    }
  }

  // Keep aliases synchronized only when the caller supplies either one.
  if (has(input, "officialWebsiteUrl") && !has(input, "websiteUrl")) {
    values.websiteUrl = optionalString(input.officialWebsiteUrl);
  } else if (has(input, "websiteUrl") && !has(input, "officialWebsiteUrl")) {
    values.officialWebsiteUrl = optionalString(input.websiteUrl);
  }

  if (creating) {
    const name = optionalString(input.name);
    const country = optionalString(input.country);
    const website = optionalString(input.websiteUrl) ?? optionalString(input.officialWebsiteUrl);
    if (!name) throw new Error("University name is required");
    if (!country) throw new Error("Country is required");
    if (!website || !validUrl(website)) throw new Error("A valid official website URL is required");

    values.name = name;
    values.country = country;
    values.city = optionalString(input.city);
    values.flagEmoji = optionalString(input.flagEmoji) ?? "🌐";
    values.worldRanking = optionalNumber(input.worldRanking, true);
    values.degreeLevel = optionalString(input.degreeLevel) ?? "All";
    values.programMajor = optionalString(input.programMajor);
    values.annualTuitionUsd = optionalNumber(input.annualTuitionUsd, true);
    values.annualLivingEstUsd = optionalNumber(input.annualLivingEstUsd, true);
    values.accommodationCostUsd = optionalNumber(input.accommodationCostUsd, true);
    values.minGpa = optionalNumber(input.minGpa);
    values.minIelts = optionalNumber(input.minIelts);
    values.minSat = optionalNumber(input.minSat, true);
    values.acceptanceRate = optionalNumber(input.acceptanceRate);
    values.postStudyWorkVisaYears = optionalNumber(input.postStudyWorkVisaYears);
    values.description = optionalString(input.description) ?? "";
    values.highlights = optionalString(input.highlights) ?? "[]";
    values.websiteUrl = website;
    values.officialWebsiteUrl = optionalString(input.officialWebsiteUrl) ?? website;
    values.verificationStatus = "unverified";
    values.isActive = true;
  } else {
    for (const requiredKey of ["name", "country", "websiteUrl", "officialWebsiteUrl"] as const) {
      if (has(input, requiredKey) && !optionalString(input[requiredKey])) {
        throw new Error(`${requiredKey} cannot be blank`);
      }
    }
    if (has(input, "websiteUrl") && !validUrl(String(values.websiteUrl ?? ""))) {
      throw new Error("websiteUrl must be a valid HTTP(S) URL");
    }
    if (has(input, "officialWebsiteUrl") && !validUrl(String(values.officialWebsiteUrl ?? ""))) {
      throw new Error("officialWebsiteUrl must be a valid HTTP(S) URL");
    }
  }

  if (values.worldRanking != null && Number(values.worldRanking) < 1) {
    throw new Error("worldRanking must be a positive rank; use null when unknown");
  }
  if (values.acceptanceRate != null && (Number(values.acceptanceRate) < 0 || Number(values.acceptanceRate) > 100)) {
    throw new Error("acceptanceRate must be between 0 and 100");
  }
  if (values.internationalStudentsPercentage != null && (Number(values.internationalStudentsPercentage) < 0 || Number(values.internationalStudentsPercentage) > 100)) {
    throw new Error("internationalStudentsPercentage must be between 0 and 100");
  }
  return values;
}

export async function POST(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const body = await req.json();
    const values = normalizeValues((body.university || {}) as Input, true);
    const [university] = await db.insert(universities).values(values as typeof universities.$inferInsert).returning();
    await writeAudit({
      entityType: "university",
      entityId: university.id,
      fieldChanged: "created",
      newValue: university.name,
      actor: "ADMIN",
      verificationStatus: "unverified",
    });
    return NextResponse.json({ university });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create university";
    const status = /required|valid|must be|cannot be|between/i.test(message) ? 400 : 500;
    console.error("POST /api/admin/universities error:", error);
    return NextResponse.json({ error: status === 400 ? message : "Failed to create university" }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "University id is required" }, { status: 400 });
    }
    const [existing] = await db.select().from(universities).where(eq(universities.id, id));
    if (!existing) return NextResponse.json({ error: "University not found" }, { status: 404 });

    const values = normalizeValues((body.university || {}) as Input, false);
    if (Object.keys(values).length === 0) {
      return NextResponse.json({ error: "No university fields supplied" }, { status: 400 });
    }
    const [university] = await db.update(universities).set(values as Partial<typeof universities.$inferInsert>)
      .where(eq(universities.id, id)).returning();
    await auditRowChanges("university", id, existing, { ...existing, ...values }, { actor: "ADMIN" });
    return NextResponse.json({ university });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update university";
    const status = /required|valid|must be|cannot be|between/i.test(message) ? 400 : 500;
    console.error("PATCH /api/admin/universities error:", error);
    return NextResponse.json({ error: status === 400 ? message : "Failed to update university" }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const access = await requireAdmin(req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ error: "University id is required" }, { status: 400 });
    }
    await db.delete(universities).where(eq(universities.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/universities error:", error);
    return NextResponse.json({ error: "Failed to delete university" }, { status: 500 });
  }
}
