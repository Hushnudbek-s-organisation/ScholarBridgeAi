import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number; studentPassword: string;
};

test("PRO study map provides a private WebGL graph and linked Markdown workspace", async ({ page }) => {
  test.setTimeout(150_000);
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL });
  const email = "e2e-study-map@example.test";
  const map = "/api/study-map";
  const vault = mkdtempSync(join(tmpdir(), "study-map-vault-"));
  try {
    const migration = readFileSync("supabase/add_study_map.sql", "utf8");
    await pool.query(migration);
    await pool.query(migration);
    const { rows: [policy] } = await pool.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.study_map_entries'::regclass",
    );
    expect(policy.relrowsecurity).toBe(true);
    const { rows: [learner] } = await pool.query(`
      INSERT INTO student_profiles (name, email, password_hash, onboarding_completed, ielts_score)
      SELECT 'Map Learner', $1, password_hash, true, 7.5 FROM student_profiles WHERE id = $2 RETURNING id
    `, [email, fixtures.studentId]);
    const signIn = async (address: string) => {
      expect((await page.request.post("/api/auth/sign-in", {
        data: { email: address, password: fixtures.studentPassword },
      })).status()).toBe(200);
    };

    expect((await page.request.get(map)).status()).toBe(401);
    await signIn(email);
    expect((await page.request.get(map)).status()).toBe(403);
    await pool.query("INSERT INTO subscriptions (profile_id, current_period_end) VALUES ($1, NOW() + INTERVAL '1 day')", [learner.id]);
    const { rows: [exam] } = await pool.query(
      "INSERT INTO test_plans (profile_id, test_type) VALUES ($1, 'ielts') RETURNING id", [learner.id],
    );
    const { rows: [attempt] } = await pool.query(
      "INSERT INTO test_attempts (test_plan_id, test_date, score) VALUES ($1, '2026-11-23', 7.5) RETURNING id", [exam.id],
    );

    const initialMap = await page.request.get(map);
    expect(initialMap.status()).toBe(200);
    expect((await initialMap.json()).nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "profile:ielts", title: "IELTS · 7.5" }),
      expect.objectContaining({ id: `attempt:${attempt.id}`, relatedId: `exam:${exam.id}`, date: "2026-11-23" }),
    ]));
    const card = await page.request.post(map, { data: { action: "save", kind: "card", title: "What is an idiom?", text: "A fixed phrase", links: ["profile:ielts"] } });
    expect(card.status()).toBe(201);
    const { id } = await card.json();
    const update = await page.request.post(map, { data: { action: "save", id, kind: "card", title: "What is an English idiom?", text: "A fixed phrase", links: ["profile:ielts"] } });
    expect(update.status()).toBe(200);

    const day = "2026-11-23";
    const daily = await Promise.all([1, 2].map(() => page.request.post(map, { data: { action: "daily", day } })));
    expect(daily.every(response => response.ok())).toBe(true);
    const dailyIds = await Promise.all(daily.map(response => response.json()));
    expect(dailyIds[0].id).toBe(dailyIds[1].id);
    const addNote = async (title: string, text: string) => {
      const response = await page.request.post(map, { data: { action: "save", kind: "note", title, text, links: [] } });
      expect(response.status()).toBe(201);
      return (await response.json()).id as string;
    };
    const targetId = await addNote("Interview prep", "---\nfolder: Admissions/Visa\ntags: [visa, checklist]\n---\n## Questions\n- [ ] Rehearse the introduction");
    await addNote("Speaking log", "# Session one\nTry [[Admissions/Visa/Interview prep|visa prep]] #speaking");

    await page.context().addCookies([{ name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL! }]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/#dashboard");
    const dock = page.getByTestId("grouped-dock");
    await expect(dock).toBeVisible();
    await dock.getByRole("button", { name: /my plan/i }).click();
    await page.getByRole("button", { name: /study map/i }).click();
    await expect(page.getByRole("heading", { name: "Study map PRO" })).toBeVisible();
    const canvas = page.locator(".sb-study-3d[data-webgl=ready] canvas");
    await expect(canvas).toBeVisible();
    const categories = page.locator(".sb-study-label-group");
    await expect(categories.first()).toBeVisible();
    const beforeOrbit = await categories.first().getAttribute("style");
    await page.getByRole("button", { name: "Rotate graph" }).click();
    await expect(categories.first()).not.toHaveAttribute("style", beforeOrbit!);
    await page.getByRole("button", { name: "Expand graph" }).click();
    await expect(page.getByRole("dialog", { name: "Graph" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Expand graph" })).toBeFocused();
    await page.getByRole("button", { name: "2D", exact: true }).click();
    const graph = page.locator(".sb-study-map-svg");
    await graph.scrollIntoViewIfNeeded();
    const plot = (await graph.boundingBox())!;
    const position = graph.locator("g[transform]").first();
    const initialTransform = await position.getAttribute("transform");
    await page.mouse.move(plot.x + 22, plot.y + plot.height / 2);
    await page.mouse.down();
    await page.mouse.move(plot.x + 74, plot.y + plot.height / 2 + 22, { steps: 5 });
    await page.mouse.up();
    await expect(position).not.toHaveAttribute("transform", initialTransform!);
    await page.getByRole("button", { name: "Reset view" }).click();
    await expect(position).toHaveAttribute("transform", initialTransform!);
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await expect(page.getByRole("button", { name: "Rotate graph" })).toBeVisible();
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.getByRole("button", { name: "Speaking log", exact: false }).first().click();
    await page.locator(".sb-study-markdown").getByRole("button", { name: "visa prep" }).click();
    const detail = page.locator(".sb-study-detail");
    await expect(detail.getByRole("heading", { name: "Interview prep", exact: true })).toBeVisible();
    await expect(detail.getByRole("heading", { name: "Backlinks" })).toBeVisible();
    await detail.getByRole("checkbox", { name: "Rehearse the introduction" }).click();
    await expect(detail.getByRole("checkbox", { name: "Rehearse the introduction" })).toBeChecked();
    await detail.getByRole("button", { name: "Pin", exact: true }).click();
    await expect(detail.getByRole("button", { name: "Unpin" })).toBeVisible();
    await page.getByRole("button", { name: "Bookmarks" }).click();
    await expect(page.locator(".sb-study-rows").getByRole("button", { name: /Interview prep/ })).toBeVisible();
    await expect(page.locator(".sb-study-rows").getByRole("button", { name: /Speaking log/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Bookmarks" }).click();
    await detail.getByRole("button", { name: "Edit", exact: true }).click();
    await detail.getByRole("button", { name: "Drawing", exact: true }).click();
    const editable = detail.locator("canvas[data-editable]");
    const stroke = async () => {
      await editable.scrollIntoViewIfNeeded();
      const sketch = (await editable.boundingBox())!;
      await page.mouse.move(sketch.x + 12, sketch.y + 10);
      await page.mouse.down();
      await page.mouse.move(sketch.x + 80, sketch.y + 40, { steps: 6 });
      await page.mouse.up();
    };
    await stroke();
    await detail.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(detail.getByRole("button", { name: "Clear", exact: true })).toBeDisabled();
    await stroke();
    await detail.getByRole("button", { name: "Save", exact: true }).click();
    await expect(detail.locator("canvas:not([data-editable])")).toBeVisible();
    const own = await (await page.request.get(map)).json();
    expect(own.entries.find((entry: { id: string }) => entry.id === targetId).text).toContain("```study-sketch");
    await page.locator('input[type="file"][accept=".md,.markdown,.txt"]').setInputFiles({
      name: "Imported.md", mimeType: "text/markdown", buffer: Buffer.from("## Plan\n- Review the notes\n\n> [!TIP] Next steps\n> Confirm the dates\n\n| Task | Day |\n| --- | --- |\n| Apply | Friday |"),
    });
    await detail.getByRole("button", { name: "Save", exact: true }).click();
    await expect(detail.getByRole("heading", { name: "Imported" })).toBeVisible();
    await expect(detail.getByRole("table").getByText("Friday")).toBeVisible();
    await expect(detail.getByText("Next steps", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Use a template" }).selectOption("1");
    await expect(detail.getByLabel("Title or question")).toHaveValue("Plan an application");
    await expect(detail.getByLabel("Note or answer")).toHaveValue(/Check the official programme page/);
    await detail.getByRole("button", { name: "Cancel", exact: true }).click();
    const downloaded = page.waitForEvent("download");
    await detail.getByRole("button", { name: "Export Markdown" }).click();
    expect((await downloaded).suggestedFilename()).toBe("Imported.md");
    await page.getByRole("button", { name: "Mind map" }).click();
    const branch = page.locator(".sb-study-mind > details").filter({ hasText: "Notes & cards" });
    await branch.locator(":scope > summary").click();
    await expect(branch).not.toHaveAttribute("open");
    await page.getByRole("button", { name: "Flashcards" }).click();
    await page.getByRole("button", { name: "Show answer" }).click();
    await page.getByRole("button", { name: "I remembered" }).click();
    await expect(page.getByText("No cards due right now.")).toBeVisible();

    await page.keyboard.press("Control+k");
    const search = page.getByRole("searchbox", { name: "Search your map" });
    await expect(search).toBeFocused();
    await search.fill("Interview prep");
    await page.getByRole("button", { name: "Databases", exact: true }).click();
    const table = page.getByRole("table", { name: "Databases" });
    await expect(table.getByRole("row")).toHaveCount(3);
    await expect(table.getByRole("button", { name: "Speaking log" })).toBeVisible();
    await table.getByRole("button", { name: /Title/ }).click();
    await expect(table.getByRole("columnheader", { name: /Title/ })).toHaveAttribute("aria-sort", "descending");
    await table.getByRole("button", { name: "Interview prep" }).click();
    await expect(detail.getByRole("heading", { name: "Interview prep" })).toBeVisible();
    await search.fill("");
    await page.getByRole("button", { name: "Previous selection" }).click();
    await expect(detail.getByRole("heading", { name: "Imported" })).toBeVisible();
    await page.getByRole("button", { name: "Next selection" }).click();
    await expect(detail.getByRole("heading", { name: "Interview prep" })).toBeVisible();

    await page.getByRole("button", { name: "Roadmaps", exact: true }).click();
    await expect(page.locator(".sb-study-track").getByRole("button", { name: "IELTS", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Calendar", exact: true }).click();
    const month = page.locator(".sb-study-month-header h2");
    const currentMonth = await month.textContent();
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(month).not.toHaveText(currentMonth!);
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect(month).toHaveText(currentMonth!);
    await page.locator(".sb-study-main").getByRole("button", { name: "Daily note", exact: true }).click();
    await expect(detail.getByRole("heading", { name: /^\d{4}-\d{2}-\d{2}$/ })).toBeVisible();
    await page.getByRole("button", { name: "Start focus timer" }).click();
    await expect(page.getByRole("timer")).not.toHaveText("25:00");
    await page.getByRole("button", { name: "Pause focus timer" }).click();
    await page.getByRole("button", { name: "Reset focus timer" }).click();
    await expect(page.getByRole("timer")).toHaveText("25:00");

    mkdirSync(join(vault, "IELTS"));
    writeFileSync(join(vault, "Overview.md"), "Review [[IELTS/Mock exam|the mock exam]]");
    writeFileSync(join(vault, "IELTS", "Mock exam.md"), "Practise the introduction.");
    await page.locator("input[webkitdirectory]").setInputFiles(vault);
    const files = page.locator(".sb-study-filetree");
    await expect(files.getByText("IELTS", { exact: true })).toBeVisible();
    await files.getByRole("button", { name: "Overview", exact: true }).click();
    await detail.locator(".sb-study-markdown").getByRole("button", { name: "the mock exam" }).click();
    await expect(detail.getByRole("heading", { name: "Mock exam" })).toBeVisible();
    await detail.getByRole("button", { name: "Delete", exact: true }).click();
    await detail.getByRole("button", { name: "Delete this entry?" }).click();
    await expect(files.getByRole("button", { name: "Mock exam" })).toHaveCount(0);
    await page.getByRole("button", { name: /^Trash/ }).click();
    const trashed = page.locator(".sb-study-card").filter({ hasText: "Mock exam" });
    await expect(trashed).toBeVisible();
    await trashed.getByRole("button", { name: "Restore" }).click();
    await expect(trashed).toHaveCount(0);
    await page.getByRole("button", { name: "Files", exact: true }).click();
    await expect(files.getByRole("button", { name: "Mock exam" })).toBeVisible();
    const deleteDaily = await page.request.post(map, { data: { action: "delete", id: dailyIds[0].id } });
    expect(deleteDaily.ok()).toBe(true);
    const reopenDaily = await page.request.post(map, { data: { action: "daily", day } });
    expect((await reopenDaily.json()).id).toBe(dailyIds[0].id);
    expect((await (await page.request.get(map)).json()).trash).toEqual([]);
    expect((await page.request.post(map, { data: { action: "purge", id } })).status()).toBe(404);

    await page.setViewportSize({ width: 390, height: 820 });
    await expect(dock.getByRole("button", { name: /my plan/i })).toBeVisible();
    expect(await dock.evaluate(element => element.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole("button", { name: "Graph", exact: true }).click();
    await expect(canvas).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

    const { rows: [other] } = await pool.query(`
      INSERT INTO student_profiles (name, email, password_hash, onboarding_completed)
      SELECT 'Other Learner', 'e2e-study-map-other@example.test', password_hash, true
      FROM student_profiles WHERE id = $1 RETURNING id, email
    `, [fixtures.studentId]);
    await pool.query("INSERT INTO subscriptions (profile_id, current_period_end) VALUES ($1, NOW() + INTERVAL '1 day')", [other.id]);
    await signIn(other.email);
    expect((await (await page.request.get(`${map}?profileId=${learner.id}`)).json()).entries).toEqual([]);
    expect((await page.request.post(map, { data: { action: "delete", id } })).status()).toBe(404);
  } finally {
    rmSync(vault, { recursive: true, force: true });
    await pool.end();
  }
});
