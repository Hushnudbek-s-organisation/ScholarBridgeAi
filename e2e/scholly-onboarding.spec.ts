import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentEmail: string;
  studentPassword: string;
};

test("Scholly offers browser permission after reminder choice and skips the known-stage question", async ({ page }) => {
  await page.context().addCookies([{
    name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL!,
  }]);
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", { configurable: true, value: "default" });
    Notification.requestPermission = async () => {
      sessionStorage.setItem("scholly-reminder-requested", "yes");
      return "granted";
    };
  });
  expect((await page.request.post("/api/auth/sign-in", {
    data: { email: fixtures.studentEmail, password: fixtures.studentPassword },
  })).status()).toBe(200);
  await page.goto("/#dashboard");
  await page.getByRole("button", { name: "Open Scholly chat", exact: true }).click();
  const chat = page.locator("#scholly-chat");
  await chat.getByRole("button", { name: "Set up Scholly" }).click();
  await chat.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(chat.getByText("Question 1 of 2")).toBeVisible();

  const permission = chat.getByRole("button", { name: "Allow browser notifications" });
  await expect(permission).toHaveCount(0);
  await chat.getByRole("button", { name: "In the evening" }).click();
  await expect(permission).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("scholly-reminder-requested"))).toBeNull();
  await permission.click();
  await expect(permission).toHaveCount(0);
  expect(await page.evaluate(() => sessionStorage.getItem("scholly-reminder-requested"))).toBe("yes");
  await expect(chat.getByText("Question 2 of 2")).toBeVisible();

  await chat.getByRole("button", { name: "Short and direct" }).click();
  await expect(chat.getByRole("heading", { name: "A few quick preferences" })).toHaveCount(0);
  const response = await page.request.get("/api/scholly/profile");
  expect(response.status()).toBe(200);
  expect((await response.json()).profile).toMatchObject({
    stageKnown: true, onboardingState: "completed", reminderWindow: "evening", tone: "short",
  });
});
