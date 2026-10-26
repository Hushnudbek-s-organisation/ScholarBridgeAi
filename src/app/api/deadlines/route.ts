import { NextResponse } from "next/server";
import { requireProfileAccess } from "@/lib/auth";
import { db } from "@/db";
import {
  universities,
  scholarships,
  savedUniversities,
  savedScholarships,
  applicationTasks,
  applications,
  applicationCycles,
  studentProfiles,
  testBookings,
  testPlans,
} from "@/db/schema";
import { and, asc, eq, gte, inArray } from "drizzle-orm";
import { computeScholarshipStatus, statusLabel } from "@/lib/scholarshipStatus";
import { daysUntil } from "@/lib/nextActions";
import { parseListColumn } from "@/lib/chancing";
import { countriesMatch } from "@/lib/countries";
import { supportsDegreeLevel } from "@/lib/degreeLevels";
import { resolvedUsdUniversityCosts, resolvedUsdScholarshipAmount } from "@/lib/usdCosts";
import {
  chancingProfileWithActivities,
  toMatchProfileWithActivities,
  toUniversityData,
} from "@/lib/profileMapping";
import { calculateUniversityMatch } from "@/lib/matching";
import { evaluateUniversityAndProgramChance } from "@/lib/programChancing";
import { matchQsUniversityBenchmark } from "@/lib/qsTop200Benchmarks";
import { localeFromRequest } from "@/lib/engineText";
import {
  localizeCountry,
  localizeMajorOrField,
  localizeScholarshipProvider,
  localizeScholarshipTitle,
} from "@/lib/catalogLocalizer";
import {
  coverageTier,
  evaluateScholarshipForSavedUnis,
  type SavedUniCoverage,
  type SavedUniRef,
} from "@/lib/savedUniCoverage";

/**
 * Unified deadline center (spec §21 + user request #10). Merges:
 *  - application deadlines (applications table); saved universities with no deadline on file
 *  - scholarship deadlines (with computed status)
 *  - test dates (IELTS / SAT / TOEFL / Duolingo / GRE)
 *  - user-created milestones (applicationTasks)
 * Each item carries date, type, source, status, days remaining and an urgency
 * bucket (🔴 critical ≤14d, 🟠 soon ≤45d, 🟡 planned) so the calendar can be
 * read at a glance.
 *
 * Module 3 — the feed is the STUDENT'S timeline, not the catalogue:
 *  • scholarships appear only when the student saved them; a student with
 *    fewer than three saved awards gets at most three full-coverage
 *    recommendations that apply to their saved universities (flagged
 *    `recommended: true`) — the previous behaviour dumped every active
 *    catalogue scholarship (60+) onto every student's plan;
 *  • saved universities resolve a REAL date (own application row → next
 *    verified cycle → published deadline) and carry the dual scores
 *    (`chanceScore` from the positioning engine, `matchScore` from the fit
 *    engine), so the backwards planner can order by what the student can
 *    still act on;
 *  • up to four HIGH-CHANCE catalogue universities (chance ≥ 60, sorted by
 *    chance, never by fit or rank) join as suggestions.
 */

/** Urgency bucket from days remaining — the user asked for 🔴🟠🟡. */
function urgencyFor(daysRemaining: number | null): "critical" | "soon" | "planned" | "past" | "undated" {
  if (daysRemaining === null) return "undated";
  if (daysRemaining < 0) return "past";
  if (daysRemaining <= 14) return "critical";
  if (daysRemaining <= 45) return "soon";
  return "planned";
}
/**
 * Status line for a saved university: a future cycle date on file makes the
 * row OPEN; nothing on file stays honestly "NO DEADLINE ON FILE" — we never
 * fabricate an OPEN for a blank, and never invent a date.
 */
function savedUniStatusLabel(upcoming: string | null): string {
  return upcoming ? "OPEN" : "NO DEADLINE ON FILE";
}

/**
 * Strict `YYYY-MM-DD` extraction — a published deadline counts ONLY when the
 * text actually carries an ISO date. Free-form values ("Jan 15", "Rolling")
 * stay NULL instead of being coerced into an invented date.
 */
function isoDateOr(value: unknown): string | null {
  if (value == null || value === "") return null;
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return null;
  const parsed = new Date(`${m[0]}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : m[0];
}

type UniRow = typeof universities.$inferSelect;

/** Dual scores for one candidate university, same engines as the Explorer. */
function scoreUniversityRow(
  u: UniRow,
  scoring: {
    chancing: Awaited<ReturnType<typeof chancingProfileWithActivities>>;
    matchProfile: Awaited<ReturnType<typeof toMatchProfileWithActivities>>;
    targetMajor: string;
    degreeLevel: string | null;
  }
) {
  const chance = evaluateUniversityAndProgramChance(
    scoring.chancing,
    u,
    {
      id: u.id,
      universityId: u.id,
      name: scoring.targetMajor || u.programMajor || "General Studies",
      degreeLevel: scoring.degreeLevel || u.degreeLevel || "Bachelor",
      field: scoring.targetMajor || u.programMajor || null,
    },
    { minGpa: u.minGpa, minIelts: u.minIelts, minSat: u.minSat },
    [],
    matchQsUniversityBenchmark(u)
  );
  const match = calculateUniversityMatch(scoring.matchProfile, toUniversityData(u));
  return {
    chanceScore: chance.compositeProgramFitScore,
    effectiveAcceptRatePct: chance.effectiveProgramAcceptRatePct,
    selectivityCategory: chance.selectivityCategory,
    matchScore: match.matchScore,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const profileId = Number(searchParams.get("profileId"));
    const access = await requireProfileAccess(req, profileId);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error, code: access.code },
        { status: access.status }
      );
    }
    if (!profileId) {
      return NextResponse.json({ error: "profileId is required" }, { status: 400 });
    }

    const items: any[] = [];
    const now = new Date();
    // Feed rows are translated for the student's locale (en = source values);
    // machine-readable statuses (COMPLETED/PENDING/REGISTERED) stay raw so
    // client chips can re-style them.
    const locale = localeFromRequest(req);

    // --- Private context in one parallel read: what the student saved, and
    //     the profile the scoring engines need. ---
    const [savedSchRows, savedUnis, profileRows, appRows] = await Promise.all([
      db.select().from(savedScholarships).where(eq(savedScholarships.profileId, profileId)),
      db.select().from(savedUniversities).where(eq(savedUniversities.profileId, profileId)),
      db.select().from(studentProfiles).where(eq(studentProfiles.id, profileId)),
      db.select().from(applications).where(eq(applications.profileId, profileId)),
    ]);
    const profile = profileRows[0] ?? null;
    const savedSchIds = savedSchRows.map((s) => s.scholarshipId);
    const savedSchSet = new Set(savedSchIds);
    const savedUniIds = [...new Set(savedUnis.map((u) => u.universityId))];

    // --- Catalogue rows + cycles + published deadlines for the candidate set
    //     (saved universities and, below, the high-chance shortlist) ---
    const [uniRows, activeScholarships, savedScholarshipsRows] = await Promise.all([
      savedUniIds.length > 0
        ? db.select().from(universities).where(inArray(universities.id, savedUniIds))
        : Promise.resolve([] as UniRow[]),
      db.select().from(scholarships).where(eq(scholarships.isActive, true)),
      savedSchIds.length > 0
        ? db.select().from(scholarships).where(inArray(scholarships.id, savedSchIds))
        : Promise.resolve([]),
    ]);
    // A student's explicit save remains part of their personal timeline even
    // if the catalogue record later becomes inactive. Recommendations below
    // still come only from the active, verified catalogue.
    const allScholarships = Array.from(
      new Map([...activeScholarships, ...savedScholarshipsRows].map((s) => [s.id, s])).values()
    );
    const uniById = new Map<number, UniRow>(uniRows.map((u) => [u.id, u]));

    // Coverage refs — the SAME rules the dashboard and the Scholarship Hub
    // use, so "covers a saved university" means one thing everywhere.
    const savedUniRefs: SavedUniRef[] = uniRows.map((u) => ({
      id: u.id,
      name: u.name,
      country: u.country,
      annualTuitionUsd: resolvedUsdUniversityCosts(u).annualTuitionUsd,
    }));

    // Scoring context (chance + fit). Best-effort: a profile that cannot be
    // scored simply means no high-chance shortlist and no score fields.
    let scoring: {
      chancing: Awaited<ReturnType<typeof chancingProfileWithActivities>>;
      matchProfile: Awaited<ReturnType<typeof toMatchProfileWithActivities>>;
      targetMajor: string;
      degreeLevel: string | null;
    } | null = null;
    if (profile) {
      try {
        const [chancing, matchProfile] = await Promise.all([
          chancingProfileWithActivities(profile),
          toMatchProfileWithActivities(profile),
        ]);
        scoring = {
          chancing,
          matchProfile,
          targetMajor: (profile.targetMajor ?? "").trim(),
          degreeLevel: profile.degreeLevel ?? null,
        };
      } catch {
        scoring = null;
      }
    }

    /** Chance/fit per candidate university id (computed once, reused below). */
    const scoresByUniId = new Map<number, ReturnType<typeof scoreUniversityRow>>();
    const scoreOf = (u: UniRow) => {
      if (!scoring) return null;
      const hit = scoresByUniId.get(u.id) ?? scoreUniversityRow(u, scoring);
      scoresByUniId.set(u.id, hit);
      return hit;
    };

    /**
     * High-chance shortlist: active, degree-compatible universities in the
     * student's preferred countries that are NOT saved yet, ranked by the
     * positioning engine's chance score (≥ 60 = "worth an application"),
     * capped at four. With no stated preferences the pool is skipped — an
     * empty profile gets no suggestions, exactly like the dashboard's
     * "Recommended for you".
     */
    let recommendedUnis: { row: UniRow; chanceScore: number }[] = [];
    const preferredCountries = profile ? parseListColumn(profile.preferredCountries) : [];
    if (scoring && (preferredCountries.length > 0 || scoring.targetMajor)) {
      const countries = preferredCountries;
      try {
        const pool = await db.select().from(universities).where(eq(universities.isActive, true));
        recommendedUnis = pool
          .filter((u) => !savedUniIds.includes(u.id))
          .filter((u) => supportsDegreeLevel(u.degreeLevel, scoring!.degreeLevel))
          .filter((u) => (countries.length > 0 ? countries.some((c) => countriesMatch(u.country, c)) : true))
          .map((u) => ({ row: u, chanceScore: scoreOf(u)?.chanceScore ?? -1 }))
          .filter((x) => x.chanceScore >= 60)
          // Sorted by CHANCE descending — the student asked for "where do I
          // actually have a shot", not for the highest-ranked name.
          .sort((a, b) => b.chanceScore - a.chanceScore)
          .slice(0, 4);
      } catch {
        recommendedUnis = [];
      }
    }

    const candidateIds = [...new Set([...savedUniIds, ...recommendedUnis.map((r) => r.row.id)])];

    // Nearest UPCOMING verified cycle per candidate (one batched query,
    // never a per-university loop).
    //
    // The `verification_status = 'verified'` filter is the contract the comment
    // above describes and the detail page already follows: an unverified or
    // estimated cycle is a catalogue guess (the import once wrote one identical
    // "Fall 2027, 15 January" row for every programme of 217 universities) and
    // must never become a countdown here. A university with no verified cycle
    // falls through to "NO DEADLINE ON FILE".
    const cycleRows =
      candidateIds.length > 0
        ? await db
            .select({
              universityId: applicationCycles.universityId,
              deadline: applicationCycles.deadline,
            })
            .from(applicationCycles)
            .where(
              and(
                inArray(applicationCycles.universityId, candidateIds),
                gte(applicationCycles.deadline, new Date().toISOString().slice(0, 10)),
                eq(applicationCycles.verificationStatus, "verified")
              )
            )
            .orderBy(asc(applicationCycles.deadline))
        : [];
    const upcomingDeadlineByUni = new Map<number, string>();
    for (const c of cycleRows) {
      if (c.deadline && !upcomingDeadlineByUni.has(c.universityId)) {
        const d = new Date(c.deadline);
        upcomingDeadlineByUni.set(
          c.universityId,
          Number.isNaN(d.getTime()) ? String(c.deadline).slice(0, 10) : d.toISOString().slice(0, 10)
        );
      }
    }

    // Priority 1 for a real date: the student's own (non-withdrawn)
    // application row for that university.
    const appDeadlineByUni = new Map<number, string>();
    for (const a of appRows) {
      if (a.status === "withdrawn" || a.universityId == null) continue;
      const iso = isoDateOr(a.deadline);
      if (iso && !appDeadlineByUni.has(a.universityId)) appDeadlineByUni.set(a.universityId, iso);
    }

    /**
     * Resolve the date a university deadline item should carry, in order of
     * trustworthiness: the student's own application row → the next upcoming
     * VERIFIED cycle (the same rows the programme deadlines are derived from
     * on the detail page) → nothing. No date, no countdown — ever.
     */
    function resolvedUniDeadline(u: UniRow): string | null {
      return appDeadlineByUni.get(u.id) ?? upcomingDeadlineByUni.get(u.id) ?? null;
    }

    // --- Scholarships: the student's saved awards (+ a small recommended
    //     full-coverage shortlist when they have barely saved anything) ---
    const datedScholarships = allScholarships
      .map((s) => {
        let date: Date | null = null;
        if (s.deadlineDate) date = new Date(s.deadlineDate);
        else if (s.deadlineRangeEnd) date = new Date(s.deadlineRangeEnd);
        else if (s.deadlineRangeStart) date = new Date(s.deadlineRangeStart);
        return { s, date };
      })
      .filter((x) => x.date && Number.isFinite(x.date.getTime()) && x.date.getTime() > now.getTime() - 365 * 86400000);
    // Unverified dates may be stale or copied from prior cycles. Keep an
    // explicitly saved item visible with its provenance, but recommend only
    // verified dates from the active catalogue.
    const verifiedDatedScholarships = datedScholarships.filter(({ s }) => s.isActive && s.verificationStatus === "verified");
    const coverageOf = new Map<number, SavedUniCoverage | null>();
    const coverageFor = (s: (typeof scholarships.$inferSelect)) => {
      if (!coverageOf.has(s.id)) {
        coverageOf.set(
          s.id,
          savedUniRefs.length > 0
            ? evaluateScholarshipForSavedUnis({ ...s, amountUsdValue: resolvedUsdScholarshipAmount(s) }, savedUniRefs)
            : null
        );
      }
      return coverageOf.get(s.id) ?? null;
    };
    for (const { s, date } of datedScholarships) {
      if (!savedSchSet.has(s.id)) continue;
      const status = computeScholarshipStatus(s);
      const cov = coverageFor(s);
      items.push({
        id: `sch-${s.id}`,
        type: "scholarship",
        title: localizeScholarshipTitle(s.title, locale),
        subtitle: localizeScholarshipProvider(s.provider, locale),
        date: date!.toISOString().slice(0, 10),
        status: statusLabel(status).toUpperCase(),
        daysRemaining: daysUntil(now, date!.toISOString()),
        source: s.sourceUrl || s.websiteUrl || null,
        saved: true,
        recommended: false,
        verificationStatus: s.verificationStatus ?? "unverified",
        coversSavedUni: cov?.coversSavedUni ?? false,
        isFullCoverage: cov?.isFullCoverage ?? false,
      });
    }
    if (savedSchIds.length < 3) {
      // Top full-coverage awards that apply to a saved university (or, with
      // no saved universities yet, simply the published full-coverage ones).
      // Maximum three, flagged `recommended`, so a brand-new student still
      // sees WHAT could fund their plan without drowning in the catalogue.
      const candidates = verifiedDatedScholarships
        .filter(({ s }) => !savedSchSet.has(s.id))
        .map(({ s, date }) => ({ s, date, cov: coverageFor(s) }))
        .filter((x) => (savedUniRefs.length > 0 ? (x.cov ? coverageTier(x.cov) >= 2 : false) : /\bfull\b/i.test(x.s.coverageType || "") ))
        .sort((a, b) => {
          const ta = a.cov ? coverageTier(a.cov) : 0;
          const tb = b.cov ? coverageTier(b.cov) : 0;
          if (tb !== ta) return tb - ta;
          return a.date!.getTime() - b.date!.getTime();
        })
        .slice(0, 3);
      for (const { s, date } of candidates) {
        const status = computeScholarshipStatus(s);
        const cov = coverageFor(s);
        items.push({
          id: `sch-${s.id}`,
          type: "scholarship",
          title: localizeScholarshipTitle(s.title, locale),
          subtitle: localizeScholarshipProvider(s.provider, locale),
          date: date!.toISOString().slice(0, 10),
          status: statusLabel(status).toUpperCase(),
          daysRemaining: daysUntil(now, date!.toISOString()),
          source: s.sourceUrl || s.websiteUrl || null,
          saved: false,
          recommended: true,
          verificationStatus: s.verificationStatus ?? "unverified",
          coversSavedUni: cov?.coversSavedUni ?? false,
          isFullCoverage: cov?.isFullCoverage ?? false,
        });
      }
    }

    // --- Saved universities (real deadlines come from the verified cycles
    //     catalogue — one batched query, never a per-university loop) ---
    if (uniRows.length > 0) {
      for (const u of uniRows) {
        const deadline = resolvedUniDeadline(u);
        if (!deadline) {
          // Nothing on file → no invented countdown either: NULL stays NULL
          // and the row reads "NO DEADLINE ON FILE" (check-journey pins this).
          items.push({
            id: `uni-${u.id}`,
            type: "university",
            title: u.name,
            subtitle: `${localizeCountry(u.country, locale)} · ${localizeMajorOrField(u.programMajor, locale)}`,
            date: null,
            status: "NO DEADLINE ON FILE",
            daysRemaining: null,
            source: u.websiteUrl || null,
            saved: true,
            country: localizeCountry(u.country, locale),
            rawCountry: u.country,
            universityId: u.id,
          });
          continue;
        }
        const scores = scoreOf(u);
        items.push({
          id: `uni-${u.id}`,
          type: "university",
          title: u.name,
          subtitle: `${localizeCountry(u.country, locale)} · ${localizeMajorOrField(u.programMajor, locale)}`,
          date: deadline,
          status: savedUniStatusLabel(deadline),
          daysRemaining: daysUntil(now, deadline),
          source: u.websiteUrl || null,
          saved: true,
          recommended: false,
          country: localizeCountry(u.country, locale),
          rawCountry: u.country,
          universityId: u.id,
          chanceScore: scores?.chanceScore ?? null,
          effectiveAcceptRatePct: scores?.effectiveAcceptRatePct ?? null,
          selectivityCategory: scores?.selectivityCategory ?? null,
          matchScore: scores?.matchScore ?? null,
        });
      }
    }

    // --- User milestones ---
    const tasks = await db
      .select()
      .from(applicationTasks)
      .where(eq(applicationTasks.profileId, profileId));
    for (const t of tasks) {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      items.push({
        id: `task-${t.id}`,
        type: "milestone",
        title: t.title,
        subtitle: t.category,
        date: due ? due.toISOString().slice(0, 10) : null,
        status: t.isCompleted ? "COMPLETED" : "PENDING",
        daysRemaining: due ? daysUntil(now, due.toISOString()) : null,
        source: null,
        saved: false,
      });
    }

    // --- Application deadlines (from the universal tracker) ---
    for (const a of appRows) {
      if (a.status === "withdrawn") continue;
      const due = a.deadline ? new Date(a.deadline) : null;
      items.push({
        id: `app-${a.id}`,
        type: "application",
        title: `${a.universityName}${a.programName ? ` — ${a.programName}` : ""}`,
        subtitle: [a.applicationRound, a.intakeTerm].filter(Boolean).join(" · "),
        date: due ? due.toISOString().slice(0, 10) : null,
        status: String(a.status || "PENDING").toUpperCase(),
        daysRemaining: due ? daysUntil(now, due.toISOString()) : null,
        source: a.portalUrl || null,
        saved: true,
      });
    }

    // --- Test dates (IELTS / SAT / TOEFL / Duolingo / GRE) ---
    const [bookings, plans] = await Promise.all([
      db.select().from(testBookings).where(eq(testBookings.profileId, profileId)),
      db.select().from(testPlans).where(eq(testPlans.profileId, profileId)),
    ]);
    for (const b of bookings) {
      const testDay = new Date(b.testDate);
      items.push({
        id: `test-${b.id}`,
        type: "test",
        title: `${b.testType.toUpperCase()} test${b.location ? ` — ${b.location}` : ""}`,
        subtitle: b.registered ? "Registered" : "Not registered yet",
        testType: b.testType,
        testLocation: b.location,
        testRegistered: b.registered,
        date: testDay.toISOString().slice(0, 10),
        status: b.registered ? "REGISTERED" : "PENDING",
        daysRemaining: daysUntil(now, testDay.toISOString()),
        source: null,
        saved: true,
      });
    }

    const bookedTestDates = new Set(bookings.map((b) => `${String(b.testType).toLowerCase()}|${isoDateOr(b.testDate)}`));
    for (const plan of plans) {
      if (!plan.isActive) continue;
      for (const candidateDate of [...new Set([isoDateOr(plan.nextTestDate), isoDateOr(plan.targetDate)].filter((d): d is string => !!d))]) {
        if (bookedTestDates.has(`${plan.testType.toLowerCase()}|${candidateDate}`)) continue;
        items.push({
          id: `test-plan-${plan.id}-${candidateDate}`,
          type: "test",
          title: `${plan.testType.toUpperCase()} test (planned)`,
          subtitle: plan.currentScore == null ? "Study plan" : `Current ${plan.currentScore}; target ${plan.targetScore ?? "—"}`,
          testType: plan.testType,
          testRegistered: false,
          date: candidateDate,
          status: "PENDING",
          daysRemaining: daysUntil(now, candidateDate),
          source: null,
          saved: true,
        });
      }
    }

    // --- High-chance suggestions (outside the student's saved list) ---
    // Placed after the saved sections: the backwards planner shows them with
    // `recommended: true` and a chance badge, ordered by CHANCE, nearest
    // verified deadline when one is actually on file.
    for (const { row: u, chanceScore } of recommendedUnis) {
      const scores = scoreOf(u);
      const deadline = resolvedUniDeadline(u);
      items.push({
        id: `uni-${u.id}`,
        type: "university",
        title: u.name,
        subtitle: `${localizeCountry(u.country, locale)} · ${localizeMajorOrField(u.programMajor, locale)}`,
        date: deadline,
        status: savedUniStatusLabel(deadline),
        daysRemaining: deadline ? daysUntil(now, deadline) : null,
        source: u.websiteUrl || null,
        saved: false,
        recommended: true,
        country: localizeCountry(u.country, locale),
        rawCountry: u.country,
        universityId: u.id,
        chanceScore: scores?.chanceScore ?? chanceScore,
        effectiveAcceptRatePct: scores?.effectiveAcceptRatePct ?? null,
        selectivityCategory: scores?.selectivityCategory ?? null,
        matchScore: scores?.matchScore ?? null,
      });
    }

    // Sort: items with dates first, nearest first; items without dates last.
    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Urgency buckets: 🔴 critical (≤14d) · 🟠 soon (≤45d) · 🟡 planned
    const withUrgency = items.map((item) => ({ ...item, urgency: urgencyFor(item.daysRemaining) }));
    const critical = withUrgency.filter((i) => i.urgency === "critical").length;
    const soon = withUrgency.filter((i) => i.urgency === "soon").length;

    return NextResponse.json({ items: withUrgency, summary: { critical, soon, total: withUrgency.length } });
  } catch (error) {
    console.error("GET /api/deadlines error:", error);
    return NextResponse.json({ error: "Failed to load deadlines" }, { status: 500 });
  }
}
