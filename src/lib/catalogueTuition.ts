import { convertCurrencyToUsd } from "./currency";
import { annualUsdAmount, normalizeCurrency, resolvedUsdUniversityCosts, type UniversityCostFields } from "./usdCosts";
import { supportsDegreeLevel } from "./degreeLevels";
import { subjectAffinity } from "./subjectAffinity";
import type { VerifiedCardProgramme } from "./universityCardSummary";

export function catalogueTuition(
  university: UniversityCostFields & { verificationStatus: string | null },
  programmes: VerifiedCardProgramme[],
  degree?: string | null,
  major?: string | null,
): { amount: number; estimated: boolean; source: string | null; programme: string | null } | null {
  const hasDegree = Boolean(degree && degree !== "All");
  const hasMajor = Boolean(major && major !== "All");
  const options = programmes.filter((program) => (
    program.tuition &&
    (!hasDegree || (program.degreeLevel && supportsDegreeLevel(program.degreeLevel, degree))) &&
    (!hasMajor || subjectAffinity([major!], program.field ?? program.name).score > 0)
  ));

  const annualAmount = (amount: number | string | null | undefined, currency: string | null | undefined, period: string | null | undefined) => {
    const currencyCode = normalizeCurrency(currency);
    if (!currencyCode) return null;
    const estimate = currencyCode === "USD" ? amount : convertCurrencyToUsd(amount, currencyCode);
    const usd = annualUsdAmount({ value: estimate, currency: "USD", period });
    return usd == null ? null : { amount: usd, estimated: currencyCode !== "USD" };
  };
  for (const program of options) {
    const tuition = program.tuition!;
    const annual = annualAmount(tuition.amount, tuition.currency, tuition.period);
    if (annual) return { ...annual, source: tuition.sourceUrl, programme: program.name };
  }
  if (hasDegree || hasMajor || university.verificationStatus !== "verified") return null;
  const canonical = resolvedUsdUniversityCosts(university).annualTuitionUsd;
  if (canonical != null) return { amount: canonical, estimated: false, source: null, programme: null };
  const annual = annualAmount(university.annualTuition, university.tuitionCurrency, university.tuitionPeriod);
  return annual ? { ...annual, source: null, programme: null } : null;
}
