"use client";

/**
 * Priority 4.2 — Requirement Transparency.
 *
 * The published gates of one scholarship, as compact pills:
 * `[✓ GPA 3.85 ≥ 3.5] [✓ IELTS 7.5 ≥ 6.5] [✓ Degree: Master]`.
 *
 * Everything is computed by `src/lib/scholarshipChecks.ts`, which follows the
 * catalogue's honesty rules: a NULL minimum is never rendered as a green tick
 * (the pill is simply not shown, because there is nothing to check), a student
 * who has not recorded a GPA gets a neutral "set your GPA" pill, and a TOEFL
 * score is never silently converted into an IELTS band.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { BookOpen, Compass, GraduationCap, Languages, MapPin } from "lucide-react";
import {
  checkScholarshipRequirements,
  type RequirementCheck,
  type ScholarshipCheckInput,
  type ScholarshipCheckProfile,
} from "@/lib/scholarshipChecks";
import { DECISION_PILL_CLASS } from "@/lib/decisionPills";

const CHECK_ICON: Record<RequirementCheck["id"], React.ComponentType<{ className?: string }>> = {
  gpa: GraduationCap,
  ielts: Languages,
  degree: BookOpen,
  major: Compass,
  country: MapPin,
};

const STATE_TONE: Record<RequirementCheck["state"], keyof typeof DECISION_PILL_CLASS> = {
  met: "positive",
  not_met: "negative",
  unknown_profile: "neutral",
  different_test: "caution",
  not_published: "neutral",
};

const STATE_MARK: Record<RequirementCheck["state"], string> = {
  met: "✓",
  not_met: "✗",
  unknown_profile: "?",
  different_test: "?",
  not_published: "—",
};

interface ScholarshipRequirementPillsProps {
  scholarship: ScholarshipCheckInput;
  profile?: ScholarshipCheckProfile | null;
  /** Also render gates the funder has not published (off by default: they add
   *  noise where there is nothing for the student to act on). */
  showUnpublished?: boolean;
  className?: string;
}

export function ScholarshipRequirementPills({
  scholarship,
  profile,
  showUnpublished = false,
  className = "",
}: ScholarshipRequirementPillsProps) {
  const t = useTranslations("scholarshipHub");

  const summary = React.useMemo(
    () => checkScholarshipRequirements(scholarship, profile ?? null),
    [scholarship, profile]
  );

  const visible = summary.checks.filter(
    (check) => showUnpublished || check.state !== "not_published"
  );
  if (visible.length === 0) return null;

  // State and id keys come from the engine, so the lookup is dynamic; a key that
  // is ever missing must degrade quietly instead of throwing during render.
  const label = (check: RequirementCheck): string => {
    try {
      return t(`reqPills.${check.id}.${check.state}` as never, check.params as never);
    } catch {
      try {
        return t(`reqPills.${check.id}.label` as never, check.params as never);
      } catch {
        return "";
      }
    }
  };
  const hint = (check: RequirementCheck): string => {
    try {
      return t(`reqPills.${check.id}.${check.state}Hint` as never, check.hintParams as never);
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
      data-requirement-verdict={summary.verdict}
      aria-label={t(`reqPillsSummary.${summary.verdict}`, {
        met: summary.metCount,
        gaps: summary.notMetCount,
        unknown: summary.unknownCount,
      })}
    >
      {visible.map((check) => {
        const Icon = CHECK_ICON[check.id];
        const text = label(check);
        if (!text) return null;
        return (
          <span
            key={check.id}
            title={hint(check)}
            className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-snug ${
              DECISION_PILL_CLASS[STATE_TONE[check.state]]
            }`}
          >
            <span aria-hidden className="shrink-0 font-extrabold">
              {STATE_MARK[check.state]}
            </span>
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            <span className="min-w-0 break-words whitespace-normal">{text}</span>
          </span>
        );
      })}
    </div>
  );
}

export default ScholarshipRequirementPills;
