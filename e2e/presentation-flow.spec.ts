import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Client } from "pg";

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
        "INSERT INTO application_cycles (university_id,program_id,academic_year,cycle_year,intake,application_type,deadline,verification_status,is_verified,source_url) VALUES ($1,$2,$3,$4,'Fall',$5,$6,'verified',true,$7) RETURNING id",
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
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await face.screenshot({ path: testInfo.outputPath("daily-speaking-orb.png"), animations: "disabled" });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/#visa/speaking");
  await page.getByRole("button", { name: /United States/ }).first().click();
  await page.getByRole("button", { name: /Start interview/ }).click();
  await page.getByRole("button", { name: "John", exact: true }).click();
  await expect(face.locator("[data-speaking-orb]")).toBeVisible();
  await expect(face.locator(".sb-scholly-model, .sb-speaking-face-flag")).toHaveCount(0);
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
