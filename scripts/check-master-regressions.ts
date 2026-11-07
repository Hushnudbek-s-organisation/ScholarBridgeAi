import assert from "node:assert/strict";
import { calculateCosts } from "../src/lib/costs";
import { gpaTo40Scale } from "../src/lib/gpa";
import { pickBestSource } from "../src/lib/sourcePick";
import {
  verifyFactOnPage,
  type OfficialSourceTarget,
} from "../src/lib/officialSourceAdapter";
import {
  LocalCacheRevisionStore,
  setCacheRevisionStore,
  bumpCacheRevision,
} from "../src/lib/cacheRevision";
import { sharedDashboardRecommendationCacheKey } from "../src/lib/dashboardRecommendationCache";
import { resolveScopedFact } from "../src/lib/factResolver";
import { fromCatalogueFact, mayAutoReject } from "../src/lib/typedEvidence";
import type { CatalogueFact } from "../src/lib/evidencePolicy";
import { classifyAid, usableUpfrontAid } from "../src/lib/financeModel";
import { effectiveDocumentStatus } from "../src/lib/documentStatus";
import {
  assessEligibility,
  assessAffordability,
  recommend,
  type RecommendationCatalog,
} from "../src/lib/recommend";
let passed = 0;
let failed = 0;
async function check(name: string, f: () => unknown | Promise<unknown>) {
  try {
    await f();
    passed++;
    console.log(`PASS ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${(e as Error).message}`);
  }
}
async function main() {
  const cost = {
    annualTuitionUsd: 1000,
    annualLivingEstUsd: 1000,
    insurancePerYearUsd: 0,
    booksPerYearUsd: 0,
    flightsPerYearUsd: 0,
    visaFeeUsd: 0,
    applicationFeeUsd: 0,
    years: 1,
    familyContributionUsd: 0,
  };
  await check("A04 tuition-only award never pays living", () => {
    const r = calculateCosts({
      ...cost,
      scholarships: [
        {
          name: "fixture waiver",
          amountUsd: 5000,
          awardPeriod: "year",
          covers: "tuition",
        },
      ],
    });
    assert.ok(r.net.gapAnnualUsd! >= 1000);
    assert.notEqual(r.net.affordable, true);
  });
  await check("A12 GPA above explicit scale is unknown", () =>
    assert.equal(gpaTo40Scale(6, 5), null),
  );
  await check("A12 absent grading scale is unknown, even below four", () =>
    assert.equal(gpaTo40Scale(3, undefined), null),
  );
  await check(
    "A17 same-date source uses lowest id independent of input order",
    () => {
      const sources = new Map(
        [9, 1].map((id) => [
          id,
          {
            id,
            url: "https://fixture.edu/",
            title: "fixture",
            accessedAt: new Date("2026-01-01"),
          },
        ]),
      );
      assert.equal(
        pickBestSource([{ sourceId: 9 }, { sourceId: 1 }], sources)?.id,
        1,
      );
    },
  );
  const target: OfficialSourceTarget = {
    entityType: "university",
    entityId: 1,
    fieldKey: "min_ielts",
    expectedValue: "7.0",
    sourceUrl: "https://fixture.edu/admission",
    officialDomain: "fixture.edu",
  };
  for (const text of [
    "IELTS is not required. A score of 7.0 is only recommended for another programme.",
    "IELTS recommended score 7.0",
    "Minimum IELTS 17.0",
  ])
    await check(`A05 does not verify ${text}`, () =>
      assert.equal(
        verifyFactOnPage({
          html: text,
          status: 200,
          finalUrl: target.sourceUrl,
          target,
        }).verificationSucceeded,
        false,
      ),
    );
  await check("A05 explicit exact minimum remains verifiable", () =>
    assert.equal(
      verifyFactOnPage({
        html: "Minimum IELTS score: 7.0",
        status: 200,
        finalUrl: target.sourceUrl,
        target,
      }).verificationSucceeded,
      true,
    ),
  );
  await check(
    "A07 real dashboard consumer key changes on catalogue bump",
    async () => {
      setCacheRevisionStore(new LocalCacheRevisionStore());
      const a = await sharedDashboardRecommendationCacheKey(
        1,
        "uz",
        "2026-11-07",
        "same",
      );
      await bumpCacheRevision("catalogue", "fixture");
      assert.notEqual(
        await sharedDashboardRecommendationCacheKey(
          1,
          "uz",
          "2026-11-07",
          "same",
        ),
        a,
      );
      setCacheRevisionStore(null);
    },
  );
  const p = {
    id: 1,
    universityId: 1,
    name: "FICTIONAL Computer Science",
    field: "Computer Science",
    degreeLevel: "Bachelor",
    annualTuition: 1000,
    tuitionCurrency: "USD",
    tuitionPeriod: "year",
    sourceUrl: "https://fixture.edu/cs",
    lastVerifiedAt: new Date(),
    verificationStatus: "verified",
    isVerified: true,
  };
  const cat = {
    programs: [p],
    universities: new Map([
      [
        1,
        {
          id: 1,
          name: "FICTIONAL",
          country: "Fixture",
          annualLivingCost: 1000,
        },
      ],
    ]),
    requirements: new Map([[1, [{ programId: 1, minGpa: 3 }]]]),
    cycles: new Map(),
    scholarships: [],
  } as unknown as RecommendationCatalog;
  await check("A09 unknown IELTS does not penalize existing known GPA", () => {
    const input = { interests: ["Computer Science"], gpa: 3.8, gpaScale: 4 };
    const a = recommend(input, cat)[0];
    const b = recommend(input, {
      ...cat,
      requirements: new Map([[1, [{ programId: 1, minGpa: 3, minIelts: 7 }]]]),
    } as unknown as RecommendationCatalog)[0];
    assert.equal(a.matchScore, b.matchScore);
  });
  const fact: CatalogueFact = {
    entityType: "program",
    entityId: 1,
    fieldKey: "min_ielts",
    valueNumeric: 7,
    valueType: "official_requirement",
    verificationStatus: "verified",
    publisherOfficial: true,
    sourceUrl: "https://fictional.example.edu/requirements",
    verifiedAt: "2026-01-01",
    programName: "Fictional CS",
    degreeLevel: "Master",
    admissionCycle: "2027",
  };
  const context = {
    programName: "Fictional CS",
    degreeLevel: "Master",
    admissionCycle: "2027",
  };
  await check("A15 no implicit official publisher", () =>
    assert.equal(
      mayAutoReject(
        fromCatalogueFact({ ...fact, publisherOfficial: undefined }),
      ),
      false,
    ),
  );
  await check("A16 wrong programme never supplies a minimum", () =>
    assert.equal(
      resolveScopedFact([fact], "min_ielts", {
        ...context,
        programName: "Other",
      }),
      null,
    ),
  );
  await check("A16 wrong cycle never supplies a minimum", () =>
    assert.equal(
      resolveScopedFact([fact], "min_ielts", {
        ...context,
        admissionCycle: "2028",
      }),
      null,
    ),
  );
  await check(
    "A16 conflicting official peers remain unknown in either order",
    () => {
      const other = { ...fact, valueNumeric: 8 };
      for (const list of [
        [fact, other],
        [other, fact],
      ])
        assert.equal(resolveScopedFact(list, "min_ielts", context), null);
    },
  );
  await check("A16 official evidence wins over a newer planning estimate", () =>
    assert.equal(
      resolveScopedFact(
        [
          fact,
          {
            ...fact,
            valueNumeric: 8,
            valueType: "planning_estimate",
            verifiedAt: "2026-10-01",
          },
        ],
        "min_ielts",
        context,
      )?.value,
      7,
    ),
  );
  await check(
    "A16 unscoped cycle cannot auto-reject a cycle-specific applicant",
    () =>
      assert.equal(
        mayAutoReject(
          resolveScopedFact(
            [{ ...fact, admissionCycle: null }],
            "min_ielts",
            context,
          )!,
        ),
        false,
      ),
  );
  const englishRow = {
    programId: 1,
    minIelts: 7,
    minToefl: 100,
    toeflScale: "120" as const,
    englishOperator: "OR" as const,
  };
  await check("A10 explicit English OR group is met by IELTS alone", () => {
    const e = assessEligibility({ ielts: 7 }, [englishRow] as any);
    assert.equal(e.met, 1);
    assert.equal(e.unmet, 0);
  });
  await check("A10 explicit AND retains missing alternative as unknown", () => {
    const e = assessEligibility({ ielts: 7 }, [
      { ...englishRow, englishOperator: "AND" },
    ] as any);
    assert.equal(e.met, 1);
    assert.equal(e.unknown, 1);
  });
  await check("A10 unknown operator does not invent OR or AND", () => {
    const e = assessEligibility({ ielts: 7 }, [
      { ...englishRow, englishOperator: null },
    ] as any);
    assert.equal(e.met, 0);
    assert.equal(e.unknown, 2);
  });
  await check("A11 TOEFL scales are not interconverted", () => {
    const e = assessEligibility({ toefl: 5, toeflScale: "6" }, [
      { programId: 1, minToefl: 100, toeflScale: "120" },
    ] as any);
    assert.equal(e.unknown, 1);
    assert.equal(e.unmet, 0);
  });
  await check("A10 cycle selection is exact, not first-row", () => {
    const rows = [
      { programId: 1, academicYear: "2026", minIelts: 9 },
      { programId: 1, academicYear: "2027", minIelts: 7 },
    ];
    assert.equal(
      assessEligibility({ ielts: 7 }, rows as any, null, "2027").met,
      1,
    );
    assert.equal(assessEligibility({ ielts: 7 }, rows as any).items.length, 0);
  });
  await check(
    "A04 restricted and unrestricted funding cannot pay tuition twice",
    () => {
      const a = classifyAid({
        key: "tuition",
        covers: "tuition",
        amountUsd: 5000,
        period: "year",
      });
      const b = classifyAid({
        key: "cash",
        covers: "both",
        amountUsd: 5000,
        period: "year",
      });
      for (const list of [
        [a, b],
        [b, a],
      ])
        assert.equal(
          usableUpfrontAid(list, {
            tuitionAnnualUsd: 1000,
            livingAnnualUsd: 1000,
          }).totalUsd,
          2000,
        );
    },
  );
  await check("A14 monthly stipend without payment months stays unknown", () =>
    assert.equal(
      classifyAid({
        key: "monthly",
        covers: "living",
        amountUsd: 200,
        period: "month",
      }).annualUsd,
      null,
    ),
  );
  await check("A14 saved awards never lower confirmed gap", () => {
    const r = calculateCosts({
      ...cost,
      scholarships: [
        {
          name: "FICTIONAL",
          amountUsd: 5000,
          covers: "both",
          awardPeriod: "year",
          status: "saved",
        },
      ],
    });
    assert.equal(r.net.gapAnnualUsd, 2000);
    assert.equal(r.scholarship.confirmedAnnualUsd, 0);
  });
  await check("A18 expired self-claims use one effective status", () => {
    assert.equal(
      effectiveDocumentStatus(
        { status: "verified", expiresAt: "2020-01-01" },
        false,
        "2026-11-07",
      ),
      "expired",
    );
    assert.equal(
      effectiveDocumentStatus({ status: "verified" }, false),
      "self_confirmed",
    );
  });
  await check(
    "A26 same destination without citizenship/institution/cycle proof is not funding",
    () => {
      const r = assessAffordability(
        { degreeLevel: "Bachelor", interests: ["Computer Science"] },
        p as any,
        cat.universities.get(1) as any,
        [
          {
            id: 1,
            title: "FICTIONAL",
            country: "Fixture",
            degreeLevels: ["Bachelor"],
            eligibleMajors: ["*"],
            financialNeedBased: false,
          },
        ] as any,
        "Fixture",
      );
      assert.equal(r.scholarshipMatches.length, 0);
    },
  );
  console.log(`${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
void main();
