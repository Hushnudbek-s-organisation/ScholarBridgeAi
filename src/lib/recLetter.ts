/**
 * #20 Recommendation letter helper.
 *
 * A data-driven, editable brief for the student's recommender. It uses only
 * verified profile facts, labels student-provided notes for review, and leaves
 * the recommender in control of the final wording and claims.
 */

import { normalizedGpa, parseListColumn, type ChancingProfile } from "./chancing";

export interface RecLetterProfile extends ChancingProfile {
  name?: string | null;
}

export interface RecLetterOpts {
  universityTitle?: string | null;
  deadline?: string | null;
  /** Optional student note, not a claim until the recommender verifies it. */
  relationshipContext?: string | null;
  /** One or two qualities the student hopes the letter will address. */
  requestedFocus?: string | null;
  /** A student-suggested anecdote or project to verify before using. */
  supportingExample?: string | null;
}

export type RecLetterAdviceKey =
  | "relationshipMissing"
  | "relationshipProvided"
  | "focusMissing"
  | "focusMissingNoMajor"
  | "focusProvided"
  | "exampleMissing"
  | "exampleProvided"
  | "targetMajorMissing"
  | "evidencePresent"
  | "evidenceMissing"
  | "academicContext";

export interface RecLetterAdvice {
  key: RecLetterAdviceKey;
  values?: Record<string, string | number>;
}

export interface RecLetterBrief {
  forUniversity: string | null;
  deadline: string | null;
  talkingPoints: string[];
  outline: { section: string; draft: string }[];
  dataMissing: string[];
  checklist: string[];
  personalizationAdvice: RecLetterAdvice[];
}

const cleanOptional = (value: string | null | undefined, maxLength: number): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/gu, " ").trim().slice(0, maxLength).trim();
  return cleaned || null;
};

export function buildRecLetterBrief(profile: RecLetterProfile, opts: RecLetterOpts = {}): RecLetterBrief {
  const name = profile.name?.trim() || "the student";
  const major = profile.targetMajor?.trim() || null;
  const universityTitle = cleanOptional(opts.universityTitle, 160);
  const deadline = cleanOptional(opts.deadline, 80);
  const relationshipContext = cleanOptional(opts.relationshipContext, 240);
  const requestedFocus = cleanOptional(opts.requestedFocus, 300);
  const supportingExample = cleanOptional(opts.supportingExample, 500);
  const talkingPoints: string[] = [];
  const dataMissing: string[] = [];

  // ---- academic facts -----------------------------------------------------
  const gpa4 = normalizedGpa({ gpa: profile.gpa ?? null, gpaScale: profile.gpaScale ?? null });
  let gpaPoint: string | null = null;
  if (profile.gpa != null && profile.gpa > 0 && profile.gpaScale != null && profile.gpaScale > 0) {
    gpaPoint = gpa4 != null
      ? `GPA ${profile.gpa} on a ${profile.gpaScale} scale (${gpa4.toFixed(2)}/4.0)`
      : `GPA ${profile.gpa} on a ${profile.gpaScale} scale`;
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
  for (const item of olympiads) talkingPoints.push(`Olympiad: ${item}`);
  const awards = parseListColumn(profile.awards).slice(0, 3);
  for (const item of awards) talkingPoints.push(`Award: ${item}`);
  const competitions = parseListColumn(profile.competitions).slice(0, 2);
  for (const item of competitions) talkingPoints.push(`Competition: ${item}`);
  const recognitions = [...olympiads, ...awards, ...competitions];
  if (recognitions.length === 0) dataMissing.push("Awards, olympiads or competitions");

  // ---- activities ---------------------------------------------------------
  const leadership = parseListColumn(profile.leadership).slice(0, 3);
  for (const item of leadership) talkingPoints.push(`Leadership: ${item}`);
  if (leadership.length === 0) dataMissing.push("Leadership roles");

  const research = parseListColumn(profile.researchExperience).slice(0, 2);
  for (const item of research) talkingPoints.push(`Research: ${item}`);
  const projects = parseListColumn(profile.projects).slice(0, 2);
  for (const item of projects) talkingPoints.push(`Project: ${item}`);
  if (research.length === 0 && projects.length === 0) dataMissing.push("Research or projects");

  if (profile.workExperienceYears != null && profile.workExperienceYears > 0) {
    talkingPoints.push(`${profile.workExperienceYears} year${profile.workExperienceYears > 1 ? "s" : ""} of work experience`);
  }
  const volunteering = parseListColumn(profile.volunteering).slice(0, 2);
  for (const item of volunteering) talkingPoints.push(`Community: ${item}`);
  if (volunteering.length === 0) dataMissing.push("Volunteering or community activity");
  if (!major) dataMissing.push("Intended major or program");

  // ---- outline: every section uses only real facts ------------------------
  const outline: { section: string; draft: string }[] = [];
  const program = universityTitle
    ? `the ${universityTitle} program${major ? ` in ${major}` : ""}`
    : major
      ? `a ${major} program`
      : "the student's intended program";
  const relationshipPrompt = relationshipContext
    ? `Student-provided relationship note to verify: “${relationshipContext}”. Rewrite it in your own voice, add the length of the relationship and the specific class, project, or setting, and remove anything you cannot confirm.`
    : "State your professional relationship to the applicant, how long you have known their work, and the specific class, project, or setting where you observed them. Explain the basis on which you can evaluate their work.";

  outline.push({
    section: "Opening and relationship",
    draft: `I am pleased to recommend ${name} for ${program}. ${relationshipPrompt} Identify the applicant's intended degree or field precisely, and keep the opening direct and professional.`,
  });

  if (gpaPoint || englishPoint) {
    const profileFacts = [gpaPoint, englishPoint].filter((item): item is string => Boolean(item));
    outline.push({
      section: "Academic strengths",
      draft: `Profile facts to verify before mentioning: ${profileFacts.join("; ")}. Use these only if they are accurate and relevant; a score is background context, not proof of something you personally observed. Describe one course assignment, question, or challenge you directly supervised: what ${name} did, how they approached it, and what specific evidence showed their reasoning, persistence, or growth. Connect that example to the demands of ${major ?? "the intended program"} without relying on grades alone.`,
    });
  }

  if (recognitions.length > 0) {
    outline.push({
      section: "Recognition and achievement",
      draft: `The profile records: ${recognitions.join("; ")}. Select only distinctions you can verify or discuss from direct knowledge. Name the year, level, and the student's contribution where known; then explain what the achievement required and why it is relevant. Avoid presenting a list of awards without context or overstating the student's role.`,
    });
  }

  if (leadership.length > 0 || research.length > 0 || projects.length > 0) {
    const evidence = [...leadership, ...research, ...projects];
    outline.push({
      section: "Leadership, research, and initiative",
      draft: `Profile examples to review: ${evidence.join("; ")}. Select examples that are relevant to the prompt and that you personally observed or can verify; there is no universal number. For each selected example, describe the student's responsibility, the challenge or question, their action, and the observable result. Add dates or scope only when accurate, and follow the letter's instructions and length limit.`,
    });
  }

  if (volunteering.length > 0) {
    outline.push({
      section: "Character and commitment",
      draft: `The profile also lists: ${volunteering.join("; ")}. If you observed this work, describe one specific moment that demonstrates reliability, empathy, or initiative: the context, what ${name} did, who benefited, and what changed. Prefer a verifiable example over broad adjectives, and do not imply a result you did not see.`,
    });
  }

  if (profile.workExperienceYears != null && profile.workExperienceYears > 0) {
    outline.push({
      section: "Professional experience",
      draft: `The profile reports ${profile.workExperienceYears} year${profile.workExperienceYears > 1 ? "s" : ""} of work experience, but does not name a role here. Ask the student for the position, dates, responsibilities, and a result before mentioning it. Discuss only work you have directly observed or can independently verify.`,
    });
  }

  if (requestedFocus) {
    outline.push({
      section: "Student-requested emphasis — verify before use",
      draft: `The student asked you to consider: “${requestedFocus}”. Treat this as a request for focus, not as a verified claim. Keep it only if it matches your own observations and support it with a concrete example; you are free to revise or omit it.`,
    });
  }

  if (supportingExample) {
    outline.push({
      section: "Student-suggested example — verify before use",
      draft: `The student suggested this possible example: “${supportingExample}”. Confirm the names, dates, setting, and the student's exact contribution. Use it only if you observed it directly or can verify it independently, then explain the context, action, and outcome in your own words.`,
    });
  }

  outline.push({
    section: "Closing endorsement",
    draft: `Close with a clear, calibrated recommendation for ${name}${major ? ` in ${major}` : ""}. Summarize the most relevant examples you personally support, as the letter's purpose and length allow. Use a comparative statement only if you can substantiate it; invite the committee to contact you with further questions.`,
  });

  // ---- preparation guidance: personalized, but never presented as fact -----
  const evidenceCount = recognitions.length + leadership.length + research.length + projects.length + volunteering.length;
  const personalizationAdvice: RecLetterAdvice[] = [
    relationshipContext
      ? { key: "relationshipProvided", values: { relationship: relationshipContext } }
      : { key: "relationshipMissing" },
    requestedFocus
      ? { key: "focusProvided", values: { focus: requestedFocus } }
      : major
        ? { key: "focusMissing", values: { major } }
        : { key: "focusMissingNoMajor" },
    supportingExample
      ? { key: "exampleProvided", values: { example: supportingExample } }
      : { key: "exampleMissing" },
    ...(!major ? [{ key: "targetMajorMissing" as const }] : []),
    evidenceCount > 0
      ? { key: "evidencePresent", values: { count: evidenceCount } }
      : { key: "evidenceMissing" },
    ...(gpaPoint || englishPoint ? [{ key: "academicContext" as const }] : []),
  ];

  // ---- professional request checklist ------------------------------------
  const checklist: string[] = [];
  if (deadline) {
    checklist.push(`Confirm the ${deadline} deadline and submission process with the recommender. Agree on a request and delivery schedule that works for them, and verify the portal cutoff, time zone, and instructions.`);
  } else {
    checklist.push("Ask the recommender what timing works for them, then confirm the programme deadline and submission process from official instructions; there is no universal lead time.");
  }
  checklist.push("Share only the materials the recommender requests or needs, such as a current CV, transcript, statement, programme link, or verified deadlines. Check profile facts against official records.");
  checklist.push("Discuss the qualities the programme asks the letter to address and relevant examples the recommender can personally verify. There is no universal example count; the writer should use their own voice.");
  checklist.push("Confirm the submission method, portal link, required forms, and time zone. Agree on any reminder timing with the recommender and follow their preference.");
  checklist.push("After submission, thank the recommender and let them know the outcome when appropriate; keep a record of each letter's university and deadline.");

  return {
    forUniversity: universityTitle,
    deadline,
    talkingPoints,
    outline,
    dataMissing,
    checklist,
    personalizationAdvice,
  };
}
