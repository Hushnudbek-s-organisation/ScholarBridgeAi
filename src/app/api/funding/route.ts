import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { applications, fundingItems, savedScholarships, savedUniversities, scholarships, universities } from "@/db/schema";
import { guardStudent, idParam, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { annualFundingCostLines, buildFundingPlan, knownAnnualCostTotal, ONE_OFF_COST_LINES, FUNDING_KIND_LABELS, type FundingItemLike, type FundingKind, type FundingStatus } from "@/lib/journey/funding";
import { countriesMatch } from "@/lib/countries";
import {
  COUNTRY_COST_BENCHMARKS,
  CURRENCY_RATES_TO_USD,
  resolveCompleteCostInputs,
  resolveMultiCurrencyScholarshipAmount,
} from "@/lib/countryCostBenchmarks";

export const dynamic = "force-dynamic";

const KINDS = ["scholarship", "aid", "family", "savings", "loan", "other"] as const;
const STATUSES = ["planned", "applied", "awarded", "confirmed", "declined"] as const;

/**
 * GET /api/funding?profileId=[&applicationId=][&country=][&currency=]
 *
 * My Funding Plan: canonical annual cost lines plus separately reported
 * one-off application/visa fees, scholarships, aid and the remaining gap.
 * With no applicationId this is the profile-wide, unlinked plan; it never
 * silently picks the latest application.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const rawApplicationId = searchParams.get("applicationId");
  const applicationId = rawApplicationId == null ? null : Number(rawApplicationId);
  if (rawApplicationId != null && (!Number.isInteger(applicationId) || applicationId! <= 0)) {
    return jsonError(400, "applicationId must be a positive integer", "bad_request");
  }
  const countryParam = (searchParams.get("country") || "").trim() || null;
  const displayCurrency = ((searchParams.get("currency") || "USD").trim().toUpperCase()) || "USD";

  try {
    let app: typeof applications.$inferSelect | undefined;
    if (applicationId != null) {
      [app] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
        .limit(1);
      if (!app) return jsonError(404, "Application not found", "not_found");
    }

    let uni = app?.universityId
      ? (await db.select().from(universities).where(eq(universities.id, app.universityId)).limit(1))[0] ?? null
      : null;

    if (!uni && !countryParam) {
      const [firstSaved] = await db
        .select({ universityId: savedUniversities.universityId })
        .from(savedUniversities)
        .where(eq(savedUniversities.profileId, profileId))
        .limit(1);
      if (firstSaved?.universityId) {
        [uni] = await db.select().from(universities).where(eq(universities.id, firstSaved.universityId)).limit(1);
      }
    }

    const resolved = resolveCompleteCostInputs({
      university: countryParam ? null : uni,
      countryOverride: countryParam ?? uni?.country ?? "United States",
      degreeLevel: uni?.degreeLevel ?? g.value.session.profile.degreeLevel ?? null,
    });

    const lines = annualFundingCostLines({
      annualTuitionUsd: resolved.inputs.annualTuitionUsd ?? null,
      annualLivingEstUsd: resolved.inputs.annualLivingEstUsd ?? null,
      accommodationCostUsd: resolved.inputs.accommodationCostUsd ?? null,
      insurancePerYearUsd: resolved.inputs.insurancePerYearUsd ?? null,
      booksPerYearUsd: resolved.inputs.booksPerYearUsd ?? null,
      flightsPerYearUsd: resolved.inputs.flightsPerYearUsd ?? null,
    });
    const annualCost = knownAnnualCostTotal(lines);
    const estimatedLines = lines
      .filter((line) => resolved.benchmarkKeys.has(line.key))
      .map((line) => line.label);
    const unknownLines = lines.filter((line) => line.cost == null).map((line) => line.label);
    const oneOffCosts = ONE_OFF_COST_LINES.map(({ key, label }) => ({
      key,
      label,
      amountUsd: key === "application_fee" ? (resolved.inputs.applicationFeeUsd ?? null) : (resolved.inputs.visaFeeUsd ?? null),
      estimated: resolved.benchmarkKeys.has(key),
    }));

    const rows = await db
      .select()
      .from(fundingItems)
      .where(app
        ? and(eq(fundingItems.profileId, profileId), eq(fundingItems.applicationId, app.id))
        : and(eq(fundingItems.profileId, profileId), isNull(fundingItems.applicationId)))
      .orderBy(desc(fundingItems.updatedAt));

    const items: FundingItemLike[] = rows.map((r) => ({
      kind: (KINDS.includes(r.kind as FundingKind) ? r.kind : "other") as FundingKind,
      name: r.name,
      amountUsd: r.amountUsd,
      status: (STATUSES.includes(r.status as FundingStatus) ? r.status : "planned") as FundingStatus,
      covers: r.covers,
    }));

    const plan = buildFundingPlan({ annualCost, items, lines });

    // Scholarships that could close the gap — matched to the saved list.
    const saved = await db
      .select({ scholarshipId: savedScholarships.scholarshipId })
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    const savedIds = saved.map((s) => s.scholarshipId);
    const candidates = await db.select().from(scholarships).where(eq(scholarships.isActive, true));
    const activeCountry = countryParam ?? uni?.country ?? null;
    const globalCountry = /^(global|international|all|worldwide|multiple countries)$/i;
    const matched = candidates
      .filter((s) => savedIds.includes(s.id) || Boolean(activeCountry && countriesMatch(s.country, activeCountry)) || globalCountry.test((s.country ?? "").trim()))
      .map((s) => ({
        saved: savedIds.includes(s.id),
        id: s.id,
        title: s.title,
        provider: s.provider,
        country: s.country ?? null,
        amountUsdValue: resolveMultiCurrencyScholarshipAmount(s).amountUsd,
        tuitionCoverage: s.tuitionCoverage || "Not specified",
        deadlineDate: s.deadlineDate ? String(s.deadlineDate).slice(0, 10) : null,
      }))
      .filter((s): s is typeof s & { amountUsdValue: number } => s.amountUsdValue != null && s.amountUsdValue > 0)
      .sort((a, b) => b.amountUsdValue - a.amountUsdValue)
      .slice(0, 8);

    // A scholarship BIGGER than the gap is the best possible answer — the old
    // `<= gap` filter hid it (a $25k award vanishes when $15k is short).
    // Gap-closers first (cheapest sufficient), then the biggest partials,
    // the selected university's own country first inside each group.
    const gapCandidates = (
      list: typeof matched,
      gap: number | null,
      homeCountry: string | null,
    ): (typeof matched)[number][] => {
      if (gap == null || list.length === 0) return [];
      const home = (x: (typeof list)[number]) => Number(Boolean(homeCountry && x.country === homeCountry));
      const closers = list
        .filter((x) => x.amountUsdValue >= gap)
        .sort((a, b) => home(b) - home(a) || a.amountUsdValue - b.amountUsdValue);
      const partials = list
        .filter((x) => x.amountUsdValue < gap)
        .sort((a, b) => home(b) - home(a) || b.amountUsdValue - a.amountUsdValue);
      return [...closers, ...partials].slice(0, 5);
    };

    return NextResponse.json({
      costLines: lines.map(({ key, label }) => ({ key, label })),
      oneOffCosts,
      kindLabels: FUNDING_KIND_LABELS,
      application: app
        ? { id: app.id, universityId: app.universityId, universityName: app.universityName, programName: app.programName }
        : null,
      university: uni && !countryParam
        ? { id: uni.id, name: uni.name, country: uni.country, city: uni.city, sourceUrl: uni.sourceUrl, lastVerifiedAt: uni.lastVerifiedAt }
        : null,
      benchmarkSource: resolved.benchmarkSource,
      countries: Object.keys(COUNTRY_COST_BENCHMARKS),
      currencyRates: CURRENCY_RATES_TO_USD,
      displayCurrency,
      annualCost,
      estimatedLines,
      unknownLines,
      plan,
      items: rows.map((r) => ({ ...r, kindLabel: FUNDING_KIND_LABELS[(r.kind as FundingKind) in FUNDING_KIND_LABELS ? (r.kind as FundingKind) : "other"] })),
      gapActions: {
        gap: plan.fundingGap,
        scholarships: (() => {
          const gap = plan.fundingGap;
          return gapCandidates(matched, gap, uni && !countryParam ? (uni.country as string | null) : null).map((s) => ({
            ...s,
            coversGap: gap != null && s.amountUsdValue >= gap,
          }));
        })(),
        tab: "scholarships",
        cta: plan.fundingGap == null
          ? "Verify the missing cost lines before estimating a funding gap"
          : plan.fundingGap > 0
            ? `Find scholarships for your remaining $${plan.fundingGap.toLocaleString()}`
            : "Your funding already covers the cost",
      },
    });
  } catch (err) {
    return serverError("funding GET", err);
  }
}

/** POST — add a funding item (scholarship, aid, family budget, loan…). */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const name = text(b.value.name, 200);
  if (!name) return jsonError(400, "name is required", "bad_request");
  const amount = Number(b.value.amountUsd);
  if (!Number.isFinite(amount) || amount < 0) return jsonError(400, "amountUsd must be a positive number", "bad_request");
  try {
    const requestedApplicationId = b.value.applicationId;
    let linked: number | null = null;
    if (requestedApplicationId != null && requestedApplicationId !== "") {
      const applicationId = Number(requestedApplicationId);
      if (!Number.isInteger(applicationId) || applicationId <= 0) {
        return jsonError(400, "applicationId must be a positive integer", "bad_request");
      }
      const [own] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
        .limit(1);
      if (!own) return jsonError(404, "Application not found", "not_found");
      linked = own.id;
    }
    const covers = Array.isArray(b.value.covers) ? (b.value.covers as unknown[]).filter((x) => typeof x === "string") : [];
    const [row] = await db
      .insert(fundingItems)
      .values({
        profileId,
        applicationId: linked,
        kind: oneOf(b.value.kind, KINDS, "other"),
        name,
        amountUsd: Math.round(amount),
        covers: JSON.stringify(covers),
        status: oneOf(b.value.status, STATUSES, "planned"),
        notes: text(b.value.notes, 1000),
      })
      .returning();
    return NextResponse.json({ ok: true, item: row });
  } catch (err) {
    return serverError("funding POST", err);
  }
}

/** PATCH — update or confirm a funding item. */
export async function PATCH(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const id = Number(b.value.id);
  if (!Number.isInteger(id) || id <= 0) return jsonError(400, "id is required", "bad_request");
  try {
    const rawApplicationId = b.value.applicationId;
    let applicationScope = isNull(fundingItems.applicationId);
    if (rawApplicationId != null && rawApplicationId !== "") {
      const applicationId = Number(rawApplicationId);
      if (!Number.isInteger(applicationId) || applicationId <= 0) {
        return jsonError(400, "applicationId must be a positive integer", "bad_request");
      }
      const [own] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
        .limit(1);
      if (!own) return jsonError(404, "Application not found", "not_found");
      applicationScope = eq(fundingItems.applicationId, applicationId);
    }
    const [row] = await db
      .select()
      .from(fundingItems)
      .where(and(eq(fundingItems.id, id), eq(fundingItems.profileId, profileId), applicationScope))
      .limit(1);
    if (!row) return jsonError(404, "Funding item not found", "not_found");
    const status = b.value.status == null ? row.status : oneOf(b.value.status, STATUSES, row.status);
    await db
      .update(fundingItems)
      .set({
        kind: b.value.kind == null ? row.kind : oneOf(b.value.kind, KINDS, row.kind),
        name: b.value.name === undefined ? row.name : text(b.value.name, 200) ?? row.name,
        amountUsd: b.value.amountUsd === undefined ? row.amountUsd : Math.max(0, Math.round(Number(b.value.amountUsd) || 0)),
        covers: b.value.covers === undefined ? row.covers : JSON.stringify(Array.isArray(b.value.covers) ? b.value.covers : []),
        status,
        confirmedAt: status === "confirmed" ? new Date().toISOString().slice(0, 10) : row.confirmedAt,
        notes: b.value.notes === undefined ? row.notes : text(b.value.notes, 1000),
        updatedAt: new Date(),
      })
      .where(and(eq(fundingItems.id, id), eq(fundingItems.profileId, profileId), applicationScope));
    return NextResponse.json({ ok: true, id, status });
  } catch (err) {
    return serverError("funding PATCH", err);
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"), { write: true });
  if (!g.ok) return g.response;
  const id = idParam(req);
  if (!id) return jsonError(400, "id is required", "bad_request");
  try {
    const rawApplicationId = searchParams.get("applicationId");
    let applicationScope = isNull(fundingItems.applicationId);
    if (rawApplicationId != null && rawApplicationId !== "") {
      const applicationId = Number(rawApplicationId);
      if (!Number.isInteger(applicationId) || applicationId <= 0) {
        return jsonError(400, "applicationId must be a positive integer", "bad_request");
      }
      const [own] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.profileId, g.value.profileId)))
        .limit(1);
      if (!own) return jsonError(404, "Application not found", "not_found");
      applicationScope = eq(fundingItems.applicationId, applicationId);
    }
    const deleted = await db
      .delete(fundingItems)
      .where(and(eq(fundingItems.id, id), eq(fundingItems.profileId, g.value.profileId), applicationScope))
      .returning({ id: fundingItems.id });
    if (!deleted.length) return jsonError(404, "Funding item not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("funding DELETE", err);
  }
}
