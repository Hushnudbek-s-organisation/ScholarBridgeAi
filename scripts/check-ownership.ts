/**
 * Platform ownership — state machine unit tests + integration tests against
 * a real PostgreSQL (embedded-postgres + `drizzle-kit push`), calling the
 * real route handlers with real signed session cookies.
 *
 * Covers: state machine, DDL/drizzle drift, bootstrap, start/accept/confirm/
 * reject/cancel/expire, replay + race safety, authorization (non-admin,
 * non-owner admin, wrong party, wrong password), admin grant/revoke, owner
 * delete protection, audit + notifications, seed not undoing a transfer.
 *
 * Run: npm run test:ownership
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import { readFileSync, rmSync } from "fs";
import { join } from "path";
import { and, eq } from "drizzle-orm";

let passed = 0;
let failed = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const section = (t: string) => console.log(`\n${t}`);

const PORT = 55443;
const DB = "sbown";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const PG_DIR = "/tmp/sb-own-pg";

let pg: EmbeddedPostgres | null = null;
let appPool: { end: () => Promise<void> } | null = null;

async function main() {
  // -------------------------------------------------------------------------
  section("State machine (pure)");
  // -------------------------------------------------------------------------
  const state = await import("../src/lib/ownership/state");
  {
    const n = state.nextOwnershipStatus;
    check("pending --accept(target)--> accepted", n("pending", "accept", "target") === "accepted");
    check("accepted --confirm(owner)--> completed", n("accepted", "confirm", "owner") === "completed");
    check("pending cannot be confirmed (target must accept first)", n("pending", "confirm", "owner") === null);
    check("owner cannot accept on behalf of the target", n("pending", "accept", "owner") === null);
    check("target cannot confirm", n("accepted", "confirm", "target") === null);
    check("target cannot cancel; owner cannot reject", n("pending", "cancel", "target") === null && n("pending", "reject", "owner") === null);
    const terminal = ["completed", "rejected", "expired", "cancelled"] as const;
    const actions = ["accept", "confirm", "reject", "cancel", "expire"] as const;
    const roles = ["owner", "target", "system"] as const;
    check(
      "terminal states never transition (no completed → pending, etc.)",
      terminal.every((s) => actions.every((a) => roles.every((r) => n(s, a, r) === null)))
    );
    check(
      "no transition ever leads back to pending",
      state.OWNERSHIP_STATUSES.every((s) => actions.every((a) => roles.every((r) => n(s, a, r) !== "pending")))
    );
    check("expire only by the system", n("pending", "expire", "system") === "expired" && n("pending", "expire", "owner") === null);
    check("TTL default 72h, clamped 1..168", state.transferTtlHours({}) === 72 && state.transferTtlHours({ OWNERSHIP_TRANSFER_TTL_HOURS: "0" }) === 1 && state.transferTtlHours({ OWNERSHIP_TRANSFER_TTL_HOURS: "9999" }) === 168 && state.transferTtlHours({ OWNERSHIP_TRANSFER_TTL_HOURS: "x" }) === 72);
    check("checklist never claims third-party accounts move automatically", state.HANDOVER_CHECKLIST.filter((c) => c.automatic).every((c) => ["app_owner", "admin_access"].includes(c.id)));
    check("Telegram item says manual transfer may be required", /Manual Telegram ownership transfer may be required/.test(state.HANDOVER_CHECKLIST.find((c) => c.id === "telegram_bot")?.detail ?? ""));
  }

  // -------------------------------------------------------------------------
  // Real database
  // -------------------------------------------------------------------------
  rmSync(PG_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({ databaseDir: PG_DIR, user: "test", password: "test", port: PORT, persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  await pg.createDatabase(`${DB}_ddl`);
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: URL_ }, encoding: "utf8", stdio: ["ignore", "ignore", "pipe"], timeout: 240000 });
  console.log(`\nPostgres :${PORT}, schema pushed from src/db/schema.ts`);

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = "ownership-integration-secret-0123456789abcdef";
  process.env.ADMIN_EMAIL = "owner@example.com";
  delete process.env.PLATFORM_OWNER_EMAIL;
  delete process.env.ADMIN_NAME;
  delete process.env.ADMIN_PASSWORD;
  delete process.env.TELEGRAM_BOT_TOKEN;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  appPool = pool as unknown as { end: () => Promise<void> };
  (pool as unknown as { on: (e: string, f: () => void) => void }).on("error", () => undefined);
  const schema = await import("../src/db/schema");
  const { hashPassword } = await import("../src/lib/password");
  const { signSessionToken } = await import("../src/lib/auth");
  const { ownershipStatements, OWNERSHIP_DDL } = await import("../src/lib/ownership/ddl");
  const ownershipRoute = await import("../src/app/api/admin/ownership/route");
  const profileRoute = await import("../src/app/api/profiles/[id]/route");
  const { resetRateLimits } = await import("../src/lib/rate-limit");
  const { resetSharedRateLimits } = await import("../src/lib/rate-limit-shared");
  // The ownership route counts against the SHARED (Postgres) limiter (audit
  // A20), so concurrency sections must clear BOTH budgets or the previous
  // password-gated calls exhaust the shared budget and the parallel requests
  // see 429 instead of the 200/409/403 race they are asserting.
  const resetAllRateLimits = async () => {
    resetRateLimits();
    await resetSharedRateLimits();
  };

  // -------------------------------------------------------------------------
  section("Schema: runtime DDL == drizzle == supabase/add_ownership.sql");
  // -------------------------------------------------------------------------
  {
    const { Pool } = await import("pg");
    const ddlPool = new Pool({ connectionString: `postgresql://test:test@127.0.0.1:${PORT}/${DB}_ddl` });
    await ddlPool.query("CREATE TABLE student_profiles (id serial primary key)");
    for (const stmt of ownershipStatements()) await ddlPool.query(stmt);
    for (const stmt of ownershipStatements()) await ddlPool.query(stmt); // idempotent
    type Q = { query: (q: string) => Promise<{ rows: Record<string, string>[] }> };
    const cols = async (p: Q) =>
      (await p.query(`SELECT table_name, column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name IN ('platform_ownership','ownership_transfers') ORDER BY 1,2`)).rows.map(
        (r) => `${r.table_name}.${r.column_name}:${r.data_type}:${r.is_nullable}:${String(r.column_default ?? "").replace(/::\w+/g, "")}`
      );
    const cons = async (p: Q) =>
      (await p.query(`SELECT conrelid::regclass::text AS t, conname, contype FROM pg_constraint WHERE conrelid::regclass::text IN ('platform_ownership','ownership_transfers') ORDER BY 1,2`)).rows.map((r) => `${r.t}.${r.conname}:${r.contype}`);
    const idx = async (p: Q) =>
      (await p.query(`SELECT indexname, regexp_replace(indexdef, '\\s+', ' ', 'g') AS def FROM pg_indexes WHERE tablename IN ('platform_ownership','ownership_transfers') ORDER BY 1`)).rows.map((r) => `${r.indexname}:${r.def}`);
    const rls = async (p: Q) =>
      (await p.query(`SELECT relname, relrowsecurity::text AS r FROM pg_class WHERE relname IN ('platform_ownership','ownership_transfers') ORDER BY 1`)).rows.map((r) => `${r.relname}:${r.r}`);
    const [c1, c2] = [await cols(ddlPool), await cols(pool as unknown as Q)];
    check("columns identical (type, nullability, default)", JSON.stringify(c1) === JSON.stringify(c2), `ddl=${c1.filter((x) => !c2.includes(x))} drizzle=${c2.filter((x) => !c1.includes(x))}`);
    const [k1, k2] = [await cons(ddlPool), await cons(pool as unknown as Q)];
    check("constraint names identical (db:push will not rename/drop them)", JSON.stringify(k1) === JSON.stringify(k2), `ddl=${k1.filter((x) => !k2.includes(x))} drizzle=${k2.filter((x) => !k1.includes(x))}`);
    const [i1, i2] = [await idx(ddlPool), await idx(pool as unknown as Q)];
    check("indexes identical incl. the partial one-open index", JSON.stringify(i1) === JSON.stringify(i2), `ddl=${i1.filter((x) => !i2.includes(x))} drizzle=${i2.filter((x) => !i1.includes(x))}`);
    check("RLS enabled by the runtime DDL", (await rls(ddlPool)).every((r) => r.endsWith(":true")));
    const sqlFile = readFileSync(join(__dirname, "..", "supabase/add_ownership.sql"), "utf8");
    const norm = (s: string) => s.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim().toLowerCase();
    const have = sqlFile.split(";").map(norm);
    check("supabase/add_ownership.sql contains every runtime statement", ownershipStatements().every((s) => have.includes(norm(s))));
    check("DDL keeps the owner profile undeletable (ON DELETE RESTRICT)", /owner_profile_id[^,]*ON DELETE RESTRICT/i.test(OWNERSHIP_DDL));
    await ddlPool.end();
    // The drizzle DB also needs RLS (db:push does not enable it) — the lazy DDL does.
    const own = await import("../src/lib/ownership/db");
    check("lazy DDL applies cleanly on top of a db:push schema", await own.ensureOwnershipTables());
    check("…and enables RLS there too", (await rls(pool as unknown as Q)).every((r) => r.endsWith(":true")));
  }

  // -------------------------------------------------------------------------
  // Fixtures
  // -------------------------------------------------------------------------
  const PW = { early: "EarlyAdmin#1", owner: "OwnerPass#123", bob: "BobPass#12345", carol: "CarolPass#123", dave: "DavePass#1234" };
  const P = async (name: string, email: string, password: string | null, isAdmin: boolean) =>
    (
      await db
        .insert(schema.studentProfiles)
        .values({ name, email, passwordHash: password ? hashPassword(password) : null, isAdmin, onboardingCompleted: true, preferredLocale: "en" } as typeof schema.studentProfiles.$inferInsert)
        .returning()
    )[0];
  // An OLDER admin exists — bootstrap must still prefer ADMIN_EMAIL.
  const early = await P("Early Admin", "early@example.com", PW.early, true);
  const owner = await P("Olivia Owner", "owner@example.com", PW.owner, true);
  const bob = await P("Bob Admin", "bob@example.com", PW.bob, true);
  const carol = await P("Carol Admin", "carol@example.com", PW.carol, true);
  const dave = await P("Dave Student", "dave@example.com", PW.dave, false);
  const noPw = await P("No Password Admin", "nopw@example.com", null, true);

  const tokenFor = async (id: number) => {
    const [p] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, id));
    return signSessionToken({ id: p.id, passwordHash: p.passwordHash });
  };
  async function api(asId: number, body?: Record<string, unknown>) {
    await resetAllRateLimits();
    const cookie = `sb_session=${await tokenFor(asId)}`;
    const req = body
      ? new Request("http://localhost/api/admin/ownership", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) })
      : new Request("http://localhost/api/admin/ownership", { headers: { cookie } });
    const res = body ? await ownershipRoute.POST(req) : await ownershipRoute.GET(req);
    return { status: res.status, json: (await res.json()) as Record<string, any> };
  }
  const transferRow = async (id: number) => (await db.select().from(schema.ownershipTransfers).where(eq(schema.ownershipTransfers.id, id)))[0];
  const ownerRow = async () => (await db.select().from(schema.platformOwnership))[0];
  const isAdmin = async (id: number) => (await db.select({ a: schema.studentProfiles.isAdmin }).from(schema.studentProfiles).where(eq(schema.studentProfiles.id, id)))[0]?.a;

  // -------------------------------------------------------------------------
  section("Bootstrap + read access");
  // -------------------------------------------------------------------------
  {
    const r = await api(dave.id);
    check("non-admin → 403", r.status === 403);
    const g = await api(bob.id);
    check("admin can read ownership", g.status === 200);
    check("bootstrap picks ADMIN_EMAIL over the oldest admin", g.json.owner?.id === owner.id, JSON.stringify(g.json.owner));
    check("non-owner admin: isOwner=false and no admin list", g.json.isOwner === false && Array.isArray(g.json.admins) && g.json.admins.length === 0);
    check("checklist returned", Array.isArray(g.json.checklist) && g.json.checklist.length >= 8);
    const [row] = await db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.entityType, "ownership"), eq(schema.auditLogs.fieldChanged, "owner_bootstrap")));
    check("bootstrap is audited", Boolean(row));
    const again = await api(owner.id);
    check("owner sees isOwner + admins", again.json.isOwner === true && again.json.admins.length === 5);
    check("owner row source=bootstrap", (await ownerRow()).source === "bootstrap");
  }

  // -------------------------------------------------------------------------
  section("Start: authorization + validation");
  // -------------------------------------------------------------------------
  let t1 = 0;
  {
    const base = { action: "start", targetEmail: bob.email, confirm: "TRANSFER", password: PW.owner };
    check("non-owner admin cannot start (403 not_owner)", (await api(carol.id, { ...base, password: PW.carol })).json.code === "not_owner");
    check("student cannot start (403)", (await api(dave.id, base)).status === 403);
    check("missing TRANSFER phrase → 400", (await api(owner.id, { ...base, confirm: "transfer" })).json.code === "confirmation_required");
    check("wrong password → 403 invalid_password", (await api(owner.id, { ...base, password: "nope-nope" })).json.code === "invalid_password");
    const nonAdmin = await api(owner.id, { ...base, targetEmail: dave.email });
    const ghost = await api(owner.id, { ...base, targetEmail: "ghost@example.com" });
    check("non-admin target rejected", nonAdmin.status === 400 && nonAdmin.json.code === "invalid_target");
    check("unknown email gets the SAME answer (no account probing)", ghost.status === 400 && ghost.json.error === nonAdmin.json.error);
    check("cannot transfer to yourself", (await api(owner.id, { ...base, targetEmail: owner.email })).json.code === "invalid_target");
    // Default preferences (whose type list lacks "security") + in-app off:
    // security notices must still be recorded.
    await db.insert(schema.notificationPreferences).values({ profileId: bob.id, inApp: false });
    const ok = await api(owner.id, base);
    check("owner starts a transfer → pending", ok.status === 200 && ok.json.status === "pending", JSON.stringify(ok.json));
    t1 = ok.json.transferId;
    const second = await api(owner.id, { ...base, targetEmail: carol.email });
    check("second open transfer → 409 transfer_open", second.status === 409 && second.json.code === "transfer_open");
    const [n] = await db.select().from(schema.notifications).where(and(eq(schema.notifications.profileId, bob.id), eq(schema.notifications.type, "security")));
    check("target is notified in-app even with default/in-app-off preferences", Boolean(n) && n.link === "/#admin");
    const audits = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityType, "ownership"));
    check("no password ever lands in the audit log", audits.every((a) => !JSON.stringify(a).includes(PW.owner)));
  }

  // -------------------------------------------------------------------------
  section("Accept / confirm: parties, replay, races");
  // -------------------------------------------------------------------------
  {
    const view = await api(bob.id);
    check("target sees canAccept", view.json.openTransfer?.canAccept === true && view.json.openTransfer?.canConfirm === false);
    check("owner cannot confirm before the target accepts (409)", (await api(owner.id, { action: "confirm", transferId: t1, password: PW.owner })).status === 409);
    check("owner cannot accept for the target (403)", (await api(owner.id, { action: "accept", transferId: t1, password: PW.owner })).status === 403);
    check("a third admin cannot accept (403)", (await api(carol.id, { action: "accept", transferId: t1, password: PW.carol })).status === 403);
    check("target: wrong password → 403", (await api(bob.id, { action: "accept", transferId: t1, password: "wrong-pass" })).json.code === "invalid_password");
    const acc = await api(bob.id, { action: "accept", transferId: t1, password: PW.bob });
    check("target accepts → accepted", acc.status === 200 && acc.json.status === "accepted");
    check("replayed accept → 409", (await api(bob.id, { action: "accept", transferId: t1, password: PW.bob })).status === 409);
    check("ownership did NOT move on accept", (await ownerRow()).ownerProfileId === owner.id);
    check("owner now sees canConfirm", (await api(owner.id)).json.openTransfer?.canConfirm === true);

    // Two confirmations at the same time: exactly one wins.
    await resetAllRateLimits();
    const cookie = `sb_session=${await tokenFor(owner.id)}`;
    const mk = () =>
      ownershipRoute.POST(new Request("http://localhost/api/admin/ownership", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ action: "confirm", transferId: t1, password: PW.owner }) }));
    const results = await Promise.all([mk(), mk(), mk()]);
    const statuses = results.map((r) => r.status).sort();
    check("concurrent confirms: exactly one 200, the rest 409/403", statuses.filter((s) => s === 200).length === 1 && statuses.every((s) => s === 200 || s === 409 || s === 403), statuses.join(","));
    check("ownership moved to the target", (await ownerRow()).ownerProfileId === bob.id && (await ownerRow()).source === "transfer");
    check("transfer is completed, decided by the old owner", (await transferRow(t1)).status === "completed" && (await transferRow(t1)).decidedBy === owner.id);
    check("previous owner kept admin (retainAdmin default true)", (await isAdmin(owner.id)) === true);
    check("completed transfer cannot be cancelled (409)", (await api(owner.id, { action: "cancel", transferId: t1 })).status === 409 || (await api(owner.id, { action: "cancel", transferId: t1 })).status === 403);
    check("old owner can no longer start transfers (not_owner)", (await api(owner.id, { action: "start", targetEmail: carol.email, confirm: "TRANSFER", password: PW.owner })).json.code === "not_owner");
    check("new owner is recognised", (await api(bob.id)).json.isOwner === true);
    const both = await db.select().from(schema.notifications).where(eq(schema.notifications.type, "security"));
    check("both parties notified of completion", both.some((x) => x.profileId === owner.id) && both.filter((x) => x.profileId === bob.id).length >= 2);
    const [ownerAudit] = await db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.entityType, "ownership"), eq(schema.auditLogs.fieldChanged, "owner_profile_id")));
    check("owner change audited (old → new)", Boolean(ownerAudit));
  }

  // -------------------------------------------------------------------------
  section("Concurrent starts: the partial unique index allows one");
  // -------------------------------------------------------------------------
  {
    await resetAllRateLimits();
    const cookie = `sb_session=${await tokenFor(bob.id)}`;
    const mk = (email: string) =>
      ownershipRoute.POST(new Request("http://localhost/api/admin/ownership", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ action: "start", targetEmail: email, confirm: "TRANSFER", password: PW.bob }) }));
    const rs = await Promise.all([mk(carol.email), mk(owner.email), mk(early.email)]);
    const codes = rs.map((r) => r.status).sort();
    check("exactly one of three parallel starts succeeds", codes.filter((c) => c === 200).length === 1 && codes.filter((c) => c === 409).length === 2, codes.join(","));
    const open = (await api(bob.id)).json.openTransfer;
    check("the open transfer is cancellable by the owner", (await api(bob.id, { action: "cancel", transferId: open.id })).json.status === "cancelled");
    check("cancelled transfer cannot be accepted (409)", (await api(open.to.id, { action: "accept", transferId: open.id, password: open.to.id === carol.id ? PW.carol : open.to.id === owner.id ? PW.owner : PW.early })).status === 409);
  }

  // -------------------------------------------------------------------------
  section("Reject, expiry, admin without password");
  // -------------------------------------------------------------------------
  {
    const s = await api(bob.id, { action: "start", targetEmail: carol.email, confirm: "TRANSFER", password: PW.bob });
    check("carol cannot cancel (not the owner) → 403", (await api(carol.id, { action: "cancel", transferId: s.json.transferId })).status === 403);
    check("target rejects → rejected", (await api(carol.id, { action: "reject", transferId: s.json.transferId })).json.status === "rejected");
    check("owner cannot confirm a rejected transfer (409)", (await api(bob.id, { action: "confirm", transferId: s.json.transferId, password: PW.bob })).status === 409);

    const e = await api(bob.id, { action: "start", targetEmail: carol.email, confirm: "TRANSFER", password: PW.bob });
    await db.update(schema.ownershipTransfers).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.ownershipTransfers.id, e.json.transferId));
    const g = await api(bob.id);
    check("stale transfer expires lazily on the next request", (await transferRow(e.json.transferId)).status === "expired" && g.json.openTransfer === null);
    check("expired transfer cannot be accepted (409)", (await api(carol.id, { action: "accept", transferId: e.json.transferId, password: PW.carol })).status === 409);

    const n = await api(bob.id, { action: "start", targetEmail: noPw.email, confirm: "TRANSFER", password: PW.bob });
    check("target without a password cannot accept (password_not_set)", (await api(noPw.id, { action: "accept", transferId: n.json.transferId, password: "anything1" })).json.code === "password_not_set");
    await api(bob.id, { action: "cancel", transferId: n.json.transferId });
  }

  // -------------------------------------------------------------------------
  section("Admin role management (owner only)");
  // -------------------------------------------------------------------------
  {
    check("non-owner admin cannot grant (403)", (await api(carol.id, { action: "grantAdmin", email: dave.email, password: PW.carol })).json.code === "not_owner");
    const g = await api(bob.id, { action: "grantAdmin", email: dave.email, password: PW.bob });
    check("owner grants admin", g.status === 200 && (await isAdmin(dave.id)) === true);
    const [a] = await db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.entityType, "admin_role"), eq(schema.auditLogs.entityId, dave.id)));
    check("grant audited", Boolean(a));
    check("owner cannot revoke themselves", (await api(bob.id, { action: "revokeAdmin", email: bob.email, password: PW.bob })).json.code === "invalid_target");
    const s = await api(bob.id, { action: "start", targetEmail: dave.email, confirm: "TRANSFER", password: PW.bob });
    check("cannot revoke the recipient of an open transfer (409)", (await api(bob.id, { action: "revokeAdmin", email: dave.email, password: PW.bob })).status === 409);
    await api(bob.id, { action: "cancel", transferId: s.json.transferId });
    check("owner revokes admin", (await api(bob.id, { action: "revokeAdmin", email: dave.email, password: PW.bob })).status === 200 && (await isAdmin(dave.id)) === false);
    check("revoked admin loses access immediately (403)", (await api(dave.id)).status === 403);
  }

  // -------------------------------------------------------------------------
  section("Transfer without keeping admin + owner delete protection");
  // -------------------------------------------------------------------------
  {
    const s = await api(bob.id, { action: "start", targetEmail: carol.email, confirm: "TRANSFER", password: PW.bob, retainAdmin: false });
    await api(carol.id, { action: "accept", transferId: s.json.transferId, password: PW.carol });
    const c = await api(bob.id, { action: "confirm", transferId: s.json.transferId, password: PW.bob });
    check("confirm with retainAdmin=false", c.status === 200 && (await ownerRow()).ownerProfileId === carol.id);
    check("previous owner is no longer admin", (await isAdmin(bob.id)) === false);
    check("previous owner loses admin API access at once (403)", (await api(bob.id)).status === 403);

    await resetAllRateLimits();
    const del = (asId: number, target: number) =>
      tokenFor(asId).then((tok) =>
        profileRoute.DELETE(new Request(`http://localhost/api/profiles/${target}`, { method: "DELETE", headers: { cookie: `sb_session=${tok}` } }), { params: Promise.resolve({ id: String(target) }) })
      );
    const blocked = await del(owner.id, carol.id);
    check("deleting the owner's profile → 409 owner_protected", blocked.status === 409 && (await blocked.json()).code === "owner_protected");
    const ok = await del(carol.id, early.id);
    check("deleting another profile still works", ok.status === 200);
  }

  // -------------------------------------------------------------------------
  section("Seed never undoes a transfer");
  // -------------------------------------------------------------------------
  {
    // ADMIN_EMAIL (owner@example.com) is not the owner any more; demote it and
    // run the seed: it must not come back as admin, and without ADMIN_NAME
    // the name is left alone.
    await db.update(schema.studentProfiles).set({ isAdmin: false }).where(eq(schema.studentProfiles.id, owner.id));
    const { seedDatabase } = await import("../src/db/seed");
    const log = console.log;
    console.log = () => undefined;
    try {
      await seedDatabase();
    } finally {
      console.log = log;
    }
    const [o] = await db.select().from(schema.studentProfiles).where(eq(schema.studentProfiles.id, owner.id));
    check("seed does not re-promote ADMIN_EMAIL after a transfer", o.isAdmin === false);
    check("seed does not rename the account when ADMIN_NAME is unset", o.name === "Olivia Owner");
    check("platform owner unchanged by the seed", (await ownerRow()).ownerProfileId === carol.id);
    const seedSrc = readFileSync(join(__dirname, "..", "src/db/seed.ts"), "utf8");
    check("no personal defaults in the seed", !/hushnudbek/i.test(seedSrc));
    check("no 'promote the first profile' fallback", !/Promoted profile/.test(seedSrc));
  }
}

main()
  .catch((err) => {
    failed++;
    console.error("\nFATAL:", err);
  })
  .finally(async () => {
    console.log(`\n${passed} passed, ${failed} failed`);
    await appPool?.end().catch(() => undefined);
    await pg?.stop().catch(() => undefined);
    process.exit(failed ? 1 : 0);
  });
