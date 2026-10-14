/**
 * Grounded built-in fallback for the profile report. Long-form copy comes
 * from the locale message files; this module only formats confirmed facts.
 * It does not score readiness, estimate outcomes, or infer requirements.
 */

export interface ReportMatchFact {
  name: string;
  country: string;
  score: number;
  reason?: string | null;
  issue?: string | null;
}

export interface ReportScholarshipFact {
  title: string;
  provider: string;
  coverageType: string;
  deadlineDate: string | null;
}

export interface ReportFacts {
  name: string;
  degreeLevel: string | null;
  targetMajor: string | null;
  gpa: number | null;
  gpaScale: number | null;
  ieltsScore: number | null;
  budgetAnnualUsd: number | null;
  needScholarship: boolean;
  workExperienceYears: number;
  researchPublications: number;
  extracurriculars: string | null;
  programmeMatches: ReportMatchFact[];
  scholarships: ReportScholarshipFact[];
}

export type ReportTranslator = (
  key: string,
  values?: Record<string, string | number>
) => string;

function shortFact(value: string | null | undefined, limit = 240): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, limit) : null;
}

function money(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `$${value.toLocaleString("en-US")}`;
}

function formatScholarship(fact: ReportScholarshipFact, t: ReportTranslator): string {
  return t("scholarshipRow", {
    title: fact.title,
    provider: fact.provider,
    coverage: fact.coverageType,
    deadline: fact.deadlineDate || t("notPublished"),
  });
}

function formatProgramme(fact: ReportMatchFact, t: ReportTranslator): string[] {
  const lines = [
    t("fitRow", { name: fact.name, country: fact.country, score: fact.score }),
  ];
  const issue = shortFact(fact.issue);
  const reason = shortFact(fact.reason);
  if (issue) lines.push(t("comparisonIssue", { detail: issue }));
  else if (reason) lines.push(t("comparisonReason", { detail: reason }));
  return lines;
}

/** Build a concise report draft in the requested locale. */
export function buildProfileReport(
  facts: ReportFacts,
  t: ReportTranslator
): string {
  const degree = shortFact(facts.degreeLevel) ?? t("notRecorded");
  const major = shortFact(facts.targetMajor) ?? t("notRecorded");
  const gpa = facts.gpa == null
    ? t("notRecorded")
    : `${facts.gpa}${facts.gpaScale == null ? "" : `/${facts.gpaScale}`}`;
  const profileRows = [
    t("identityLine", { name: shortFact(facts.name, 120) ?? t("notRecorded") }),
    t("studyLine", { degree, major }),
    t("gpaLine", { value: gpa }),
    facts.ieltsScore != null ? t("ieltsLine", { score: facts.ieltsScore }) : null,
    money(facts.budgetAnnualUsd) ? t("budgetLine", { amount: money(facts.budgetAnnualUsd)! }) : null,
    facts.needScholarship ? t("fundingNeedRecorded") : null,
    facts.workExperienceYears > 0 ? t("experienceLine", { years: facts.workExperienceYears }) : null,
    facts.researchPublications > 0 ? t("publicationLine", { count: facts.researchPublications }) : null,
    shortFact(facts.extracurriculars)
      ? t("activityLine", { details: shortFact(facts.extracurriculars)! })
      : null,
  ].filter((line): line is string => Boolean(line));

  const programmeRows = facts.programmeMatches.flatMap((fact) => formatProgramme(fact, t));
  const scholarshipRows = facts.scholarships.map((fact) => formatScholarship(fact, t));
  const steps: string[] = [];

  const firstProgramme = facts.programmeMatches[0];
  if (firstProgramme) steps.push(t("verifyProgramme", { name: firstProgramme.name }));
  else steps.push(t("chooseProgramme"));

  if (facts.needScholarship) {
    const firstScholarship = facts.scholarships[0];
    steps.push(firstScholarship
      ? t("verifyScholarship", { name: firstScholarship.title })
      : t("searchFunding"));
  }
  if (facts.gpa != null && facts.gpaScale == null) steps.push(t("verifyGpaScale"));
  if (steps.length === 0) steps.push(t("reviewRecordedDetails"));

  return [
    `### ${t("title")}`,
    t("draftNote"),
    "",
    `### ${t("profileHeading")}`,
    ...profileRows.map((line) => `- ${line}`),
    t("unknownFieldsNote"),
    "",
    `### ${t("programmesHeading")}`,
    t("fitNote"),
    ...(programmeRows.length ? programmeRows.map((line) => `- ${line}`) : [`- ${t("noProgrammeData")}`]),
    "",
    `### ${t("fundingHeading")}`,
    ...(scholarshipRows.length ? scholarshipRows.map((line) => `- ${line}`) : [`- ${t("noScholarshipData")}`]),
    t("fundingNote"),
    "",
    `### ${t("nextStepsHeading")}`,
    ...steps.map((line) => `- ${line}`),
  ].join("\n");
}
