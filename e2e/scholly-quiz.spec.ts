import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { gradeQuiz, publicQuiz, questionsForDay, type DailyQuiz } from "../src/lib/scholly-quiz.server";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  adminEmail: string;
  adminPassword: string;
  studentId: number;
};

test("Scholly rotates 21 questions and preserves the questions attached to a saved result", () => {
  const sets = Array.from({ length: 7 }, (_, index) => questionsForDay(`2026-11-${10 + index}`));
  expect(new Set(sets.flat().map(({ id }) => id)).size).toBe(21);
  const saved = gradeQuiz("2026-11-10", sets[0].map(({ id, correctIndex }) => ({
    questionId: id, selectedIndex: correctIndex,
  })));
  expect(publicQuiz("2026-11-11", "en", saved).questions.map(({ id }) => id))
    .toEqual(sets[0].map(({ id }) => id));
});

test("Scholly grades and awards a daily quiz once across concurrent requests", async ({ request }) => {
  expect((await request.get("/api/scholly/quiz")).status()).toBe(401);
  expect((await request.post("/api/auth/sign-in", {
    data: { email: fixtures.adminEmail, password: fixtures.adminPassword },
  })).status()).toBe(200);
  expect((await request.get(`/api/scholly/quiz?profileId=${fixtures.studentId}`)).status()).toBe(403);
  const response = await request.get("/api/scholly/quiz?locale=uz");
  expect(response.status()).toBe(200);
  const quiz: DailyQuiz = await response.json();
  expect(quiz.questions).toHaveLength(3);
  expect(quiz.result).toBeNull();
  expect(quiz.questions[0]).not.toHaveProperty("correctIndex");

  const russian: DailyQuiz = await (await request.get("/api/scholly/quiz?locale=ru")).json();
  expect(russian.questions.map(({ id }) => id)).toEqual(quiz.questions.map(({ id }) => id));
  expect(russian.questions[0].prompt).not.toEqual(quiz.questions[0].prompt);

  const answers = questionsForDay(quiz.day).map(({ id, correctIndex }) => ({
    questionId: id, selectedIndex: correctIndex,
  }));
  const expected = gradeQuiz(quiz.day, answers);
  expect(expected).toMatchObject({ correctCount: 3, points: 8 });

  expect((await request.post("/api/scholly/quiz", {
    data: { locale: "uz", day: "2000-01-01", answers },
  })).status()).toBe(409);
  expect((await request.post("/api/scholly/quiz", {
    data: { locale: "uz", day: quiz.day, answers: answers.slice(0, 2) },
  })).status()).toBe(400);

  const submissions = await Promise.all(Array.from({ length: 3 }, () => request.post("/api/scholly/quiz", {
    data: { locale: "uz", day: quiz.day, answers },
  })));
  for (const submission of submissions) {
    expect(submission.status()).toBe(200);
    expect((await submission.json()).result).toEqual(expected);
  }
  const stored = await request.get("/api/scholly/quiz?locale=en");
  expect((await stored.json()).result).toEqual(expected);

  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  try {
    const { rows: awards } = await pool.query(
      `SELECT points FROM points_ledger
       WHERE reason = 'scholly_daily_quiz' AND related_entity_id = $1
         AND profile_id = (SELECT id FROM student_profiles WHERE email = $2)`,
      [Number(quiz.day.replace(/-/g, "")), fixtures.adminEmail],
    );
    expect(awards).toEqual([{ points: 8 }]);
    const { rows: events } = await pool.query(
      `SELECT payload->>'points' AS points FROM scholly_events
       WHERE type = 'quiz_done' AND payload->>'day' = $1
         AND user_id = (SELECT id FROM student_profiles WHERE email = $2)`,
      [quiz.day, fixtures.adminEmail],
    );
    expect(events).toEqual([{ points: "8" }]);
  } finally {
    await pool.end();
  }
});
