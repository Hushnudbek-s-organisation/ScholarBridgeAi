import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { countByType, rankOpportunities } from "@/lib/opportunities";
import { localeFromRequest } from "@/lib/engineText";
import { localizeOpportunityRow } from "@/lib/catalogLocalizer";
import { rankSemanticTexts } from "@/lib/ai/semanticSearch";
import { runMercuryDecision } from "@/lib/ai/decide";
import { getCachedOpportunitiesBundle } from "@/lib/catalogCache";

export const dynamic = "force-dynamic";

/**
 * #26/#27/#28 — Personalized opportunities feed.
 *
 * GET /api/opportunities?type=competition&sort=match
 *
 * Public catalog. When the caller is signed in, each entry is scored for
 * their profile (field / country / level / deadline); anonymous callers get
 * the catalog with match = null. Counts by type power the "NEW FOR YOU" row.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type")?.trim();
    const search = (url.searchParams.get("search") ?? url.searchParams.get("q") ?? "").trim();
    const focusId = Number(url.searchParams.get("focusId") ?? url.searchParams.get("opportunityId"));
    const sort = url.searchParams.get("sort")?.trim() || "match";

    // Reuse the existing per-process catalogue cache: only the first cold read
    // (or the 60-second refresh) queries the full curated feed. Filter the
    // ordered snapshot locally so SQL sort order and the response contract stay stable.
    const { entries } = await getCachedOpportunitiesBundle();
    const rows = type ? entries.filter((row) => row.type === type) : [...entries];

    // Optional profile scoring — the session decides, never a claimed id.
    // Anonymous callers get the plain catalog (match: null).
    let profile: { major: string | null; country: string | null; degreeLevel: string | null } | null = null;
    const auth = await authenticate(req);
    if (auth.ok) {
      const pRows = await db
        .select({ targetMajor: studentProfiles.targetMajor, country: studentProfiles.country, degreeLevel: studentProfiles.degreeLevel })
        .from(studentProfiles)
        .where(eq(studentProfiles.id, auth.session.profile.id))
        .limit(1);
      if (pRows[0]) {
        // The matcher speaks "major" — the schema column is targetMajor.
        profile = { major: pRows[0].targetMajor, country: pRows[0].country, degreeLevel: pRows[0].degreeLevel };
      }
    }

    const now = new Date();
    const items = rows.map((r) => {
      const opp = {
        id: r.id,
        type: r.type,
        title: r.title,
        provider: r.provider,
        country: r.country,
        fields: r.fields,
        level: r.level,
        deadlineDate: r.deadlineDate || null,
        url: r.url,
        isVerified: r.isVerified,
      };
      const scored = profile ? rankOpportunities([opp], profile, now)[0] : null;
      return {
        ...opp,
        match: scored ? scored.match : null,
        reasons: scored ? scored.reasons : [],
        flags: scored ? scored.flags : [],
      };
    });

    if (sort === "deadline") {
      items.sort((a, b) => (a.deadlineDate ?? "9999").localeCompare(b.deadlineDate ?? "9999") || a.title.localeCompare(b.title));
    } else {
      items.sort((a, b) => (b.match ?? 0) - (a.match ?? 0) || a.title.localeCompare(b.title));
    }

    // Multilingual semantic order is a small best-effort boost on the
    // deterministic relevance/deadline order; provider failure is a no-op.
    if (search && items.length > 1 && sort !== "deadline") {
      try {
        const candidates = items.slice(0, 63).map((item) => [item.title, item.provider, item.country, item.fields, item.level, item.type].filter(Boolean).join(". "));
        const ranked = await rankSemanticTexts(search, candidates, { timeoutMs: 3_500, limit: candidates.length });
        const semanticPosition = new Map(ranked.flatMap((entry, position) => {
          const item = items[entry.index];
          return item ? [[item.id, position] as const] : [];
        }));
        const baselinePosition = new Map(items.map((item, position) => [item.id, position]));
        const denominator = Math.max(1, items.length - 1);
        items.sort((a, b) => {
          const baseA = (baselinePosition.get(a.id) ?? denominator) / denominator;
          const baseB = (baselinePosition.get(b.id) ?? denominator) / denominator;
          const semA = (semanticPosition.get(a.id) ?? denominator) / denominator;
          const semB = (semanticPosition.get(b.id) ?? denominator) / denominator;
          return baseA * 0.7 + semA * 0.3 - (baseB * 0.7 + semB * 0.3);
        });
      } catch {
        // Keep deterministic matches and order when OpenRouter is unavailable.
      }
    }

    // Optional Mercury check only for a signed-in user and one explicitly
    // focused catalogue item. It is advisory and never changes eligibility.
    let mercuryEligibilityReview: { available: boolean; probabilityPercent: number | null; model: string } | null = null;
    if (Number.isSafeInteger(focusId) && focusId > 0 && profile) {
      const focus = items.find((item) => item.id === focusId);
      if (focus) {
        const review = await runMercuryDecision({
          timeoutMs: 3_500,
          state: JSON.stringify({
            applicant: { major: profile.major, country: profile.country, degreeLevel: profile.degreeLevel },
            publishedOpportunity: { title: focus.title, provider: focus.provider, country: focus.country, fields: focus.fields, level: focus.level, type: focus.type, verified: focus.isVerified },
          }),
          questions: [{
            key: "explicitEligibilityAlignment",
            type: "yes_no",
            question: "Based only on the listed applicant facts and published opportunity fields, is the applicant explicitly eligible? Treat missing or ambiguous criteria as unknown, never as eligible by assumption. This is advisory only.",
          }],
        });
        const signal = review.signals.explicitEligibilityAlignment;
        mercuryEligibilityReview = { available: review.available, probabilityPercent: signal?.probabilityPercent ?? null, model: review.model };
      }
    }

    // Localize seeded display content AFTER scoring/sorting — matching and
    // ranking above ran on canonical English rows.
    const locale = localeFromRequest(req);
    return NextResponse.json({
      count: items.length,
      counts: countByType(rows),
      items: items.map((item) => localizeOpportunityRow(item, locale)),
      scoredFor: profile ? profile.major ?? "your profile" : null,
      ...(mercuryEligibilityReview ? { mercuryEligibilityReview } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Failed to load opportunities" }, { status: 500 });
  }
}
