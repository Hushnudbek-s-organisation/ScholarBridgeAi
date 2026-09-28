/**
 * Portability + config safety + RLS checks.
 *
 *  1. appUrl: normalisation, env priority, open-redirect refusal, Host-header
 *     hygiene; no hardcoded deploy domains left in src/.
 *  2. Config allowlist (lib/configPortability): secrets/internal keys are
 *     never editable/exportable; values are validated.
 *  3. Real routes against embedded PostgreSQL: PUT /api/admin/config,
 *     export (no secrets), import (dry run, apply, rejects), authorization.
 *  4. supabase/enable_rls.sql against a Supabase-like role setup: anon loses
 *     access to private tables, keeps catalog read, the owner (app) keeps
 *     full access, and the script is idempotent.
 *
 * Run: npm run test:portability
 */
import EmbeddedPostgres from "embedded-postgres";
import { execSync } from "child_process";
import { readFileSync, readdirSync, rmSync, statSync } from "fs";
import { join } from "path";

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

const PORT = 55444;
const DB = "sbport";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const PG_DIR = "/tmp/sb-port-pg";
const ROOT = join(__dirname, "..");

let pg: EmbeddedPostgres | null = null;
const pools: { end: () => Promise<void> }[] = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

async function main() {
  // -------------------------------------------------------------------------
  section("appUrl (pure)");
  // -------------------------------------------------------------------------
  const u = await import("../src/lib/appUrl");
  check("bare host → https, trailing slash dropped", u.normalizeAppUrl("example.org/") === "https://example.org");
  check("sub-path kept, query/fragment dropped", u.normalizeAppUrl("https://example.org/app/?x=1#y") === "https://example.org/app");
  check("non-http schemes refused", u.normalizeAppUrl("javascript:alert(1)") === "" && u.normalizeAppUrl("ftp://example.org") === "");
  check("credentials in URL refused", u.normalizeAppUrl("https://user:pw@example.org") === "");
  check("priority APP_URL > NEXT_PUBLIC_APP_URL > RENDER_EXTERNAL_URL > VERCEL", u.configuredAppUrl({ APP_URL: "a.example", NEXT_PUBLIC_APP_URL: "b.example", RENDER_EXTERNAL_URL: "https://c.example" }) === "https://a.example" && u.configuredAppUrl({ RENDER_EXTERNAL_URL: "https://c.example", VERCEL_PROJECT_PRODUCTION_URL: "d.example" }) === "https://c.example" && u.configuredAppUrl({ VERCEL_PROJECT_PRODUCTION_URL: "d.example" }) === "https://d.example");
  check("invalid APP_URL falls through to the next source", u.configuredAppUrl({ APP_URL: "javascript:x", RENDER_EXTERNAL_URL: "https://c.example" }) === "https://c.example");
  check("nothing configured → empty (no invented domain)", u.configuredAppUrl({}) === "" && u.appUrlSource({}) === null);
  check("appUrlSource names the winning variable", u.appUrlSource({ NEXT_PUBLIC_APP_URL: "b.example" }) === "NEXT_PUBLIC_APP_URL");
  check("absoluteAppUrl joins app-relative paths", u.absoluteAppUrl("/tg?x=1", "https://example.org/") === "https://example.org/tg?x=1");
  check("absoluteAppUrl refuses absolute / protocol-relative / backslash paths (no open redirect)", ["https://evil.example", "//evil.example", "/\\evil.example", "tg"].every((p) => u.absoluteAppUrl(p, "https://example.org") === null));
  check("absoluteAppUrl without a base → null", u.absoluteAppUrl("/tg", "") === null);
  check("originFromHeaders rejects header injection", u.originFromHeaders("evil.example/path", "https") === "" && u.originFromHeaders("a b", "https") === "");
  check("originFromHeaders defaults to https, honours http", u.originFromHeaders("example.org", null) === "https://example.org" && u.originFromHeaders("localhost:3000", "http") === "http://localhost:3000");

  section("No hardcoded deploy domains in src/");
  {
    const banned = [/onrender\.com/, /[a-z]{20}\.supabase\.co/, /scholarbridge\.uz/, /vercel\.app/];
    const hits: string[] = [];
    for (const file of walk(join(ROOT, "src"))) {
      const text = readFileSync(file, "utf8");
      for (const re of banned) if (re.test(text)) hits.push(`${file.replace(ROOT + "/", "")} ~ ${re.source}`);
    }
    check("no deploy/Supabase-project/brand-domain URLs", hits.length === 0, hits.join(", "));
  }

  // -------------------------------------------------------------------------
  section("Config allowlist (pure)");
  // -------------------------------------------------------------------------
  process.env.DATABASE_URL = URL_; // config.ts imports the (lazily connecting) pool
  const cp = await import("../src/lib/configPortability");
  const internal = ["telegram_bot_token", "telegram_settings", "notification_last_sweep", "session_secret", "ai_api_key", "stripe_secret", "feature_x_token"];
  check("secret/internal keys are not editable", internal.every((k) => !cp.isPortableConfigKey(k)), internal.filter((k) => cp.isPortableConfigKey(k)).join(","));
  check("business keys are editable", ["payment_premium_price_uzs", "ai_provider_essay", "ai_fallback_provider", "ai_disabled_providers", "nav_hidden_items", "journey_steps", "section_help", "feature_essay_review"].every(cp.isPortableConfigKey));
  const v = cp.validateConfigValue;
  check("provider keys accept chat providers only", v("ai_provider_essay", "groq") === null && v("ai_provider_essay", "gemini") !== null && v("ai_default_provider", "nope") !== null);
  check("fallback accepts none or a chat provider", v("ai_fallback_provider", "none") === null && v("ai_fallback_provider", "openai") === null && v("ai_fallback_provider", "x") !== null);
  check("disabled list must be a JSON array of ids", v("ai_disabled_providers", '["groq"]') === null && v("ai_disabled_providers", '["evil"]') !== null && v("ai_disabled_providers", "groq") !== null);
  check("integers / currency / scope / feature tiers validated", v("payment_premium_days", "30") === null && v("payment_premium_days", "-1") !== null && v("payment_currency", "usd") !== null && v("refresh_default_scope", "x") !== null && v("feature_essay_review", "premium") === null && v("feature_essay_review", "vip") !== null);
  check("JSON keys must be valid JSON", v("nav_hidden_items", "[]") === null && v("nav_hidden_items", "[") !== null);
  check("branding URLs: empty, /relative or https only", v("branding_logo_url", "") === null && v("branding_logo_url", "/x.png") === null && v("branding_logo_url", "https://cdn.example/x.png") === null && v("branding_logo_url", "javascript:alert(1)") !== null && v("branding_logo_url", "//evil.example/x") !== null && v("branding_logo_url", "http://cdn.example/x.png") !== null);
  check("oversized values refused", v("section_help", JSON.stringify("x".repeat(20_001))) !== null);
  {
    const exp = cp.buildConfigExport(
      [
        { key: "payment_premium_days", value: "45" },
        { key: "telegram_bot_token", value: "v1:ENCRYPTED" },
        { key: "notification_last_sweep", value: "2026-01-01" },
        { key: "ai_provider_essay", value: "gemini" },
      ],
      [{ provider: "groq", model: "llama-x" }, { provider: "evil", model: "m" }],
      new Date("2026-01-02T00:00:00Z")
    );
    check("export keeps valid portable keys only", JSON.stringify(exp.config) === JSON.stringify({ payment_premium_days: "45" }), JSON.stringify(exp.config));
    check("export carries models, not keys", JSON.stringify(exp.aiModels) === JSON.stringify({ groq: "llama-x" }) && !JSON.stringify(exp).includes("ENCRYPTED"));
    const plan = cp.planConfigImport({ ...exp, config: { ...exp.config, telegram_bot_token: "x", ai_provider_essay: "gemini" }, aiModels: { groq: "llama-y", evil: "m", openai: "bad model!" } }, { payment_premium_days: "45" }, { groq: "llama-x" });
    check("import plan: unchanged / rejected / model change", plan.ok && plan.unchanged.join() === "payment_premium_days" && plan.changes.length === 0 && plan.rejected.map((r) => r.key).sort().join() === ["ai_provider_essay", "aiModels.evil", "aiModels.openai", "telegram_bot_token"].sort().join() && plan.modelChanges.length === 1 && plan.modelChanges[0].to === "llama-y");
    check("import refuses foreign files and unknown versions", !cp.planConfigImport({ format: "x" }, {}, {}).ok && !cp.planConfigImport({ ...exp, version: 99 }, {}, {}).ok && !cp.planConfigImport(null, {}, {}).ok);
  }

  // -------------------------------------------------------------------------
  // Real database
  // -------------------------------------------------------------------------
  rmSync(PG_DIR, { recursive: true, force: true });
  pg = new EmbeddedPostgres({ databaseDir: PG_DIR, user: "test", password: "test", port: PORT, persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: URL_ }, encoding: "utf8", stdio: ["ignore", "ignore", "pipe"], timeout: 240000 });
  console.log(`\nPostgres :${PORT}, schema pushed from src/db/schema.ts`);

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = "portability-integration-secret-0123456789abcdef";
  process.env.AI_KEYS_ENCRYPTION_SECRET = "portability-keys-secret-0123456789abcdef";
  for (const k of ["ADMIN_EMAIL", "ADMIN_NAME", "ADMIN_PASSWORD", "PLATFORM_OWNER_EMAIL", "TELEGRAM_BOT_TOKEN"]) delete process.env[k];
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  pools.push(pool as unknown as { end: () => Promise<void> });
  (pool as unknown as { on: (e: string, f: () => void) => void }).on("error", () => undefined);
  const schema = await import("../src/db/schema");
  const { signSessionToken } = await import("../src/lib/auth");
  const { invalidateConfigCache } = await import("../src/lib/config");
  const { upsertCredential } = await import("../src/lib/ai/credentials");
  const { saveBotToken } = await import("../src/lib/telegram/settings");
  const configRoute = await import("../src/app/api/admin/config/route");
  const exportRoute = await import("../src/app/api/admin/config/export/route");
  const importRoute = await import("../src/app/api/admin/config/import/route");
  const { resetRateLimits } = await import("../src/lib/rate-limit");
  const { eq } = await import("drizzle-orm");

  const mk = async (email: string, isAdmin: boolean) => {
    const [p] = await db
      .insert(schema.studentProfiles)
      .values({ name: email.split("@")[0], email, passwordHash: "scrypt$x$y", isAdmin, onboardingCompleted: true, preferredLocale: "en" } as typeof schema.studentProfiles.$inferInsert)
      .returning();
    return { id: p.id, cookie: `sb_session=${await signSessionToken({ id: p.id, passwordHash: p.passwordHash })}` };
  };
  const admin = await mk("admin@example.com", true);
  const user = await mk("user@example.com", false);
  const json = (cookie: string, method: string, url: string, body?: unknown) =>
    new Request(`http://localhost${url}`, { method, headers: { cookie, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

  // Secrets that must never leak through export.
  await upsertCredential("groq", { apiKey: "gsk_SECRETKEY_should_never_leak_123456", model: "llama-portable" });
  await saveBotToken("123456789:AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQr");

  section("PUT /api/admin/config");
  {
    resetRateLimits();
    const r1 = await configRoute.PUT(json(user.cookie, "PUT", "/api/admin/config", { key: "payment_premium_days", value: "40" }));
    check("non-admin → 403", r1.status === 403, String(r1.status));
    const r2 = await configRoute.PUT(json(admin.cookie, "PUT", "/api/admin/config", { key: "telegram_bot_token", value: "attacker" }));
    check("cannot overwrite the Telegram token through generic config (400)", r2.status === 400, String(r2.status));
    const [tok] = await db.select().from(schema.appConfig).where(eq(schema.appConfig.key, "telegram_bot_token"));
    check("token row untouched", !!tok && tok.value !== "attacker");
    const r3 = await configRoute.PUT(json(admin.cookie, "PUT", "/api/admin/config", { key: "ai_provider_essay", value: "gemini" }));
    check("voice-only provider for a chat task refused (400)", r3.status === 400, String(r3.status));
    const r4 = await configRoute.PUT(json(admin.cookie, "PUT", "/api/admin/config", { key: "payment_premium_days", value: "40" }));
    check("valid change saved (200)", r4.status === 200, String(r4.status));
    const audits = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.fieldChanged, "payment_premium_days"));
    check("change audited with old → new", audits.length === 1 && audits[0].newValue === "40" && audits[0].entityType === "config", JSON.stringify(audits.map((a) => [a.oldValue, a.newValue])));
  }

  section("GET /api/admin/config/export");
  let exported: Record<string, unknown> = {};
  {
    const r0 = await exportRoute.GET(json(user.cookie, "GET", "/api/admin/config/export"));
    check("non-admin → 403", r0.status === 403, String(r0.status));
    const r = await exportRoute.GET(json(admin.cookie, "GET", "/api/admin/config/export"));
    const text = await r.text();
    exported = JSON.parse(text);
    check("200 + attachment + no-store", r.status === 200 && /attachment/.test(r.headers.get("content-disposition") ?? "") && r.headers.get("cache-control") === "no-store");
    check("contains the saved setting and the AI model", (exported.config as Record<string, string>).payment_premium_days === "40" && (exported.aiModels as Record<string, string>).groq === "llama-portable");
    const leaks = ["gsk_SECRETKEY", "AAbbCCdd", "telegram_bot_token", "v1:", "scrypt$", "portability-keys-secret", "portability-integration-secret"].filter((s) => text.includes(s));
    check("no API key, bot token, encrypted blob, password hash or env secret in the file", leaks.length === 0, leaks.join(","));
  }

  section("POST /api/admin/config/import");
  {
    resetRateLimits();
    const payload = { ...exported, config: { ...(exported.config as object), payment_premium_days: "55", ai_provider_essay: "groq", telegram_bot_token: "attacker" }, aiModels: { groq: "llama-imported" } };
    const r0 = await importRoute.POST(json(user.cookie, "POST", "/api/admin/config/import", { payload }));
    check("non-admin → 403", r0.status === 403, String(r0.status));
    const r1 = await importRoute.POST(json(admin.cookie, "POST", "/api/admin/config/import", { payload }));
    const j1 = await r1.json();
    invalidateConfigCache();
    const [days1] = await db.select().from(schema.appConfig).where(eq(schema.appConfig.key, "payment_premium_days"));
    check("dry run is the default and writes nothing", r1.status === 200 && j1.dryRun === true && days1.value === "40", JSON.stringify({ s: r1.status, d: days1?.value }));
    check("dry run reports changes and rejects the token key", j1.plan.changes.length === 2 && j1.plan.rejected.some((x: { key: string }) => x.key === "telegram_bot_token") && j1.plan.modelChanges.length === 1);
    const r2 = await importRoute.POST(json(admin.cookie, "POST", "/api/admin/config/import", { payload, dryRun: false }));
    const j2 = await r2.json();
    const rows = Object.fromEntries((await db.select().from(schema.appConfig)).map((x) => [x.key, x.value]));
    const [cred] = await db.select().from(schema.aiProviderCredentials).where(eq(schema.aiProviderCredentials.provider, "groq"));
    check("apply writes the valid changes", r2.status === 200 && j2.applied === 3 && rows.payment_premium_days === "55" && rows.ai_provider_essay === "groq" && cred.model === "llama-imported", JSON.stringify({ s: r2.status, a: j2.applied }));
    check("apply never writes rejected keys; key stays encrypted and intact", rows.telegram_bot_token !== "attacker" && !!cred.apiKeyEnc && !cred.apiKeyEnc.includes("gsk_"));
    const audits = await db.select().from(schema.auditLogs);
    check("each applied change audited", audits.filter((a) => (a.source ?? "").startsWith("import:admin:")).length === 3);
    const bad = await importRoute.POST(json(admin.cookie, "POST", "/api/admin/config/import", { payload: { format: "other" }, dryRun: false }));
    check("foreign file → 400", bad.status === 400, String(bad.status));
  }

  section("Encryption-secret rotation keeps the panel-stored Telegram token");
  {
    const { getBotToken, invalidateTelegramSettings } = await import("../src/lib/telegram/settings");
    const oldSecret = process.env.AI_KEYS_ENCRYPTION_SECRET!;
    const [before] = await db.select().from(schema.appConfig).where(eq(schema.appConfig.key, "telegram_bot_token"));
    process.env.AI_KEYS_ENCRYPTION_SECRET = "portability-rotated-secret-abcdef0123456789";
    process.env.AI_KEYS_ENCRYPTION_SECRET_PREVIOUS = oldSecret;
    invalidateTelegramSettings();
    const tok = await getBotToken();
    check("token still readable via the previous secret", tok.source === "admin" && tok.token === "123456789:AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQr", tok.source);
    const [after] = await db.select().from(schema.appConfig).where(eq(schema.appConfig.key, "telegram_bot_token"));
    check("…and re-encrypted with the current secret", after.value !== before.value && after.value.startsWith("v1:") === before.value.startsWith("v1:"));
    delete process.env.AI_KEYS_ENCRYPTION_SECRET_PREVIOUS;
    invalidateTelegramSettings();
    const tok2 = await getBotToken();
    check("readable with only the new secret afterwards", tok2.source === "admin" && tok2.token === tok.token);
  }

  // -------------------------------------------------------------------------
  section("supabase/enable_rls.sql (Supabase-like roles)");
  // -------------------------------------------------------------------------
  {
    const { seedDatabase } = await import("../src/db/seed");
    const quiet = console.log;
    console.log = () => undefined;
    try {
      await seedDatabase();
    } finally {
      console.log = quiet;
    }
    const { Pool } = await import("pg");
    const su = new Pool({ connectionString: URL_ });
    pools.push(su);
    await su.query(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE app LOGIN PASSWORD 'app' NOSUPERUSER`);
    const { rows: tables } = await su.query<{ relname: string }>(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'`);
    const { rows: seqs } = await su.query<{ relname: string }>(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S'`);
    await su.query(`GRANT USAGE ON SCHEMA public TO anon, authenticated, app; GRANT CREATE ON SCHEMA public TO app`);
    for (const t of tables) await su.query(`ALTER TABLE public."${t.relname}" OWNER TO app`);
    for (const s of seqs) await su.query(`ALTER SEQUENCE public."${s.relname}" OWNER TO app`);
    // Supabase's default: the public roles get everything on public tables.
    await su.query(`GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated`);
    // A table owned by someone else must be skipped, not fail the script.
    await su.query(`CREATE TABLE public.foreign_owned (id int)`);

    const asRole = async (role: string, sql: string) => {
      const c = await su.connect();
      try {
        await c.query(`SET ROLE ${role}`);
        return { ok: true as const, rows: (await c.query(sql)).rows };
      } catch (err) {
        return { ok: false as const, error: (err as Error).message };
      } finally {
        await c.query("RESET ROLE").catch(() => undefined);
        c.release();
      }
    };
    const before = await asRole("anon", "SELECT password_hash FROM student_profiles");
    check("baseline: anon CAN read password hashes (the problem being fixed)", before.ok && before.rows.length >= 2);

    const appPool = new Pool({ connectionString: `postgresql://app:app@127.0.0.1:${PORT}/${DB}` });
    pools.push(appPool);
    const sql = readFileSync(join(ROOT, "supabase/enable_rls.sql"), "utf8");
    let ran = true;
    try {
      await appPool.query(sql);
      await appPool.query(sql); // idempotent
    } catch (err) {
      ran = false;
      console.log("   ", (err as Error).message);
    }
    check("script runs twice as the app role without error", ran);

    const { rows: rls } = await su.query<{ relname: string; relrowsecurity: boolean }>(`SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND c.relname <> 'foreign_owned'`);
    check("RLS enabled on every app table", rls.length === tables.length && rls.every((r) => r.relrowsecurity), rls.filter((r) => !r.relrowsecurity).map((r) => r.relname).join(","));
    const after = await asRole("anon", "SELECT password_hash FROM student_profiles");
    check("anon can no longer read student_profiles (permission denied)", !after.ok && /permission denied/.test(after.error), after.ok ? `${after.rows.length} rows` : after.error);
    const tg = await asRole("authenticated", "SELECT * FROM telegram_links");
    check("authenticated cannot read telegram_links (permission denied)", !tg.ok && /permission denied/.test(tg.error), tg.ok ? "readable" : tg.error);
    const write = await asRole("anon", "INSERT INTO app_config (key, value) VALUES ('x','y')");
    check("anon cannot write app_config", !write.ok && /permission denied/.test(write.error));
    const owned = (await su.query(`SELECT count(*)::int AS n FROM universities`)).rows[0].n as number;
    const cat = await asRole("anon", "SELECT count(*)::int AS n FROM universities");
    const cat2 = await asRole("anon", "SELECT count(*)::int AS n FROM scholarships");
    check("public catalog stays readable by anon (universities, scholarships)", owned > 0 && cat.ok && cat.rows[0].n === owned && cat2.ok && cat2.rows[0].n > 0, JSON.stringify({ owned, cat, cat2 }));
    const catWrite = await asRole("anon", "UPDATE universities SET name = 'x'");
    check("catalog is read-only for anon", !catWrite.ok);
    const appRead = await appPool.query(`SELECT count(*)::int AS n FROM student_profiles`);
    await appPool.query(`INSERT INTO app_config (key, value) VALUES ('rls_probe','1')`);
    check("the app (table owner) keeps full read/write access", appRead.rows[0].n >= 2);
    const skipped = (await su.query(`SELECT relrowsecurity FROM pg_class WHERE relname='foreign_owned'`)).rows[0].relrowsecurity;
    check("tables owned by another role are skipped", skipped === false);
  }
}

main()
  .catch((err) => {
    failed++;
    console.error("\nFATAL:", err);
  })
  .finally(async () => {
    console.log(`\n${passed} passed, ${failed} failed`);
    for (const p of pools.reverse()) await p.end().catch(() => undefined);
    await pg?.stop().catch(() => undefined);
    process.exit(failed ? 1 : 0);
  });
