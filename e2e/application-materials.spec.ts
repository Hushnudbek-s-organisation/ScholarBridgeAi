import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import en from "../src/i18n/messages/en.json";

const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
const copy = en.materials;
const journey = en.journey;

test.beforeEach(async ({ page }) => {
  await page.context().addCookies([{ name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL! }]);
  expect((await page.request.post("/api/auth/sign-in", { data: {
    email: fixture.studentEmail, password: fixture.studentPassword,
  } })).status()).toBe(200);
});

test("requirements, documents, SOP, and Workspace share the selected application", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 820 });
  await page.addInitScript(() => localStorage.setItem("scholarbridge_theme", "dark"));
  const profileId = fixture.studentId;
  const ids: number[] = [];
  const applications = ["Fictional materials A", "Fictional materials B"];
  const title = "Fictional materials transcript";
  let documentId: number | undefined;
  let promptId: number | undefined;
  const admin = await browser.newContext();

  try {
    for (const universityName of applications) {
      const result = await page.request.post("/api/applications", {
        data: { profileId, universityName, programName: "Computing", deadline: "2099-03-12" },
      });
      expect(result.ok()).toBe(true);
      ids.push((await result.json()).application.id);
    }

    await page.goto("/#materials/requirements");
    const scope = page.getByRole("combobox", { name: en.hubs.selectedApplication, exact: true });
    await scope.selectOption(String(ids[0]));
    const panel = page.locator("#hub-panel-requirements");
    await expect(panel.getByText(applications[0], { exact: true })).toBeVisible();
    await expect(page.getByText("Application deadline · Mar 12, 2099")).toBeVisible();
    await panel.getByRole("button", { name: copy.viewRequirement }).click();
    await expect(panel.locator("details[open] summary")).toBeFocused();

    await scope.selectOption(String(ids[1]));
    await expect(panel.getByText(applications[1], { exact: true })).toBeVisible();
    await expect(panel.getByText(applications[0], { exact: true })).toHaveCount(0);
    await scope.selectOption("");
    await expect(panel.getByRole("heading", { name: journey.rbBlueprintTitle })).toBeVisible();

    await scope.selectOption(String(ids[1]));
    await page.locator("#hub-tab-requirements").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#hub-tab-documents")).toBeFocused();
    const docs = page.locator("#hub-panel-documents");
    await docs.getByRole("button", { name: journey.dvAdd, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: journey.dvAdd });
    await dialog.getByLabel(journey.dvFieldTitle).fill(title);
    const created = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/vault/documents" && response.request().method() === "POST");
    await dialog.getByRole("button", { name: journey.dvAdd, exact: true }).click();
    const response = await created;
    expect(response.ok()).toBe(true);
    documentId = (await response.json()).document.id;
    await expect(dialog).toBeHidden();
    const search = docs.getByRole("searchbox", { name: copy.searchDocuments });
    await search.fill(title);
    await docs.getByRole("combobox", { name: copy.documentLink }).selectOption("linked");
    await expect(docs.getByText(title, { exact: true })).toBeVisible();

    await scope.selectOption(String(ids[0]));
    await search.fill(title);
    await docs.getByRole("combobox", { name: copy.documentLink }).selectOption("linked");
    await expect(docs.getByText(copy.noDocuments)).toBeVisible();
    await docs.getByRole("combobox", { name: copy.documentLink }).selectOption("unlinked");
    await expect(docs.getByText(title, { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    expect((await admin.request.post("/api/auth/sign-in", {
      data: { email: fixture.adminEmail, password: fixture.adminPassword },
    })).ok()).toBe(true);
    const prompt = "Which project prepared you for this programme?";
    const promptResponse = await admin.request.post("/api/admin/answer-prompts", { data: { question: prompt } });
    expect(promptResponse.ok()).toBe(true);
    promptId = (await promptResponse.json()).item.id;
    const answer = "I designed and tested a reading tracker for my school.";
    expect((await page.request.put("/api/vault", { data: { profileId, promptId, answer } })).ok()).toBe(true);
    await docs.getByRole("button", { name: new RegExp(copy.answers) }).click();
    const promptName = /Which project prepared you/;
    const savedAnswer = docs.locator("li").filter({ has: page.getByRole("button", { name: promptName }) });
    const toggle = savedAnswer.getByRole("button", { name: promptName });
    if (await toggle.getAttribute("aria-expanded") !== "true") await toggle.click();
    await savedAnswer.getByRole("button", { name: copy.useInSop }).click();
    const sop = page.getByPlaceholder(en.ai.sopStudio.draftPlaceholder);
    await expect(sop).toHaveValue(answer);
    await scope.selectOption(String(ids[1]));
    await expect(sop).toHaveCount(0);
    await scope.selectOption(String(ids[0]));
    await expect(sop).toHaveValue(answer);

    await page.getByRole("button", { name: en.hubs.openWorkspace, exact: true }).click();
    await expect(page.getByRole("heading", { name: applications[0], exact: true })).toBeVisible();
  } finally {
    if (promptId) await admin.request.delete(`/api/admin/answer-prompts?id=${promptId}`);
    await admin.close();
    if (documentId) await page.request.delete(`/api/vault/documents?profileId=${profileId}&id=${documentId}`);
    for (const id of ids) await page.request.delete(`/api/applications?id=${id}`);
  }
});

test("timed practice keeps the current question through preparation and answer", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => localStorage.setItem("scholarbridge_theme", "light"));
  await page.goto("/#materials/interviews");
  const panel = page.locator("#hub-panel-interviews");
  await panel.getByRole("combobox", { name: journey.icTracksLabel }).selectOption("timed-video");
  await panel.getByRole("button", { name: copy.nextQuestion }).click();
  const question = panel.getByRole("heading", { level: 3 }).first();
  const questionText = await question.innerText();
  await page.clock.install();
  await panel.getByRole("button", { name: journey.icStartTimer }).click();
  await expect(question).toHaveText(questionText);
  await expect(panel.getByRole("timer")).toHaveText("1:00");
  await page.clock.fastForward(60_000);
  await expect(panel.getByText(copy.answerPhase, { exact: true })).toBeVisible();
  await expect(panel.getByRole("timer")).toHaveText("2:00");
  await panel.getByRole("button", { name: copy.stopTimer }).click();
  await expect(panel.getByRole("timer")).toHaveText("0:00");
  await expect(question).toHaveText(questionText);
  await panel.getByRole("checkbox").first().check();
  await panel.getByRole("button", { name: copy.previousQuestion }).click();
  await expect(question).not.toHaveText(questionText);
  await expect(panel.getByRole("checkbox").first()).not.toBeChecked();
});
