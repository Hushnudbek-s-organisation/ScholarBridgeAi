import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  adminEmail: string;
  adminPassword: string;
  verifiedUniversityId: number;
};

test("Scholly micro rewards are idempotent and share a 60-point cap across concurrent actions", async ({ request }) => {
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  const email = `scholly-micro-${randomUUID()}@example.test`;
  let profileId: number | undefined;
  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO student_profiles (name, email, password_hash, is_admin)
       SELECT 'Scholly reward test', $1, password_hash, true FROM student_profiles WHERE email = $2
       RETURNING id`, [email, fixtures.adminEmail],
    );
    profileId = rows[0].id;
    const signIn = await request.post("/api/auth/sign-in", { data: { email, password: fixtures.adminPassword } });
    expect(signIn.status()).toBe(200);

    await pool.query(`INSERT INTO points_ledger (profile_id, points, reason, bucket)
      SELECT $1, 5, 'scholly_forum_helpful', 'small' FROM generate_series(1, 11)`, [profileId]);
    const profileUrl = `/api/profiles/${profileId}`;
    for (const country of ["Uzbekistan", null, "Uzbekistan"]) {
      expect((await request.put(profileUrl, { data: { country } })).ok()).toBe(true);
    }
    const saveUniversity = () => request.post("/api/saved-universities", {
      data: { profileId, universityId: fixtures.verifiedUniversityId },
    });
    for (const response of await Promise.all([saveUniversity(), saveUniversity()])) {
      expect(response.ok()).toBe(true);
    }

    const attachDocument = (number: number) => request.post("/api/vault/documents", {
      data: { profileId, docType: "other", title: `Document ${number}`, fileUrl: `https://example.test/doc-${number}.pdf` },
    });
    for (const response of await Promise.all([1, 2, 3, 4, 5].map(attachDocument))) {
      expect(response.ok()).toBe(true);
    }
    const ledger = async (reason: string) => (await pool.query<{ points: number }>(
      "SELECT points FROM points_ledger WHERE profile_id = $1 AND reason = $2 ORDER BY points DESC",
      [profileId, reason],
    )).rows.map(({ points }) => points);

    expect(await ledger("scholly_profile_field_filled")).toEqual([3]);
    expect(await ledger("scholly_university_saved")).toEqual([2]);
    expect(await ledger("scholly_document_uploaded")).toEqual([]);
    const { rows: events } = await pool.query<{ points: number }>(
      `SELECT sum((payload->>'points')::integer)::integer AS points FROM scholly_events
       WHERE user_id = $1 AND type = 'points_awarded'`, [profileId],
    );
    expect(events).toEqual([{ points: 5 }]);
    expect(await (await request.get("/api/scholly/points")).json()).toMatchObject({ smallPoints: 60 });

    await pool.query("UPDATE points_ledger SET created_at = created_at - interval '2 days' WHERE profile_id = $1", [profileId]);
    expect((await request.put(profileUrl, { data: { targetMajor: "Computer Science" } })).ok()).toBe(true);
    expect(await ledger("scholly_profile_field_filled")).toEqual([3, 3]);
    expect(await (await request.get("/api/scholly/points")).json()).toMatchObject({ smallPoints: 3 });
  } finally {
    if (profileId) await pool.query("DELETE FROM student_profiles WHERE id = $1", [profileId]);
    await pool.end();
  }
});
