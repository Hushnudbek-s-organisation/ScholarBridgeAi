import { writeFileSync } from "node:fs";
import { db, pool } from "@/db";
import { savedScholarships, scholarships, studentProfiles, universities, userDocuments } from "@/db/schema";
import { hashPassword } from "@/lib/password";

async function main() {
  const password = "Phase12-E2E-Only-Password-2026!";
  const [student] = await db.insert(studentProfiles).values({
    name: "Phase 12 E2E Student",
    email: "phase12-e2e-student@example.test",
    passwordHash: hashPassword(password),
    targetMajor: "Computer Science",
    degreeLevel: "Bachelor",
    country: "Uzbekistan",
    preferredCountries: '["Germany"]',
    gpa: 3.6,
    gpaScale: 4,
    budgetAnnualUsd: 25000,
    isPremium: true,
    premiumUntil: new Date(Date.now() + 30 * 86400000),
    onboardingCompleted: true,
  }).returning();
  const [other] = await db.insert(studentProfiles).values({
    name: "Phase 12 E2E Other Student",
    email: "phase12-e2e-other@example.test",
    passwordHash: hashPassword("Different-E2E-Password-Only-2026!"),
    targetMajor: "Biology",
    degreeLevel: "Bachelor",
    country: "Uzbekistan",
    isPremium: true,
    premiumUntil: new Date(Date.now() + 30 * 86400000),
    onboardingCompleted: true,
  }).returning();

  const [verifiedUniversity] = await db.insert(universities).values({
    name: "Phase12 E2E Verified University",
    country: "Germany",
    city: "Berlin",
    worldRanking: 2,
    degreeLevel: "Bachelor",
    programMajor: "Computer Science",
    annualTuitionUsd: 12000,
    annualLivingEstUsd: 15000,
    minIelts: 6.5,
    postStudyWorkVisaYears: 2,
    description: "Disposable browser-test university record.",
    websiteUrl: "https://verified-e2e.example.test",
    sourceUrl: "https://verified-e2e.example.test/admissions",
    verificationStatus: "verified",
    lastVerifiedAt: new Date("2026-10-22T00:00:00.000Z"),
    isActive: true,
  }).returning();
  const [unverifiedUniversity] = await db.insert(universities).values({
    name: "Phase12 E2E Unverified University",
    country: "Netherlands",
    city: "Utrecht",
    worldRanking: 1,
    degreeLevel: "Bachelor",
    programMajor: "Computer Science",
    annualTuitionUsd: 99999,
    annualLivingEstUsd: 88888,
    minIelts: 8,
    postStudyWorkVisaYears: 7,
    description: "Disposable unverified browser-test record; numeric fields must remain undisclosed.",
    websiteUrl: "https://unverified-e2e.example.test",
    verificationStatus: "unverified",
    lastVerifiedAt: null,
    isActive: true,
  }).returning();

  const deadlineDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const [scholarship] = await db.insert(scholarships).values({
    title: "Phase12 E2E Unverified Scholarship",
    provider: "E2E Test Provider",
    country: "Germany",
    coverageType: "tuition",
    description: "Disposable unverified scholarship fixture.",
    requirements: "E2E fixture only.",
    websiteUrl: "https://scholarship-e2e.example.test",
    deadline: deadlineDate,
    deadlineDate,
    verificationStatus: "unverified",
    isActive: true,
  }).returning();
  await db.insert(savedScholarships).values({ profileId: student.id, scholarshipId: scholarship.id, status: "Saved" });
  await db.insert(userDocuments).values({
    profileId: student.id,
    docType: "passport",
    title: "Phase12 E2E Passport",
    fileName: "e2e-passport.pdf",
    status: "uploaded",
  });
  await db.insert(userDocuments).values({
    profileId: other.id,
    docType: "passport",
    title: "Other Student Private Passport",
    fileName: "private.pdf",
    status: "uploaded",
  });

  const fixturePath = process.env.E2E_FIXTURE_FILE;
  if (!fixturePath) throw new Error("E2E_FIXTURE_FILE must point to the disposable fixture manifest");
  writeFileSync(fixturePath, JSON.stringify({
    studentId: student.id,
    studentEmail: student.email,
    studentPassword: password,
    otherProfileId: other.id,
    verifiedUniversityName: verifiedUniversity.name,
    unverifiedUniversityName: unverifiedUniversity.name,
    scholarshipTitle: scholarship.title,
    scholarshipDeadline: deadlineDate,
    ownDocumentLabel: "Phase12 E2E Passport",
    otherDocumentLabel: "Other Student Private Passport",
  }, null, 2), { mode: 0o600 });
  console.log("Created disposable E2E fixtures using the application schema and password hasher.");
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  await pool.end().catch(() => undefined);
  process.exitCode = 1;
});
