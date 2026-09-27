/**
 * Success stories — validation and public projection. Shared by the student
 * submit route and the admin moderation route.
 */
import type { successStories } from "@/db/schema";
import { clampString, optionalNumber } from "@/lib/request";
import { cleanList, parseList } from "./logic";

type StoryRow = typeof successStories.$inferSelect;

const DEGREES = ["Bachelor", "Master", "PhD", "Foundation", "Other"];

/** Whitelisted, clamped values from a story form (student or admin). */
export function storyValues(b: Record<string, unknown>) {
  const num = (v: unknown, min: number, max: number, integer = false) => {
    const n = optionalNumber(v, { min, max, integer });
    return n === undefined || n === null || n <= 0 ? null : n;
  };
  const degree = clampString(b.degreeLevel, 30);
  return {
    displayName: clampString(b.displayName, 60) || "Anonymous",
    homeCountry: clampString(b.homeCountry, 60) || null,
    admittedUniversity: clampString(b.admittedUniversity, 140),
    admittedCountry: clampString(b.admittedCountry, 60) || null,
    otherAdmits: JSON.stringify(cleanList(b.otherAdmits, 10, 120)),
    degreeLevel: DEGREES.includes(degree) ? degree : null,
    major: clampString(b.major, 100) || null,
    intakeYear: num(b.intakeYear, 1990, 2100, true),
    gpa: num(b.gpa, 0, 100),
    gpaScale: num(b.gpaScale, 1, 100),
    ielts: num(b.ielts, 0, 9),
    toefl: num(b.toefl, 0, 120, true),
    sat: num(b.sat, 400, 1600, true),
    activities: JSON.stringify(cleanList(b.activities, 12, 160)),
    awards: JSON.stringify(cleanList(b.awards, 10, 160)),
    essayTitle: clampString(b.essayTitle, 160) || null,
    essayExcerpt: clampString(b.essayExcerpt, 4000) || null,
    advice: clampString(b.advice, 2000) || null,
    scholarshipName: clampString(b.scholarshipName, 140) || null,
    scholarshipAmountUsd: num(b.scholarshipAmountUsd, 0, 10_000_000, true),
  };
}

/** What other students may see. Never exposes profileId or admin notes. */
export function publicStory(r: StoryRow, extra: { twin?: number | null; reasons?: string[]; mine?: boolean } = {}) {
  return {
    id: r.id,
    displayName: r.displayName,
    homeCountry: r.homeCountry,
    admittedUniversity: r.admittedUniversity,
    admittedCountry: r.admittedCountry,
    otherAdmits: parseList(r.otherAdmits),
    degreeLevel: r.degreeLevel,
    major: r.major,
    intakeYear: r.intakeYear,
    gpa: r.gpa,
    gpaScale: r.gpaScale,
    ielts: r.ielts,
    toefl: r.toefl,
    sat: r.sat,
    activities: parseList(r.activities),
    awards: parseList(r.awards),
    essayTitle: r.essayTitle,
    essayExcerpt: r.essayExcerpt,
    advice: r.advice,
    scholarshipName: r.scholarshipName,
    scholarshipAmountUsd: r.scholarshipAmountUsd,
    isVerified: r.isVerified,
    isFeatured: r.isFeatured,
    views: r.views,
    createdAt: r.createdAt,
    twin: extra.twin ?? null,
    reasons: extra.reasons ?? [],
    ...(extra.mine ? { status: r.status, mine: true } : {}),
  };
}
