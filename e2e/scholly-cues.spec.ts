import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { SCHOLLY_DEADLINE_NEAR } from "../src/lib/scholly-client-events";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));

test("Scholly defers a near-deadline cue while the user is editing", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().addCookies([{
    name: "scholarbridge_locale",
    value: "en",
    url: process.env.E2E_BASE_URL!,
  }]);
  const signIn = await page.request.post("/api/auth/sign-in", {
    data: { email: fixtures.studentEmail, password: fixtures.studentPassword },
  });
  expect(signIn.ok()).toBe(true);
  await page.goto("/#dashboard");
  await expect(page.getByTestId("journey-dashboard")).toBeVisible();

  const launcher = page.getByRole("button", { name: "Open Scholly chat" });
  await expect(launcher).toBeVisible();
  const detail = { profileId: fixtures.studentId, id: "focused-editor-test", dueDate: "2099-01-01", daysRemaining: 2 };
  const event = { name: SCHOLLY_DEADLINE_NEAR, detail };
  await page.evaluate(({ name, detail }) => {
    const editor = document.createElement("textarea");
    editor.id = "deadline-cue-test-editor";
    document.body.append(editor);
    editor.focus({ preventScroll: true });
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }, event);

  // Allow the idle cue delay to pass while focus remains inside the editor.
  const storageKey = `scholly:deadline-cue:${detail.profileId}:${detail.id}:${detail.dueDate}:${detail.daysRemaining}`;
  await page.waitForTimeout(600);
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull();
  await expect(launcher).not.toHaveAttribute("data-motion", "concern");
  await page.locator("#deadline-cue-test-editor").evaluate((editor: HTMLTextAreaElement) => editor.blur());
  await expect(launcher).toHaveAttribute("data-motion", "concern");
  await expect(page.locator(".sb-scholly [role='status']")).toHaveText("Due in 2 days");
  expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBe("1");
});
