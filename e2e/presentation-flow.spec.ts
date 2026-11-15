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
