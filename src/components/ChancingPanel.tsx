"use client";

/**
 * ChancingPanel — the entry point the hubs still mount.
 *
 * The panel used to be a 1,200-line "chance" calculator: composite planning
 * index, Safety/Likely/Target/Reach badges, hardcoded GPA/SAT/IELTS percentile
 * axes and a fabricated "estimated offer rate". None of that survives (spec §8):
 * the panel now renders `ProgrammeAssessmentScreen`, which shows the five
 * canonical answers — preference fit with an interval and coverage, documented
 * eligibility, finance, comparison against published statistics, and an
 * explicit `admissionProbability: null`.
 *
 * The props are unchanged on purpose, so every existing mount point keeps
 * working without a screen disappearing.
 */

import { ProgrammeAssessmentScreen } from "./ProgrammeAssessmentScreen";

export function ChancingPanel({
  profileId,
  activeProfile,
}: {
  profileId?: number | null;
  activeProfile?: {
    id?: number | null;
    gpa?: number | null;
    gpaScale?: number | null;
    ieltsScore?: number | null;
    toeflScore?: number | null;
    duolingoScore?: number | null;
    satScore?: number | null;
    budgetAnnualUsd?: number | null;
    targetMajor?: string | null;
    degreeLevel?: string | null;
  } | null;
}) {
  return <ProgrammeAssessmentScreen profileId={profileId} activeProfile={activeProfile} />;
}
