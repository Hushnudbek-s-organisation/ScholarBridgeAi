/**
 * Semantic colour tiers for a 0–100 profile-FIT score (requirements, field,
 * budget…). A fit score is never an admission probability — the tiers only
 * say how much of the student's profile lines up with the published data:
 *
 *   ≥ 80   strong fit     emerald
 *   60–79  moderate fit   indigo
 *   < 60   weak fit       amber — the one tier that asks for attention
 *   null   not scored     neutral slate (no profile, or nothing comparable)
 *
 * Every class is a literal string so Tailwind's scanner sees it, and each tier
 * carries explicit `dark:` values: the badges sit on photos and cards, where a
 * translucent wash would let the image bleed through.
 */
export type FitTier = "strong" | "moderate" | "weak" | "none";

/** The tier a score falls in — same thresholds as `fitBadgeClass`. */
export function fitTier(score: number | null | undefined): FitTier {
  if (score == null || !Number.isFinite(score)) return "none";
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  return "weak";
}

export function fitBadgeClass(score: number | null | undefined): string {
  if (score == null || !Number.isFinite(score)) {
    return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700";
  }
  if (score >= 80) {
    return "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700/60";
  }
  if (score >= 60) {
    return "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/80 dark:text-indigo-200 dark:border-indigo-700/60";
  }
  return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700/60";
}
