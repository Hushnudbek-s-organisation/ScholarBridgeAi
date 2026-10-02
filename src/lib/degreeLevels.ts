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
  const label = cleanLabel(value);
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
