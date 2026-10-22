import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type Fixtures = {
  studentId: number;
  studentEmail: string;
  studentPassword: string;
  otherProfileId: number;
  verifiedUniversityName: string;
  unverifiedUniversityName: string;
  scholarshipTitle: string;
  scholarshipDeadline: string;
  ownDocumentLabel: string;
  otherDocumentLabel: string;
};

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as Fixtures;

async function signIn(page: Page) {
  await page.goto("/");
  const signIn = page.getByRole("button", { name: /sign in/i }).first();
  await expect(signIn).toBeVisible();
  await signIn.click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="email"]').fill(fixtures.studentEmail);
  await dialog.locator('input[type="password"]').fill(fixtures.studentPassword);
  await dialog.locator('form button[type="submit"]').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Phase 12 E2E Student", { exact: true }).first()).toBeVisible();
}

async function apiJson<T>(page: Page, path: string) {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { status: response.status, body: await response.json() as T };
  }, path);
}

test("public university catalogue searches and filters real seeded records", async ({ page }) => {
  await page.goto("/universities");
  const verified = page.getByRole("heading", { name: fixtures.verifiedUniversityName, exact: true });
  const unverified = page.getByRole("heading", { name: fixtures.unverifiedUniversityName, exact: true });
  await expect(verified).toBeVisible();
  await expect(unverified).toBeVisible();

  const unverifiedCard = page.locator("article").filter({ has: unverified });
  await expect(unverifiedCard.getByText("$99,999", { exact: true })).toHaveCount(0);
  await expect(unverifiedCard.getByText("$88,888", { exact: true })).toHaveCount(0);
  await expect(unverifiedCard.getByText("8", { exact: true })).toHaveCount(0);
  await expect(unverifiedCard.getByText("#1", { exact: true })).toHaveCount(0);
  await expect(unverifiedCard.getByText("Not published").first()).toBeVisible();

  await signIn(page);
  await page.evaluate(() => { window.location.hash = "#universities/search"; });
  const search = page.getByRole("textbox", { name: /search/i });
  await expect(search).toBeVisible();
  const searchResponse = page.waitForResponse((response) => response.url().includes("/api/universities?") && response.ok());
  await search.fill("Phase12 E2E");
  const cataloguePayload = await (await searchResponse).json() as { universities?: Array<Record<string, unknown>> };
  const unverifiedApiRow = cataloguePayload.universities?.find((university) => university.name === fixtures.unverifiedUniversityName);
  expect(unverifiedApiRow).toBeDefined();
  for (const field of ["worldRanking", "annualTuitionUsd", "annualLivingEstUsd", "minIelts", "postStudyWorkVisaYears"]) {
    expect(unverifiedApiRow?.[field], `unverified ${field} must not be emitted by the search API`).toBeNull();
  }
  await expect(page.getByText(fixtures.verifiedUniversityName, { exact: true })).toBeVisible();
  await expect(page.getByText(fixtures.unverifiedUniversityName, { exact: true })).toBeVisible();
  await search.fill("");
  const country = page.getByRole("combobox", { name: /all destinations/i });
  await country.selectOption({ label: "Germany" });
  await expect(page.getByText(fixtures.verifiedUniversityName, { exact: true })).toBeVisible();
  await expect(page.getByText(fixtures.unverifiedUniversityName, { exact: true })).toHaveCount(0);
});

test("authenticated dashboard and saved scholarship/deadline state are profile-scoped", async ({ page }) => {
  await signIn(page);
  const ownDashboard = await apiJson<Record<string, unknown>>(page, `/api/dashboard?profileId=${fixtures.studentId}`);
  expect(ownDashboard.status).toBe(200);
  expect(ownDashboard.body).toMatchObject({
    profile: { id: fixtures.studentId, name: "Phase 12 E2E Student" },
  });

  const foreignDashboard = await apiJson<Record<string, unknown>>(page, `/api/dashboard?profileId=${fixtures.otherProfileId}`);
  expect(foreignDashboard.status).toBe(403);
  expect(JSON.stringify(foreignDashboard.body)).not.toContain(fixtures.otherProfileId.toString());

  const saved = await apiJson<Record<string, unknown>>(page, `/api/saved-scholarships?profileId=${fixtures.studentId}`);
  expect(saved.status).toBe(200);
  expect(JSON.stringify(saved.body)).toContain(fixtures.scholarshipTitle);
  const foreignSaved = await apiJson<Record<string, unknown>>(page, `/api/saved-scholarships?profileId=${fixtures.otherProfileId}`);
  expect(foreignSaved.status).toBe(403);

  await page.evaluate(() => { window.location.hash = "#deadlines"; });
  await expect(page.getByText(fixtures.scholarshipTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("Date not verified — check the source", { exact: true })).toBeVisible();
});

test("document vault renders only the signed-in profile's documents", async ({ page }) => {
  await signIn(page);
  const own = await apiJson<{ documents?: Array<{ title: string }> }>(page, `/api/vault/documents?profileId=${fixtures.studentId}`);
  expect(own.status).toBe(200);
  expect(own.body.documents?.map((doc) => doc.title)).toContain(fixtures.ownDocumentLabel);
  expect(JSON.stringify(own.body)).not.toContain(fixtures.otherDocumentLabel);

  const foreign = await apiJson<Record<string, unknown>>(page, `/api/vault/documents?profileId=${fixtures.otherProfileId}`);
  expect(foreign.status).toBe(403);
  expect(JSON.stringify(foreign.body)).not.toContain(fixtures.otherDocumentLabel);

  await page.evaluate(() => { window.location.hash = "#materials/documents"; });
  await expect(page.getByText(fixtures.ownDocumentLabel, { exact: true })).toBeVisible();
  await expect(page.getByText(fixtures.otherDocumentLabel, { exact: true })).toHaveCount(0);
});
