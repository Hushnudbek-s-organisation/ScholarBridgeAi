/**
 * `scholarship_channel_content` — the Uzbek copy an editor writes for one
 * scholarship: tagline, funding line, language requirement, eligibility and
 * benefit bullets, an "about" paragraph and extra hashtags.
 *
 * This copy is authored in the admin panel and nowhere else. It is never
 * generated from the English `scholarships` columns, never translated by a
 * model and never scraped: a missing field simply means the section is dropped.
 */

export interface ScholarshipContent {
  scholarshipId: number;
  taglineUz: string | null;
  fundingTypeUz: string | null;
  languageReqUz: string | null;
  /** Bullet strings, rendered with "➡️". */
  eligibilityUz: string[];
  benefitsUz: string[];
  aboutUz: string | null;
  extraHashtags: string[];
}

export const EMPTY_CONTENT = (scholarshipId: number): ScholarshipContent => ({
  scholarshipId,
  taglineUz: null,
  fundingTypeUz: null,
  languageReqUz: null,
  eligibilityUz: [],
  benefitsUz: [],
  aboutUz: null,
  extraHashtags: [],
});

export interface ContentRowLike {
  scholarshipId: number;
  taglineUz: string | null;
  fundingTypeUz: string | null;
  languageReqUz: string | null;
  eligibilityUz: string | null;
  benefitsUz: string | null;
  aboutUz: string | null;
  extraHashtags: string | null;
}

function parseList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v).trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function text(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  return value ? value : null;
}

export function contentFromRow(row: ContentRowLike): ScholarshipContent {
  return {
    scholarshipId: row.scholarshipId,
    taglineUz: text(row.taglineUz),
    fundingTypeUz: text(row.fundingTypeUz),
    languageReqUz: text(row.languageReqUz),
    eligibilityUz: parseList(row.eligibilityUz),
    benefitsUz: parseList(row.benefitsUz),
    aboutUz: text(row.aboutUz),
    extraHashtags: parseList(row.extraHashtags),
  };
}

/**
 * "Rich" = a tagline, a funding line, and at least one of the three body
 * sections. Anything less uses the compact templates.
 */
export function isRichContent(content: ScholarshipContent | null | undefined): boolean {
  if (!content) return false;
  if (!content.taglineUz || !content.fundingTypeUz) return false;
  return content.eligibilityUz.length > 0 || content.benefitsUz.length > 0 || Boolean(content.aboutUz);
}

export interface CompletenessReport {
  rich: boolean;
  missing: string[];
  filled: number;
  total: number;
}

/** Used by the admin completeness badge and by the planner's tie-break. */
export function contentCompleteness(content: ScholarshipContent | null | undefined): CompletenessReport {
  const c = content ?? EMPTY_CONTENT(0);
  const checks: [string, boolean][] = [
    ["tagline", Boolean(c.taglineUz)],
    ["funding", Boolean(c.fundingTypeUz)],
    ["language", Boolean(c.languageReqUz)],
    ["eligibility", c.eligibilityUz.length > 0],
    ["benefits", c.benefitsUz.length > 0],
    ["about", Boolean(c.aboutUz)],
    ["hashtags", c.extraHashtags.length > 0],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return {
    rich: isRichContent(c),
    missing,
    filled: checks.length - missing.length,
    total: checks.length,
  };
}

/** Bullet lists are capped so a single post cannot become a wall of text. */
export const MAX_BULLETS = 6;
export const MAX_TAGLINE_CHARS = 160;
export const MAX_ABOUT_CHARS = 900;

/**
 * Shape the stored copy into what a post may print: trimmed, capped, and
 * stripped of anything empty. No generation, no translation.
 */
export function normalizeContentForPost(content: ScholarshipContent): ScholarshipContent {
  return {
    ...content,
    taglineUz: content.taglineUz ? content.taglineUz.slice(0, MAX_TAGLINE_CHARS).trim() : null,
    aboutUz: content.aboutUz ? content.aboutUz.slice(0, MAX_ABOUT_CHARS).trim() : null,
    eligibilityUz: content.eligibilityUz.slice(0, MAX_BULLETS),
    benefitsUz: content.benefitsUz.slice(0, MAX_BULLETS),
  };
}
