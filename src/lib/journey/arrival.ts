/**
 * After arrival — first 7 / 30 / 90 days and the first study year
 * (product journey §14.3–14.4).
 *
 * PURE, GENERIC GUIDANCE ENGINE. It deliberately contains NO country-specific
 * or university-specific rules: everything here is a general checklist that
 * adapts only to facts we actually know about the student (journey stage,
 * scholarship / visa / housing signals). Conditional items carry
 * `conditional: true` and their i18n text says "if this applies to you" —
 * a requirement that is not backed by an official source is never presented
 * as a strict rule (product policies: provenance over assertion).
 *
 * The completion state lives in `arrival_checklist_items` (journey DDL),
 * keyed by `item_key`, so the plan survives reloads without a parallel store.
 */

export type ArrivalWindow = "d7" | "d30" | "d90" | "year1";

export const ARRIVAL_WINDOWS: readonly ArrivalWindow[] = ["d7", "d30", "d90", "year1"];

export interface ArrivalItem {
  /** Stable id — persisted in `arrival_checklist_items.item_key`. */
  key: string;
  window: ArrivalWindow;
  /**
   * Sidebar tab where this item is handled, when one exists. Never invented:
   * empty means "this is general guidance, do it in real life".
   */
  tab?: string;
  /** Only show when the matching signal is true (or the text is self-conditional). */
  requires?: "scholarship" | "visa" | "housing";
  /** Generic guidance, not an official rule of any state / university. */
  guidanceOnly: boolean;
  sort: number;
}

/**
 * The checklist. Windows:
 *   d7    — the first week on campus;
 *   d30   — the first month (services, systems, routines);
 *   d90   — the first quarter (academic rhythm, support, funding check);
 *   year1 — the first study year (semesters, renewal, career prep).
 */
export const ARRIVAL_ITEMS: readonly ArrivalItem[] = [
  // ---- first 7 days ------------------------------------------------------
  { key: "d7_register", window: "d7", tab: "study-plan", guidanceOnly: true, sort: 10 },
  { key: "d7_housing", window: "d7", tab: "departure", requires: "housing", guidanceOnly: true, sort: 20 },
  { key: "d7_orientation", window: "d7", guidanceOnly: true, sort: 30 },
  { key: "d7_sim_bank", window: "d7", guidanceOnly: true, sort: 40 },
  { key: "d7_emergency_contacts", window: "d7", guidanceOnly: true, sort: 50 },
  { key: "d7_campus_tour", window: "d7", guidanceOnly: true, sort: 60 },
  // ---- first 30 days -----------------------------------------------------
  { key: "d30_transport", window: "d30", guidanceOnly: true, sort: 10 },
  { key: "d30_bank", window: "d30", guidanceOnly: true, sort: 20 },
  { key: "d30_academic_system", window: "d30", tab: "study-plan", guidanceOnly: true, sort: 30 },
  { key: "d30_support_services", window: "d30", guidanceOnly: true, sort: 40 },
  { key: "d30_health_insurance", window: "d30", guidanceOnly: true, sort: 50 },
  { key: "d30_local_laws", window: "d30", guidanceOnly: true, sort: 60 },
  // ---- first 90 days -----------------------------------------------------
  { key: "d90_study_rhythm", window: "d90", tab: "study-plan", guidanceOnly: true, sort: 10 },
  { key: "d90_mentor", window: "d90", tab: "guidance", guidanceOnly: true, sort: 20 },
  { key: "d90_grant_conditions", window: "d90", tab: "post-admission-funding", requires: "scholarship", guidanceOnly: true, sort: 30 },
  { key: "d90_grades", window: "d90", tab: "study-plan", guidanceOnly: true, sort: 40 },
  { key: "d90_next_semester", window: "d90", tab: "study-plan", guidanceOnly: true, sort: 50 },
  // ---- first study year --------------------------------------------------
  { key: "y1_semester_dates", window: "year1", tab: "study-plan", guidanceOnly: true, sort: 10 },
  { key: "y1_grant_renewal", window: "year1", tab: "post-admission-funding", requires: "scholarship", guidanceOnly: true, sort: 20 },
  { key: "y1_visa_docs", window: "year1", tab: "visa", requires: "visa", guidanceOnly: true, sort: 30 },
  { key: "y1_academic_progress", window: "year1", tab: "study-plan", guidanceOnly: true, sort: 40 },
  { key: "y1_internship_prep", window: "year1", tab: "profile", guidanceOnly: true, sort: 50 },
  { key: "y1_cv_portfolio", window: "year1", tab: "study-plan", guidanceOnly: true, sort: 60 },
  { key: "y1_career_center", window: "year1", tab: "guidance", guidanceOnly: true, sort: 70 },
  { key: "y1_after_grad", window: "year1", guidanceOnly: true, sort: 80 },
];

export interface ArrivalSignals {
  /** Journey stage — the plan only unlocks after acceptance (see stages.ts). */
  stage: string;
  /** true = hunting funding, false = explicitly no, null/undefined = unknown. */
  needScholarship?: boolean | null;
  preferredCountries?: string[] | null;
}

export interface ArrivalItemView extends ArrivalItem {
  /** false → hidden because a required signal is explicitly absent. */
  applies: boolean;
}

export interface ArrivalPlan {
  /** The plan opens only from the `accepted` stage onward. */
  unlocked: boolean;
  windows: { window: ArrivalWindow; items: ArrivalItemView[] }[];
  /** All item keys that belong to this plan (for progress merge). */
  itemKeys: string[];
}

const UNLOCKED_STAGES = new Set(["accepted", "fund", "visa", "depart"]);

/**
 * Build the visible plan for one student. Pure: same signals → same plan.
 *   • before acceptance the whole plan stays locked (an honest empty state);
 *   • conditional items show only when the signal is known-true, or when the
 *     signal is unknown (the item text itself says "if this applies to you") —
 *     an unknown is never treated as "you must do this".
 */
export function buildArrivalPlan(signals: ArrivalSignals): ArrivalPlan {
  const unlocked = UNLOCKED_STAGES.has(signals.stage);
  const views = ARRIVAL_ITEMS.map((item): ArrivalItemView => {
    let applies = true;
    if (item.requires === "scholarship") {
      // needScholarship true → the student is hunting funding, so renewal
      // guidance is relevant; explicitly false → hide; unknown → show
      // conditionally (text is self-conditional).
      applies = signals.needScholarship !== false;
    }
    return { ...item, applies };
  });

  return {
    unlocked,
    windows: ARRIVAL_WINDOWS.map((window) => ({
      window,
      items: views.filter((i) => i.window === window && i.applies).sort((a, b) => a.sort - b.sort),
    })),
    itemKeys: views.filter((i) => i.applies).map((i) => i.key),
  };
}

/** i18n key helpers — the UI never hardcodes checklist text. */
export function arrivalItemTitleKey(itemKey: string): string {
  return `items.${itemKey}`;
}

export function arrivalWindowLabelKey(window: ArrivalWindow): string {
  return `windows.${window}`;
}

/** Validate a client-sent item key against the real plan (server-side). */
export function isKnownArrivalItem(key: string): boolean {
  return ARRIVAL_ITEMS.some((i) => i.key === key);
}

export type ArrivalItemStatus = "pending" | "done";

export function isArrivalItemStatus(value: unknown): value is ArrivalItemStatus {
  return value === "pending" || value === "done";
}
