import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles } from "@/db/schema";
import { authenticate } from "@/lib/auth";
import { countByType, mergeOpportunitySearchOrder, rankOpportunities } from "@/lib/opportunities";
import { localeFromRequest } from "@/lib/engineText";
import { expandMultilingualSearchTerms, localizeOpportunityRow } from "@/lib/catalogLocalizer";
import { rankSemanticTexts } from "@/lib/ai/semanticSearch";
import { isUsefulSemanticQuery } from "@/lib/ai/semanticQuery";
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
    const type = url.searchParams.get("type")?.trim() || "";
    const rawSearch = url.searchParams.get("search") ?? url.searchParams.get("q") ?? "";
    if (rawSearch.length > 200) return NextResponse.json({ error: "search must be at most 200 characters" }, { status: 400 });
    if (type && !["competition", "research", "internship", "summer_school"].includes(type)) {
      return NextResponse.json({ error: "type is not supported" }, { status: 400 });
    }
    const search = rawSearch.trim();
    const focusRaw = url.searchParams.get("focusId") ?? url.searchParams.get("opportunityId");
    const focusId = focusRaw && /^\d{1,12}$/.test(focusRaw) ? Number(focusRaw) : Number.NaN;
    const sort = url.searchParams.get("sort") === "deadline" ? "deadline" : "match";

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
    let items = rows.map((r) => {
      const opp = {
        id: r.id,
        type: r.type,
        title: r.title,
        provider: r.provider,
        country: r.country,
        fields: r.fields,
        description: r.description,
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

    // Search is lexical-first and always works without a model. The explicit
    // type filter and owner-authorized profile selection above are applied
    // before a bounded semantic candidate set is formed.
    if (search) {
      const terms = expandMultilingualSearchTerms(search).map((term) => term.toLocaleLowerCase());
      const lexicalIds = new Set(items.filter((item) => {
        const haystack = [item.title, item.provider, item.country, item.fields, item.level, item.type, item.description]
          .filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase();
        return terms.some((term) => term && haystack.includes(term));
      }).map((item) => item.id));
      const searchUniverse = items;
      const lexicalItems = searchUniverse.filter((item) => lexicalIds.has(item.id));
      items = lexicalItems;

      if (sort !== "deadline" && search.trim().length >= 4 && isUsefulSemanticQuery(search) && searchUniverse.length > 1) {
        try {
          // Favor lexical hits in the batch, then fill from the profile-ranked
          // and type-filtered catalogue. One query + at most 63 records.
          const candidateUniverse = [
            ...searchUniverse.filter((item) => lexicalIds.has(item.id)),
            ...searchUniverse.filter((item) => !lexicalIds.has(item.id)),
          ].slice(0, 63);
          const semanticCandidates = candidateUniverse.map((item) => [item.title, item.provider, item.country, item.fields, item.level, item.type, item.description].filter(Boolean).join(". "));
          const ranked = await rankSemanticTexts(search, semanticCandidates, { timeoutMs: 3_500, limit: 10 });
          const semanticRows = ranked.flatMap((entry) => {
            const item = candidateUniverse[entry.index];
            return item ? [{ id: item.id, similarity: entry.similarity }] : [];
          });
          const merged = mergeOpportunitySearchOrder(searchUniverse, lexicalIds, semanticRows, 10);
          if (merged.length) items = merged;
        } catch {
          // Keep only lexical matches in their deterministic profile order.
        }
      }
    }

    if (sort === "deadline") {
      items.sort((a, b) => (a.deadlineDate ?? "9999").localeCompare(b.deadlineDate ?? "9999") || a.title.localeCompare(b.title));
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
