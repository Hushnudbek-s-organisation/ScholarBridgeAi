import { NextResponse } from "next/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { scholarships, universities } from "@/db/schema";
import { compareCountries, listCountries, type CountryComparison } from "@/lib/countryCompare";
import { resolvedUsdScholarshipAmount, resolvedUsdUniversityCosts } from "@/lib/usdCosts";

export const dynamic = "force-dynamic";

/**
 * #29 Country comparison.
 *
 * GET /api/countries/compare?countries=Germany,USA (up to 6)
 *     /api/countries/compare                     (top 8 by universities in the DB)
 *
 * Public catalog, like /api/scholarships. Every number comes from database
 * rows; work-rights are reported as null because the database does not
 * publish them.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const [universityRows, scholarshipRows] = await Promise.all([
      db
        .select({
          country: universities.country,
          annualTuitionUsd: universities.annualTuitionUsd,
          annualTuition: universities.annualTuition,
          tuitionCurrency: universities.tuitionCurrency,
          tuitionPeriod: universities.tuitionPeriod,
          annualLivingEstUsd: universities.annualLivingEstUsd,
          annualLivingEst: universities.annualLivingEst,
          livingCostCurrency: universities.livingCostCurrency,
          livingCostPeriod: universities.livingCostPeriod,
          minIelts: universities.minIelts,
          postStudyWorkVisaYears: universities.postStudyWorkVisaYears,
        })
        .from(universities)
        .where(eq(universities.isActive, true)),
      db.select({
        country: scholarships.country,
        amountUsdValue: scholarships.amountUsdValue,
        awardAmount: scholarships.awardAmount,
        awardCurrency: scholarships.awardCurrency,
        awardPeriod: scholarships.awardPeriod,
      }).from(scholarships).where(eq(scholarships.isActive, true)),
    ]);
    const unis = universityRows.map((row) => ({ ...row, ...resolvedUsdUniversityCosts(row) }));
    const schs = scholarshipRows.map((row) => ({
      country: row.country,
      amountUsdValue: resolvedUsdScholarshipAmount(row),
      awardPeriod: row.awardPeriod,
    }));

    let wanted: string[];
    const param = url.searchParams.get("countries")?.trim();
    if (param) {
      wanted = param
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
        .slice(0, 6);
    } else {
      wanted = listCountries(unis).slice(0, 8).map((c) => c.country);
    }

    const comparisons: CountryComparison[] = wanted.map((c) => compareCountries(c, unis, schs));
    return NextResponse.json({
      source: "database",
      countries: comparisons,
      available: listCountries(unis).slice(0, 40),
    });
  } catch {
    return NextResponse.json({ error: "Failed to compare countries" }, { status: 500 });
  }
}
