import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { scholarships } from "./schema";

/** Official pages reviewed on 2026-10-22. Future cycles without official published dates stay undated. */
export const SEEDED_SCHOLARSHIP_CYCLES = [
  { title: "Chevening Scholarship", sourceUrl: "https://www.chevening.org/scholarship/uzbekistan/", verificationStatus: "verified", deadline: "2026-10-06", deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "exact", applicationStatus: "closed", notes: "Uzbekistan 2027/28 cycle: official country page lists a 6 October 2026, 11:00 UTC deadline. No next-cycle dates published on the review date." },
  { title: "Stipendium Hungaricum", sourceUrl: "https://stipendiumhungaricum.hu/apply/", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "The official page showed the 2026/27 call (deadline 15 January 2026); the 2027/28 call and deadline were not published as of 2026-10-22. Do not infer the next opening, deadline, or Uzbekistan quota." },
  { title: "Türkiye Bursları Scholarship", sourceUrl: "https://www.turkiyeburslari.gov.tr/calendar", verificationStatus: "estimated", openingDate: "2027-01-10", deadline: "2027-02-20", deadlineRangeStart: "2027-01-10", deadlineRangeEnd: "2027-02-20", deadlineType: "estimated", applicationStatus: "upcoming", recurrence: "annual", notes: "The official calendar describes the recurring 10 January–20 February application period; exact dates for the 2027 cycle were not separately announced as of 2026-10-22. Estimated window, not a confirmed call." },
  { title: "Gates Cambridge Scholarship", sourceUrl: "https://www.gatescambridge.org/apply/timeline/", verificationStatus: "verified", openingDate: "2026-09-11", deadline: "2027-01-06", deadlineRangeStart: "2026-12-08", deadlineRangeEnd: "2027-01-06", deadlineType: "range", applicationStatus: "open", notes: "For 2027/28 entry, the official timeline gives course-dependent deadlines of 8 December 2026 or 6 January 2027 for applicants outside the US-resident round; use the Cambridge course directory for an individual's deadline." },
  { title: "DAAD Development-Related Postgraduate Courses (EPOS)", sourceUrl: "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "DAAD states that EPOS deadlines vary by course and applicants apply directly to each course. No single programme-wide deadline is asserted." },
  { title: "Fulbright Foreign Student Program", sourceUrl: "https://uz.usembassy.gov/fulbright-foreign-student-program/", verificationStatus: "verified", deadline: "2026-06-30", deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "exact", applicationStatus: "closed", notes: "U.S. Embassy in Uzbekistan listed 30 June 2026 for the 2027–28 cycle; the supplied May 2027 date was not supported by the official Uzbekistan page." },
  { title: "Global Korea Scholarship (GKS Graduate 2027)", sourceUrl: "https://www.studyinkorea.go.kr/en/plan/scholarship.do", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "Graduate application deadlines are set by the first-round embassy/university and vary by country/institution; no universal 15 March 2027 deadline was published as of 2026-10-22." },
  { title: "Chinese Government Scholarship (CSC 2027/28)", sourceUrl: "https://www.campuschina.org/content/details27_100758.html", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "Official guidance gives a broad January–early-April application period and directs applicants to their receiving agency for the deadline; no universal 28 February date is asserted." },
  { title: "France Excellence Eiffel Scholarship", sourceUrl: "https://www.campusfrance.org/en/actu/call-for-france-excellence-eiffel-applications-2027", verificationStatus: "verified", openingDate: "2026-10-01", deadline: "2027-01-06", deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "exact", applicationStatus: "open", notes: "2027 call is submitted by French higher-education institutions. Campus France's 2027 institution guide gives 6 January 2027; students must check their host institution's earlier internal deadline." },
  { title: "Australia Awards Scholarships", sourceUrl: "https://www.dfat.gov.au/people-to-people/australia-awards/participating-countries", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", isActive: false, notes: "DFAT eligibility and dates are country-specific; Uzbekistan is not listed among current participating countries. Do not advertise as available to Uzbek applicants without a new official country profile." },
  { title: "Erasmus Mundus Joint Master Degrees (EMJMD)", sourceUrl: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "Deadlines are set by each joint master's consortium; no single date applies across the catalogue." },
  { title: "Knight-Hennessy Scholars Program", sourceUrl: "https://knight-hennessy.stanford.edu/admission", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "The current application deadline is cycle-specific; no unverified future deadline is carried forward." },
  { title: "MEXT Japanese Government Scholarship", sourceUrl: "https://www.studyinjapan.go.jp/en/planning/scholarships/", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "Embassy recommendation schedules are set by the local Japanese embassy; no universal deadline is asserted." },
  { title: "Lester B. Pearson International Scholarship", sourceUrl: "https://future.utoronto.ca/pearson/about/", verificationStatus: "unverified", deadline: null, deadlineRangeStart: null, deadlineRangeEnd: null, deadlineType: "unknown", applicationStatus: "unknown", recurrence: "annual", notes: "School nomination and university application deadlines are cycle-specific; confirm the current official dates." },
] as const;

export const SEEDED_SCHOLARSHIP_TITLES = SEEDED_SCHOLARSHIP_CYCLES.map((cycle) => cycle.title);
export interface SeededScholarshipRefreshSummary { examined: number; rolledForward: number }

/**
 * Refreshes only known seed identities that are not already verified/admin-managed.
 * Expired legacy dates are cleared where no current official cycle was published;
 * current-cycle dates are never guessed from a stale annual pattern.
 */
export async function refreshSeededScholarshipCycles(): Promise<SeededScholarshipRefreshSummary> {
  const rows = await db.select().from(scholarships).where(inArray(scholarships.title, SEEDED_SCHOLARSHIP_TITLES));
  let rolledForward = 0;
  for (const row of rows) {
    if (row.verificationStatus === "verified") continue;
    const spec = SEEDED_SCHOLARSHIP_CYCLES.find((entry) => entry.title === row.title);
    if (!spec) continue;
    const nextDeadline = "deadline" in spec ? (spec.deadline ?? null) : null;
    const staleLegacyDate = [row.deadline, row.deadlineDate, row.deadlineRangeStart, row.deadlineRangeEnd]
      .some((value) => value != null && value < "2026-10-22");
    const expectedOpening = "openingDate" in spec ? spec.openingDate ?? null : null;
    const expectedRangeStart = "deadlineRangeStart" in spec ? spec.deadlineRangeStart ?? null : null;
    const expectedRangeEnd = "deadlineRangeEnd" in spec ? spec.deadlineRangeEnd ?? null : null;
    const expectedRecurrence = "recurrence" in spec ? spec.recurrence ?? "none" : "none";
    const differs = row.openingDate !== expectedOpening || row.deadline !== nextDeadline || row.deadlineDate !== nextDeadline ||
      row.deadlineRangeStart !== expectedRangeStart || row.deadlineRangeEnd !== expectedRangeEnd ||
      row.deadlineType !== spec.deadlineType || row.applicationStatus !== spec.applicationStatus ||
      row.recurrence !== expectedRecurrence || row.notes !== spec.notes ||
      row.lastVerifiedAt?.toISOString() !== "2026-10-22T00:00:00.000Z" ||
      row.sourceUrl !== spec.sourceUrl || row.verificationStatus !== spec.verificationStatus ||
      ("isActive" in spec && row.isActive !== spec.isActive) || staleLegacyDate;
    if (!differs) continue;
    const update = {
      openingDate: "openingDate" in spec ? spec.openingDate ?? null : null,
      deadline: nextDeadline,
      deadlineDate: nextDeadline,
      deadlineRangeStart: "deadlineRangeStart" in spec ? spec.deadlineRangeStart ?? null : null,
      deadlineRangeEnd: "deadlineRangeEnd" in spec ? spec.deadlineRangeEnd ?? null : null,
      deadlineType: spec.deadlineType,
      applicationStatus: spec.applicationStatus,
      recurrence: "recurrence" in spec ? spec.recurrence ?? "none" : "none",
      sourceUrl: spec.sourceUrl,
      lastVerifiedAt: new Date("2026-10-22T00:00:00.000Z"),
      verificationStatus: spec.verificationStatus,
      notes: spec.notes,
      ...( "isActive" in spec ? { isActive: spec.isActive } : {}),
    };
    await db.update(scholarships).set(update).where(and(
      eq(scholarships.id, row.id),
      // Guard against a verification/admin change made after the read.
      eq(scholarships.verificationStatus, row.verificationStatus),
    ));
    rolledForward += 1;
  }
  return { examined: rows.length, rolledForward };
}
