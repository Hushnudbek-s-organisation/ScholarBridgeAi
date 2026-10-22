import assert from "node:assert/strict";
import { normalizeUniversityName, REGIONAL_UNIVERSITY_SEEDS, UNIVERSITY_NAME_ALIAS_GROUPS } from "../src/db/seedUniversityCatalog";
import { VERIFIED_PROGRAM_SEEDS } from "../src/db/seedProgramCatalog";
import { SEEDED_SCHOLARSHIP_CYCLES } from "../src/db/seedScholarshipCycles";
import { VERIFIED_QS_2027 } from "../src/db/seedVerifiedUniversityFacts";

const normal = normalizeUniversityName;
assert.equal(normal("Massachusetts Institute of Technology (MIT)"), normal("Massachusetts Institute of Technology"));
assert.equal(normal("Koç University"), normal("Koc University"));
assert.equal(normal("Eötvös Loránd University (ELTE)"), normal("Eotvos Lorand University"));
assert.equal(normal("Middle East Technical University (METU)"), normal("Middle East Technical University"));
assert.ok(UNIVERSITY_NAME_ALIAS_GROUPS.length >= 16);
assert.ok(UNIVERSITY_NAME_ALIAS_GROUPS.every((group) => group.length > 0));
assert.equal(new Set(REGIONAL_UNIVERSITY_SEEDS.map((row) => normal(row.canonicalName))).size, REGIONAL_UNIVERSITY_SEEDS.length);
assert.equal(REGIONAL_UNIVERSITY_SEEDS.length, 16);

assert.equal(VERIFIED_PROGRAM_SEEDS.length, 3);
assert.ok(VERIFIED_PROGRAM_SEEDS.every((row) => row.programUrl.startsWith("https://") && row.name.length > 3));
assert.ok(VERIFIED_PROGRAM_SEEDS.every((row) => ["mit.edu", "ox.ac.uk", "tum.de"].some((domain) => new URL(row.programUrl).hostname.endsWith(domain))));
assert.equal(VERIFIED_PROGRAM_SEEDS.filter((row) => "applicationCycle" in row).length, 2);
assert.equal(VERIFIED_PROGRAM_SEEDS.find((row) => row.name === "MSc Advanced Computer Science")?.applicationCycle?.deadline, "2027-01-06");
assert.equal(VERIFIED_QS_2027.map((row) => row.rank).join(","), "1,4,25,32");

const byTitle = new Map(SEEDED_SCHOLARSHIP_CYCLES.map((row) => [row.title, row]));
assert.equal(byTitle.size, SEEDED_SCHOLARSHIP_CYCLES.length);
assert.equal(byTitle.get("Chevening Scholarship")?.deadline, "2026-10-06");
assert.equal(byTitle.get("Gates Cambridge Scholarship")?.deadline, "2027-01-06");
assert.equal(byTitle.get("Gates Cambridge Scholarship")?.deadlineRangeStart, "2026-12-08");
assert.equal(byTitle.get("France Excellence Eiffel Scholarship")?.deadline, "2027-01-06");
assert.equal(byTitle.get("Fulbright Foreign Student Program")?.deadline, "2026-06-30");
assert.equal(byTitle.get("Stipendium Hungaricum")?.deadline, null);
assert.equal(byTitle.get("Stipendium Hungaricum")?.verificationStatus, "unverified");
assert.equal(byTitle.get("Australia Awards Scholarships")?.deadline, null);
const australia = byTitle.get("Australia Awards Scholarships");
assert.ok(australia && "isActive" in australia && australia.isActive === false);
assert.equal(byTitle.get("Türkiye Bursları Scholarship")?.verificationStatus, "estimated");
assert.ok(SEEDED_SCHOLARSHIP_CYCLES.every((row) => row.sourceUrl.startsWith("https://")));
console.log("Phase 8 catalog/cycle source and alias checks passed.");
