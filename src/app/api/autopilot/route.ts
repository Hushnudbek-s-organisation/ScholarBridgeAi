import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedScholarships, scholarshipDecisions, scholarships, studentProfiles } from "@/db/schema";
import { calculateScholarshipMatch } from "@/lib/matching";
import { localeFromRequest, translateReasons } from "@/lib/engineText";
import { withStatus } from "@/lib/scholarshipStatus";
import { guardStudent, jsonError, oneOf, readBody, serverError } from "@/lib/growth/api";
import {
  autopilotPriority,
  autopilotTags,
  similarScholarships,
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
    const [rows, decisions, saved] = await Promise.all([
      db.select().from(scholarships),
      db.select().from(scholarshipDecisions).where(eq(scholarshipDecisions.profileId, profileId)),
      db.select({ scholarshipId: savedScholarships.scholarshipId }).from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
    ]);
    const now = new Date();
    const decisionById = new Map(decisions.map((d) => [d.scholarshipId, d.status]));
    const savedIds = new Set(saved.map((s) => s.scholarshipId));

    const all = rows.map((s) => {
      const m = calculateScholarshipMatch(profile, s);
      const st = withStatus(s);
      const item: AutopilotScholarship = {
        id: s.id,
        title: s.title,
        provider: s.provider,
        country: s.country,
        coverageType: s.coverageType,
        amountUsdValue: s.amountUsdValue,
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
        statusLabel: st.statusLabel,
        isEligible: m.isEligible,
        reasons: translateReasons(locale, "scholarship", m.reasonDetails, m.reasons).slice(0, 3),
        issues: translateReasons(locale, "scholarship", m.issueDetails, m.potentialIssues).slice(0, 2),
        tags: autopilotTags(item, now),
        priority: autopilotPriority(item, now),
        decision: decisionById.get(s.id) ?? null,
        saved: savedIds.has(s.id),
      };
    });

    const queue = all
      .filter((s) => !s.decision && (!s.tags.closed || s.tags.reopens) && s.isEligible !== false)
      .sort((a, b) => b.priority - a.priority);
    const applied = all.filter((s) => s.decision === "applied");
    const hidden = all.filter((s) => s.decision === "hidden");
    const decided = new Set(all.filter((s) => s.decision).map((s) => s.id));
    const similar = similarScholarships(applied, queue, decided, 4).map((x) => ({
      id: x.scholarship.id,
      basedOn: x.basedOn,
      similarity: x.similarity,
    }));

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
          potentialUsd: applied.reduce((sum, s) => sum + (s.amountUsdValue ?? 0), 0),
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
