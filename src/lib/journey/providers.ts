/**
 * External Learning Provider (spec §32) — ARCHITECTURE ONLY.
 *
 * WHAT THIS IS
 * ------------
 * A generic, provider-agnostic contract for an optional external learning
 * platform (an IELTS preparation site, a coding academy, a language school)
 * to share a small, fixed set of metrics with a ScholarBridge student.
 *
 * WHAT THIS IS NOT
 * ----------------
 * There is NO partner here. No company is named, no logo, no navigation item,
 * no API call, no hardcoded URL. The `learning_providers` table ships EMPTY and
 * the whole app behaves identically with zero providers connected.
 *
 * Adding a provider later is an ADMIN action (insert a row + implement the
 * adapter server-side), not a rebuild. The vocabulary below is the contract.
 *
 * WHY THE METRIC VOCABULARY IS CLOSED
 * -----------------------------------
 * A provider can only ever report one of these keys. It cannot invent an
 * arbitrary field, and it cannot write to a student's application data — the
 * metrics land in `learning_provider_scores`, keyed to an explicit consent
 * row, and the student's own `test_plans` are NEVER overwritten by them.
 */

export const LEARNING_METRICS = [
  "current_score", // e.g. IELTS 6.5
  "target_score", // e.g. IELTS 7.0
  "practice_progress", // 0–100 completion of practice material
  "mock_score", // most recent mock result
  "course_completion", // 0–100 of an enrolled course
  "study_task_completed", // count of recommended tasks completed
] as const;

export type LearningMetric = (typeof LEARNING_METRICS)[number];

export function isLearningMetric(v: unknown): v is LearningMetric {
  return typeof v === "string" && (LEARNING_METRICS as readonly string[]).includes(v);
}

/** Display metadata — used by the (currently empty) provider settings screen. */
export const LEARNING_METRIC_LABELS: Record<LearningMetric, { label: string; unit?: string; hint: string }> = {
  current_score: { label: "Current score", hint: "The learner's most recent official test score, if the provider holds one." },
  target_score: { label: "Target score", hint: "The score the learner is working towards." },
  practice_progress: { label: "Practice progress", unit: "%", hint: "How much of the practice material is finished." },
  mock_score: { label: "Mock test score", hint: "Most recent practice/mock result." },
  course_completion: { label: "Course completion", unit: "%", hint: "Progress through an enrolled course." },
  study_task_completed: { label: "Study tasks completed", hint: "How many recommended study tasks are done." },
};

export type ProviderStatus = "disabled" | "sandbox" | "live";

export interface LearningProviderRecord {
  providerKey: string;
  name: string;
  kind: string;
  status: ProviderStatus;
  isEnabled: boolean;
  config?: string | null;
}

export interface LearningMetricReading {
  metric: LearningMetric;
  value: number | null;
  measuredAt: string | null;
  /** Where the number came from — always shown to the student. */
  sourceName: string;
  sourceUrl?: string | null;
  lastVerifiedAt?: string | null;
}

/**
 * The adapter interface a provider integration must implement.
 *
 * NOTE: no implementation ships with this release. Declaring the interface is
 * what makes the later integration a configuration task rather than a rewrite.
 */
export interface LearningProviderAdapter {
  providerKey: string;
  /** Human-readable name shown to the student. */
  displayName: string;
  /** Build the consent/connect URL for one student. */
  connectUrl(profileId: number, state: string): string;
  /** Pull the closed-vocabulary metrics above. Must never throw. */
  fetchMetrics(link: { externalUserRef: string | null }): Promise<LearningMetricReading[]>;
}

/**
 * Registry of live adapters, keyed by `provider_key`.
 *
 * EMPTY BY DESIGN. A future integration registers its adapter here server-side;
 * nothing about a partner is hardcoded anywhere else in the codebase.
 */
const ADAPTERS = new Map<string, LearningProviderAdapter>();

export function registerLearningAdapter(adapter: LearningProviderAdapter): void {
  ADAPTERS.set(adapter.providerKey, adapter);
}

export function getLearningAdapter(providerKey: string): LearningProviderAdapter | null {
  return ADAPTERS.get(providerKey) ?? null;
}

export function listLearningAdapters(): LearningProviderAdapter[] {
  return [...ADAPTERS.values()];
}

export interface LearningProviderSummary {
  /** True when at least one provider exists AND is enabled. */
  connected: boolean;
  providers: {
    providerKey: string;
    name: string;
    kind: string;
    status: ProviderStatus;
    linked: boolean;
    externalUserRef: string | null;
    lastSyncedAt: string | null;
    metrics: LearningMetricReading[];
  }[];
  /**
   * What the Test Planner may use as a SUGGESTION. Always empty today, and
   * explicitly labelled as coming from an external source when it is not.
   */
  suggestedTargets: { metric: LearningMetric; value: number; sourceName: string }[];
}

/**
 * Turn provider rows + readings into what the Test Planner can display.
 *
 * IMPORTANT: a provider's `target_score` is a *suggestion shown with its
 * source*. It is never written into `test_plans` automatically — the student
 * stays the source of truth for their own targets.
 */
export function summarizeProviders(
  providers: LearningProviderRecord[],
  links: Record<string, { externalUserRef: string | null; lastSyncedAt: string | null }>,
  readings: Record<string, LearningMetricReading[]>
): LearningProviderSummary {
  const enabled = providers.filter((p) => p.isEnabled && p.status !== "disabled");
  const out = providers.map((p) => {
    const link = links[p.providerKey];
    return {
      providerKey: p.providerKey,
      name: p.name,
      kind: p.kind,
      status: p.status,
      linked: !!link?.externalUserRef,
      externalUserRef: link?.externalUserRef ?? null,
      lastSyncedAt: link?.lastSyncedAt ?? null,
      metrics: readings[p.providerKey] ?? [],
    };
  });
  const suggestedTargets: LearningProviderSummary["suggestedTargets"] = [];
  for (const p of enabled) {
    for (const r of readings[p.providerKey] ?? []) {
      if (r.metric === "target_score" && r.value != null) {
        suggestedTargets.push({ metric: r.metric, value: r.value, sourceName: p.name });
      }
    }
  }
  return { connected: enabled.length > 0, providers: out, suggestedTargets };
}
