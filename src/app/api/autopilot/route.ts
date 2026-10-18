import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { savedScholarships, savedUniversities, scholarshipDecisions, scholarships, studentProfiles, universities } from "@/db/schema";
import { calculateScholarshipMatch } from "@/lib/matching";
import { toMatchProfileWithActivities } from "@/lib/profileMapping";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { withStatus } from "@/lib/scholarshipStatus";
import { resolvedUsdScholarshipAmount, resolvedUsdUniversityCosts } from "@/lib/usdCosts";
import { coverageTier, evaluateScholarshipForSavedUnis } from "@/lib/savedUniCoverage";
import { guardStudent, jsonError, oneOf, readBody, serverError } from "@/lib/growth/api";
import {
  localizeCountry,
  localizeScholarshipProvider,
  localizeScholarshipTitle,
  localizeStatusValue,
} from "@/lib/catalogLocalizer";
import {
  autopilotPriority,
  autopilotTags,
  commonScholarshipAwardPeriod,
  similarScholarships,
  totalComparableAwardValue,
  type AutopilotScholarship,
} from "@/lib/growth/logic";

export const dynamic = "force-dynamic";

/**
 * Scholarship autopilot (idea from ScholarshipOwl, adapted):
 * instead of browsing a long list, the student works through ONE queue of
 * matched scholarships, best + most urgent first, and decides each one:
 * "Save", "I applied" or "Not for me". Hidden ones disappear, applied ones
 * move to a tracker and power "similar to what you applied to" suggestions.
 *
 * We never apply on the student's behalf — every scholarship has its own
 * official form. The reusable answers in the Answer Vault make that fast.
 */
export async function GET(req: Request) {
  const g = await guardStudent(req, new URL(req.url).searchParams.get("profileId"));
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const locale = localeFromRequest(req);
  try {
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)).limit(1);
    if (!profile) return jsonError(404, "Profile not found", "not_found");
    const [rows, decisions, saved, savedUniversityRows] = await Promise.all([
      db.select().from(scholarships).where(eq(scholarships.isActive, true)),
      db.select().from(scholarshipDecisions).where(eq(scholarshipDecisions.profileId, profileId)),
      db.select({ scholarshipId: savedScholarships.scholarshipId }).from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
      db.select({ universityId: savedUniversities.universityId }).from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
    ]);
    const savedUniIds = [...new Set(savedUniversityRows.map((u) => u.universityId))];
    const savedUniRows = savedUniIds.length
      ? await db.select().from(universities).where(inArray(universities.id, savedUniIds))
      : [];
    const savedUniRefs = savedUniRows.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      annualTuitionUsd: resolvedUsdUniversityCosts(u).annualTuitionUsd,
    }));
    const matchProfile = await toMatchProfileWithActivities(profile);
    const now = new Date();
    const decisionById = new Map(decisions.map((d) => [d.scholarshipId, d.status]));
    const savedIds = new Set(saved.map((s) => s.scholarshipId));

    const all = rows.map((s) => {
      const m = calculateScholarshipMatch(matchProfile, s);
      const st = withStatus(s);
      const cov = evaluateScholarshipForSavedUnis({ ...s, amountUsdValue: resolvedUsdScholarshipAmount(s) }, savedUniRefs);
      const item: AutopilotScholarship = {
        id: s.id,
        // Catalogue text arrives in the student's language (en = source).
        title: localizeScholarshipTitle(s.title, locale),
        provider: localizeScholarshipProvider(s.provider, locale),
        country: localizeCountry(s.country, locale),
        coverageType: s.coverageType,
        amountUsdValue: resolvedUsdScholarshipAmount(s),
        awardPeriod: s.awardPeriod,
        deadlineDate: s.deadlineDate || null,
        degreeLevels: s.degreeLevels,
        eligibleMajors: s.eligibleMajors,
        requirements: s.requirements,
        requiredDocuments: s.requiredDocuments,
        recurrence: s.recurrence,
        computedStatus: st.computedStatus,
        matchScore: m.matchScore,
      };
      return {
        ...item,
        websiteUrl: s.applicationUrl || s.websiteUrl,
        statusLabel: localizeStatusValue(st.statusLabel, locale),
        isEligible: m.isEligible,
        reasons: translateReasons(locale, "scholarship", m.reasonDetails, m.reasons).slice(0, 3),
        issues: translateReasons(locale, "scholarship", m.issueDetails, m.potentialIssues).slice(0, 2),
        tags: autopilotTags(item, now),
        priority: autopilotPriority(item, now),
        decision: decisionById.get(s.id) ?? null,
        saved: savedIds.has(s.id),
        coveredUniversities: cov.coveredUniNames,
        coversSavedUni: cov.coversSavedUni,
        isFullForSavedUni: cov.isFullForSavedUni,
        coverageTier: coverageTier(cov),
      };
    });

    const queue = all
      .filter((s) => !s.decision && (!s.tags.closed || s.tags.reopens) && s.isEligible !== false)
      .sort((a, b) => (b.coverageTier ?? 0) - (a.coverageTier ?? 0) || b.priority - a.priority);
    const applied = all.filter((s) => s.decision === "applied");
    const hidden = all.filter((s) => s.decision === "hidden");
    const decided = new Set(all.filter((s) => s.decision).map((s) => s.id));
    const similar = similarScholarships(applied, queue, decided, 4).map((x) => ({
      id: x.scholarship.id,
      basedOn: x.basedOn,
      similarity: x.similarity,
    }));

    const potentialUsd = totalComparableAwardValue(applied);
    const potentialPeriod = commonScholarshipAwardPeriod(applied);

    return NextResponse.json(
      {
        queue,
        applied,
        hidden,
        similar,
        stats: {
          matches: queue.length,
          applied: applied.length,
          hidden: hidden.length,
          closingSoon: queue.filter((s) => s.tags.closingSoon).length,
          reopening: queue.filter((s) => s.tags.reopens).length,
          potentialUsd,
          potentialPeriod,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return serverError("autopilot GET", err);
  }
}

/** POST { profileId, scholarshipId, action: "applied" | "hidden" | "reset" } */
export async function POST(req: Request) {
  const b = await readBody(req);
  if (!b.ok) return b.response;
  const g = await guardStudent(req, b.value.profileId, { write: true });
  if (!g.ok) return g.response;
  const { profileId } = g.value;
  const scholarshipId = Number(b.value.scholarshipId);
  if (!Number.isInteger(scholarshipId) || scholarshipId <= 0) return jsonError(400, "scholarshipId is required", "bad_request");
  const action = oneOf(b.value.action, ["applied", "hidden", "reset"] as const, "reset");
  try {
    const [exists] = await db.select({ id: scholarships.id }).from(scholarships).where(eq(scholarships.id, scholarshipId)).limit(1);
    if (!exists) return jsonError(404, "Scholarship not found", "not_found");
    if (action === "applied") {
      await db.insert(savedScholarships).values({ profileId, scholarshipId }).onConflictDoNothing();
    }
    if (action === "reset") {
      await db
        .delete(scholarshipDecisions)
        .where(and(eq(scholarshipDecisions.profileId, profileId), eq(scholarshipDecisions.scholarshipId, scholarshipId)));
    } else {
      await db
        .insert(scholarshipDecisions)
        .values({ profileId, scholarshipId, status: action })
        .onConflictDoUpdate({
          target: [scholarshipDecisions.profileId, scholarshipDecisions.scholarshipId],
          set: { status: action, createdAt: new Date() },
        });
    }
    return NextResponse.json({ ok: true, scholarshipId, decision: action === "reset" ? null : action });
  } catch (err) {
    return serverError("autopilot POST", err);
  }
}
