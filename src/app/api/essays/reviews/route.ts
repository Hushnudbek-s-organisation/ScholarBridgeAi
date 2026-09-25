import { NextResponse } from "next/server";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { essayReviews, essayVersions } from "@/db/schema";
import { requireProfileAccess, requireRowAccess } from "@/lib/auth";
import { aggregateReviews, clampScore } from "@/lib/essayReviews";

/**
 * #24 — Essay peer review.
 *
 * GET  /api/essays/reviews?essayVersionId=5      → the AUTHOR's view: reviews + averages
 * GET  /api/essays/reviews?open=1                → essays any student may review
 * POST /api/essays/reviews { essayVersionId, hook, structure, specificity, language, fit, total, comment }
 *
 * Rules: a version is reviewable only because its author flipped
 * `open_for_review` on; the author can never review their own essay;
 * reviewers see the essay content (the author chose to open it) but are
 * shown only as "Student #<id tail>" — no names leak.
 */

const MAX_COMMENT = 2000;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    // Always the caller's own session — no claimed id, no cross-profile reads.
    const access = await requireProfileAccess(req, undefined);
    if (!access.ok) {
      return NextResponse.json({ error: access.error, code: access.code }, { status: access.status });
    }
    const me = access.session.profile.id;

    // ---- reviewer side: open essays -------------------------------------
    if (url.searchParams.get("open") === "1") {
      const rows = await db
        .select({
          id: essayVersions.id,
          title: essayVersions.title,
          essayType: essayVersions.essayType,
          wordCount: essayVersions.wordCount,
          content: essayVersions.content,
          versionNumber: essayVersions.versionNumber,
          rubricTotal: essayVersions.rubricTotal,
          authorId: essayVersions.profileId,
        })
        .from(essayVersions)
        .where(eq(essayVersions.openForReview, true))
        .orderBy(desc(essayVersions.id))
        .limit(50);
      const reviewCounts = await db
        .select({ essayVersionId: essayReviews.essayVersionId, n: count() })
        .from(essayReviews)
        .groupBy(essayReviews.essayVersionId);
      const counts = new Map(reviewCounts.map((r) => [r.essayVersionId, r.n]));
      return NextResponse.json({
        items: rows.map((r) => ({
          id: r.id,
          title: r.title,
          essayType: r.essayType,
          wordCount: r.wordCount,
          content: r.content,
          versionNumber: r.versionNumber,
          rubricTotal: r.rubricTotal,
          // anonymized on purpose
          author: `Student #${String(r.authorId).slice(-3)}`,
          reviewCount: counts.get(r.id) ?? 0,
        })),
      });
    }

    // ---- author side: reviews of one of my versions ----------------------
    const versionId = Number(url.searchParams.get("essayVersionId"));
    if (!Number.isInteger(versionId) || versionId <= 0) {
      return NextResponse.json({ error: "essayVersionId is required" }, { status: 400 });
    }
    const versions = await db
      .select()
      .from(essayVersions)
      .where(and(eq(essayVersions.id, versionId), eq(essayVersions.profileId, me)))
      .limit(1);
    if (!versions.length) return NextResponse.json({ error: "Essay version not found" }, { status: 404 });

    const rows = await db.select().from(essayReviews).where(eq(essayReviews.essayVersionId, versionId)).orderBy(asc(essayReviews.id));
    // Anonymity by design: reviewers are shown only as "Student #<id tail>".
    return NextResponse.json({
      essayVersionId: versionId,
      openForReview: versions[0].openForReview,
      reviews: rows.map((r) => ({
        id: r.id,
        reviewer: `Student #${String(r.reviewerProfileId).slice(-3)}`,
        hook: r.hook,
        structure: r.structure,
        specificity: r.specificity,
        language: r.language,
        fit: r.fit,
        total: r.total,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      aggregate: aggregateReviews(rows),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const profile = await requireProfileAccess(req, undefined);
    if (!profile.ok) {
      return NextResponse.json({ error: profile.error, code: profile.code }, { status: profile.status });
    }
    const me = profile.session.profile.id;

    let body: Record<string, any>;
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const versionId = Number(body.essayVersionId);
    if (!Number.isInteger(versionId) || versionId <= 0) {
      return NextResponse.json({ error: "essayVersionId is required" }, { status: 400 });
    }

    const versions = await db.select().from(essayVersions).where(eq(essayVersions.id, versionId)).limit(1);
    const version = versions[0];
    if (!version) return NextResponse.json({ error: "Essay version not found" }, { status: 404 });
    if (version.profileId === me) {
      return NextResponse.json({ error: "You cannot review your own essay" }, { status: 403 });
    }
    if (!version.openForReview) {
      return NextResponse.json({ error: "This essay is not open for review" }, { status: 403 });
    }

    const scores = {
      hook: clampScore(body.hook),
      structure: clampScore(body.structure),
      specificity: clampScore(body.specificity),
      language: clampScore(body.language),
      fit: clampScore(body.fit),
      total: clampScore(body.total),
    };
    const hasAnyScore = Object.values(scores).some((v) => v != null);
    if (!hasAnyScore && !String(body.comment ?? "").trim()) {
      return NextResponse.json({ error: "Provide at least one score or a comment" }, { status: 400 });
    }

    const [review] = await db
      .insert(essayReviews)
      .values({
        essayVersionId: versionId,
        authorProfileId: version.profileId,
        reviewerProfileId: me,
        ...scores,
        comment: String(body.comment ?? "").slice(0, MAX_COMMENT),
      })
      .returning();

    return NextResponse.json({ id: review.id });
  } catch {
    return NextResponse.json({ error: "Failed to save the review" }, { status: 500 });
  }
}
