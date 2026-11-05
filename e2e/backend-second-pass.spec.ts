import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as { studentEmail: string; studentPassword: string; studentId: number; adminEmail: string; adminPassword: string; courseId: number; lessonId: number };

test("strict profile, numeric paths and forum pagination reject malformed HTTP requests", async ({ request }) => {
  expect((await request.post("/api/auth/sign-in", { data: { email: fixtures.studentEmail, password: fixtures.studentPassword } })).status()).toBe(200);
  for (const path of ["/api/profiles/NaN", "/api/courses/1oops", "/api/universities/1oops", "/api/forum/threads?page=NaN", "/api/forum/threads?authorId=1oops", "/api/forum/threads?authorId=1e2", "/api/forum/replies?threadId=abc", "/api/forum/threads/abc", "/api/dashboard?profileId=NaN"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(400);
    expect(await response.text()).not.toMatch(/TypeError|Failed query|postgresql:\/\//);
  }
  expect((await request.get("/api/health")).status()).toBe(200);
});

test("parallel learning HTTP retries complete once, keep time monotonic and grant one reward/certificate", async ({ request }) => {
  expect((await request.post("/api/auth/sign-in", { data: { email: fixtures.studentEmail, password: fixtures.studentPassword } })).status()).toBe(200);
  const save = (watchedSeconds: number) => request.post("/api/courses/progress", { data: { profileId: fixtures.studentId, lessonId: fixtures.lessonId, watchedSeconds } });
  const first = await save(5); expect(first.status()).toBe(200); expect((await first.json()).progress.isCompleted).toBe(false);
  const results = await Promise.all([100, 120, 20, 110, 15, 100, 99, 50].map(save));
  expect(results.map((r) => r.status())).toEqual(Array(8).fill(200));
  const final = await save(1); expect(final.status()).toBe(200);
  const data = await final.json(); expect(data.progress.watchedSeconds).toBe(120); expect(data.progress.isCompleted).toBe(true);
  const certs = await request.get(`/api/certificates?profileId=${fixtures.studentId}`);
  expect(certs.status()).toBe(200);
  expect((await certs.json()).certificates.filter((c: { courseId: number }) => c.courseId === fixtures.courseId)).toHaveLength(1);
  const points = await request.get(`/api/gamification?profileId=${fixtures.studentId}`);
  expect(points.status()).toBe(200);
  const snapshot = await points.json();
  expect(snapshot.ledger.filter((r: { reason: string; relatedEntityId: number }) => r.reason === "lesson_complete" && r.relatedEntityId === fixtures.lessonId)).toHaveLength(1);
});

test("admin malformed audit/research parameters fail before background work starts", async ({ request }) => {
  expect((await request.post("/api/auth/sign-in", { data: { email: fixtures.adminEmail, password: fixtures.adminPassword } })).status()).toBe(200);
  for (const path of ["/api/admin/audit?limit=NaN", "/api/admin/audit?offset=-1", "/api/admin/channel/audit?limit=-1"]) expect((await request.get(path)).status(), path).toBe(400);
  for (const data of [{ universityId: "1oops" }, { universityId: 1, scopes: ["bad_scope"] }, { universityId: 1, maxPages: 999 }, { universityId: 1, dryRun: "true" }]) expect((await request.post("/api/admin/research-agent/run", { data })).status()).toBe(400);
  const audit = await request.get("/api/admin/audit?entityId=0"); expect(audit.status()).toBe(200);
  const logs = (await audit.json()).logs; expect(logs.length).toBeGreaterThan(0); expect(logs.every((row: { entityId: number }) => row.entityId === 0)).toBe(true);
  const status = await request.get("/api/admin/research-agent/status"); expect(status.status()).toBe(200); expect((await status.json()).runs).toHaveLength(0);
});
