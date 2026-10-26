/**
 * Preference weights (pure).
 *
 * A poll answer says "this topic is interesting"; a click says "this post was
 * worth opening". Votes update the weight immediately, clicks are folded in
 * once a week, and every value is clamped so one enthusiastic poll cannot turn
 * the channel into a single-topic feed.
 *
 *   next  = clamp(0.7 × weight + 0.3 × (share × optionCount), 0.5, 2.0)
 *   weekly= clamp(0.8 × weight + 0.2 × clickScore,            0.5, 2.0)
 *   bias  = clamp(0.8 … 1.4) for budget-related topics
 */

export const PREFS_MIN = 0.5;
export const PREFS_MAX = 2.0;
export const BUDGET_BIAS_MIN = 0.8;
export const BUDGET_BIAS_MAX = 1.4;

export const VOTE_KEEP = 0.7;
export const VOTE_SIGNAL = 0.3;
export const CLICK_KEEP = 0.8;
export const CLICK_SIGNAL = 0.2;

export function clampWeight(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(PREFS_MAX, Math.max(PREFS_MIN, value));
}

/** Share of voters that picked an option (0 when nobody voted). */
export function voteShare(count: number, total: number): number {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0 || count < 0) return 0;
  return Math.min(1, count / total);
}

/**
 * One vote update. `share × optionCount` normalises across poll sizes: picking
 * 1 of 2 options and 1 of 5 options are not the same signal.
 */
export function nextWeight(current: number, share: number, optionCount: number): number {
  const base = Number.isFinite(current) && current > 0 ? current : 1;
  const options = Number.isFinite(optionCount) && optionCount > 0 ? optionCount : 1;
  const signal = Math.max(0, share) * options;
  return clampWeight(VOTE_KEEP * base + VOTE_SIGNAL * signal);
}

/**
 * Weekly click blend. `clickScore` is the topic's click-through relative to the
 * channel average, clamped to 0…2 so a single lucky link cannot dominate.
 */
export function blendClickWeight(current: number, clickScore: number): number {
  const base = Number.isFinite(current) && current > 0 ? current : 1;
  const score = Number.isFinite(clickScore) ? Math.min(2, Math.max(0, clickScore)) : 1;
  return clampWeight(CLICK_KEEP * base + CLICK_SIGNAL * score);
}

/** How strongly budget-sensitive content is favoured (0 → 0.8, 1 → 1.4). */
export function budgetBias(appetite: number): number {
  const a = Number.isFinite(appetite) ? Math.min(1, Math.max(0, appetite)) : 0.5;
  const bias = BUDGET_BIAS_MIN + (BUDGET_BIAS_MAX - BUDGET_BIAS_MIN) * a;
  return Math.min(BUDGET_BIAS_MAX, Math.max(BUDGET_BIAS_MIN, bias));
}

/** Effective weight for one candidate: the best of its topics, times the bias. */
export function effectiveWeight(topics: readonly string[], prefs: Record<string, number>, bias = 1): number {
  let best = 1;
  for (const topic of topics) {
    const w = prefs[topic];
    if (typeof w === "number" && Number.isFinite(w) && w > best) best = w;
  }
  return clampWeight(best * (Number.isFinite(bias) && bias > 0 ? bias : 1));
}
