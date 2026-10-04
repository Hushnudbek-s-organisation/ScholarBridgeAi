"use client";

/**
 * Small-print warnings ("ogohlantirish").
 *
 * The product shows AI-written text, compiled catalogue data, estimates and
 * third-party offers. None of it is infallible, so every surface that can be
 * wrong carries a short, honest note next to the content — not buried in the
 * Terms page.
 *
 * One component, one message namespace (`disclaimers`) and one wording per
 * kind, so the same sentence appears wherever the same risk exists and the
 * copy can never drift apart between panels.
 *
 * Kinds
 * -----
 *  - general     the app-wide footer line (independent guide, verify sources)
 *  - ai          AI-generated output (chat, SOP studio, essay review, …)
 *  - catalogue   compiled reference data (tuition, deadlines, programs)
 *  - estimate    scores / chances — never a prediction or a guarantee
 *  - money       costs, budgets, funding and payments
 *  - planning    generated plans and task timelines
 *  - visa        visa / immigration information
 *  - community   user-generated content (forum, stories)
 *  - thirdParty  mentors, courses and payment providers
 *  - prototype   unfinished / changing features
 *  - certificate course certificates are not university credit
 *
 * WHY NOT `useTranslations`: a warning must never be the reason a panel fails
 * to render. Several components here are rendered on their own (render smoke
 * tests, embeds) with no `NextIntlClientProvider` above them, and the
 * next-intl hook throws in that situation. `useLocaleContext` has a default
 * value and reads the same dictionaries, so the note always renders — in the
 * user's language when the provider is present, in English otherwise.
 */
import React from "react";
import { TriangleAlert } from "lucide-react";
import { useLocaleContext } from "@/i18n/LocaleProvider";
import { dictionaries } from "@/i18n/messages";
import { defaultLocale } from "@/i18n/config";

export type AppNoteKind =
  | "general"
  | "ai"
  | "catalogue"
  | "estimate"
  | "money"
  | "planning"
  | "visa"
  | "community"
  | "thirdParty"
  | "prototype"
  | "certificate";

const TONE: Record<AppNoteKind, string> = {
  general: "text-slate-500 dark:text-slate-400",
  ai: "text-amber-700 dark:text-amber-200",
  catalogue: "text-slate-500 dark:text-slate-400",
  estimate: "text-amber-700 dark:text-amber-200",
  money: "text-amber-700 dark:text-amber-200",
  planning: "text-slate-500 dark:text-slate-400",
  visa: "text-amber-700 dark:text-amber-200",
  community: "text-slate-500 dark:text-slate-400",
  thirdParty: "text-amber-700 dark:text-amber-200",
  prototype: "text-slate-500 dark:text-slate-400",
  certificate: "text-slate-500 dark:text-slate-400",
};

export function AppNote({
  kind,
  className = "",
  /** `inline` drops the icon for very tight rows (table footers, chips). */
  variant = "block",
}: {
  kind: AppNoteKind;
  className?: string;
  variant?: "block" | "inline";
}) {
  const { locale } = useLocaleContext();
  const messages = dictionaries[locale] ?? dictionaries[defaultLocale];
  const text = messages?.disclaimers?.[kind] ?? dictionaries[defaultLocale].disclaimers[kind];
  return (
    <p
      role="note"
      data-app-note={kind}
      className={`${variant === "inline" ? "" : "flex items-start gap-1.5 "}text-[11px] leading-relaxed ${TONE[kind]} ${className}`}
    >
      {variant === "block" && <TriangleAlert className="mt-[2px] h-3 w-3 shrink-0" aria-hidden />}
      <span>{text}</span>
    </p>
  );
}
