import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { hashPassword } from "../src/lib/password";

test("presentation journey connects an authenticated profile to programme, funding, deadline and SOP", async ({ request }) => {
  const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
  test.skip(!fixture.fixtureProgramId, "Requires the disposable continuation schema");
  const connection = new URL(process.env.E2E_DATABASE_URL!);
  expect(connection.hostname).toBe("127.0.0.1");
  expect(connection.pathname).toMatch(/^\/sb_e2e_\d+$/);
  const db = new Client({ connectionString: connection.toString() });
  await db.connect();
  const deadline = new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10);
  const universityDeadline = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const year = Number(deadline.slice(0, 4));
  const cycleIds: number[] = [];
  try {
    for (const [programId, date, round] of [
      [null, universityDeadline, "Round 1"],
      [fixture.fixtureProgramId, deadline, "Round 2"],
    ] as const) {
      const cycle = await db.query(
        "INSERT INTO application_cycles (university_id,program_id,academic_year,cycle_year,intake,application_type,deadline,verification_status,is_verified,is_estimated,source_url,last_verified_at) VALUES ($1,$2,$3,$4,'Fall',$5,$6,'verified',true,false,$7,now() AT TIME ZONE 'UTC') RETURNING id",
        [fixture.verifiedUniversityId, programId, String(year), year, round, date, fixture.fixturePublisherUrl]
      );
      cycleIds.push(cycle.rows[0].id);
    }

    expect((await request.post("/api/auth/sign-in", { data: {
      email: fixture.studentEmail, password: fixture.studentPassword,
    } })).status()).toBe(200);

    const profileId = fixture.studentId;
    const profile = await request.get(`/api/profiles/${profileId}`);
    expect(profile.status()).toBe(200);
    expect((await profile.json()).profile.id).toBe(profileId);

    const recommendations = await request.post("/api/programs/recommend", { data: {
      profileId, interests: ["Computer Science"], startYear: year,
    } });
    expect(recommendations.status()).toBe(200);
    const selected = (await recommendations.json()).results.find(
      (row: { program: { id: number } }) => row.program.id === fixture.fixtureProgramId
    );
    expect(selected?.nextCycle?.deadline).toBe(deadline);
    expect(selected.assessment.admissionProbability.value).toBeNull();

    const explorer = await request.get(`/api/universities?search=${encodeURIComponent(fixture.verifiedUniversityName)}&sort=rank_asc`);
    expect(explorer.status()).toBe(200);
    const card = (await explorer.json()).universities.find((row: { id: number }) => row.id === fixture.verifiedUniversityId);
    expect(card?.cardSummary).toEqual(expect.objectContaining({
      programme: expect.objectContaining({ id: fixture.fixtureProgramId, sourceUrl: fixture.fixturePublisherUrl, tuition: null }),
      deadline: expect.objectContaining({ date: deadline, programmeId: fixture.fixtureProgramId, category: "Round 2" }),
      admissionsUrl: expect.stringMatching(/^https:\/\//),
    }));
    expect(card?.estimatedChance.percentage).toBeNull();

    const detail = `/api/universities/${fixture.verifiedUniversityId}`;
    expect((await (await request.get(detail)).json()).applicationCycles).toEqual(
      expect.arrayContaining([expect.objectContaining({ deadline: universityDeadline })])
    );
    const scoped = await request.get(`${detail}?programId=${fixture.fixtureProgramId}&admissionCycle=${year}`);
    expect(scoped.status()).toBe(200);
    expect((await scoped.json()).applicationCycles).toEqual([
      expect.objectContaining({ programId: fixture.fixtureProgramId, deadline }),
    ]);

    const funding = await request.get(`/api/funding?profileId=${profileId}`);
    expect(funding.status()).toBe(200);
    expect((await funding.json()).plan.scenario).toBe("confirmed");
    const deadlines = await request.get(`/api/deadlines?profileId=${profileId}`);
    expect(deadlines.status()).toBe(200);
    expect((await deadlines.json()).items).toEqual(expect.any(Array));

    const draft = await request.post("/api/ai/draft-sop", { data: {
      profileId, universityName: fixture.verifiedUniversityName, programName: selected.program.name,
    } });
    expect(draft.status()).toBe(200);
    const { sopDraft, draftKind } = await draft.json();
    expect(draftKind).toBe("outline-scaffold");
    expect(sopDraft).toMatch(/\[[^\]]+\]/);

    const review = await request.post("/api/ai/review-sop", { data: {
      profileId, sopText: sopDraft, targetUniversity: fixture.verifiedUniversityName,
      targetMajor: selected.program.name, language: "en",
    } });
    expect(review.status()).toBe(200);
    const feedback = await review.json();
    expect(feedback.aiUsed).toBe(false);
    expect(feedback.rubric.wordCount).toBeGreaterThan(10);
    expect(feedback.review).toEqual(expect.any(String));
  } finally {
    if (cycleIds.length) await db.query("DELETE FROM application_cycles WHERE id=ANY($1::int[])", [cycleIds]);
    await db.end();
  }
});


test("speaking rooms use the plain orb independently of Scholly", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
  await page.context().addCookies([{name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL!}]);
  expect((await page.request.post("/api/auth/sign-in", { data: {
    email: fixture.studentEmail, password: fixture.studentPassword,
  } })).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#visa/daily-speaking");
  await page.getByRole("button", { name: "Start conversation", exact: true }).click();
  const face = page.locator("[data-speaking-avatar]:visible");
  await expect(face.locator("[data-speaking-orb]")).toBeVisible();
  await expect(face.locator(".sb-scholly-model, .sb-speaking-face-flag")).toHaveCount(0);
  await expect(face.locator("[data-eye]")).toHaveCount(2);
  const supportsWebGL = await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2")));
  if (supportsWebGL) {
    await expect(face.locator("[data-speaking-orb]")).toHaveAttribute("data-rendering", "3d");
  }
  await expect(page.getByRole("button", { name: "Open Scholly chat" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await face.screenshot({ path: testInfo.outputPath("daily-speaking-orb.png"), animations: "disabled" });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/#visa/speaking");
  await page.getByRole("button", { name: /United States/ }).first().click();
  await page.getByRole("button", { name: /Start interview/ }).click();
  await page.getByRole("button", { name: "John", exact: true }).click();
  await expect(face.locator("[data-speaking-orb]")).toBeVisible();
  await expect(face.locator(".sb-scholly-model, .sb-speaking-face-flag")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Scholly chat" })).toHaveCount(0);
  if (supportsWebGL) await expect(face.locator("[data-speaking-orb]")).toHaveAttribute("data-rendering", "3d");
});

test("an administrator can publish sourced ranks and restore archived universities", async ({ request }) => {
  const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
  expect((await request.post("/api/auth/sign-in", { data: {
    email: fixture.adminEmail, password: fixture.adminPassword,
  } })).status()).toBe(200);
  const sourceUrl = "https://www.topuniversities.com/world-university-rankings/2027";
  const name = "Disposable presentation catalogue fixture";
  const created = await request.post("/api/admin/universities", { data: {
    university: { name, country: "Canada", websiteUrl: fixture.fixturePublisherUrl },
    qsRanking: { label: "801–850", year: 2027, sourceUrl },
  } });
  expect(created.status()).toBe(200);
  const { university: { id } } = await created.json();
  try {
    const params = new URLSearchParams({ search: name, sort: "rank_asc", minRank: "830", maxRank: "850" });
    const list = () => request.get("/api/universities?" + params);
    const published = await list();
    expect((await published.json()).universities).toEqual([
      expect.objectContaining({ id, qsRanking: { rank: 801, upperRank: 850, year: 2027, label: "#801–850", sourceUrl } }),
    ]);
    const archived = await request.delete("/api/admin/universities?id=" + id);
    expect(archived.status()).toBe(200);
    expect((await (await list()).json()).universities).toEqual([]);
    expect((await request.get("/api/universities/" + id)).status()).toBe(404);
    const restored = await request.patch("/api/admin/universities", { data: { id, university: { isActive: true } } });
    expect(restored.status()).toBe(200);
    expect((await (await list()).json()).universities).toHaveLength(1);
  } finally {
    const db = new Client({ connectionString: process.env.E2E_DATABASE_URL });
    await db.connect();
    try {
      await db.query("DELETE FROM universities WHERE id = $1 AND name = $2", [id, name]);
    } finally {
      await db.end();
    }
  }
});

test("Admin can hide and show Study map under My Plan", async ({ page }) => {
  const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
  await page.context().addCookies([{name: "scholarbridge_locale", value: "en", url: process.env.E2E_BASE_URL!}]);
  expect((await page.request.post("/api/auth/sign-in", { data: {
    email: fixture.adminEmail, password: fixture.adminPassword,
  } })).status()).toBe(200);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/#admin");
  await page.getByRole("button", { name: "Sidebar sections", exact: true }).click();
  const studyMap = page.locator("li").filter({ has: page.locator("code").getByText("study-map", { exact: true }) });
  await expect(studyMap.getByText("Study map", { exact: true })).toBeVisible();
  await studyMap.getByRole("button", { name: "Visible", exact: true }).click();
  await expect(studyMap.getByRole("button", { name: "Hidden", exact: true })).toBeVisible();
  expect((await (await page.request.get("/api/config/boot")).json()).nav.hidden).toContain("study-map");
  await studyMap.getByRole("button", { name: "Hidden", exact: true }).click();
  await expect(studyMap.getByRole("button", { name: "Visible", exact: true })).toBeVisible();
  expect((await (await page.request.get("/api/config/boot")).json()).nav.hidden).not.toContain("study-map");
});

test("support recovery invalidates the old session and the replacement link is single-use", async ({ request, playwright }) => {
  const fixture = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8"));
  const db = new Client({ connectionString: process.env.E2E_DATABASE_URL });
  const student = await playwright.request.newContext({ baseURL: process.env.E2E_BASE_URL });
  try {
    await db.connect();
    const email = "recovery-audit@example.test";
    const replacementEmail = "owner-recovered@example.test";
    const oldPassword = "Isolated-Old-Passphrase-2026!";
    const newPassword = "Isolated-New-Passphrase-2026!";
    const { rows: [profile] } = await db.query<{ id: number }>(`
      INSERT INTO student_profiles (name, email, password_hash, onboarding_completed)
      VALUES ('Recovery audit', $1, $2, true) RETURNING id
    `, [email, hashPassword(oldPassword)]);

    expect((await student.post("/api/auth/sign-in", { data: { email, password: oldPassword } })).status()).toBe(200);
    expect((await student.get("/api/auth/session")).status()).toBe(200);
    expect((await request.post("/api/auth/sign-in", { data: {
      email: fixture.adminEmail, password: fixture.adminPassword,
    } })).status()).toBe(200);

    const endpoint = `/api/admin/accounts/${profile.id}/reset-link`;
    const adminPassword = fixture.adminPassword;
    expect((await student.post(endpoint, { data: { adminPassword, ownershipVerified: true } })).status()).toBe(403);
    expect((await request.post(endpoint, { data: { adminPassword, ownershipVerified: false } })).status()).toBe(400);
    const issued = await request.post(endpoint, { data: { adminPassword, ownershipVerified: true, newEmail: replacementEmail } });
    expect(issued.status()).toBe(200);
    expect(issued.headers()["cache-control"]).toContain("no-store");
    const body = await issued.json();
    expect(body.sessionsRevoked).toBeGreaterThanOrEqual(1);
    expect((await student.get("/api/auth/session")).status()).toBe(401);
    expect((await student.post("/api/auth/sign-in", { data: { email: replacementEmail, password: oldPassword } })).status()).toBe(401);

    const token = new URL(body.link).searchParams.get("token");
    expect(token).toBeTruthy();
    const data = { token, password: newPassword, passwordConfirm: newPassword };
    expect((await student.post("/api/auth/password-reset/confirm", { data })).status()).toBe(200);
    expect((await student.post("/api/auth/password-reset/confirm", { data })).ok()).toBe(false);
    expect((await student.post("/api/auth/sign-in", { data: { email: replacementEmail, password: newPassword } })).status()).toBe(200);
    const audit = await db.query("SELECT new_value FROM audit_logs WHERE entity_type='profile' AND entity_id=$1 AND field_changed='password_reset_token'", [profile.id]);
    expect(audit.rowCount).toBe(1);
    expect(JSON.stringify(audit.rows)).not.toContain(token);
  } finally {
    await student.dispose();
    await db.end();
  }
});
