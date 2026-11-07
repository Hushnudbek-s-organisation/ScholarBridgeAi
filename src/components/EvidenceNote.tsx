"use client";

/**
 * §4/§5 — one shared, honest renderer for a typed `evidence` envelope field.
 *
 * Every surface uses the SAME envelope from `legacyEvidence()` / `presentFact()`.
 * This component never upgrades trust: only `official_minimum` may say
 * "minimum", a `recommended` score is never a cutoff, an unknown is never 0,
 * and a missing metadata object still produces a visible "no field-level
 * evidence" note instead of silently disappearing.
 *
 * The long explanation lives in a native <details>/<summary> pair: keyboard
 * and touch can open it, it is not hover-only, and it does not add a big badge
 * next to every number.
 */
import { useTranslations } from "next-intl";
import { ExternalLink, ShieldCheck, ShieldAlert, Info } from "lucide-react";
import type { PresentedFact } from "@/lib/factPresentation";

/** Only http(s) links are rendered — a DB value must never become javascript:. */
function safeHttpUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch { return null; }
}

/**
 * Static `t()` calls on purpose: scripts/check-i18n.mjs can only verify
 * literal keys, so a computed translation key would let a missing translation
 * ship unnoticed in one of EN/UZ/RU.
 */
function displayLabel(displayAs: PresentedFact["displayAs"], t: (key: string) => string): string {
  switch (displayAs) {
    case "official_minimum": return t("officialMinimum");
    case "recommended": return t("recommended");
    case "unverified_value": return t("legacyUnknown");
    case "observed_value": return t("observed");
    case "estimate": return t("estimate");
    case "computed": return t("computed");
    case "unknown": return t("unknown");
    default: return t("unknown");
  }
}

export interface EvidenceNoteProps {
  fact?: PresentedFact | null;
  /** Human name of the number ("TOEFL minimum", "Monthly stipend"). Falls back
   *  to the envelope label. Keeps number / name / source / note consistent. */
  label?: string;
  /** Compact: inline note is folded into <details>; full: also shows it. */
  compact?: boolean;
}

export function EvidenceNote({ fact, label, compact = false }: EvidenceNoteProps) {
  const t = useTranslations("evidence");
  // A fact with NO metadata is still an honest, visible state. A caller may
  // know a raw number but have no envelope; we never hide that gap.
  const url = safeHttpUrl(fact?.sourceUrl ?? null);
  const official = fact?.displayAs === "official_minimum";
  const name = label ?? fact?.label ?? t("unnamedValue");
  const policyLabel=fact?.trust==="official_verified"&&fact.verificationStatus==="verified"
    ?fact.valueType==="not_published"?t("notPublishedConfirmed"):fact.valueType==="not_applicable"?t("notApplicableConfirmed"):fact.valueType==="official_requirement"&&typeof fact.value==="string"?t("officialCriteria"):null
    :null;
  const note = fact?.note?.trim()
    || (fact ? t("noMetadata") : t("noMetadataAtAll"));

  return (
    <span
      data-testid="evidence-note"
      data-evidence-trust={fact?.trust ?? "metadata_missing"}
      data-evidence-display={fact?.displayAs ?? "unknown"}
      data-evidence-source={url ? "official_link" : "none"}
      className={`mt-1 block min-w-0 text-xs leading-tight ${official ? "text-emerald-700" : "text-amber-700"}`}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {official
          ? <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
          : <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />}
        <span className="min-w-0 break-words font-semibold">{name}</span>
        <span aria-hidden>·</span>
        <span className="min-w-0 break-words">{policyLabel??displayLabel(fact?.displayAs ?? "unknown", t)}</span>
        {fact?.admissionCycle && (
          <span className="text-slate-500">· {t("cycle")}: {fact.admissionCycle}</span>
        )}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-semibold underline decoration-dotted underline-offset-2 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700"
          >
            {t("source")} <ExternalLink className="h-2.5 w-2.5" aria-hidden />
          </a>
        ) : (
          <span className="text-slate-500">· {t("noSource")}</span>
        )}
      </span>

      {/* Always present, even in compact mode: a missing envelope must not
          silently drop its caveat. `compact` only decides whether it starts open. */}
      <details open={!compact} className="group mt-0.5 min-w-0 text-slate-500">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-control font-semibold text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 [&::-webkit-details-marker]:hidden">
            <Info className="h-2.5 w-2.5" aria-hidden /> {t("details")}
          </summary>
          <span className="mt-0.5 block max-w-prose break-words">{note}</span>
        </details>
    </span>
  );
}
