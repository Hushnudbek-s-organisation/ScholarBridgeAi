/**
 * Growth features — pure logic (no database, no React). Unit-tested by
 * `scripts/check-growth.ts`.
 */
import type { JourneyCheck } from "./defaults";

// ---------------------------------------------------------------------------
// Small parsing helpers
// ---------------------------------------------------------------------------

/** JSON array column → string[] (garbage → []). Accepts a comma list too. */
export function parseList(raw: unknown, max = 30): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? "").trim()).filter(Boolean).slice(0, max);
  }
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return parseList(v, max);
  } catch {
    // not JSON — treat as a comma / newline separated list
  }
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

/** Sanitise a user list: trimmed, de-duplicated, each item capped. */
export function cleanList(raw: unknown, maxItems = 12, maxLen = 120): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of parseList(raw, maxItems * 2)) {
    const v = item.replace(/\u0000/g, "").slice(0, maxLen);
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= maxItems) break;
  }
  return out;
}

export function wordCount(text: string | null | undefined): number {
  if (!text) return 0;
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

// ---------------------------------------------------------------------------
// Profile completeness (journey step 1)
// ---------------------------------------------------------------------------

export interface CompletenessInput {
  gpa?: number | null;
  ieltsScore?: number | null;
  toeflScore?: number | null;
  duolingoScore?: number | null;
  satScore?: number | null;
  country?: string | null;
  graduationYear?: number | null;
  targetMajor?: string | null;
  budgetAnnualUsd?: number | null;
  careerGoal?: string | null;
  leadership?: string | null;
  volunteering?: string | null;
  clubs?: string | null;
  projects?: string | null;
  sports?: string | null;
  awards?: string | null;
  olympiads?: string | null;
}

/** 0–100. Counts only facts the student entered — no invented defaults. */
export function profileCompleteness(p: CompletenessInput | null | undefined): number {
  if (!p) return 0;
  const has = (v: unknown) => v !== null && v !== undefined && v !== "" && !(typeof v === "number" && !Number.isFinite(v));
  const checks = [
    has(p.gpa) && Number(p.gpa) > 0,
    has(p.ieltsScore) || has(p.toeflScore) || has(p.duolingoScore),
    has(p.country),
    has(p.graduationYear),
    has(p.targetMajor),
    has(p.budgetAnnualUsd),
    has(p.careerGoal),
    [p.leadership, p.volunteering, p.clubs, p.projects, p.sports].some((v) => parseList(v).length > 0),
    [p.awards, p.olympiads].some((v) => parseList(v).length > 0),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

// ---------------------------------------------------------------------------
// Journey status
// ---------------------------------------------------------------------------

export interface JourneyCounts {
  completeness: number;
  savedUniversities: number;
  savedScholarships: number;
  appliedScholarships: number;
  answers: number;
  essays: number;
  applications: number;
  visaSessions: number;
  checklistDone: number;
  checklistTotal: number;
}

export const PROFILE_DONE_AT = 70;
export const SHORTLIST_DONE_AT = 5;

/** Is a journey rule satisfied? Returns progress 0–1 for partial credit. */
export function evaluateCheck(check: JourneyCheck, c: JourneyCounts): { done: boolean; progress: number } {
  const ratio = (v: number, target: number) => Math.max(0, Math.min(1, target > 0 ? v / target : 0));
  switch (check) {
    case "profile":
      return { done: c.completeness >= PROFILE_DONE_AT, progress: ratio(c.completeness, PROFILE_DONE_AT) };
    case "universities":
      return { done: c.savedUniversities >= 1, progress: ratio(c.savedUniversities, 1) };
    case "shortlist":
      return { done: c.savedUniversities >= SHORTLIST_DONE_AT, progress: ratio(c.savedUniversities, SHORTLIST_DONE_AT) };
    case "scholarships": {
      const n = c.savedScholarships + c.appliedScholarships;
      return { done: n >= 3, progress: ratio(n, 3) };
    }
    case "answers": {
      const n = c.answers + c.essays;
      return { done: n >= 3, progress: ratio(n, 3) };
    }
    case "applications":
      return { done: c.applications >= 1, progress: ratio(c.applications, 1) };
    case "visa":
      return { done: c.visaSessions >= 1, progress: ratio(c.visaSessions, 1) };
    case "departure":
      return {
        done: c.checklistTotal > 0 && c.checklistDone >= c.checklistTotal,
        progress: ratio(c.checklistDone, c.checklistTotal),
      };
    default:
      return { done: false, progress: 0 };
  }
}

export interface JourneyStepStatus {
  id: string;
  tab: string;
  title: string | null;
  description: string | null;
  done: boolean;
  progress: number;
  current: boolean;
}

export function buildJourney(
  steps: { id: string; check: JourneyCheck; tab: string; enabled: boolean; title: string | null; description: string | null }[],
  counts: JourneyCounts
): { steps: JourneyStepStatus[]; doneCount: number; total: number; percent: number; currentId: string | null } {
  const enabled = steps.filter((s) => s.enabled);
  let currentId: string | null = null;
  const out = enabled.map((s) => {
    const r = evaluateCheck(s.check, counts);
    if (!r.done && currentId === null) currentId = s.id;
    return { id: s.id, tab: s.tab, title: s.title, description: s.description, done: r.done, progress: r.progress, current: false };
  });
  for (const s of out) s.current = s.id === currentId;
  const doneCount = out.filter((s) => s.done).length;
  return {
    steps: out,
    doneCount,
    total: out.length,
    percent: out.length ? Math.round((doneCount / out.length) * 100) : 0,
    currentId,
  };
}

// ---------------------------------------------------------------------------
// Success stories — "find my twin" similarity (AdmitYogi's College Twin idea)
// ---------------------------------------------------------------------------

export interface TwinInput {
  major?: string | null;
  degreeLevel?: string | null;
  gpa?: number | null;
  gpaScale?: number | null;
  ielts?: number | null;
  sat?: number | null;
  homeCountry?: string | null;
  admittedCountry?: string | null;
}

export interface TwinProfile extends TwinInput {
  preferredCountries?: string[];
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9а-яё ]+/gi, " ").replace(/\s+/g, " ").trim();

function tokenOverlap(a: string | null | undefined, b: string | null | undefined): number {
  const ta = new Set(norm(a).split(" ").filter((w) => w.length > 2));
  const tb = new Set(norm(b).split(" ").filter((w) => w.length > 2));
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const w of ta) if (tb.has(w)) hit++;
  return hit / Math.min(ta.size, tb.size);
}

export function gpaTo4(gpa: number | null | undefined, scale: number | null | undefined): number | null {
  if (gpa == null || !Number.isFinite(gpa) || gpa <= 0) return null;
  const s = scale && Number.isFinite(scale) && scale > 0 ? scale : 4;
  return Math.max(0, Math.min(4, (gpa / s) * 4));
}

/**
 * 0–100 similarity + human-readable reasons. Weights: field 30, degree 15,
 * GPA 25, English 10, SAT 10, country fit 10. Missing data on either side is
 * skipped and the score is re-normalised, so an incomplete story never looks
 * like a perfect match by accident.
 */
export function twinScore(me: TwinProfile, story: TwinInput): { score: number; reasons: string[] } {
  let got = 0;
  let max = 0;
  const reasons: string[] = [];

  if (me.major && story.major) {
    max += 30;
    const o = norm(me.major) === norm(story.major) ? 1 : tokenOverlap(me.major, story.major);
    got += 30 * o;
    if (o >= 0.5) reasons.push("same_field");
  }
  if (me.degreeLevel && story.degreeLevel) {
    max += 15;
    if (norm(me.degreeLevel) === norm(story.degreeLevel)) {
      got += 15;
      reasons.push("same_degree");
    }
  }
  const g1 = gpaTo4(me.gpa, me.gpaScale);
  const g2 = gpaTo4(story.gpa, story.gpaScale);
  if (g1 != null && g2 != null) {
    max += 25;
    const d = Math.abs(g1 - g2);
    const part = Math.max(0, 1 - d / 0.8); // 0.8 GPA points apart → 0
    got += 25 * part;
    if (d <= 0.25) reasons.push("similar_gpa");
  }
  if (me.ielts && story.ielts) {
    max += 10;
    const d = Math.abs(me.ielts - story.ielts);
    got += 10 * Math.max(0, 1 - d / 1.5);
    if (d <= 0.5) reasons.push("similar_english");
  }
  if (me.sat && story.sat) {
    max += 10;
    const d = Math.abs(me.sat - story.sat);
    got += 10 * Math.max(0, 1 - d / 250);
    if (d <= 80) reasons.push("similar_sat");
  }
  const countries = (me.preferredCountries ?? []).map(norm);
  if (story.admittedCountry && countries.length) {
    max += 10;
    if (countries.includes(norm(story.admittedCountry))) {
      got += 10;
      reasons.push("target_country");
    }
  }
  if (me.homeCountry && story.homeCountry && norm(me.homeCountry) === norm(story.homeCountry)) {
    reasons.push("same_home_country");
  }
  if (max === 0) return { score: 0, reasons: [] };
  // Re-normalise, but damp scores built on very little evidence.
  const evidence = Math.min(1, max / 60);
  return { score: Math.round((got / max) * 100 * evidence), reasons };
}

// ---------------------------------------------------------------------------
// Scholarship autopilot (ScholarshipOwl-style match queue)
// ---------------------------------------------------------------------------

export interface AutopilotScholarship {
  id: number;
  title: string;
  provider: string;
  country: string;
  coverageType: string;
  amountUsdValue: number | null;
  deadlineDate: string | null;
  degreeLevels: string;
  eligibleMajors: string;
  requirements: string;
  requiredDocuments: string | null;
  recurrence: string | null;
  computedStatus?: string | null;
  matchScore: number | null;
}

const ESSAY_RE = /\b(essay|personal statement|statement of purpose|sop|motivation letter|motivational letter|cover letter|research proposal|study plan)\b/i;

/** "Essay listed" is derived from the published requirement text — never guessed further. */
export function essayListed(s: Pick<AutopilotScholarship, "requirements" | "requiredDocuments">): boolean {
  const docs = parseList(s.requiredDocuments).join(" ");
  return ESSAY_RE.test(`${s.requirements ?? ""} ${docs}`);
}

export function daysUntil(dateStr: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr.slice(0, 10)}T23:59:59Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
}

/**
 * Next expected deadline for a recurring (annual) scholarship whose last
 * published deadline has passed: same day/month, rolled forward to the
 * future. Labelled "expected" in the UI — never presented as confirmed.
 */
export function nextExpectedDeadline(dateStr: string | null | undefined, recurrence: string | null | undefined, now: Date = new Date()): string | null {
  if (!dateStr || !recurrence || recurrence === "none") return null;
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const step = recurrence === "biannual" ? 6 : 12; // months
  let guard = 0;
  while (d.getTime() < now.getTime() && guard++ < 40) d.setUTCMonth(d.getUTCMonth() + step);
  return d.toISOString().slice(0, 10);
}

export function autopilotTags(s: AutopilotScholarship, now: Date = new Date()) {
  const days = daysUntil(s.deadlineDate, now);
  const recurring = !!s.recurrence && s.recurrence !== "none";
  const closed = (days != null && days < 0) || s.computedStatus === "closed";
  const expected = closed && recurring ? nextExpectedDeadline(s.deadlineDate, s.recurrence, now) : null;
  return {
    essay: essayListed(s),
    fullFunding: /full/i.test(s.coverageType ?? ""),
    closingSoon: !closed && days != null && days >= 0 && days <= 30,
    closed,
    recurring,
    /** Closed this round but recurs — worth preparing for the next round. */
    reopens: !!expected,
    expectedDeadline: expected,
    daysLeft: closed ? null : days,
  };
}

/**
 * Queue priority: good match first, then urgency. A scholarship closing in
 * 10 days with 70% match outranks a 75% match with no deadline pressure.
 */
export function autopilotPriority(s: AutopilotScholarship, now: Date = new Date()): number {
  const t = autopilotTags(s, now);
  const match = s.matchScore ?? 40;
  // Closed but recurring: still useful to prepare early, ranked below open ones.
  const urgencyFor = (days: number | null) => (days == null ? 0 : days <= 14 ? 15 : days <= 30 ? 10 : days <= 60 ? 5 : 0);
  if (t.closed) return t.reopens ? match - 25 + urgencyFor(daysUntil(t.expectedDeadline, now)) : -1;
  const urgency = urgencyFor(t.daysLeft);
  return match + urgency + (t.fullFunding ? 5 : 0);
}

/** Jaccard-style similarity used for "similar to what you applied to". */
export function scholarshipSimilarity(a: AutopilotScholarship, b: AutopilotScholarship): number {
  if (a.id === b.id) return 0;
  let score = 0;
  if (norm(a.country) === norm(b.country)) score += 0.35;
  const la = new Set(parseList(a.degreeLevels).map(norm));
  const lb = parseList(b.degreeLevels).map(norm);
  if (lb.some((l) => la.has(l))) score += 0.2;
  const ma = parseList(a.eligibleMajors).map(norm);
  const mb = parseList(b.eligibleMajors).map(norm);
  if (ma.includes("all") || mb.includes("all") || mb.some((m) => ma.includes(m))) score += 0.2;
  if (/full/i.test(a.coverageType) === /full/i.test(b.coverageType)) score += 0.15;
  if (norm(a.provider) && norm(a.provider) === norm(b.provider)) score += 0.1;
  return Math.round(score * 100) / 100;
}

export function similarScholarships(
  applied: AutopilotScholarship[],
  pool: AutopilotScholarship[],
  exclude: Set<number>,
  limit = 4
): { scholarship: AutopilotScholarship; basedOn: string; similarity: number }[] {
  const best = new Map<number, { scholarship: AutopilotScholarship; basedOn: string; similarity: number }>();
  for (const a of applied) {
    for (const p of pool) {
      if (exclude.has(p.id)) continue;
      const sim = scholarshipSimilarity(a, p);
      if (sim < 0.5) continue;
      const prev = best.get(p.id);
      if (!prev || sim > prev.similarity) best.set(p.id, { scholarship: p, basedOn: a.title, similarity: sim });
    }
  }
  return [...best.values()]
    .sort((x, y) => y.similarity - x.similarity || (y.scholarship.matchScore ?? 0) - (x.scholarship.matchScore ?? 0))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export interface GoalStep {
  text: string;
  done: boolean;
}

export function parseSteps(raw: unknown): GoalStep[] {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(v)) return [];
  const out: GoalStep[] = [];
  for (const item of v.slice(0, 15)) {
    if (typeof item === "string") {
      const text = item.trim().slice(0, 200);
      if (text) out.push({ text, done: false });
    } else if (item && typeof item === "object") {
      const text = String((item as { text?: unknown }).text ?? "").trim().slice(0, 200);
      if (text) out.push({ text, done: (item as { done?: unknown }).done === true });
    }
  }
  return out;
}

export function goalProgress(steps: GoalStep[]): number {
  if (!steps.length) return 0;
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}
