import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, fundingItems, savedScholarships, scholarships, studentProfiles, universities } from "@/db/schema";
import { guardStudent, idParam, jsonError, oneOf, readBody, serverError, text } from "@/lib/journey/api";
import { buildFundingPlan, COST_LINES, FUNDING_KIND_LABELS, type FundingItemLike, type FundingKind, type FundingStatus } from "@/lib/journey/funding";
import { calculateCosts } from "@/lib/costs";

export const dynamic = "force-dynamic";

const KINDS = ["scholarship", "aid", "family", "savings", "loan", "other"] as const;
const STATUSES = ["planned", "applied", "awarded", "confirmed", "declined"] as const;

/**
 * GET /api/funding?profileId=[&applicationId=]
 *
 * My Funding Plan (spec §9): full yearly cost (tuition, accommodation, food,
 * insurance, visa, flight, books, transport, other), scholarships, aid, family
 * budget and the REMAINING GAP — with the next action attached to that gap.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const g = await guardStudent(req, searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const applicationId = Number(searchParams.get("applicationId"));
  try {
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);

    let app: typeof applications.$inferSelect | undefined;
    if (Number.isInteger(applicationId) && applicationId > 0) {
      [app] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
        .limit(1);
    } else {
      [app] = await db
        .select()
        .from(applications)
        .where(eq(applications.profileId, profileId))
        .orderBy(desc(applications.updatedAt))
        .limit(1);
    }

    const uni = app?.universityId
      ? (await db.select().from(universities).where(eq(universities.id, app.universityId)).limit(1))[0]
      : null;

    // Cost lines: published university data + the extras the spec lists.
    const costs = calculateCosts({
      annualTuitionUsd: num(uni?.annualTuition ?? uni?.annualTuitionUsd),
      annualLivingEstUsd: num(uni?.annualLivingEst ?? uni?.annualLivingEstUsd),
      accommodationCostUsd: num(uni?.accommodationCost ?? uni?.accommodationCostUsd),
      applicationFeeUsd: num(uni?.applicationFee),
      country: uni?.country ?? profile?.country ?? null,
      city: uni?.city ?? null,
      years: 1,
      flightsPerYearUsd: 1400,
      insurancePerYearUsd: 1200,
      booksPerYearUsd: 900,
      visaFeeUsd: 500,
      familyContributionUsd: profile?.familyIncomeUsd ?? null,
    });

    const lines = [
      { key: "tuition", label: "Tuition", cost: costs.lines.find((l) => l.key === "tuition")?.annualUsd ?? 0 },
      { key: "accommodation", label: "Accommodation", cost: costs.lines.find((l) => l.key === "accommodation")?.annualUsd ?? 0 },
      { key: "food", label: "Food", cost: costs.lines.find((l) => l.key === "food")?.annualUsd ?? 0 },
      { key: "insurance", label: "Insurance", cost: costs.lines.find((l) => l.key === "insurance")?.annualUsd ?? 0 },
      { key: "visa", label: "Visa", cost: costs.lines.find((l) => l.key === "visa")?.annualUsd ?? 0 },
      { key: "flight", label: "Flight", cost: costs.lines.find((l) => l.key === "flight")?.annualUsd ?? 0 },
      { key: "books", label: "Books", cost: costs.lines.find((l) => l.key === "books")?.annualUsd ?? 0 },
      { key: "transport", label: "Transport", cost: costs.lines.find((l) => l.key === "transport")?.annualUsd ?? 0 },
      { key: "other", label: "Other", cost: costs.lines.find((l) => l.key === "other")?.annualUsd ?? 0 },
    ];

    const rows = await db
      .select()
      .from(fundingItems)
      .where(and(eq(fundingItems.profileId, profileId), app ? eq(fundingItems.applicationId, app.id) : eq(fundingItems.profileId, profileId)))
      .orderBy(desc(fundingItems.updatedAt));

    const items: FundingItemLike[] = rows.map((r) => ({
      kind: (KINDS.includes(r.kind as FundingKind) ? r.kind : "other") as FundingKind,
      name: r.name,
      amountUsd: r.amountUsd,
      status: (STATUSES.includes(r.status as FundingStatus) ? r.status : "planned") as FundingStatus,
      covers: r.covers,
    }));

    const plan = buildFundingPlan({ annualCost: costs.annualTotalUsd, items, lines });

    // Scholarships that could close the gap — matched to the saved list.
    const saved = await db
      .select({ scholarshipId: savedScholarships.scholarshipId })
      .from(savedScholarships)
      .where(eq(savedScholarships.profileId, profileId));
    const savedIds = saved.map((s) => s.scholarshipId);
    const candidates = savedIds.length
      ? await db.select().from(scholarships).where(eq(scholarships.isActive, true)).limit(200)
      : [];
    const matched = candidates
      .filter((s) => savedIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        title: s.title,
        provider: s.provider,
        amountUsdValue: s.amountUsdValue,
        tuitionCoverage: s.tuitionCoverage || "Not specified",
        deadlineDate: s.deadlineDate ? String(s.deadlineDate).slice(0, 10) : null,
      }))
      .filter((s): s is typeof s & { amountUsdValue: number } => s.amountUsdValue != null && s.amountUsdValue > 0)
      .sort((a, b) => b.amountUsdValue - a.amountUsdValue)
      .slice(0, 8);

    return NextResponse.json({
      costLines: COST_LINES,
      kindLabels: FUNDING_KIND_LABELS,
      application: app
        ? { id: app.id, universityId: app.universityId, universityName: app.universityName, programName: app.programName }
        : null,
      university: uni ? { id: uni.id, name: uni.name, country: uni.country, city: uni.city, sourceUrl: uni.sourceUrl, lastVerifiedAt: uni.lastVerifiedAt } : null,
      annualCost: costs.annualTotalUsd,
      /** Which numbers are published and which are our estimates. */
      estimatedLines: costs.lines.filter((l) => l.estimated).map((l) => l.label),
      plan,
      items: rows.map((r) => ({ ...r, kindLabel: FUNDING_KIND_LABELS[(r.kind as FundingKind) in FUNDING_KIND_LABELS ? (r.kind as FundingKind) : "other"] })),
      // "Find scholarships for remaining gap" — the CTA the spec asks for.
      gapActions: {
        gap: plan.fundingGap,
        scholarships: matched.filter((s) => s.amountUsdValue <= plan.fundingGap || plan.fundingGap === 0).slice(0, 5),
        tab: "scholarships",
        cta: plan.fundingGap > 0 ? `Find scholarships for your remaining $${plan.fundingGap.toLocaleString()}` : "Your funding already covers the cost",
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
    const applicationId = Number(b.value.applicationId);
    let linked: number | null = null;
    if (Number.isInteger(applicationId) && applicationId > 0) {
      const [own] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.profileId, profileId)))
        .limit(1);
      linked = own?.id ?? null;
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
    const [row] = await db
      .select()
      .from(fundingItems)
      .where(and(eq(fundingItems.id, id), eq(fundingItems.profileId, profileId)))
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
      .where(eq(fundingItems.id, id));
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
    const deleted = await db
      .delete(fundingItems)
      .where(and(eq(fundingItems.id, id), eq(fundingItems.profileId, g.value.profileId)))
      .returning({ id: fundingItems.id });
    if (!deleted.length) return jsonError(404, "Funding item not found", "not_found");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    return serverError("funding DELETE", err);
  }
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
