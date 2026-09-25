import { NextResponse } from "next/server";
import { db } from "@/db";
import { scholarships, universities } from "@/db/schema";
import { compareCountries, listCountries, type CountryComparison } from "@/lib/countryCompare";

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
    const [unis, schs] = await Promise.all([
      db
        .select({
          country: universities.country,
          annualTuitionUsd: universities.annualTuitionUsd,
          annualLivingEstUsd: universities.annualLivingEstUsd,
          minIelts: universities.minIelts,
        })
        .from(universities),
      db.select({ country: scholarships.country, amountUsdValue: scholarships.amountUsdValue }).from(scholarships),
    ]);

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
