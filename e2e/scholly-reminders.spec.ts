import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { generateVAPIDKeys } from "web-push";
import { require as loadTs } from "tsx/cjs/api";
import { hashSchollyPushEndpoint } from "../src/lib/scholly-push.server";

test("Scholly sends one encrypted reminder per day and records categories and stable assignment", async () => {
  const connectionString = process.env.E2E_DATABASE_URL!;
  const url = new URL(connectionString);
  expect(url.hostname).toBe("127.0.0.1");
  expect(url.pathname).toMatch(/^\/sb_e2e_\d+$/);
  process.env.DATABASE_URL = connectionString;

  const { runSchollyPushReminders } = loadTs("../src/lib/scholly-push-reminders.server", __filename) as
    typeof import("../src/lib/scholly-push-reminders.server");
  const { pool: appPool } = loadTs("../src/db", __filename) as typeof import("../src/db");
  const keys = generateVAPIDKeys();
  process.env.SCHOLLY_VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.SCHOLLY_VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.SCHOLLY_VAPID_SUBJECT = "mailto:push@example.test";

  const pool = new Pool({ connectionString });
  const ids: number[] = [];
  const received = new Set<string>();
  const now = new Date("2026-11-17T14:15:00Z");
  const provider: typeof fetch = async (input, options) => {
    const endpoint = String(input);
    expect(options?.method).toBe("POST");
    expect(new Headers(options?.headers).get("content-encoding")).toBe("aes128gcm");
    expect(options?.body).toBeInstanceOf(Uint8Array);
    expect(received.has(endpoint)).toBe(false);
    received.add(endpoint);
    return new Response(null, { status: 201 });
  };

  try {
    const profiles = await pool.query<{ id: number }>(`
      INSERT INTO student_profiles (name, email)
      SELECT 'Reminder Fixture', $1 || n || '@example.test' FROM generate_series(1, 5) n
      ORDER BY n RETURNING id
    `, [randomUUID()]);
    ids.push(...profiles.rows.map(row => row.id));
    const [mission, streak, paired, partner, quiet] = ids;
    await pool.query(`
      INSERT INTO scholly_profile (user_id, reminder_window, quiet_start)
      SELECT id, 'evening', CASE WHEN id = $2 THEN '19:00' ELSE '22:00' END
      FROM unnest($1::int[]) id
    `, [ids, quiet]);

    const device = createECDH("prime256v1");
    device.generateKeys();
    for (const id of [mission, streak, paired, quiet]) {
      const endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`;
      await pool.query(`
        INSERT INTO scholly_push_subscriptions (endpoint_hash, user_id, endpoint, p256dh, auth)
        VALUES ($1, $2, $3, $4, $5)
      `, [hashSchollyPushEndpoint(endpoint), id, endpoint, device.getPublicKey().toString("base64url"),
        randomBytes(16).toString("base64url")]);
    }
    await pool.query(`
      INSERT INTO points_ledger (profile_id, points, reason, created_at)
      SELECT $1, 0, 'daily_active', '2026-11-17 12:00:00'::timestamp - n * interval '1 day'
      FROM generate_series(1, 3) n
    `, [streak]);
    await pool.query(`
      INSERT INTO scholly_friend_links (inviter_id, friend_id, token_hash, expires_at, accepted_at)
      VALUES ($1, $2, $3, '2026-11-19T00:00:00Z', '2026-11-16T12:00:00Z')
    `, [paired, partner, randomUUID()]);
    await pool.query(`
      INSERT INTO daily_missions (user_id, day, type, status, done_at)
      VALUES ($1, '2026-11-17', 'fill_profile_fields', 'done', '2026-11-17T13:00:00Z')
    `, [partner]);

    const runs = await Promise.all([runSchollyPushReminders(now, provider), runSchollyPushReminders(now, provider)]);
    expect(runs.reduce((total, run) => total + run.sent, 0)).toBe(3);
    expect(runs.every(run => run.failed === 0)).toBe(true);
    expect(received.size).toBe(3);
    const deliveries = await pool.query(`
      SELECT user_id, category, variant, status FROM scholly_notification_log
      WHERE user_id = ANY($1::int[]) ORDER BY user_id
    `, [ids]);
    const assignment = deliveries.rows[0]?.variant;
    expect(assignment).toMatch(/^[AB]$/);
    expect(deliveries.rows).toEqual([
      { user_id: mission, category: "mission", variant: assignment, status: "sent" },
      { user_id: streak, category: "streak", variant: null, status: "sent" },
      { user_id: paired, category: "friend", variant: null, status: "sent" },
    ]);

    received.clear();
    expect((await runSchollyPushReminders(new Date("2026-11-18T14:15:00Z"), provider)).sent).toBe(3);
    const checked = await pool.query(
      "SELECT variant FROM scholly_notification_log WHERE user_id = $1 ORDER BY local_day",
      [mission],
    );
    expect(checked.rows).toEqual([{ variant: assignment }, { variant: assignment }]);
  } finally {
    if (ids.length) await pool.query("DELETE FROM student_profiles WHERE id = ANY($1::int[])", [ids]);
    await Promise.all([pool.end(), appPool.end()]);
  }
});
