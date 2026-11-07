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

/** Existing funding_items storage is whole USD, nearest-dollar rounded.
 * Validate BEFORE coercion: absence/null/booleans/containers are not zero.
 * Keep numeric form strings and existing fractional-input rounding compatible;
 * this does not claim original fractions/currency periods are stored. */
export function parseRecordedFundingUsd(value:unknown):number|null{
  if(typeof value!=="number"&&(typeof value!=="string"||!value.trim()))return null;
  const amount=typeof value==="number"?value:Number(value);
  if(!Number.isFinite(amount)||amount<0)return null;
  const rounded=Math.round(amount);
  return rounded<=2147483647?rounded:null;
}

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
  { key: "living", label: "Living costs" },
  { key: "accommodation", label: "Accommodation" },
  { key: "insurance", label: "Insurance" },
  { key: "books", label: "Books and supplies" },
  { key: "flights", label: "Flights" },
] as const;

export interface AnnualFundingCostLine {
  key: string;
  label: string;
  cost: number | null;
}

/** Build the same known/unknown annual lines for dashboard and funding views. */
export function annualFundingCostLines(costs: {
  annualTuitionUsd: number | null;
  annualLivingEstUsd: number | null;
  accommodationCostUsd: number | null;
  insurancePerYearUsd?: number | null;
  booksPerYearUsd?: number | null;
  flightsPerYearUsd?: number | null;
}): AnnualFundingCostLine[] {
  return COST_LINES
    // A published living-cost total may already include housing. Only show
    // accommodation separately when no living total exists and its own amount is known.
    .filter(({ key }) => key !== "accommodation" || (
      costs.annualLivingEstUsd == null && costs.accommodationCostUsd != null
    ))
    .map(({ key, label }) => ({
      key,
      label,
      cost: key === "tuition"
        ? costs.annualTuitionUsd
        : key === "living"
          ? costs.annualLivingEstUsd
          : key === "accommodation"
            ? costs.accommodationCostUsd
            : key === "insurance"
              ? (costs.insurancePerYearUsd ?? null)
              : key === "books"
                ? (costs.booksPerYearUsd ?? null)
                : key === "flights"
                  ? (costs.flightsPerYearUsd ?? null)
                  : null,
    }));
}

/** Null unless every included annual cost line has a known non-negative value. */
export function knownAnnualCostTotal(lines: AnnualFundingCostLine[]): number | null {
  if (lines.length === 0 || lines.some((line) =>
    line.cost == null || !Number.isFinite(line.cost) || line.cost < 0
  )) return null;
  return lines.reduce((total, line) => total + (line.cost as number), 0);
}

/** Visa and application fees are one-off costs, not annual funding lines. */
export const ONE_OFF_COST_LINES = [
  { key: "visa_fee", label: "Visa fee" },
  { key: "application_fee", label: "Application fee" },
] as const;

export type CostLineKey = (typeof COST_LINES)[number]["key"];

export interface FundingPlanResult {
  /** Total yearly cost; null until every required annual cost is known. */
  annualCost: number | null;
  currency: string;
  /** Scholarship + aid only (money that is NOT the family's own). */
  scholarshipTotal: number;
  /** Family + savings + loans. */
  ownContributionTotal: number;
  /** Only what is actually secured (awarded / confirmed). */
  securedTotal: number;
  /** What is only planned or applied for. */
  projectedTotal: number;
  /** annualCost − everything that could still materialise; null if cost is unknown. */
  fundingGap: number | null;
  /** annualCost − what is secured today; null if cost is unknown. */
  securedGap: number | null;
  isCovered: boolean | null;
  byLine: { key: string; label: string; cost: number | null; covered: number | null; gap: number | null }[];
  /** Scholarships that are still open actions for the student. */
  openActions: { name: string; kind: FundingKind; amountUsd: number; status: FundingStatus }[];
}

export function buildFundingPlan(input: {
  annualCost: number | null;
  currency?: string;
  lines?: { key: string; label: string; cost: number | null }[];
  items: FundingItemLike[];
}): FundingPlanResult {
  const currency = input.currency ?? "USD";
  const items = input.items ?? [];
  const lines = (input.lines ?? []).map((line) => ({
    ...line,
    cost: line.cost == null ? null : nullableNonNegativeFinite(line.cost),
  }));
  const annualCost = input.annualCost == null ? null : nullableNonNegativeFinite(input.annualCost);

  const isMoney = (k: FundingKind) => k === "scholarship" || k === "aid";
  const isSecured = (s: FundingStatus) => s === "awarded" || s === "confirmed";

  const scholarshipTotal = sum(items.filter((i) => isMoney(i.kind)));
  const ownContributionTotal = sum(items.filter((i) => !isMoney(i.kind)));
  const securedTotal = sum(items.filter((i) => isSecured(i.status)));
  const projectedTotal = sum(items.filter((i) => i.status !== "declined"));

  // Allocate each dollar at most once. Explicitly scoped items go to their
  // declared lines first; unscoped items are then distributed, in line order,
  // over any remaining costs. Unused restricted funding does not spill over.
  const available = items.map((item) => ({
    amount: item.status === "declined" ? 0 : nonNegativeFinite(item.amountUsd),
    covers: parseCovers(item.covers),
  }));
  const coveredByLine: (number | null)[] = lines.map((line) => line.cost == null ? null : 0);
  const allocate = (itemIndex: number, lineIndex: number) => {
    const cost = lines[lineIndex].cost;
    const covered = coveredByLine[lineIndex];
    // Never allocate against an unknown cost as though it were a $0 line.
    if (cost == null || covered == null) return;
    const left = Math.max(0, cost - covered);
    const amount = Math.min(left, available[itemIndex].amount);
    if (amount <= 0) return;
    coveredByLine[lineIndex] = covered + amount;
    available[itemIndex].amount -= amount;
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      if (available[itemIndex].covers.length > 0 && available[itemIndex].covers.includes(lines[lineIndex].key)) {
        allocate(itemIndex, lineIndex);
      }
    }
  }
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      if (available[itemIndex].covers.length === 0) allocate(itemIndex, lineIndex);
    }
  }

  const byLine = lines.map((line, index) => ({
    key: line.key,
    label: line.label,
    cost: line.cost,
    covered: coveredByLine[index],
    gap: line.cost == null || coveredByLine[index] == null
      ? null
      : Math.max(0, line.cost - coveredByLine[index]),
  }));

  const fundingGap = annualCost == null ? null : Math.max(0, annualCost - projectedTotal);
  const securedGap = annualCost == null ? null : Math.max(0, annualCost - securedTotal);

  return {
    annualCost,
    currency,
    scholarshipTotal,
    ownContributionTotal,
    securedTotal,
    projectedTotal,
    fundingGap,
    securedGap,
    isCovered: fundingGap == null ? null : fundingGap === 0,
    byLine,
    openActions: items
      .filter((i) => i.status === "planned" || i.status === "applied")
      .map((i) => ({ name: i.name, kind: i.kind, amountUsd: i.amountUsd, status: i.status })),
  };
}

/** Existing projection/allocator above is retained for compatibility. Rendered
 * plans use this explicit scenario adapter, never the optimistic projection by
 * accident. A student's status is a record, not publisher eligibility proof. */
export type FundingScenario="confirmed"|"optimistic";
export function buildFundingScenario(input:Parameters<typeof buildFundingPlan>[0],scenario:FundingScenario="confirmed") {
  const possibleItems=input.items.filter(item=>item.status!=="declined");
  const confirmedItems=possibleItems.filter(item=>item.status==="confirmed");
  const projected=buildFundingPlan({...input,items:possibleItems});
  const confirmed=buildFundingPlan({...input,items:confirmedItems});
  const active=scenario==="optimistic"?projected:confirmed;
  const allocated=(plan:FundingPlanResult)=>plan.byLine.reduce((total,line)=>total+(line.covered??0),0);
  const gap=(plan:FundingPlanResult):number|null=>{
    // Restricted excess cannot close an unrelated line. Incomplete or
    // inconsistent lines cannot prove a whole-year funding gap.
    const total=knownAnnualCostTotal(plan.byLine);
    if(plan.annualCost==null||total==null||Math.abs(total-plan.annualCost)>0.005)return null;
    return Math.round(Math.max(0,plan.annualCost-allocated(plan))*100)/100;
  };
  const fundingGap=gap(active),securedGap=gap(confirmed);
  return {...projected,
    scenario,basis:"student_recorded_cash_commitments" as const,
    scholarshipTotal:active.scholarshipTotal,ownContributionTotal:active.ownContributionTotal,
    securedTotal:confirmed.securedTotal,securedAllocatedTotal:allocated(confirmed),
    conditionalTotal:Math.max(0,projected.projectedTotal-confirmed.securedTotal),
    optimisticGap:gap(projected),fundingGap,securedGap,
    isCovered:fundingGap==null?null:fundingGap===0,byLine:active.byLine,
    // No disbursement timing is stored by this legacy USD metadata model.
    // Even confirmed cash commitments do not establish upfront availability.
    upfrontGap:null as number|null,timingRecorded:false as const,
    repayableTotal:active===confirmed?sum(confirmedItems.filter(item=>item.kind==="loan")):sum(possibleItems.filter(item=>item.kind==="loan")),
  };
}

/** Breakdown line for the post-admission view (spec §24). */
export type OfferTuitionBasis = "offer_recorded_usd" | "published_annual_usd";
export interface PostAdmissionFunding {
  scenario: "confirmed";
  basis: "student_recorded_cash_commitments";
  tuitionBasis: OfferTuitionBasis | "unknown";
  tuition: number | null;
  tuitionRemaining: number | null;
  confirmedAllocatedToTuition: number;
  confirmedNotAllocatedToTuition: number;
  conditionalTotal: number;
  repayableTotal: number;
  upfrontGap: number | null;
  timingRecorded: false;
  scholarship: number;
  aid: number;
  otherConfirmed: number;
  deposit: number | null;
  depositDueDate: string | null;
  /** What the student must pay to the university, and by when; null if unknown. */
  payableNow: { amount: number | null; dueDate: string | null; payee: string };
  explanation: string[];
}

export function postAdmissionFunding(input: {
  tuition: number | null;
  tuitionBasis?: OfferTuitionBasis;
  items: FundingItemLike[];
  depositAmount?: number | null;
  depositDueDate?: string | null;
  universityName: string;
}): PostAdmissionFunding {
  const securedItems = input.items.filter((i) => i.status === "confirmed");
  const scholarship = sum(securedItems.filter((i) => i.kind === "scholarship"));
  const aid = sum(securedItems.filter((i) => i.kind === "aid"));
  // A confirmed explicit family/savings/loan item is real funding; profile
  // income is not present in this function and cannot be inferred here.
  const otherConfirmed = sum(securedItems.filter((i) => i.kind !== "scholarship" && i.kind !== "aid"));
  const secured = scholarship + aid + otherConfirmed;
  const deposit = input.depositAmount == null ? null : nullableNonNegativeFinite(input.depositAmount);
  const tuition = input.tuition == null ? null : nullableNonNegativeFinite(input.tuition);
  // Reuse the existing once-only allocator and confirmed scenario adapter.
  // Housing/living restrictions never become unrestricted tuition coverage.
  const plan = buildFundingScenario({annualCost:tuition,lines:[{key:"tuition",label:"Tuition",cost:tuition}],items:input.items});
  const remaining = plan.fundingGap;
  const notAllocated = Math.max(0, secured - plan.securedAllocatedTotal);

  const confirmedBreakdown = [
    scholarship > 0 ? `scholarship $${scholarship.toLocaleString()}` : "",
    aid > 0 ? `aid $${aid.toLocaleString()}` : "",
    otherConfirmed > 0 ? `other confirmed funds $${otherConfirmed.toLocaleString()}` : "",
  ].filter(Boolean).join(" + ");
  const explanation: string[] = [];
  explanation.push(tuition == null
    ? "Tuition commitment is not recorded; verify the amount in the official offer letter."
    : `Tuition commitment: $${tuition.toLocaleString()}.`);
  explanation.push(
    secured > 0
      ? `Confirmed funding: $${secured.toLocaleString()}${confirmedBreakdown ? ` (${confirmedBreakdown})` : ""}.`
      : tuition == null
        ? "No confirmed funding is recorded."
        : "No confirmed funding yet — the full tuition is still your responsibility."
  );
  if (deposit != null) {
    explanation.push(
      `Deposit: $${deposit.toLocaleString()}${input.depositDueDate ? ` due ${input.depositDueDate}` : ""}, payable to ${input.universityName}.`
    );
  } else {
    explanation.push("No deposit recorded. Check your offer letter for the deposit amount and due date.");
  }
  explanation.push(remaining == null
    ? "Remaining tuition after confirmed funding cannot be calculated until the tuition amount is verified."
    : `Remaining after confirmed funding: $${remaining.toLocaleString()}.`);

  if(notAllocated>0)explanation.push(`$${notAllocated.toLocaleString()} of confirmed funding is not allocated to this tuition amount; restrictions and excess do not pay unrelated costs.`);
  if(plan.conditionalTotal>0)explanation.push(`Conditional funding recorded: $${plan.conditionalTotal.toLocaleString()} (planned, applied or awarded; excluded from confirmed tuition coverage).`);
  if(plan.repayableTotal>0)explanation.push(`Confirmed loans: $${plan.repayableTotal.toLocaleString()}, repayable rather than grant funding.`);
  explanation.push("Funding disbursement timing is not recorded; confirmed commitments do not prove upfront availability or reduce the recorded deposit.");
  return {
    scenario:"confirmed",
    basis:plan.basis,
    tuitionBasis:tuition==null?"unknown":(input.tuitionBasis??"offer_recorded_usd"),
    tuition,
    tuitionRemaining:remaining,
    confirmedAllocatedToTuition:plan.securedAllocatedTotal,
    confirmedNotAllocatedToTuition:notAllocated,
    conditionalTotal:plan.conditionalTotal,
    repayableTotal:plan.repayableTotal,
    upfrontGap:plan.upfrontGap,
    timingRecorded:plan.timingRecorded,
    scholarship,
    aid,
    otherConfirmed,
    deposit,
    depositDueDate: input.depositDueDate ?? null,
    payableNow: { amount: deposit, dueDate: deposit == null ? null : input.depositDueDate ?? null, payee: input.universityName },
    explanation,
  };
}

// ---------------------------------------------------------------------------

function sum(items: FundingItemLike[]): number {
  return items.reduce((total, item) => total + nonNegativeFinite(item.amountUsd), 0);
}

function nonNegativeFinite(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function nullableNonNegativeFinite(value: number): number | null {
  return Number.isFinite(value) && value >= 0 ? value : null;
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
