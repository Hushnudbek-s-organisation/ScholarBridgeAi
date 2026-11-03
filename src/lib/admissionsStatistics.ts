/** Observed admissions facts, separate from the legacy planning estimates.
 * Unknown is NULL, never a rank-derived estimate or the midpoint of a range.
 * CDS usually describes ENROLLED first-years; an admissions page may describe
 * ADMITTED students. Neither is a personalized probability or a program cutoff.
 */
export const ADMISSIONS_METRICS = [
  "gpa25", "gpa50", "gpa75", "sat25", "sat50", "sat75",
  "act25", "act50", "act75", "ieltsMinimum", "ieltsMedian", "toeflMinimum",
  "overallRate", "edRate", "eaRate", "rdRate", "internationalRate",
  "satMath25", "satMath75", "satErw25", "satErw75",
] as const;
export type AdmissionsMetric = (typeof ADMISSIONS_METRICS)[number];
export interface ObservedAdmissionMetric {
  value: number | null;
  status: "verified" | "not_published" | "not_applicable" | "unreviewed";
  sourceUrl: string | null;
  accessedOn: string | null;
  cohort: string | null;
  population: "admitted" | "enrolled" | "applicants" | null;
  basis: string;
  calculation?: { admitted: number; considered: number };
}
export interface AdmissionsStatistics {
  institution: string;
  level: "undergraduate_first_year" | "unknown";
  metrics: Record<AdmissionsMetric, ObservedAdmissionMetric>;
  reviewedMetricCount: number;
  verifiedMetricCount: number;
  personalizedProbabilityAvailable: false;
}
const MIT_SOURCE = "https://mitadmissions.org/apply/process/stats/";
const unknown = (): ObservedAdmissionMetric => ({ value: null, status: "unreviewed", sourceUrl: null,
  accessedOn: null, cohort: null, population: null,
  basis: "No edition-specific primary-source observation recorded. Uploaded reports and legacy estimates are not CDS evidence." });

export function admissionsStatisticsFor(institution: string): AdmissionsStatistics {
  const metrics = Object.fromEntries(ADMISSIONS_METRICS.map((key) => [key, unknown()])) as Record<AdmissionsMetric, ObservedAdmissionMetric>;
  if (institution === "Massachusetts Institute of Technology (MIT)") {
    const observed = (value: number | null, basis: string, status: ObservedAdmissionMetric["status"] = "verified"): ObservedAdmissionMetric => ({
      value, status, sourceUrl: MIT_SOURCE, accessedOn: "2026-11-02", cohort: "Class of 2029 (fall 2025 entry)", population: "admitted", basis,
    });
    metrics.overallRate = observed(4.6, "Published rounded overall percentage; 1,334 admits / 29,281 applications. Not the international or individual applicant rate.");
    const derived = (admitted: number, considered: number, basis: string): ObservedAdmissionMetric => ({
      ...observed(Math.round(admitted / considered * 10000) / 100, basis), calculation: { admitted, considered },
    });
    metrics.eaRate = derived(721, 12052, "Calculated from published Early Action counts: 721 / 12,052. No causal ED/EA advantage is implied.");
    metrics.rdRate = derived(603, 24715, "Calculated Regular Action rate uses all 24,715 considered, INCLUDING deferred EA applicants, not only 17,229 new applications. 603 admits includes deferred applicants.");
    metrics.internationalRate = derived(136, 6926, "Calculated from published international counts: 136 admits / 6,926 applications.");
    metrics.act25 = observed(34, "Published admitted-student ACT Composite 25th percentile.");
    metrics.act75 = observed(36, "Published admitted-student ACT Composite 75th percentile.");
    metrics.satMath25 = observed(780, "Published SAT Math 25th percentile, not SAT total.");
    metrics.satMath75 = observed(800, "Published SAT Math 75th percentile, not SAT total.");
    metrics.satErw25 = observed(740, "Published SAT ERW 25th percentile, not SAT total.");
    metrics.satErw75 = observed(780, "Published SAT ERW 75th percentile, not SAT total.");
    for (const key of ["gpa25", "gpa50", "gpa75", "sat25", "sat50", "sat75", "act50", "ieltsMinimum", "ieltsMedian", "toeflMinimum"] as const) {
      metrics[key] = observed(null, "Not published on this reviewed statistics page. Do not infer a median, sum marginal SAT percentiles, or treat a language recommendation as a cohort percentile.", "not_published");
    }
    metrics.edRate = observed(null, "Reviewed page reports Early Action and Regular Action; no Early Decision round is reported.", "not_applicable");
  }
  const reviewPage = (sourceUrl: string, cohort: string, population: ObservedAdmissionMetric["population"], basis: string) => {
    for (const key of ADMISSIONS_METRICS) metrics[key] = { value: null, status: "not_published", sourceUrl,
      accessedOn: "2026-11-03", cohort, population, basis };
  };
  if (institution === "Harvard University") {
    reviewPage("https://college.harvard.edu/admissions/admissions-statistics", "Class of 2030 (fall 2026 entry)", "admitted",
      "Not supplied on the reviewed profile. The 15% international geography share describes enrolled-class permanent addresses, not an international acceptance rate or citizenship breakdown. Round-specific and test/GPA/English figures remain unknown.");
    metrics.overallRate = { ...metrics.overallRate, value: Math.round(2037 / 55104 * 10000) / 100, status: "verified",
      calculation: { admitted: 2037, considered: 55104 },
      basis: "Calculated from 2,037 admitted / 55,104 applicants. Admitted includes waitlist offers; 1,648 enrolling is not the numerator for an acceptance rate. No EA/RD breakdown is supplied." };
  }
  if (institution === "Brown University") {
    reviewPage("https://admission.brown.edu/explore/brown-admission-numbers", "Class of 2030 (fall 2026 entry)", "admitted",
      "Not supplied on the reviewed profile. The 889 Early Decision admits lack an ED applicant denominator, so ED and RD rates cannot be derived. Do not subtract round totals with unknown deferrals or infer a GPA/English cutoff.");
    metrics.overallRate = { ...metrics.overallRate, value: 5.6, status: "verified",
      basis: "Published rounded Class of 2030 acceptance rate: 2,687 admitted / 47,944 applications. This is institution-wide, not a department or international rate." };
    for (const [key, value] of [["sat25", 1470], ["sat75", 1550], ["act25", 34], ["act75", 36]] as const) {
      metrics[key] = { ...metrics[key], value, status: "verified",
        cohort: "Most recent admitted test-submitters, page as of September 2026; test cohort not separately identified",
        basis: `Published middle 50% endpoint for admitted students who submitted ${key.startsWith("sat") ? "SAT total" : "ACT composite"} scores. Selection of test-submitters matters. Median is not published and is not the midpoint. The page does not separately identify the test cohort year.` };
    }
  }
  if (institution === "Princeton University") {
    reviewPage("https://admission.princeton.edu/apply/admission-statistics", "Enrolled Class of 2030, as of September 4, 2026", "enrolled",
      "The reviewed page describes 1,414 enrolled first-years and class composition, not applicant/admit counts or score quartiles. The 12.9% international citizen share is NOT an international acceptance rate. No admission rate, test percentile or language minimum can be derived here.");
  }
  return { institution, level: Object.values(metrics).some((m) => m.status !== "unreviewed") ? "undergraduate_first_year" : "unknown", metrics,
    reviewedMetricCount: Object.values(metrics).filter((m) => m.status !== "unreviewed").length,
    verifiedMetricCount: Object.values(metrics).filter((m) => m.status === "verified").length,
    personalizedProbabilityAvailable: false };
}
