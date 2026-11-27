import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import en from "../src/i18n/messages/en.json";

const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
const tracker = en.applications;
const journey = en.journey;

test("the tracker and workspace share progress and require a completed checklist to record submission", async ({ page }) => {
  test.setTimeout(120_000);
  const name = "Workspace Browser Test University";
  let id: number | undefined;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem("scholarbridge_theme", "dark"));
  await page.context().addCookies([{ name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL! }]);
  expect((await page.request.post("/api/auth/sign-in", { data: {
    email: fixture.studentEmail, password: fixture.studentPassword,
  } })).status()).toBe(200);

  const query = `profileId=${fixture.studentId}`;
  const pick = async (section: keyof typeof journey.awSections) => {
    const mobile = page.getByRole("combobox", { name: journey.awTabsAria });
    if (await mobile.isVisible()) await mobile.selectOption(section);
    else await page.getByRole("navigation", { name: journey.awTabsAria })
      .getByRole("button", { name: new RegExp(`^${journey.awSections[section]}(?:$| )`) }).click();
  };

  try {
    await page.goto("/#applications");
    await page.getByRole("button", { name: tracker.add, exact: true }).click();
    const editor = page.getByRole("dialog", { name: tracker.add });
    await editor.getByLabel(tracker.formUniversity).fill(name);
    await editor.getByLabel(tracker.formProgram).fill("Computing");
    await editor.getByLabel(tracker.formDeadline).fill("2099-04-15");
    const creating = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/applications" && response.request().method() === "POST");
    await editor.getByRole("button", { name: tracker.addSubmit }).click();
    const created = await creating;
    expect(created.ok()).toBe(true);
    id = (await created.json()).application.id;
    await expect(editor).toBeHidden();

    await page.getByRole("searchbox", { name: tracker.trackerSearch }).fill(name);
    const row = page.locator("li").filter({ has: page.getByRole("heading", { name, exact: true }) });
    await expect(row).toHaveCount(1);
    await expect(row.getByText("Computing · RD")).toBeVisible();
    const statusFilter = page.getByRole("combobox", { name: tracker.trackerFilter, exact: true });
    await statusFilter.selectOption("awaiting");
    await expect(page.getByText(tracker.trackerNoMatches)).toBeVisible();
    await statusFilter.selectOption("preparing");
    await row.getByRole("button", { name: tracker.openWorkspace }).click();
    await expect(page.getByRole("heading", { name: journey.awNextStep })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    const readWorkspace = async () => {
      const response = await page.request.get(`/api/workspace?${query}&applicationId=${id}`);
      expect(response.ok()).toBe(true);
      return response.json();
    };
    const checklist = await readWorkspace();
    const response = await page.request.get(`/api/workspace?${query}`);
    expect(response.ok()).toBe(true);
    const summary = (await response.json()).workspaces.find((workspace: { id: number }) => workspace.id === id);
    expect(summary.progressPct).toBe(checklist.progress.pct);
    expect(summary.blockers).toBe(checklist.progress.blockers.length);
    expect(checklist.progress.total).toBeGreaterThan(0);

    await page.getByRole("button", { name: journey.awOpenItem, exact: true }).click();
    const openItem = page.locator("li[tabindex='-1']:focus");
    await expect(openItem).toBeVisible();
    const itemId = await openItem.getAttribute("id");
    await openItem.getByRole("button", { name: /^Mark .* as done$/ }).click();
    await expect(page.locator(`[id="${itemId}"]`).getByRole("button", { name: /^Mark .* as not done$/ })).toBeVisible();

    await pick("submission");
    const submit = page.getByRole("button", { name: journey.awMarkSubmittedBtn, exact: true });
    await expect(submit).toBeDisabled();
    for (const requirement of (await readWorkspace()).requirements) {
      if (!requirement.isRequired || ["done", "not_required"].includes(requirement.status)) continue;
      expect((await page.request.patch("/api/requirements", { data: {
        profileId: fixture.studentId, applicationId: id, id: requirement.id, status: "done",
      } })).ok()).toBe(true);
    }

    await page.goto("/#applications/workspace");
    await page.reload();
    await page.locator("li").filter({ has: page.getByRole("heading", { name, exact: true }) })
      .getByRole("button", { name: tracker.openWorkspace }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await pick("submission");
    await expect(submit).toBeEnabled();
    await submit.click();
    const confirm = page.getByRole("dialog", { name: journey.awMarkSubmittedBtn });
    await confirm.getByRole("checkbox", { name: journey.awConfirmPortalSubmit }).check();
    await confirm.getByRole("button", { name: journey.awMarkSubmittedBtn }).click();
    await expect(page.getByText(journey.awMarkedSubmitted, { exact: true })).toBeVisible();
    expect((await readWorkspace()).application.submittedAt).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    await pick("decision");
    await page.getByRole("combobox", { name: journey.opStatus, exact: true }).selectOption("accepted");
    await page.getByLabel(journey.opRespondBy).fill("2099-05-01");
    await page.getByLabel(journey.opDepositAmount).fill("250");
    await page.getByRole("button", { name: journey.opSaveOffer }).click();
    await expect(page.getByText(journey.awOfferSaved, { exact: true })).toBeVisible();
    await expect(page.getByText("$250.00", { exact: true })).toBeVisible();
    await pick("deadlines");
    await expect(page.locator("time[datetime='2099-05-01']")).toBeVisible();
    await page.getByRole("tab", { name: "Applications", exact: true }).click();
    await page.getByRole("searchbox", { name: tracker.trackerSearch }).fill(name);
    await page.getByRole("combobox", { name: tracker.trackerFilter, exact: true }).selectOption("closed");
    await expect(row.locator("span").getByText(tracker.result.accepted, { exact: true })).toBeVisible();
  } finally {
    if (id) await page.request.delete(`/api/applications?id=${id}`);
  }
});
