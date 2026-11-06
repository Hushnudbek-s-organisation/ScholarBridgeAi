/**
 * Eligibility-list semantics — one definition for catalogue rows, admin forms,
 * matching, recommendations and Telegram text.
 *
 * The columns are JSON-array text. An empty array is NOT "open to all": it
 * means the official scope was not recorded. An explicit unrestricted scope
 * uses `["*"]`; a dimension that does not apply uses
 * `["__not_applicable__"]`. Legacy rows containing "All", "All Majors", etc.
 * are kept readable but tagged `legacy` so they are never mistaken for
 * source-backed evidence. Unknown is not a match, a rejection, or zero.
 */
export type EligibilityScope = "unknown" | "unrestricted" | "not_applicable" | "restricted";

export const EXPLICIT_UNRESTRICTED_TOKEN = "*";
export const NOT_APPLICABLE_TOKEN = "__not_applicable__";

export interface ParsedEligibilityScope {
  scope: EligibilityScope;
  /** Concrete values only; tokens such as "*" are excluded. */
  values: string[];
  /** "explicit" = new typed token; "legacy" = unverified old wording; "none" = no evidence. */
  evidence: "explicit" | "legacy" | "none";
}

const LEGACY_ALL = /^(all|any|all\s+(countries|majors|degrees|levels|fields)|worldwide|international|global|no\s+restriction|open\s+to\s+all)$/i;
const LEGACY_ALL_CONTAINS = /\b(all countries|all majors|all degrees|worldwide|international|global)\b/i;

function clean(raw: string | null | undefined): string {
  return String(raw ?? "").trim();
}

/**
 * Parse both JSON arrays and the prose that older imports stored. Never throws:
 * a malformed value is unknown, not an implicit eligibility claim.
 */
export function parseEligibilityScope(raw: string | null | undefined): ParsedEligibilityScope {
  const text = clean(raw);
  if (!text || text === "[]") return { scope: "unknown", values: [], evidence: "none" };

  let entries: string[] = [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      entries = Array.isArray(parsed) ? parsed.map((v) => clean(String(v))).filter(Boolean) : [];
    } catch {
      return { scope: "unknown", values: [], evidence: "none" };
    }
  } else {
    entries = text.split(/[,;|]/).map(clean).filter(Boolean);
  }

  if (entries.includes(EXPLICIT_UNRESTRICTED_TOKEN)) {
    return { scope: "unrestricted", values: [], evidence: "explicit" };
  }
  if (entries.includes(NOT_APPLICABLE_TOKEN)) {
    return { scope: "not_applicable", values: [], evidence: "explicit" };
  }

  const legacyAll = entries.some((v) => LEGACY_ALL.test(v)) ||
    (!text.startsWith("[") && LEGACY_ALL_CONTAINS.test(text));
  if (legacyAll) {
    return { scope: "unrestricted", values: [], evidence: "legacy" };
  }

  const values = entries.filter((v) => !LEGACY_ALL.test(v));
  if (!values.length) return { scope: "unknown", values: [], evidence: "none" };
  return { scope: "restricted", values, evidence: "legacy" };
}

/** The canonical stored form for an explicitly unrestricted scope. */
export function explicitUnrestrictedScope(): string {
  return JSON.stringify([EXPLICIT_UNRESTRICTED_TOKEN]);
}

/** The canonical stored form for a dimension that does not apply. */
export function notApplicableScope(): string {
  return JSON.stringify([NOT_APPLICABLE_TOKEN]);
}

/** Normalize admin/import input without inventing an "All" default. */
export function normalizeEligibilityScopeInput(raw: string | null | undefined): string {
  const parsed = parseEligibilityScope(raw);
  if (parsed.scope === "unrestricted") {
    return parsed.evidence === "explicit" ? explicitUnrestrictedScope() : JSON.stringify(["All"]);
  }
  if (parsed.scope === "not_applicable") return notApplicableScope();
  if (parsed.scope === "unknown") return "[]";
  return JSON.stringify(parsed.values);
}

export type ScopeVerdict = "eligible" | "not_eligible" | "unknown" | "not_applicable";

/**
 * Evaluate a profile value against the scope. `matcher` is called only for a
 * restricted list; unknown never becomes `eligible`.
 */
export function evaluateEligibilityScope(
  raw: string | null | undefined,
  matcher: (values: string[]) => boolean | null | undefined,
): ScopeVerdict {
  const parsed = parseEligibilityScope(raw);
  if (parsed.scope === "not_applicable") return "not_applicable";
  if (parsed.scope === "unknown") return "unknown";
  if (parsed.scope === "unrestricted") return "eligible";
  const matched = matcher(parsed.values);
  if (matched == null) return "unknown";
  return matched ? "eligible" : "not_eligible";
}

/** Stable i18n key for an honest scope label. */
export function eligibilityScopeLabelKey(raw: string | null | undefined): string {
  const parsed = parseEligibilityScope(raw);
  if (parsed.scope === "unrestricted") {
    return parsed.evidence === "legacy"
      ? "eligibility.scope.unrestricted_legacy"
      : "eligibility.scope.unrestricted";
  }
  return `eligibility.scope.${parsed.scope}`;
}
