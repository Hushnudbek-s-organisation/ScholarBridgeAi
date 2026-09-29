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

  // Per-line coverage: only items that declare which lines they cover count.
  const byLine = lines.map((l) => {
    let covered = 0;
    for (const item of items) {
      if (item.status === "declined") continue;
      const covers = parseCovers(item.covers);
      // No declared coverage → the item is counted against the total only.
      if (covers.length === 0 || covers.includes(l.key)) covered += item.amountUsd;
    }
    return {
      key: l.key,
      label: l.label,
      cost: l.cost,
      covered: Math.min(covered, l.cost),
      gap: Math.max(0, l.cost - covered),
    };
  });

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
    openActions: items
      .filter((i) => i.status === "planned" || i.status === "applied")
      .map((i) => ({ name: i.name, kind: i.kind, amountUsd: i.amountUsd, status: i.status })),
  };
}

/** Breakdown line for the post-admission view (spec §24). */
export interface PostAdmissionFunding {
  tuition: number;
  scholarship: number;
  aid: number;
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
