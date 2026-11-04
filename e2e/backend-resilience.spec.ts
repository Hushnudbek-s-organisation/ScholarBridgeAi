import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  studentId: number; studentEmail: string; studentPassword: string; otherProfileId: number; adminEmail: string; adminPassword: string;
};

test("malformed JSON envelopes never turn public forms into server 500s", async ({ request }, testInfo) => {
  const results = [];
  for (const path of ["/api/auth/sign-in", "/api/profiles", "/api/auth/telegram/status", "/api/auth/password-reset/confirm"]) {
    for (const body of ["null", "[]", "true", "42", '"text"', "{"]) {
      const response = await request.post(path, { data: body, headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.222" }, timeout: 15_000 });
      results.push({ path, body, status: response.status() });
      expect(response.status(), `${path} (${body})`).toBe(400);
      expect(await response.text()).not.toMatch(/TypeError|postgresql:\/\/|Failed query:|at .*\.tsx?:/);
    }
  }
  const large = await request.post("/api/profiles", { data: JSON.stringify({ bio: "x".repeat(128 * 1024) }), headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.223" } });
  expect(large.status()).toBe(413);
  await testInfo.attach("invalid-payload-results", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
});

test("public boot/catalogue APIs survive cold, warm and concurrent local reads", async ({ request }, testInfo) => {
  test.setTimeout(120_000);
  const paths = ["/api/health", "/api/config/boot", "/api/config/branding", "/api/config/nav", "/api/config/guide", "/api/courses", "/api/stories", "/api/opportunities", "/api/scholarships", "/api/universities"];
  const results = [];
  for (const phase of ["cold", "warm"]) for (const path of paths) {
    const started = performance.now(); const response = await request.get(path, { timeout: 15_000 });
    results.push({ phase, path, status: response.status(), ms: performance.now() - started });
    expect(response.status(), `${phase} ${path}`).toBe(200);
    await response.json();
  }
  const burst = await Promise.all(Array.from({ length: 12 }, (_, index) => request.get(paths[index % paths.length], { timeout: 15_000 })));
  expect(burst.every((r) => r.status() === 200)).toBe(true);
  await testInfo.attach("public-api-observations", { body: JSON.stringify({ scope: "small disposable fixtures; not a production-scale load benchmark", results, burstStatuses: burst.map((r) => r.status()) }, null, 2), contentType: "application/json" });
});

test("authenticated backend reads remain private, owned and available after invalid writes", async ({ request }, testInfo) => {
  test.setTimeout(120_000);
  const login = await request.post("/api/auth/sign-in", { data: { email: fixtures.studentEmail, password: fixtures.studentPassword } });
  expect(login.status()).toBe(200);
  const paths = ["dashboard", "saved-universities", "saved-scholarships", "applications", "documents", "tasks", "goals", "vault"];
  const results = [];
  for (const path of paths) {
    const started = performance.now();
    const own = await request.get(`/api/${path}?profileId=${fixtures.studentId}`, { timeout: 15_000 });
    results.push({ path, ownStatus: own.status(), ms: performance.now() - started });
    expect(own.status(), path).toBe(200);
    expect(own.headers()["cache-control"], path).toContain("no-store");
    const other = await request.get(`/api/${path}?profileId=${fixtures.otherProfileId}`);
    expect(other.status(), `${path}: other profile is forbidden`).toBe(403);
  }
  for (const path of ["tasks", "goals", "applications", "essays", "saved-universities", "documents", "referral", "quizzes/attempt", "courses/progress", "roadmap/generate", "essay-adapter", "essays/reviews"]) {
    const response = await request.post(`/api/${path}`, { data: "null", headers: { "content-type": "application/json" } });
    expect(response.status(), path).toBe(400);
  }
  for (const method of ["PATCH", "PUT"]) {
    expect((await request.fetch("/api/notifications", { method, data: "null", headers: { "content-type": "application/json" } })).status()).toBe(400);
  }
  for (const limit of ["abc", "-1", "1.5", "Infinity"]) {
    expect((await request.get(`/api/notifications?profileId=${fixtures.studentId}&limit=${limit}`)).status()).toBe(400);
  }
  expect((await request.get(`/api/notifications?profileId=${fixtures.studentId}&limit=10000`)).status()).toBe(200);
  const burst = await Promise.all(Array.from({ length: 8 }, () => request.get(`/api/tasks?profileId=${fixtures.studentId}`, { timeout: 15_000 })));
  expect(burst.every((r) => r.status() === 200)).toBe(true);
  expect((await request.get("/api/health")).status()).toBe(200);
  await testInfo.attach("private-api-observations", { body: JSON.stringify({ results, burstStatuses: burst.map((r) => r.status()) }, null, 2), contentType: "application/json" });
});


test("admin branding rejects malformed/oversized multipart without storage calls", async ({ request }) => {
  expect((await request.post("/api/auth/sign-in", { data: { email: fixtures.adminEmail, password: fixtures.adminPassword } })).status()).toBe(200);
  const invalid = await request.post("/api/admin/branding/upload", { data: "broken multipart", headers: { "content-type": "multipart/form-data; boundary=missing" } });
  expect(invalid.status()).toBe(400);
  const tooLarge = await request.post("/api/admin/branding/upload", { multipart: { kind: "logo", file: { name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(6 * 1024 * 1024) } } });
  expect(tooLarge.status()).toBe(413);
  expect((await request.get("/api/health")).status()).toBe(200);
});
