import { evaluateRecordedAcademicCriteria, type OriginalAcademicProfile } from "./academicDecision";
import { countriesMatch, resolveCountryCode } from "./countries";
import { compareDegreeLevels } from "./degreeLevels";
import { type CatalogueFact } from "./evidencePolicy";
import { parseEligibilityScope } from "./eligibilityScope";
import { resolveScopedFact } from "./factResolver";
import { CATALOGUE_FIT_VERSION, calculateScholarshipMatch, type ScholarshipData, type StudentProfileData } from "./matching";
import { type RequirementEvaluation } from "./requirementGroups";
import { type ChanceBucket } from "./scholarshipGates";
import { subjectAffinity } from "./subjectAffinity";
import { resolveAcademicRequirements } from "./universityDetailRequirements";

type Award = ScholarshipData & { verificationStatus?: string | null; eligibleCountries?: string | null };
type RequirementState = "pass" | "fail" | "unknown";

export function scholarshipAssessment(
  profile: StudentProfileData,
  academicProfile: OriginalAcademicProfile,
  award: Award,
  facts: CatalogueFact[],
  today: string,
  computeFit = calculateScholarshipMatch,
) {
  const scope = { degreeLevel: profile.degreeLevel };
  const academic = resolveAcademicRequirements(facts, scope);
  const summary = academic.requirementGroup ? null : academic.summary;
  const gpa = summary?.gpa;
  const fitInput = {
    ...award,
    minGpa: gpa && ["4", "4.0", "GPA 4.0"].includes(gpa.unit ?? "") ? gpa.single : null,
    minIelts: summary?.ielts?.single ?? null,
  };
  const fit = computeFit(profile, fitInput);
  const checks: { field: string; state: RequirementState }[] = [];
  const evaluation = evaluateRecordedAcademicCriteria(academic, academicProfile, today);
  const reviewed = new Set<string>();
  function visit(node: RequirementEvaluation) {
    if (node.field) reviewed.add(node.field);
    node.children.forEach(visit);
  }
  visit(evaluation);
  if (academic.requirementGroup || Object.values(academic.summary).some(Boolean)) {
    checks.push({ field: "academics", state: evaluation.state === "unmet" ? "fail" : evaluation.state === "met" || evaluation.state === "not_applicable" ? "pass" : "unknown" });
  }
  if (award.minGpa && !reviewed.has("gpa")) checks.push({ field: "gpa", state: "unknown" });
  if (award.minIelts && !reviewed.has("ielts")) checks.push({ field: "ielts", state: "unknown" });
  if (parseEligibilityScope(award.degreeLevels).scope === "restricted") {
    const degree = compareDegreeLevels(profile.degreeLevel, award.degreeLevels);
    checks.push({ field: "degree", state: degree === "match" ? "pass" : degree === "mismatch" ? "fail" : "unknown" });
  }

  for (const [key, legacy, field] of [
    ["eligible_citizenships", award.eligibleCountries, "citizenship"],
    ["eligible_residencies", null, "residency"],
    ["eligible_majors", award.eligibleMajors, "major"],
  ] as const) {
    const fact = resolveScopedFact(facts, key, scope) ??
      (field === "citizenship" ? resolveScopedFact(facts, "eligible_countries", scope) : null);
    if (fact?.trust !== "official_verified" || typeof fact.value !== "string") {
      if (parseEligibilityScope(legacy).scope === "restricted") checks.push({ field, state: "unknown" });
      continue;
    }
    const published = parseEligibilityScope(fact.value);
    if (published.scope !== "restricted") continue;
    const citizenships = academicProfile.applicantContext?.citizenships ?? [];
    const major = profile.targetMajor?.trim();
    let state: RequirementState = "unknown";
    const residence = academicProfile.applicantContext?.residency;
    const countries = field === "residency" ? (residence ? [residence] : []) : citizenships;
    if (field !== "major" && countries.length) {
      if (published.values.some(country => countries.some(code => countriesMatch(country, code)))) state = "pass";
      else if (published.values.every(country => resolveCountryCode(country))) state = "fail";
    } else if (field === "major" && major) {
      if (published.values.some(subject => ["exact", "synonym"].includes(subjectAffinity([major], subject).level))) state = "pass";
    }
    checks.push({ field, state });
  }

  const checked = checks.filter(check => check.state !== "unknown").length;
  const bucket: ChanceBucket = award.verificationStatus !== "verified" ? "unknown"
    : checks.some(check => check.state === "fail") ? "below"
    : !checks.length || checks.some(check => check.state === "unknown") ? "unknown" : "meets";
  return {
    fit,
    fitVersion: CATALOGUE_FIT_VERSION,
    matchScore: award.verificationStatus === "verified" && fit.breakdown.comparedDimensions ? fit.matchScore : null,
    checked,
    checks,
    eligibilityBasis: "recorded_requirements" as const,
    bucket,
    isEligible: bucket === "unknown" ? null : bucket === "meets",
    academic,
  };
}
