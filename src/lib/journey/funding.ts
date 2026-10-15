/**
 * My Funding Plan (spec §9) and post-admission funding (spec §24).
 *
 * EXTENDS the existing `src/lib/costs.ts` calculator — it does not replace it.
 * `calculateCosts` still produces the cost breakdown from a university; this
 * module takes that number plus the student's own funding portfolio and answers
 * the one question that matters: **is the gap closed, and if not, by how much?**
 *
 * PURE MODULE — asserted in `scripts/check-journey.ts`.
 */

export type FundingKind = "scholarship" | "aid" | "family" | "savings" | "loan" | "other";
export type FundingStatus = "planned" | "applied" | "awarded" | "confirmed" | "declined";

export interface FundingItemLike {
  kind: FundingKind;
  name: string;
  amountUsd: number;
  status: FundingStatus;
  /** JSON array of the cost lines this item actually covers. */
  covers?: string | null;
}

export const FUNDING_KIND_LABELS: Record<FundingKind, string> = {
  scholarship: "Scholarship",
  aid: "Financial aid",
  family: "Family budget",
  savings: "Savings",
  loan: "Loan",
  other: "Other",
};

/** The cost lines the plan understands (spec §9). */
export const COST_LINES = [
  { key: "tuition", label: "Tuition" },
  { key: "accommodation", label: "Accommodation" },
  { key: "food", label: "Food" },
  { key: "insurance", label: "Insurance" },
  { key: "visa", label: "Visa" },
  { key: "flight", label: "Flight" },
  { key: "books", label: "Books" },
  { key: "transport", label: "Transport" },
  { key: "other", label: "Other" },
] as const;

export type CostLineKey = (typeof COST_LINES)[number]["key"];

/**
 * Which `calculateCosts` line(s) feed each funding line.
 *
 * THE BUG THIS FIXES (2026-10): the API searched the cost breakdown for the
 * literal keys "food", "transport", "flight", "visa" and "other" while
 * `calculateCosts` emits "living", "flights", "visa_fee" and
 * "application_fee". Every one of those lookups returned undefined → 0, so
 * the Funding Plan dropped the entire 11,000–16,000 USD living estimate and
 * the 1,400 USD flight estimate, and `byLine` never summed to `annualCost`.
 * The mapping now lives here, in one table, and is asserted in
 * `scripts/check-journey.ts`.
 *
 * One published living figure covers food, transport and phone; it is shown on
 * ONE line rather than invented as three separate amounts.
 */
export const COST_LINE_SOURCES: Record<CostLineKey, readonly string[]> = {
  tuition: ["tuition"],
  accommodation: ["accommodation"],
  food: ["living"],
  insurance: ["insurance"],
  visa: ["visa_fee", "visa"],
  flight: ["flights", "flight"],
  books: ["books"],
  transport: ["transport"],
  other: ["application_fee", "other"],
};

/**
 * Coverage keys accepted from saved funding items (`funding_items.covers`).
 * Students and older rows write "flights", "visa_fee", "living", "housing"…
 * — all of them must land on the right line instead of silently covering
 * nothing.
 */
const COVER_ALIASES: Record<string, CostLineKey> = {
  tuition: "tuition",
  tuition_fee: "tuition",
  fees: "tuition",
  accommodation: "accommodation",
  accommodations: "accommodation",
  housing: "accommodation",
  rent: "accommodation",
  dorm: "accommodation",
  dormitory: "accommodation",
  food: "food",
  living: "food",
  living_costs: "food",
  living_costs_food_transport_phone: "food",
  meals: "food",
  insurance: "insurance",
  health_insurance: "insurance",
  visa: "visa",
  visa_fee: "visa",
  visafee: "visa",
  flight: "flight",
  flights: "flight",
  airfare: "flight",
  travel: "flight",
  books: "books",
  books_materials: "books",
  materials: "books",
  transport: "transport",
  transportation: "transport",
  local_transport: "transport",
  other: "other",
  application_fee: "other",
  application_fees: "other",
  miscellaneous: "other",
};

/** Resolve any recorded coverage key onto a canonical cost line, or null. */
export function canonicalCostLineKey(raw: string): CostLineKey | null {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!key) return null;
  if ((COST_LINES as readonly { key: string }[]).some((l) => l.key === key)) return key as CostLineKey;
  return COVER_ALIASES[key] ?? null;
}

export interface FundingPlanResult {
  /** Total yearly cost of the programme. */
  annualCost: number;
  currency: string;
  /** Scholarship + aid only (money that is NOT the family's own). */
  scholarshipTotal: number;
  /** Family + savings + loans. */
  ownContributionTotal: number;
  /** Only what is actually secured (awarded / confirmed). */
  securedTotal: number;
  /** What is only planned or applied for. */
  projectedTotal: number;
  /** annualCost − everything that could still materialise. */
  fundingGap: number;
  /** annualCost − what is secured today. This is the number to act on. */
  securedGap: number;
  isCovered: boolean;
  byLine: { key: string; label: string; cost: number; covered: number; gap: number }[];
  /** Sum of `byLine[].covered`. Never exceeds `projectedTotal`. */
  allocatedTotal: number;
  /**
   * Money that could not be attached to a line: a scholarship that covers
   * something the plan does not track, or funding that exceeds the cost.
   * It still counts in `projectedTotal`; it just has no line.
   */
  unallocatedTotal: number;
  /** Scholarships that are still open actions for the student. */
  openActions: { name: string; kind: FundingKind; amountUsd: number; status: FundingStatus }[];
}

export function buildFundingPlan(input: {
  annualCost: number;
  currency?: string;
  lines?: { key: string; label: string; cost: number }[];
  items: FundingItemLike[];
}): FundingPlanResult {
  const currency = input.currency ?? "USD";
  const items = input.items ?? [];
  const lines = input.lines ?? [];

  const isMoney = (k: FundingKind) => k === "scholarship" || k === "aid";
  const isSecured = (s: FundingStatus) => s === "awarded" || s === "confirmed";

  const scholarshipTotal = sum(items.filter((i) => isMoney(i.kind)));
  const ownContributionTotal = sum(items.filter((i) => !isMoney(i.kind)));
  const securedTotal = sum(items.filter((i) => isSecured(i.status)));
  const projectedTotal = sum(items.filter((i) => i.status !== "declined"));

  // Per-line coverage.
  //
  // THE BUG THIS FIXES (2026-10): the old loop was
  //
  //     if (covers.length === 0 || covers.includes(l.key)) covered += item.amountUsd;
  //
  // so a single $5,000 item with no declared coverage was added to EVERY line
  // (9 lines × $5,000 = $45,000 of "coverage" out of $5,000 of money), and an
  // item covering ["tuition","accommodation"] charged its full amount to both
  // lines without ever depleting. `sum(byLine[].covered)` is now a hard upper
  // bound of `projectedTotal` by construction:
  //
  //   1. a line-specific item spends only its REMAINING balance and only on
  //      the lines it names (capped by each line's own remaining gap);
  //   2. an item that declares no coverage — or names only keys the plan does
  //      not track — is a POOL, handed to lines in order until it is used up.
  const remaining = new Map<FundingItemLike, number>();
  const covered = new Map<string, number>(lines.map((l) => [l.key, 0]));
  const lineOrder = lines.map((l) => l.key);
  const lineCost = new Map(lines.map((l) => [l.key, Math.max(0, Number(l.cost) || 0)]));
  const gapOn = (key: string) => Math.max(0, (lineCost.get(key) ?? 0) - (covered.get(key) ?? 0));

  const live = items.filter((i) => i.status !== "declined" && Number.isFinite(Number(i.amountUsd)) && Number(i.amountUsd) > 0);
  for (const item of live) remaining.set(item, Number(item.amountUsd));

  // Pass 1 — line-specific items.
  for (const item of live) {
    const keys = parseCovers(item.covers)
      .map(canonicalCostLineKey)
      .filter((k): k is CostLineKey => k != null && lineCost.has(k));
    if (!keys.length) continue; // pass 2 pool
    const unique = [...new Set(keys)];
    for (const key of unique) {
      const left = remaining.get(item) ?? 0;
      if (left <= 0) break;
      const give = Math.min(left, gapOn(key));
      if (give <= 0) continue;
      covered.set(key, (covered.get(key) ?? 0) + give);
      remaining.set(item, left - give);
    }
  }

  // Pass 2 — unallocated pool, in line order.
  for (const item of live) {
    let left = remaining.get(item) ?? 0;
    if (left <= 0) continue;
    for (const key of lineOrder) {
      if (left <= 0) break;
      const give = Math.min(left, gapOn(key));
      if (give <= 0) continue;
      covered.set(key, (covered.get(key) ?? 0) + give);
      left -= give;
    }
    remaining.set(item, left);
  }

  const byLine = lines.map((l) => {
    const cov = Math.min(covered.get(l.key) ?? 0, Math.max(0, Number(l.cost) || 0));
    return {
      key: l.key,
      label: l.label,
      cost: l.cost,
      covered: cov,
      gap: Math.max(0, (Number(l.cost) || 0) - cov),
    };
  });

  // Sanity guard: allocations can never exceed the money that exists. If a
  // future caller hands in duplicate line keys we clamp instead of reporting
  // coverage the student does not have.
  const allocatedTotal = byLine.reduce((s, l) => s + l.covered, 0);
  const allocated = Math.min(allocatedTotal, projectedTotal);

  const fundingGap = Math.max(0, input.annualCost - projectedTotal);
  const securedGap = Math.max(0, input.annualCost - securedTotal);

  return {
    annualCost: input.annualCost,
    currency,
    scholarshipTotal,
    ownContributionTotal,
    securedTotal,
    projectedTotal,
    fundingGap,
    securedGap,
    isCovered: fundingGap === 0,
    byLine,
    allocatedTotal: allocated,
    unallocatedTotal: Math.max(0, projectedTotal - allocated),
    openActions: items
      .filter((i) => i.status === "planned" || i.status === "applied")
      .map((i) => ({ name: i.name, kind: i.kind, amountUsd: i.amountUsd, status: i.status })),
  };
}

/**
 * Turn a `calculateCosts` breakdown into the Funding Plan's lines.
 *
 * Recurring lines (what the yearly plan is about) sum EXACTLY to
 * `costs.annualTotalUsd`; the one-off visa / application fees are returned
 * separately so they are never silently folded into a yearly figure. Any line
 * key `calculateCosts` may add in future that this map does not know about is
 * folded into "Other" (and named in `foldedSources`) rather than dropped —
 * silently losing a cost line is exactly the bug being fixed here.
 */
export function fundingLinesFromCosts(costs: {
  lines: { key: string; label: string; annualUsd: number; totalUsd: number }[];
  annualTotalUsd: number;
}): {
  lines: { key: string; label: string; cost: number }[];
  oneOff: { key: string; label: string; amountUsd: number; sourceKey: string }[];
  recurringTotalUsd: number;
  /** annualTotalUsd − recurringTotalUsd. Always 0 unless a source key is new. */
  unaccountedUsd: number;
  foldedSources: string[];
} {
  const bySource = new Map(costs.lines.map((l) => [l.key, l]));
  const used = new Set<string>();
  const foldedSources: string[] = [];

  const lines = COST_LINES.map((line) => {
    let cost = 0;
    for (const source of COST_LINE_SOURCES[line.key]) {
      const row = bySource.get(source);
      if (!row) continue;
      used.add(source);
      // Visa / application lines carry annualUsd 0 in `calculateCosts` — their
      // money is a one-off and is returned separately. A separate Transport or
      // Other source, when a catalogue ever publishes one, is added here.
      cost += Math.max(0, Number(row.annualUsd) || 0);
    }
    return { key: line.key, label: line.label, cost: Math.round(cost) };
  });

  const other = lines.find((l) => l.key === "other");
  for (const row of costs.lines) {
    if (used.has(row.key)) continue;
    used.add(row.key);
    foldedSources.push(row.key);
    if (other) other.cost = Math.round(other.cost + Math.max(0, Number(row.annualUsd) || 0));
  }

  const oneOff = costs.lines
    .filter((l) => l.key === "visa_fee" || l.key === "application_fee")
    .filter((l) => Number(l.totalUsd) > 0)
    .map((l) => ({ key: l.key, label: l.label, amountUsd: Math.round(Number(l.totalUsd)), sourceKey: l.key }));

  const recurringTotalUsd = lines.reduce((s, l) => s + l.cost, 0);
  return {
    lines,
    oneOff,
    recurringTotalUsd,
    unaccountedUsd: Math.max(0, Math.round(costs.annualTotalUsd) - recurringTotalUsd),
    foldedSources,
  };
}

/** Breakdown line for the post-admission view (spec §24). */
export interface PostAdmissionFunding {
  tuition: number;
  /** Every recorded scholarship, whatever its status. */
  scholarship: number;
  /** Every recorded aid/grant, whatever its status. */
  aid: number;
  /** Scholarship + aid that is `awarded` or `confirmed` — the money to plan with. */
  secured: number;
  /** Tuition minus confirmed funding, floored at 0. Never negative. */
  netAnnualUsd: number;
  deposit: number;
  depositDueDate: string | null;
  /** What the student must pay to the university, and by when. */
  payableNow: { amount: number; dueDate: string | null; payee: string };
  explanation: string[];
}

export function postAdmissionFunding(input: {
  tuition: number;
  items: FundingItemLike[];
  depositAmount?: number | null;
  depositDueDate?: string | null;
  universityName: string;
}): PostAdmissionFunding {
  const money = input.items.filter((i) => i.kind === "scholarship" || i.kind === "aid");
  const scholarship = sum(money.filter((i) => i.kind === "scholarship"));
  const aid = sum(money.filter((i) => i.kind === "aid"));
  const secured = sum(money.filter((i) => i.status === "awarded" || i.status === "confirmed"));
  const deposit = input.depositAmount ?? 0;
  const remaining = Math.max(0, input.tuition - secured);

  const explanation: string[] = [];
  explanation.push(`Tuition commitment: $${input.tuition.toLocaleString()}.`);
  explanation.push(
    secured > 0
      ? `Confirmed funding: $${secured.toLocaleString()} (${scholarship > 0 ? `scholarship $${scholarship.toLocaleString()}` : ""}${aid > 0 ? ` + aid $${aid.toLocaleString()}` : ""}).`
      : "No confirmed funding yet — the full tuition is still your responsibility."
  );
  if (deposit > 0) {
    explanation.push(
      `Deposit: $${deposit.toLocaleString()}${input.depositDueDate ? ` due ${input.depositDueDate}` : ""}, payable to ${input.universityName}.`
    );
  } else {
    explanation.push("No deposit recorded. Check your offer letter for the deposit amount and due date.");
  }
  explanation.push(`Remaining after confirmed funding: $${remaining.toLocaleString()}.`);

  return {
    tuition: input.tuition,
    scholarship,
    aid,
    secured,
    netAnnualUsd: remaining,
    deposit,
    depositDueDate: input.depositDueDate ?? null,
    payableNow: { amount: deposit > 0 ? deposit : remaining, dueDate: input.depositDueDate ?? null, payee: input.universityName },
    explanation,
  };
}

// ---------------------------------------------------------------------------

function sum(items: FundingItemLike[]): number {
  return items.reduce((s, i) => s + (Number.isFinite(i.amountUsd) ? i.amountUsd : 0), 0);
}

function parseCovers(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
