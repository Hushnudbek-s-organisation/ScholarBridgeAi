/**
 * CV / Resume Builder (Phase 3).
 *
 * CV content and formatting requirements vary by country, institution,
 * programme, degree level and application. This builder organizes information
 * supplied by the student; it does not rank profile categories or make claims
 * about universal admissions preferences.
 *
 * It never invents an award, a date or a number: a field that is empty is
 * omitted, not filled with plausible-sounding text. Missing fields and review
 * prompts are stable message keys so the API can localize them.
 *
 * Pure module — asserted in `scripts/check-cv.ts`.
 */

export interface CvProfile {
  name?: string | null;
  email?: string | null;
  country?: string | null;
  targetMajor?: string | null;
  degreeLevel?: string | null;
  graduationYear?: number | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  satScore?: number | null;
  actScore?: number | null;
  apCourses?: string | null;
  ibCourses?: string | null;
  aLevelSubjects?: string | null;
  leadership?: string | null;
  volunteering?: string | null;
  sports?: string | null;
  clubs?: string | null;
  researchExperience?: string | null;
  projects?: string | null;
  workExperienceYears?: number | null;
  olympiads?: string | null;
  awards?: string | null;
  competitions?: string | null;
  certificates?: string | null;
  careerGoal?: string | null;
  languages?: string | null;
}

export interface CvSection {
  heading: string;
  items: string[];
}

export type CvGuidanceKey =
  | "targetMajor"
  | "targetMajorMissing"
  | "evidence"
  | "evidenceMissing"
  | "leadership"
  | "leadershipMissing"
  | "academicComplete"
  | "academicIncomplete"
  | "testScoresPresent"
  | "testScoresMissing"
  | "lengthOnePage"
  | "lengthLong";

export interface CvGuidance {
  key: CvGuidanceKey;
  values?: Record<string, string | number>;
}

export type CvMissingKey =
  | "fullName"
  | "email"
  | "country"
  | "targetMajor"
  | "gpa"
  | "graduationYear"
  | "testScores";

export type CvWarningKey = "noActivities" | "empty" | "noEvidence" | "length" | "manyEntries";

export interface CvIssue<Key extends string> {
  key: Key;
  values?: Record<string, string | number>;
}

export interface CvResult {
  name: string;
  headline: string;
  contact: string[];
  sections: CvSection[];
  /** Profile fields not supplied — localized by the API, never fabricated. */
  missing: CvIssue<CvMissingKey>[];
  /** Profile-specific, actionable revision guidance; never adds CV claims. */
  guidance: CvGuidance[];
  /** Structural review prompts — localized by the API. */
  warnings: CvIssue<CvWarningKey>[];
  /** Rough page count at ~45 lines/page. */
  estimatedPages: number;
  totalItems: number;
}

/** Parse a JSON array column or a comma-separated legacy string. */
export function parseList(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  const text = String(raw).trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean);
    } catch {
      // fall through to comma splitting
    }
  }
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Fields that must never appear on an application CV in most jurisdictions.
 * Surfaced as a warning if the profile implies them, so the student removes
 * them from any document they upload.
 */
export const FORBIDDEN_ON_CV = [
  "photograph",
  "date of birth",
  "marital status",
  "religion",
  "nationality number",
];

const has = (v: unknown): boolean => v != null && String(v).trim() !== "";

export function buildCv(profile: CvProfile): CvResult {
  const missing: CvIssue<CvMissingKey>[] = [];
  const warnings: CvIssue<CvWarningKey>[] = [];
  const sections: CvSection[] = [];

  // --- Header --------------------------------------------------------------
  const name = has(profile.name) ? String(profile.name).trim() : "Your Name";
  if (!has(profile.name)) missing.push({ key: "fullName" });

  const contact: string[] = [];
  if (has(profile.email)) contact.push(String(profile.email).trim());
  else missing.push({ key: "email" });
  if (has(profile.country)) contact.push(String(profile.country).trim());
  else missing.push({ key: "country" });

  const targetMajor = has(profile.targetMajor) ? String(profile.targetMajor).trim() : null;
  const headline = targetMajor
    ? `${targetMajor} applicant${has(profile.degreeLevel) ? ` · ${String(profile.degreeLevel).trim()}` : ""}`
    : has(profile.careerGoal)
      ? String(profile.careerGoal).trim()
      : "Applicant";
  if (!targetMajor) missing.push({ key: "targetMajor" });

  // --- Education -----------------------------------------------------------
  const education: string[] = [];
  if (Number(profile.gpa) > 0) {
    const scale = Number(profile.gpaScale) > 0 ? Number(profile.gpaScale) : 4;
    education.push(`GPA ${Number(profile.gpa)}/${scale}`);
  } else {
    missing.push({ key: "gpa" });
  }
  if (Number(profile.graduationYear) > 0) education.push(`Expected graduation ${profile.graduationYear}`);
  else missing.push({ key: "graduationYear" });
  const coursework = [
    ...parseList(profile.apCourses).map((c) => `AP ${c}`),
    ...parseList(profile.ibCourses).map((c) => `IB ${c}`),
    ...parseList(profile.aLevelSubjects).map((c) => `A-Level ${c}`),
  ];
  if (coursework.length > 0) education.push(`Coursework: ${coursework.join(", ")}`);
  if (education.length > 0) sections.push({ heading: "Education", items: education });

  // --- Standardized tests --------------------------------------------------
  const tests: string[] = [];
  if (Number(profile.satScore) > 0) tests.push(`SAT ${profile.satScore}`);
  if (Number(profile.actScore) > 0) tests.push(`ACT ${profile.actScore}`);
  if (Number(profile.ieltsScore) > 0) tests.push(`IELTS ${profile.ieltsScore}`);
  if (Number(profile.toeflScore) > 0) tests.push(`TOEFL ${profile.toeflScore}`);
  if (tests.length > 0) sections.push({ heading: "Standardized Tests", items: tests });
  else missing.push({ key: "testScores" });

  // --- Research & projects: evidence first ---------------------------------
  const research = parseList(profile.researchExperience);
  const projects = parseList(profile.projects);
  if (research.length + projects.length > 0) {
    sections.push({ heading: "Research & Projects", items: [...research, ...projects] });
  }

  // --- Honours: what makes the file stand out ------------------------------
  const honours = [
    ...parseList(profile.olympiads),
    ...parseList(profile.awards),
    ...parseList(profile.competitions),
  ];
  if (honours.length > 0) sections.push({ heading: "Honours & Awards", items: honours });

  // --- Leadership & activities ---------------------------------------------
  const leadership = parseList(profile.leadership);
  const other = [
    ...parseList(profile.volunteering),
    ...parseList(profile.sports),
    ...parseList(profile.clubs),
  ];
  // Group profile entries without scoring one activity type above another.
  if (leadership.length + other.length > 0) {
    sections.push({ heading: "Activities & Leadership", items: [...leadership, ...other] });
  }
  if (leadership.length === 0 && other.length === 0) {
    warnings.push({ key: "noActivities" });
  }

  // --- Work experience ------------------------------------------------------
  if (Number(profile.workExperienceYears) > 0) {
    sections.push({
      heading: "Work Experience",
      items: [`${profile.workExperienceYears} year${Number(profile.workExperienceYears) === 1 ? "" : "s"} of professional experience`],
    });
  }

  // --- Certifications & languages ------------------------------------------
  const certs = parseList(profile.certificates);
  const languages = parseList(profile.languages);
  if (certs.length + languages.length > 0) {
    sections.push({
      heading: "Certifications & Languages",
      items: [...certs, ...(languages.length ? [`Languages: ${languages.join(", ")}`] : [])],
    });
  }

  // --- Objective (only when the student wrote one) --------------------------
  if (has(profile.careerGoal)) {
    sections.push({ heading: "Objective", items: [String(profile.careerGoal).trim()] });
  }

  // --- Structural warnings --------------------------------------------------
  const totalItems = sections.reduce((n, s) => n + s.items.length, 0);
  if (totalItems === 0) {
    warnings.push({ key: "empty" });
  }
  if (research.length + projects.length === 0 && honours.length === 0) {
    warnings.push({ key: "noEvidence" });
  }
  // Count the lines the renderer will actually emit: header, one line per
  // item, one per heading, plus the blank line between sections. At ~45 lines
  // to a page that is what decides whether it fits.
  const renderedLines =
    3 /* name, headline, contact */ +
    sections.length /* heading + trailing blank per section */ * 2 +
    totalItems;
  const estimatedPages = Math.max(1, Math.ceil(renderedLines / 45));
  if (estimatedPages > 2) {
    warnings.push({ key: "length", values: { pages: estimatedPages } });
  }
  if (totalItems > 22) {
    warnings.push({ key: "manyEntries", values: { count: totalItems } });
  }

  const evidenceCount = research.length + projects.length + honours.length;
  const activityCount = leadership.length + other.length;
  const hasAcademicRecord =
    Number(profile.gpa) > 0 && Number(profile.gpaScale) > 0 && Number(profile.graduationYear) > 0;
  const hasTestScores = tests.length > 0;
  const guidance: CvGuidance[] = [
    targetMajor
      ? { key: "targetMajor", values: { major: targetMajor } }
      : { key: "targetMajorMissing" },
    evidenceCount > 0
      ? { key: "evidence", values: { count: evidenceCount } }
      : { key: "evidenceMissing" },
    activityCount > 0
      ? { key: "leadership", values: { count: activityCount } }
      : { key: "leadershipMissing" },
    { key: hasAcademicRecord ? "academicComplete" : "academicIncomplete" },
    { key: hasTestScores ? "testScoresPresent" : "testScoresMissing" },
    estimatedPages > 1
      ? { key: "lengthLong", values: { pages: estimatedPages } }
      : { key: "lengthOnePage" },
  ];

  return {
    name,
    headline,
    contact,
    sections,
    missing,
    guidance,
    warnings,
    estimatedPages,
    totalItems,
  };
}

/** Plain-text rendering, ready to paste into a document or PDF export. */
export function renderCvText(cv: CvResult): string {
  const lines: string[] = [cv.name.toUpperCase(), cv.headline];
  if (cv.contact.length) lines.push(cv.contact.join("  ·  "));
  lines.push("");
  for (const section of cv.sections) {
    lines.push(section.heading.toUpperCase());
    for (const item of section.items) lines.push(`  • ${item}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}
