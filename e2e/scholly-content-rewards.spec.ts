import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { Pool } from "pg";
import { SOP_SAMPLES } from "../src/lib/samples/exemplars";

const fixtures = JSON.parse(readFileSync(process.env.E2E_FIXTURE_FILE!, "utf8")) as {
  adminEmail: string;
  adminPassword: string;
};

async function login(request: APIRequestContext, pool: Pool) {
  const email = `scholly-content-${randomUUID()}@example.test`;
  const { rows: [profile] } = await pool.query<{ id: number }>(`
    INSERT INTO student_profiles (name, email, password_hash, is_admin)
    SELECT 'Content rewards test', $1, password_hash, true FROM student_profiles WHERE email = $2
    RETURNING id`, [email, fixtures.adminEmail]);
  expect((await request.post("/api/auth/sign-in", { data: { email, password: fixtures.adminPassword } })).status()).toBe(200);
  return profile.id;
}

test("vault pays once for an owned application's document category, outside the small bucket", async ({ request }) => {
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  try {
    const profileId = await login(request, pool);
    const { rows: [first, second] } = await pool.query<{ id: number }>(`
      INSERT INTO applications (profile_id, university_name) VALUES ($1, 'First'), ($1, 'Second') RETURNING id`, [profileId]);
    const url = "/api/vault/documents";
    async function create(data: Record<string, unknown>) {
      const response = await request.post(url, { data: { profileId, title: "Application preparation", ...data } });
      expect(response.ok()).toBe(true);
      return await response.json();
    }
    async function update(id: number, data: Record<string, unknown>) {
      const response = await request.patch(url, { data: { profileId, id, ...data } });
      expect(response.ok()).toBe(true);
      return await response.json();
    }

    const original = await create({ docType: "passport", fileUrl: "https://example.test/passport.pdf" });
    expect(original.schollyPointsAwarded).toBe(0);
    expect((await update(original.document.id, { applicationIds: [first.id] })).schollyPointsAwarded).toBe(15);
    expect((await update(original.document.id, { fileUrl: "https://example.test/passport-new.pdf" })).schollyPointsAwarded).toBe(0);

    const replacement = await create({ docType: "passport", fileUrl: "https://example.test/second-passport.pdf", applicationIds: [first.id] });
    expect(replacement.schollyPointsAwarded).toBe(0);
    expect((await update(original.document.id, { applicationIds: [first.id, second.id] })).schollyPointsAwarded).toBe(15);
    const checklist = await create({ docType: "transcript", applicationIds: [first.id] });
    expect(checklist.schollyPointsAwarded).toBe(0);
    expect((await update(checklist.document.id, { fileUrl: "https://example.test/transcript.pdf" })).schollyPointsAwarded).toBe(15);
    expect((await update(checklist.document.id, { docType: "diploma" })).schollyPointsAwarded).toBe(0);

    const { rows } = await pool.query(
      "SELECT points, bucket FROM points_ledger WHERE profile_id = $1 AND reason = 'scholly_document_uploaded'", [profileId],
    );
    expect(rows).toEqual(Array.from({ length: 3 }, () => ({ points: 15, bucket: "main" })));
  } finally {
    await pool.end();
  }
});

test("SOP pays for three novel paragraphs a day and records meaningful practice after the cap", async ({ request }) => {
  const pool = new Pool({ connectionString: process.env.E2E_DATABASE_URL! });
  try {
    const profileId = await login(request, pool);
    const paragraphs = [
      "During the winter robotics club, I designed a sensor enclosure to protect a small board from condensation. Our first print cracked when the door closed, so I measured the frame again and redesigned the joint. This exercise taught me to document failed assumptions before ordering materials.",
      "My community library asked me to explain why their volunteer schedule regularly left the reading room unattended. After interviewing three volunteers, I compared their calendars and noticed that classes ended later on Wednesdays. We introduced one longer afternoon shift and let each family choose a predictable check-in time.",
      "I compared recordings from the same irrigation channel in spring and autumn to understand why an optical instrument drifted. Students at the field station kept their own notebooks, and I transcribed those readings before checking weather records. That comparison revealed missing measurements on cloudy mornings near the shaded bridge.",
      "My aunt's garment cooperative tracked fabric purchases with handwritten receipts. I designed a spreadsheet beside her cutting table and recorded mistakes rather than correcting them silently. After several shifts we discovered that bolts with different widths needed separate labels, and our next inventory finished before the afternoon delivery.",
      "The chemistry demonstration ended with an unexpected colour change in a container previously labelled water. I read the preparation notes with our teacher and replicated the experiment using separate beakers. We found that the earlier group had rinsed both implements in one tray, which contaminated the reference sample.",
      "I wrote a neighbourhood history by asking residents how they used an old courtyard. Instead of treating the oldest account as definitive, I compared photographs, property sketches and recordings from different generations. Their disagreements made me interested in archives that preserve competing memories of an ordinary place.",
    ];
    async function save(content: string) {
      const response = await request.post("/api/essays", { data: { profileId, essayType: "sop", content } });
      expect(response.ok()).toBe(true);
      return await response.json();
    }
    expect((await save("word repetition ".repeat(60))).schollyPointsAwarded).toBe(0);
    expect((await save(SOP_SAMPLES[0].text)).schollyPointsAwarded).toBe(0);
    await pool.query(`
      INSERT INTO essay_versions (profile_id, essay_type, title, content)
      VALUES ($1, 'private_memory', 'Private essay memory (draft)', $2)`, [profileId, paragraphs[5]]);
    expect((await save(paragraphs[5])).schollyPointsAwarded).toBe(0);
    const firstSave = await save(paragraphs.slice(0, 3).join("\n\n"));
    expect(firstSave.schollyPointsAwarded).toBe(30);
    expect((await save(paragraphs[0].replace("ordering materials", "selecting hardware"))).schollyPointsAwarded).toBe(0);
    const capped = await save(paragraphs[3]);
    expect(capped.schollyPointsAwarded).toBe(0);
    const { rows: [practice] } = await pool.query(
      "SELECT count(*)::int AS count FROM scholly_events WHERE user_id = $1 AND type = 'sop_practiced' AND payload->>'versionId' = $2",
      [profileId, String(capped.version.id)],
    );
    expect(practice.count).toBe(1);
    await pool.query("UPDATE points_ledger SET created_at = created_at - interval '2 days' WHERE profile_id = $1", [profileId]);
    expect((await save(paragraphs[4])).schollyPointsAwarded).toBe(10);
  } finally {
    await pool.end();
  }
});
