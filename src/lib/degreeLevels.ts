/**
 * Catalogue degree aliases, shared by discovery filtering and display.
 * This normalises labels, not stored data or eligibility: an unspecified
 * level is NOT evidence that a university offers every degree.
 */
export type DegreeLevel = "Bachelor" | "Master" | "PhD" | "Diploma" | "All";
export type DegreeLabelKey = "bachelor" | "master" | "phd" | "diploma" | "all" | "unspecified";

const aliasGroups: Record<DegreeLevel, readonly string[]> = {
  Bachelor: [
    "bachelor", "bachelors", "undergraduate", "undergraduates", "undergrad", "ug",
    "bachelor of arts", "bachelor of science", "bachelor of engineering",
    "ba", "bs", "bsc", "beng", "bba", "bakalavr", "bakalavriat", "бакалавр", "бакалавриат",
  ],
  Master: [
    "master", "masters", "graduate", "graduates", "grad", "postgraduate", "postgraduates", "postgrad",
    "post graduate", "post grad", "pg", "master of arts", "master of science", "master of engineering",
    "ma", "ms", "msc", "meng", "mba", "med", "magistr", "magistratura", "магистр", "магистратура",
  ],
  PhD: [
    "phd", "ph d", "doctorate", "doctorates", "doctoral", "doctor of philosophy", "dphil", "d phil",
    "doktorantura", "докторантура", "аспирантура",
  ],
  Diploma: [
    "diploma", "diplomas", "graduate diploma", "postgraduate diploma", "post graduate diploma",
    "pgdip", "pg dip", "diplom", "диплом",
  ],
  All: ["all", "alls"],
};

const aliases = new Map<string, DegreeLevel>(
  (Object.entries(aliasGroups) as [DegreeLevel, readonly string[]][])
    .flatMap(([level, labels]) => labels.map((label) => [label, level] as const)),
);

function cleanLabel(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘']/g, "")
    .replace(/\./g, "")
    .replace(/\s+[–—-]\s+/g, "/")
    .replace(/[-_]/g, " ")
    .replace(/\b(?:degrees?|programs?|programmes?|levels?|only)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Recognise complete labels, not substrings ("undergraduate" contains
 * "graduate", but is NOT a Master's degree). Parentheses support paired
 * names; separators support explicitly listed levels such as Bachelor/Master.
 * If any part is unrecognised, the record remains unspecified: do not infer
 * incompatibility from an incomplete or ambiguous catalogue label.
 */
function recognisedLevels(value: string | null | undefined): DegreeLevel[] | null {
  if (!value?.trim()) return null;
  // Several catalogue columns store a JSON array (["Master","PhD"]); accept
  // it everywhere a label is accepted so a stored list is never "unknown".
  let raw = value;
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) raw = parsed.map((x) => String(x)).join("/");
    } catch {
      // not valid JSON — fall through and treat it as a label
    }
  }
  const label = cleanLabel(raw);
  const direct = aliases.get(label);
  if (direct) return [direct];

  const parts = label.split(/[()[\]{},/;&+|]|\band\b/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const levels = parts.map((part) => aliases.get(part));
  if (levels.some((level) => level === undefined)) return null;
  return [...new Set(levels as DegreeLevel[])];
}

/** A single canonical value for controls; unknown is never coerced to All. */
export function normalizeDegreeLevel(value: string | null | undefined): DegreeLevel | null {
  const levels = recognisedLevels(value);
  if (levels?.includes("All")) return "All";
  return levels?.length === 1 ? levels[0] : null;
}

/** Discovery visibility, NOT a claim of verified degree availability. */
export function supportsDegreeLevel(
  universityLevel: string | null | undefined,
  requestedLevel: string | null | undefined,
): boolean {
  const offered = recognisedLevels(universityLevel);
  const requested = recognisedLevels(requestedLevel);
  // Only an explicit, recognised conflict excludes a row. Unspecified stays
  // visible, with its original value (including NULL) unchanged in the API.
  if (!offered || !requested || offered.includes("All") || requested.includes("All")) return true;
  return offered.some((level) => requested.includes(level));
}

const labelKeys: Record<DegreeLevel, DegreeLabelKey> = {
  Bachelor: "bachelor",
  Master: "master",
  PhD: "phd",
  Diploma: "diploma",
  All: "all",
};

export function formatDegreeLevel(
  value: string | null | undefined,
  translate: (key: DegreeLabelKey) => string,
): string {
  const levels = recognisedLevels(value);
  if (!levels) return translate("unspecified");
  if (levels.includes("All")) return translate("all");
  return levels.map((level) => translate(labelKeys[level])).join(" / ");
}

/**
 * Compare a student's level with a catalogue record's level for SCORING.
 *
 *   • "match"    — both sides recognised and they intersect ("All" matches
 *                  anything, in either direction);
 *   • "mismatch" — both sides recognised and they do NOT intersect
 *                  (e.g. student Bachelor, catalogue Master only);
 *   • "unknown"  — at least one side is unrecognised/empty. Unknown is NEVER
 *                  treated as a mismatch (the record may well be open) and
 *                  never as a match (we do not claim eligibility).
 *
 * This is the same recognition table the discovery filters use, so a label
 * like "Master's", "MSc", "магистратура" or "Master (graduate)" all compare
 * equal to the catalogue's "Master".
 */
export type DegreeLevelComparison = "match" | "mismatch" | "unknown";

export function compareDegreeLevels(
  studentLevel: string | null | undefined,
  catalogueLevels: string | null | undefined,
): DegreeLevelComparison {
  const student = recognisedLevels(studentLevel);
  const offered = recognisedLevels(catalogueLevels);
  if (!student || !offered || !student.length || !offered.length) return "unknown";
  if (student.includes("All") || offered.includes("All")) return "match";
  return offered.some((level) => student.includes(level)) ? "match" : "mismatch";
}

/**
 * SAT/ACT are UNDERGRADUATE-admission tests. A published SAT/ACT minimum is
 * evidence about undergraduate entry, so it must never be presented (or
 * scored) as a requirement for a known graduate applicant, and it does not
 * apply at all to an institution that does not admit undergraduates.
 *
 * The test is suppressed only when we KNOW it cannot apply — an unrecognised
 * label never hides a published requirement:
 *   • the student's level is recognised and contains only graduate levels
 *     (Master / PhD / Diploma), or
 *   • the university's level is recognised and offers no Bachelor intake.
 */
export function undergraduateTestApplies(
  universityLevel: string | null | undefined,
  studentLevel?: string | null,
): boolean {
  if (studentLevel !== undefined) {
    const student = recognisedLevels(studentLevel);
    if (
      student?.length &&
      !student.includes("All") &&
      student.every((level) => level === "Master" || level === "PhD" || level === "Diploma")
    ) {
      return false;
    }
  }
  const offered = recognisedLevels(universityLevel);
  if (offered?.length && !offered.includes("All") && !offered.includes("Bachelor")) {
    return false;
  }
  return true;
}

/** True when the catalogue record is KNOWN to admit undergraduates. */
export function hasUndergraduateAdmission(universityLevel: string | null | undefined): boolean {
  const offered = recognisedLevels(universityLevel);
  if (!offered?.length) return false;
  return offered.includes("All") || offered.includes("Bachelor");
}
