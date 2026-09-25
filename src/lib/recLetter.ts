/**
 * #20 Recommendation letter helper.
 *
 * A data-driven brief the student hands to their recommender:
 *   - talking points — ONLY real facts from the profile (nothing invented)
 *   - a suggested letter outline with those facts already placed
 *   - dataMissing — what the student should add to the profile first
 *   - checklist — the practical steps around sending the request
 *
 * Pure and deterministic: same profile in, same brief out. The recommender
 * writes the letter; this makes sure they have concrete facts instead of
 * "the student is very hardworking".
 */

import { normalizedGpa, parseListColumn, type ChancingProfile } from "./chancing";

export interface RecLetterProfile extends ChancingProfile {
  name?: string | null;
}

export interface RecLetterOpts {
  universityTitle?: string | null;
  deadline?: string | null;
}

export interface RecLetterBrief {
  forUniversity: string | null;
  deadline: string | null;
  talkingPoints: string[];
  outline: { section: string; draft: string }[];
  dataMissing: string[];
  checklist: string[];
}

export function buildRecLetterBrief(profile: RecLetterProfile, opts: RecLetterOpts = {}): RecLetterBrief {
  const name = profile.name?.trim() || "the student";
  const major = profile.targetMajor?.trim() || null;
  const talkingPoints: string[] = [];
  const dataMissing: string[] = [];

  // ---- academic facts -----------------------------------------------------
  const gpa4 = normalizedGpa({ gpa: profile.gpa ?? null, gpaScale: profile.gpaScale ?? null });
  let gpaPoint: string | null = null;
  if (profile.gpa != null && profile.gpa > 0 && profile.gpaScale != null && profile.gpaScale > 0) {
    gpaPoint = gpa4 != null ? `GPA ${profile.gpa} on a ${profile.gpaScale} scale (${gpa4.toFixed(2)}/4.0)` : `GPA ${profile.gpa} on a ${profile.gpaScale} scale`;
    talkingPoints.push(gpaPoint);
  } else {
    dataMissing.push("GPA and scale");
  }

  let englishPoint: string | null = null;
  if (profile.ieltsScore != null && profile.ieltsScore > 0) {
    englishPoint = `IELTS ${profile.ieltsScore}`;
    talkingPoints.push(englishPoint);
  } else if (profile.toeflScore != null && profile.toeflScore > 0) {
    englishPoint = `TOEFL ${profile.toeflScore}`;
    talkingPoints.push(englishPoint);
  } else {
    dataMissing.push("English test score");
  }

  // ---- achievements -------------------------------------------------------
  const olympiads = parseListColumn(profile.olympiads).slice(0, 2);
  for (const o of olympiads) talkingPoints.push(`Olympiad: ${o}`);
  const awards = parseListColumn(profile.awards).slice(0, 3);
  for (const a of awards) talkingPoints.push(`Award: ${a}`);
  const competitions = parseListColumn(profile.competitions).slice(0, 2);
  for (const c of competitions) talkingPoints.push(`Competition: ${c}`);
  if (!olympiads.length && !awards.length && !competitions.length) dataMissing.push("Awards, olympiads or competitions");

  // ---- activities ---------------------------------------------------------
  const leadership = parseListColumn(profile.leadership).slice(0, 3);
  for (const l of leadership) talkingPoints.push(`Leadership: ${l}`);
  if (!leadership.length) dataMissing.push("Leadership roles");

  const research = parseListColumn(profile.researchExperience).slice(0, 2);
  for (const r of research) talkingPoints.push(`Research: ${r}`);
  const projects = parseListColumn(profile.projects).slice(0, 2);
  for (const p of projects) talkingPoints.push(`Project: ${p}`);
  if (!research.length && !projects.length) dataMissing.push("Research or projects");

  if (profile.workExperienceYears != null && profile.workExperienceYears > 0) {
    talkingPoints.push(`${profile.workExperienceYears} year${profile.workExperienceYears > 1 ? "s" : ""} of work experience`);
  }
  const volunteering = parseListColumn(profile.volunteering).slice(0, 2);
  for (const v of volunteering) talkingPoints.push(`Community: ${v}`);
  if (!volunteering.length) dataMissing.push("Volunteering or community activity");

  // ---- outline: every section uses only facts that exist -------------------
  const outline: { section: string; draft: string }[] = [];
  const program = opts.universityTitle?.trim()
    ? `the ${opts.universityTitle.trim()} program${major ? ` in ${major}` : ""}`
    : major
      ? `a ${major} program`
      : "their target program";

  outline.push({
    section: "Opening",
    draft: `I am writing to recommend ${name} for ${program}. [Relationship and how long you have known them — one sentence.]`,
  });

  if (gpaPoint) {
    outline.push({
      section: "Academic strengths",
      draft: `${name} has ${gpaPoint}${englishPoint ? ` and ${englishPoint}` : ""}. [One concrete example of how that showed up in your class — a project, a result, a moment you still remember.]`,
    });
  }
  if (leadership.length || research.length || projects.length) {
    const items = [
      ...leadership.map((l) => l),
      ...research.map((r) => r),
      ...projects.map((p) => p),
    ];
    outline.push({
      section: "Leadership and initiative",
      draft: `Beyond grades, ${name} has taken on real responsibility: ${items.join("; ")}. [Which of these impressed you most, and why? — one paragraph.]`,
    });
  }
  if (volunteering.length) {
    outline.push({
      section: "Character and commitment",
      draft: `${name} has also committed time to: ${volunteering.join("; ")}. [A moment that showed their character.]`,
    });
  }
  outline.push({
    section: "Closing",
    draft: `I recommend ${name}${major ? ` for ${major} studies` : ""} without reservation. [Your strongest single sentence about them.]`,
  });

  // ---- practical checklist --------------------------------------------------
  const checklist: string[] = [];
  if (opts.deadline?.trim()) {
    checklist.push(`Ask the recommender to send it at least 2 weeks before the ${opts.deadline.trim()} deadline`);
  } else {
    checklist.push("Ask the recommender at least 3–4 weeks before the deadline");
  }
  checklist.push("Attach your CV and transcript so the letter uses concrete facts");
  checklist.push("Share this outline with the recommender and let them edit it — it is a starting point, not a template to copy");
  checklist.push("Send one reminder about a week before the deadline");
  checklist.push("Thank the recommender after submission — and report the outcome in ScholarBridge");

  return {
    forUniversity: opts.universityTitle?.trim() || null,
    deadline: opts.deadline?.trim() || null,
    talkingPoints,
    outline,
    dataMissing,
    checklist,
  };
}
