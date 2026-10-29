/**
 * The dictionary's state, as rules — no database import.
 *
 * "Is the translation dictionary installed?" has to be answerable from the
 * admin panel, because it is the difference between a post written entirely in
 * Uzbek and one that quietly falls back to English terms. The panel already
 * answers "why is nothing being posted?" (`channel/why.ts`); this is the same
 * kind of answer for the other half of the pipeline.
 *
 * Kept dependency-free on purpose: the offline channel check
 * (`scripts/check-channel.ts`) runs with no DATABASE_URL, so the rules must not
 * pull `@/db` in. The database half lives in `selfcheckStore.ts`.
 */

/**
 * • `installed`   — the DB copy matches the version bundled in this build;
 * • `pending`     — the tables exist but the import has not run (a fresh
 *                   deployment, before the first tick);
 * • `stale`       — a different version is installed: the bundled dictionary
 *                   changed and needs a re-import;
 * • `unavailable` — the table could not be read at all (missing, or the
 *                   database refused the query).
 */
export const DICTIONARY_STATES = ["installed", "pending", "stale", "unavailable"] as const;
export type DictionaryState = (typeof DICTIONARY_STATES)[number];

export interface DictionaryFacts {
  /** Rows in `translation_lexicon` (0 when the read failed). */
  rows: number;
  /** Rows an operator edited by hand (`source = 'admin'`). */
  adminRows: number;
  /** Version recorded in `translation_lexicon_meta`, or null. */
  installedVersion: string | null;
  /** Version shipped with *this* deployment. */
  bundledVersion: string;
  /** Terms shipped with this deployment. */
  bundledTerms: number;
  /** The database read threw (table missing, permissions, …). */
  readFailed?: boolean;
}

export interface DictionaryStatus extends DictionaryFacts {
  state: DictionaryState;
  /** What the operator should do about it. */
  advice: "none" | "install" | "reimport" | "checkDatabase";
  /** True when the bundled terms are proven to be in the database. */
  ready: boolean;
}

export function dictionaryStateOf(facts: DictionaryFacts): DictionaryState {
  if (facts.readFailed) return "unavailable";
  if (!Number.isFinite(facts.rows) || facts.rows <= 0) return "pending";
  if (!facts.installedVersion) return "stale";
  return facts.installedVersion === facts.bundledVersion ? "installed" : "stale";
}

/**
 * The state plus the one action that fixes it.
 *
 * `stale` is deliberately not an error: an older dictionary still translates,
 * it just misses the terms added in the newer bundled version — so the advice
 * is "re-import", not "something is broken".
 */
export function dictionaryStatusOf(facts: DictionaryFacts): DictionaryStatus {
  const state = dictionaryStateOf(facts);
  const advice: DictionaryStatus["advice"] =
    state === "installed"
      ? "none"
      : state === "pending"
        ? "install"
        : state === "stale"
          ? "reimport"
          : "checkDatabase";
  return { ...facts, state, advice, ready: state === "installed" };
}

/** One line the panel can show without any other context. */
export function dictionarySummary(status: DictionaryStatus): string {
  switch (status.state) {
    case "installed":
      return `${status.rows} terms installed (${status.installedVersion})`;
    case "pending":
      return `not imported yet — ${status.bundledTerms} terms are waiting in this build`;
    case "stale":
      return `installed version ${status.installedVersion ?? "unknown"} differs from the bundled ${status.bundledVersion}`;
    default:
      return "the dictionary table could not be read";
  }
}
