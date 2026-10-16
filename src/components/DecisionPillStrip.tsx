"use client";

/**
 * Priority 4.1 — the one-glance decision strip.
 *
 * Three pills, same everywhere (explorer card, university detail, compare
 * sheet): can I get in academically, does it fit my budget, and can I stay to
 * work afterwards. All three are computed by `src/lib/decisionPills.ts`, so a
 * card in the grid and the detail page can never disagree.
 *
 * Every pill has an honest "we do not know" state: a university that publishes
 * no IELTS minimum, or a student who has not entered a GPA, gets a neutral pill
 * that says exactly which side is missing and where to set it — never a green
 * tick and never a red cross.
 */
import React from "react";
import { useTranslations } from "next-intl";
import { Briefcase, GraduationCap, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/format";
import {
  DECISION_PILL_CLASS,
  evaluateUniversityDecision,
  type DecisionPill,
  type DecisionProfileInput,
  type DecisionUniversityInput,
} from "@/lib/decisionPills";

const PILL_ICON: Record<DecisionPill["id"], React.ComponentType<{ className?: string }>> = {
  eligibility: GraduationCap,
  budget: Wallet,
  workVisa: Briefcase,
};

interface DecisionPillStripProps {
  university: DecisionUniversityInput;
  /** Null for an anonymous visitor — the pills then report what is published. */
  profile?: DecisionProfileInput | null;
  /** Tighter padding for table rows and the compare sheet. */
  compact?: boolean;
  className?: string;
}

export function DecisionPillStrip({ university, profile, compact = false, className = "" }: DecisionPillStripProps) {
  const t = useTranslations("university");

  const decision = React.useMemo(
    () => evaluateUniversityDecision(university, profile ?? null),
    [university, profile]
  );

  /**
   * Money params arrive from the engine as plain numbers. Formatting them here
   * keeps the ICU messages free of currency symbols, so uz and ru can place the
   * amount wherever their own conventions put it.
   */
  const MONEY_PARAMS = new Set(["tuition", "budget", "gap", "headroom"]);
  const withMoney = (params: Record<string, string | number>): Record<string, string | number> => {
    const next: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      next[key] = MONEY_PARAMS.has(key) && typeof value === "number" ? formatMoney(value, "USD") : value;
    }
    return next;
  };

  // The state keys are produced by the engine, so the lookup is dynamic. A key
  // that is ever missing must degrade to the neutral "not published" wording
  // rather than throwing during render (the same pattern the journey panels use).
  const label = (pill: DecisionPill): string => {
    try {
      return t(`pills.${pill.id}.${pill.stateKey}` as never, withMoney(pill.params) as never);
    } catch {
      try {
        return t(`pills.${pill.id}.fallback` as never);
      } catch {
        return "";
      }
    }
  };
  const hint = (pill: DecisionPill): string => {
    try {
      return t(`pills.${pill.id}.${pill.hintKey}` as never, withMoney(pill.hintParams) as never);
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
      data-decision-eligibility={decision.eligibility}
      data-decision-within-budget={
        decision.budget.withinBudget == null ? "unknown" : decision.budget.withinBudget ? "yes" : "no"
      }
    >
      {decision.pills.map((pill) => {
        const Icon = PILL_ICON[pill.id];
        const text = label(pill);
        if (!text) return null;
        return (
          <span
            key={pill.id}
            title={hint(pill)}
            className={`inline-flex max-w-full items-center gap-1 rounded-full border font-bold leading-snug ${
              compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
            } ${DECISION_PILL_CLASS[pill.tone]}`}
          >
            <Icon className={compact ? "h-3 w-3 shrink-0" : "h-3.5 w-3.5 shrink-0"} aria-hidden />
            <span className="min-w-0 break-words whitespace-normal">{text}</span>
          </span>
        );
      })}
    </div>
  );
}

export default DecisionPillStrip;
