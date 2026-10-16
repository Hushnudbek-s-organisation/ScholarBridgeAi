/**
 * Feature 5.4 — Country-Specific e-Apostille & 28-Day Bank Statement Date
 * Calculator.
 *
 * WHY
 * ---
 * Visa and scholarship refusals from Uzbekistan are frequently documentary,
 * not academic: a bank statement that broke the UK's 28-day consecutive rule,
 * a German file with no Sperrkonto blocking confirmation, a diploma that never
 * received its Hague e-Apostille on my.gov.uz before the certified translation
 * was made. Every one of those is a date problem the student can solve months
 * in advance — if the dates are written down.
 *
 * HONESTY RULES
 * -------------
 *  1. A rule this module could not ground in a published source is `null`, not
 *     a plausible-looking default. Only the UK publishes a consecutive-day
 *     rule among these destinations; the others get `consecutiveDays: null`
 *     with the reason, never an invented 28.
 *  2. Amounts come in two kinds and are labelled: `estimated: false` for a
 *     published visa-funds figure with its official source, `estimated: true`
 *     for a country cost benchmark from `COUNTRY_COST_BENCHMARKS` (the same
 *     distinction `/api/planning` and `/api/funding` already make).
 *  3. Currency conversion uses the platform's single rate table
 *     (`CURRENCY_RATES_TO_USD`) so this card and the funding planner agree.
 *  4. Document rules are "typical for this destination, confirm with the
 *     receiving institution and the embassy" — the matrix carries the official
 *     portal for each country and never claims to replace it.
 *  5. Deterministic and pure: dates are UTC, `today` is passed in by the
 *     caller, and two runs produce identical output.
 */

import { COUNTRY_COST_BENCHMARKS, CURRENCY_RATES_TO_USD } from "./countryCostBenchmarks";
import { countriesMatch } from "./countries";

/* -------------------------------------------------------------------------- */
/* Currency                                                                    */
/* -------------------------------------------------------------------------- */

/** Convert to USD with the platform's single published rate table. */
export function toUsd(amount: number, currency: string): number {
  const code = (currency || "USD").trim().toUpperCase();
  const entry = CURRENCY_RATES_TO_USD[code];
  if (!entry) return Math.round(amount);
  return Math.round(amount * entry.rateToUsd);
}

/** The symbol used next to an amount in this module's tables. */
export function currencySymbol(currency: string): string {
  return CURRENCY_RATES_TO_USD[(currency || "USD").toUpperCase()]?.symbol ?? "";
}

/* -------------------------------------------------------------------------- */
/* Published visa-funds rules                                                  */
/* -------------------------------------------------------------------------- */

/** What kind of money proof the consulate actually asks for. */
export type FundsRuleId =
  | "uk_28_day"
  | "blocked_account"
  | "balance_certificate"
  | "i20_amount"
  | "liquid_available"
  | "gic_or_liquid";

export interface LiquidFundsRequirement {
  country: string;
  visaType: string;
  ruleId: FundsRuleId;
  /** Published amount in its own currency. Null when no national figure exists. */
  amount: number | null;
  currency: string;
  /** The same amount in USD, via the shared rate table. */
  amountUsd: number | null;
  /** How the figure is built, in plain numbers ("1,483 × 9 months"). */
  basis: string;
  /** True when this is a cost benchmark rather than a published visa figure. */
  estimated: boolean;
  /** Whether unpaid first-year tuition must be shown on top of this amount. */
  tuitionSeparate: boolean;
  /** Consecutive days the funds must already be in the account. */
  consecutiveDays: number | null;
  /** Statement closing date must be within this many days of the application. */
  statementValidityDays: number | null;
  /** An official full-scholarship award letter may replace the bank proof. */
  scholarshipLetterAccepted: boolean;
  sourceName: string;
  sourceUrl: string;
  note: string;
}

/** UK maintenance, per month, for up to 9 months (published on GOV.UK). */
export const UK_MAINTENANCE_PER_MONTH_GBP = { london: 1483, outsideLondon: 1136 } as const;
export const UK_MAINTENANCE_MONTHS = 9;

/**
 * The published funds rules this calculator knows. Countries without an entry
 * fall back to their cost benchmark and are flagged `estimated: true`.
 */
export const PUBLISHED_FUNDS_RULES: LiquidFundsRequirement[] = [
  {
    country: "United Kingdom",
    visaType: "Student Route Visa",
    ruleId: "uk_28_day",
    amount: UK_MAINTENANCE_PER_MONTH_GBP.london * UK_MAINTENANCE_MONTHS,
    currency: "GBP",
    amountUsd: toUsd(UK_MAINTENANCE_PER_MONTH_GBP.london * UK_MAINTENANCE_MONTHS, "GBP"),
    basis: "£1,483/month (London) × 9 months = £13,347; £1,136/month outside London × 9 = £10,224",
    estimated: false,
    tuitionSeparate: true,
    consecutiveDays: 28,
    statementValidityDays: 31,
    scholarshipLetterAccepted: true,
    sourceName: "GOV.UK — Student visa: money you need",
    sourceUrl: "https://www.gov.uk/student-visa/money",
    note: "The balance must never drop below the required amount for 28 consecutive days, and the statement's closing date must be within 31 days of the online application.",
  },
  {
    country: "Germany",
    visaType: "National Student Visa (§16b)",
    ruleId: "blocked_account",
    amount: 11904,
    currency: "EUR",
    amountUsd: toUsd(11904, "EUR"),
    basis: "€992/month × 12 months = €11,904 blocked (Sperrkonto)",
    estimated: false,
    tuitionSeparate: false,
    consecutiveDays: null,
    statementValidityDays: null,
    scholarshipLetterAccepted: true,
    sourceName: "Study in Germany (DAAD) — proof of financing",
    sourceUrl: "https://www.study-in-germany.com/en/plan-your-studies/requirements/proof-of-financing/",
    note: "Germany asks for a blocked account with a blocking confirmation (Sperrkonto), not a 28-day balance history. A full DAAD or El-yurt umidi award letter at or above the monthly rate replaces it.",
  },
  {
    country: "South Korea",
    visaType: "D-2 Student Visa",
    ruleId: "balance_certificate",
    amount: 20000,
    currency: "USD",
    amountUsd: 20000,
    basis: "USD 20,000 balance certificate (KVAC / embassy requirement)",
    estimated: false,
    tuitionSeparate: false,
    consecutiveDays: null,
    statementValidityDays: null,
    scholarshipLetterAccepted: true,
    sourceName: "Embassy of the Republic of Korea in Uzbekistan",
    sourceUrl: "https://overseas.mofa.go.kr/uz-ru/wpge/m_5137/contents.do",
    note: "Korean visa centres ask for a bank balance certificate rather than a day-count history; a full GKS award letter is accepted in place of it.",
  },
  {
    country: "Canada",
    visaType: "Study Permit",
    ruleId: "gic_or_liquid",
    amount: 20635,
    currency: "CAD",
    amountUsd: toUsd(20635, "CAD"),
    basis: "CA$20,635 per year of living costs, plus tuition and travel",
    estimated: false,
    tuitionSeparate: true,
    consecutiveDays: null,
    statementValidityDays: null,
    scholarshipLetterAccepted: true,
    sourceName: "IRCC — Study permit: proof of funds",
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
    note: "IRCC accepts liquid funds, a Guaranteed Investment Certificate (GIC) through a participating bank, or a scholarship letter. Tuition and travel are shown separately from the living-cost figure.",
  },
  {
    country: "United States",
    visaType: "F-1 Student Visa",
    ruleId: "i20_amount",
    amount: null,
    currency: "USD",
    amountUsd: null,
    basis: "The amount is set by the school on Form I-20 (tuition + living for one academic year)",
    estimated: false,
    tuitionSeparate: true,
    consecutiveDays: null,
    statementValidityDays: null,
    scholarshipLetterAccepted: true,
    sourceName: "U.S. Department of State — student visa",
    sourceUrl: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
    note: "There is no single national figure: the I-20 states exactly what must be documented, and a university or assistantship award reduces it line by line.",
  },
];

/** Countries the card supports out of the box (the requested destination set). */
export const SUPPORTED_FUNDS_COUNTRIES = [
  "United Kingdom",
  "United States",
  "Germany",
  "South Korea",
  "Canada",
  "Italy",
  "Hungary",
] as const;

function publishedRuleFor(country: string | null | undefined): LiquidFundsRequirement | null {
  if (!country) return null;
  return PUBLISHED_FUNDS_RULES.find((rule) => countriesMatch(rule.country, country)) ?? null;
}

/**
 * The funds requirement for a destination: the published rule when one exists,
 * otherwise the country cost benchmark, clearly flagged as an estimate.
 */
export function resolveFundsRequirement(
  country: string | null | undefined,
  options: { ukArea?: "london" | "outsideLondon" } = {}
): LiquidFundsRequirement | null {
  if (!country) return null;
  const published = publishedRuleFor(country);

  if (published) {
    if (published.ruleId !== "uk_28_day" || (options.ukArea ?? "london") === "london") return published;
    const amount = UK_MAINTENANCE_PER_MONTH_GBP.outsideLondon * UK_MAINTENANCE_MONTHS;
    return {
      ...published,
      amount,
      amountUsd: toUsd(amount, "GBP"),
      basis: "£1,136/month (outside London) × 9 months = £10,224",
    };
  }

  const benchmark = Object.values(COUNTRY_COST_BENCHMARKS).find((b) => countriesMatch(b.country, country));
  if (!benchmark) return null;

  return {
    country: benchmark.country,
    visaType: "Student visa",
    ruleId: "liquid_available",
    amount: benchmark.annualLivingDefaultUsd,
    currency: "USD",
    amountUsd: benchmark.annualLivingDefaultUsd,
    basis: "Country living-cost benchmark (no single published visa figure on file)",
    estimated: true,
    tuitionSeparate: true,
    consecutiveDays: null,
    statementValidityDays: null,
    scholarshipLetterAccepted: true,
    sourceName: benchmark.officialSourceName,
    sourceUrl: benchmark.officialSourceUrl,
    note: benchmark.notes,
  };
}

/* -------------------------------------------------------------------------- */
/* The date calculator                                                         */
/* -------------------------------------------------------------------------- */

export interface FundsWindow {
  ok: boolean;
  country: string | null;
  /** `YYYY-MM-DD` of the planned visa application, or null when unparsable. */
  applicationDate: string | null;
  /**
   * Latest day the money can be deposited and still satisfy the consecutive-day
   * rule when the statement closes on the application date.
   */
  fundsInPlaceBy: string | null;
  /** The statement's closing date must not be earlier than this. */
  statementNotBefore: string | null;
  /** The statement's closing date must not be later than this. */
  statementNotAfter: string | null;
  /** Earliest day a valid holding window could begin (widest option). */
  earliestWindowStart: string | null;
  consecutiveDays: number | null;
  statementValidityDays: number | null;
  requirement: LiquidFundsRequirement | null;
  /** Why there is no window: no rule, no date, or no destination. */
  reason: "ok" | "no_country" | "no_date" | "no_rule" | "no_published_window";
}

/** Parse `YYYY-MM-DD` / ISO / Date into UTC midnight. */
export function parseYmd(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const text = String(value).trim();
  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = ymd
    ? new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])))
    : new Date(text);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function ymd(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 86_400_000);
}

/**
 * Compute the exact dates the money has to be in place for one destination and
 * one planned application date.
 *
 * The arithmetic, spelled out for the UK (28 consecutive days, statement valid
 * 31 days, application 2027-06-15):
 *   statementNotAfter   = application date                    → 2027-06-15
 *   statementNotBefore  = application − 31 days               → 2027-05-15
 *   fundsInPlaceBy      = statementNotAfter − 28 days         → 2027-05-18
 *   earliestWindowStart = statementNotBefore − 28 days        → 2027-04-17
 * so the student can deposit as late as 2027-05-18 and still show a full
 * 28-day history on the day they apply — or start earlier and keep more slack.
 */
export function computeFundsWindow(
  country: string | null | undefined,
  applicationDate: string | Date | null | undefined,
  options: { ukArea?: "london" | "outsideLondon" } = {}
): FundsWindow {
  const base: FundsWindow = {
    ok: false,
    country: country ?? null,
    applicationDate: null,
    fundsInPlaceBy: null,
    statementNotBefore: null,
    statementNotAfter: null,
    earliestWindowStart: null,
    consecutiveDays: null,
    statementValidityDays: null,
    requirement: null,
    reason: "no_country",
  };
  if (!country) return base;

  const requirement = resolveFundsRequirement(country, options);
  if (!requirement) return { ...base, reason: "no_rule" };

  const app = parseYmd(applicationDate);
  if (!app) return { ...base, requirement, reason: "no_date" };

  const consecutiveDays = requirement.consecutiveDays;
  const validityDays = requirement.statementValidityDays;

  if (consecutiveDays == null && validityDays == null) {
    // No published day-count rule: there is no window to compute, and saying
    // so is more useful than inventing one.
    return {
      ...base,
      country,
      applicationDate: ymd(app),
      requirement,
      consecutiveDays: null,
      statementValidityDays: null,
      reason: "no_published_window",
    };
  }

  const days = consecutiveDays ?? 0;
  const validity = validityDays ?? 0;
  return {
    ok: true,
    country,
    applicationDate: ymd(app),
    fundsInPlaceBy: ymd(shiftDays(app, days)),
    statementNotBefore: validity ? ymd(shiftDays(app, validity)) : null,
    statementNotAfter: ymd(app),
    earliestWindowStart: validity ? ymd(shiftDays(shiftDays(app, validity), days)) : ymd(shiftDays(app, days)),
    consecutiveDays,
    statementValidityDays: validityDays,
    requirement,
    reason: "ok",
  };
}

/* -------------------------------------------------------------------------- */
/* Uzbekistan e-Apostille & notarisation matrix                                */
/* -------------------------------------------------------------------------- */

export type DocumentId =
  | "diploma"
  | "transcript"
  | "birth_certificate"
  | "police_clearance"
  | "marriage_certificate"
  | "medical"
  | "bank_statement"
  | "passport";

export const DOCUMENT_IDS: DocumentId[] = [
  "diploma",
  "transcript",
  "birth_certificate",
  "police_clearance",
  "marriage_certificate",
  "medical",
  "bank_statement",
  "passport",
];

/**
 *  - `required`       the destination routinely asks for a Hague apostille
 *  - `accepted`       an apostille is accepted where the receiving body asks
 *                     for legalisation of a public document
 *  - `not_applicable` this document is never apostilled (a passport, a bank's
 *                     own statement) — it is certified by its issuer instead
 *  - `verify`         the requirement is set by the receiving institution or
 *                     consulate case by case
 */
export type ApostilleNeed = "required" | "accepted" | "not_applicable" | "verify";
export type TranslationNeed = "sworn" | "certified" | "not_required" | "verify";

export interface DocumentApostilleRule {
  id: DocumentId;
  apostille: ApostilleNeed;
  translation: TranslationNeed;
  /** Language the translation is normally made into (null = English accepted). */
  translationLanguage: string | null;
}

export interface ApostilleCountryProfile {
  country: string;
  /** Every destination here is a Hague Apostille Convention member. */
  hagueMember: boolean;
  /** Where the apostille is obtained in Uzbekistan. */
  portalName: string;
  portalUrl: string;
  /** Ministry that apostilles academic documents. */
  issuingAuthorityKey: string;
  /** Planning buffer for the apostille itself plus a certified translation. */
  leadDays: number;
  documents: DocumentApostilleRule[];
  sourceName: string;
  sourceUrl: string;
  note: string;
}

/** my.gov.uz issues the Uzbek e-Apostille; plan one to two weeks. */
export const E_APOSTILLE_PORTAL = { name: "my.gov.uz — e-Apostille", url: "https://my.gov.uz" } as const;
export const E_APOSTILLE_LEAD_DAYS = 14;

/** Documents that are never apostilled anywhere: they are issuer-certified. */
const NEVER_APOSTILLED: DocumentApostilleRule[] = [
  { id: "passport", apostille: "not_applicable", translation: "not_required", translationLanguage: null },
  { id: "bank_statement", apostille: "not_applicable", translation: "certified", translationLanguage: null },
];

const ACADEMIC_DEFAULTS: DocumentApostilleRule[] = [
  { id: "diploma", apostille: "required", translation: "certified", translationLanguage: null },
  { id: "transcript", apostille: "required", translation: "certified", translationLanguage: null },
  { id: "birth_certificate", apostille: "required", translation: "certified", translationLanguage: null },
  { id: "police_clearance", apostille: "required", translation: "certified", translationLanguage: null },
  { id: "marriage_certificate", apostille: "accepted", translation: "certified", translationLanguage: null },
  { id: "medical", apostille: "verify", translation: "verify", translationLanguage: null },
];

/**
 * Build a country's document matrix from the defaults plus per-document
 * overrides. The answer each row gives is conditional on purpose:
 *
 *   "IF the receiving body asks for this document, does it need a Hague
 *    apostille, and what kind of translation?"
 *
 * It never claims the destination requires the document — that is the
 * embassy's or the university's own published list, linked on every row.
 */
function withCommonDocuments(overrides: Partial<Record<DocumentId, Partial<DocumentApostilleRule>>> = {}): DocumentApostilleRule[] {
  const rows = [...ACADEMIC_DEFAULTS, ...NEVER_APOSTILLED].map((rule) => {
    const patch = overrides[rule.id];
    return patch ? { ...rule, ...patch } : rule;
  });
  // Keep a stable document order for the table.
  return DOCUMENT_IDS.map((id) => rows.find((row) => row.id === id)).filter(
    (row): row is DocumentApostilleRule => row != null
  );
}

/**
 * The apostille / notarisation matrix. Uzbekistan is a Hague Apostille
 * Convention member, so an e-Apostille from my.gov.uz is what every destination
 * below recognises; what differs is the translation regime and which documents
 * the receiving body asks to see legalised at all.
 */
export const APOSTILLE_MATRIX: ApostilleCountryProfile[] = [
  {
    country: "United Kingdom",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryJustice",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments(),
    sourceName: "GOV.UK — Student visa",
    sourceUrl: "https://www.gov.uk/student-visa",
    note: "UK universities and UKVI normally accept documents in English without translation; an apostille is asked for when the institution requires legalisation of a foreign public document.",
  },
  {
    country: "United States",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryJustice",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments(),
    sourceName: "U.S. Department of State — student visa",
    sourceUrl: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
    note: "Most U.S. schools ask for a credential evaluation (WES/ECE) or certified English translations rather than an apostille; the F-1 interview file usually keeps the originals.",
  },
  {
    country: "Germany",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryHigherEducation",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments({
      diploma: { translation: "sworn", translationLanguage: "German or English" },
      transcript: { translation: "sworn", translationLanguage: "German or English" },
      birth_certificate: { translation: "sworn", translationLanguage: "German or English" },
      medical: { apostille: "not_applicable", translation: "certified", translationLanguage: "German" },
    }),
    sourceName: "German Embassy Tashkent — visa & entry",
    sourceUrl: "https://taschkent.diplo.de/uz-de/service/05-VisaEinreise",
    note: "Apostille the ORIGINAL diploma and transcript on my.gov.uz first, then have them translated by a sworn translator; uni-assist and the university check both.",
  },
  {
    country: "South Korea",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryHigherEducation",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments({
      diploma: { translationLanguage: "English" },
      transcript: { translationLanguage: "English" },
    }),
    sourceName: "Embassy of the Republic of Korea in Uzbekistan",
    sourceUrl: "https://overseas.mofa.go.kr/uz-ru/wpge/m_5137/contents.do",
    note: "GKS and D-2 files routinely ask for apostilled diplomas, transcripts, birth certificates and both parents' citizenship documents — start three weeks before the deadline.",
  },
  {
    country: "Canada",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryJustice",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments(),
    sourceName: "IRCC — Study permit",
    sourceUrl: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
    note: "Canada joined the Apostille Convention in 2024; an e-Apostille from my.gov.uz is recognised, and most institutions ask for a WES-style evaluation of the credential itself.",
  },
  {
    country: "Italy",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryHigherEducation",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments({
      diploma: { translation: "sworn", translationLanguage: "Italian" },
      transcript: { translation: "sworn", translationLanguage: "Italian" },
    }),
    sourceName: "Universitaly — Italian Ministry of University and Research",
    sourceUrl: "https://www.universitaly.it/",
    note: "Universitaly pre-enrolment asks for the apostilled degree plus a sworn Italian translation (or a Declaration of Value from the Italian embassy).",
  },
  {
    country: "Hungary",
    hagueMember: true,
    portalName: E_APOSTILLE_PORTAL.name,
    portalUrl: E_APOSTILLE_PORTAL.url,
    issuingAuthorityKey: "ministryHigherEducation",
    leadDays: E_APOSTILLE_LEAD_DAYS,
    documents: withCommonDocuments(),
    sourceName: "Embassy of Hungary in Tashkent",
    sourceUrl: "https://taskent.mfa.gov.hu/",
    note: "Stipendium Hungaricum (DreamApply) accepts English documents; the residence-permit file at the embassy is where an apostille and a certified translation are usually requested.",
  },
];

/** The matrix row for a destination (null when the country is not listed). */
export function apostilleProfileFor(country: string | null | undefined): ApostilleCountryProfile | null {
  if (!country) return null;
  return APOSTILLE_MATRIX.find((profile) => countriesMatch(profile.country, country)) ?? null;
}

/* -------------------------------------------------------------------------- */
/* The dated preparation schedule                                              */
/* -------------------------------------------------------------------------- */

export interface ApostilleStep {
  id: "order_apostille" | "certified_translation" | "collect_documents" | "submit_file";
  /** Days before the planned visa application date. */
  offsetDays: number;
  dueDate: string | null;
  daysOverdue: number;
}

export interface ApostilleReadiness {
  country: string | null;
  profile: ApostilleCountryProfile | null;
  applicationDate: string | null;
  steps: ApostilleStep[];
  /** Documents that need an apostille for this destination. */
  apostilleDocuments: DocumentId[];
  /** Documents that only need a notarised / certified translation. */
  translationOnlyDocuments: DocumentId[];
  /** Documents whose requirement is case-by-case (`verify`). */
  verifyDocuments: DocumentId[];
  /** Documents never apostilled (passport, the bank's own statement). */
  notApplicableDocuments: DocumentId[];
  funds: FundsWindow;
}

/**
 * The dated document-preparation schedule for one destination: when to order
 * the e-Apostille, when the certified translation must be finished, and which
 * documents belong in each pile.
 */
export function checkApostilleReadiness(
  country: string | null | undefined,
  visaApplicationDate: string | Date | null | undefined,
  options: { today?: string | Date | null; ukArea?: "london" | "outsideLondon" } = {}
): ApostilleReadiness {
  const profile = apostilleProfileFor(country);
  const app = parseYmd(visaApplicationDate);
  const today = parseYmd(options.today) ?? new Date(Date.now());
  const leadDays = profile?.leadDays ?? E_APOSTILLE_LEAD_DAYS;

  const stepSpecs: { id: ApostilleStep["id"]; offsetDays: number }[] = [
    { id: "collect_documents", offsetDays: leadDays + 14 },
    { id: "order_apostille", offsetDays: leadDays + 7 },
    { id: "certified_translation", offsetDays: leadDays },
    { id: "submit_file", offsetDays: 3 },
  ];

  const steps: ApostilleStep[] = stepSpecs.map((spec) => {
    const due = app ? shiftDays(app, spec.offsetDays) : null;
    const dueYmd = ymd(due);
    const overdue = due && today ? Math.max(0, Math.round((today.getTime() - due.getTime()) / 86_400_000)) : 0;
    return { id: spec.id, offsetDays: spec.offsetDays, dueDate: dueYmd, daysOverdue: overdue };
  });

  const documents = profile?.documents ?? [];
  return {
    country: country ?? null,
    profile,
    applicationDate: ymd(app),
    steps,
    apostilleDocuments: documents
      .filter((d) => d.apostille === "required" || d.apostille === "accepted")
      .map((d) => d.id),
    translationOnlyDocuments: documents
      .filter((d) => d.apostille === "not_applicable" && d.translation !== "not_required")
      .map((d) => d.id),
    verifyDocuments: documents.filter((d) => d.apostille === "verify").map((d) => d.id),
    notApplicableDocuments: documents.filter((d) => d.apostille === "not_applicable").map((d) => d.id),
    funds: computeFundsWindow(country, visaApplicationDate, options),
  };
}
