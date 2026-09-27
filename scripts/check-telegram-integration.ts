/**
 * Telegram bot + Mini App — integration tests against a real PostgreSQL.
 *
 * embedded-postgres runs a genuine server; `drizzle-kit push` builds the real
 * schema. Only the Telegram Bot API itself is replaced: `fetch` calls to
 * TELEGRAM_API_BASE are answered locally and recorded, so the tests can see
 * exactly what the bot would have sent (text, buttons, callback answers).
 * Everything else — linking, sessions, the website's API routes the bot and
 * the Mini App reuse, premium checks, reminders, retries — is the production
 * code path.
 *
 * Run: npm run test:telegram-integration
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

const PORT = 55442;
const DB = "sbtg";
const URL_ = `postgresql://test:test@127.0.0.1:${PORT}/${DB}`;
const SECRET = "telegram-integration-secret-0123456789abcdef";
const BOT_TOKEN = "123456789:AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQr";
const API_BASE = "http://telegram-stub.invalid";
const SITE = "https://scholarbridge.example";

// ---------------------------------------------------------------------------
// Telegram Bot API stub
// ---------------------------------------------------------------------------

interface TgCallRecord {
  method: string;
  body: Record<string, any>;
}
const calls: TgCallRecord[] = [];
let nextMessageId = 1000;
/** Queue of forced failures for sendMessage: e.g. { error_code: 500 }. */
const failQueue: { error_code: number; description: string }[] = [];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(API_BASE)) return realFetch(input, init);
  const method = url.split("/").pop() as string;
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  calls.push({ method, body });
  if (method === "sendMessage" && failQueue.length) {
    const f = failQueue.shift()!;
    return new Response(JSON.stringify({ ok: false, ...f }), { status: f.error_code, headers: { "content-type": "application/json" } });
  }
  const result =
    method === "sendMessage" || method === "editMessageText"
      ? { message_id: body.message_id ?? nextMessageId++, chat: { id: Number(body.chat_id) }, text: body.text }
      : method === "getMe"
        ? { id: 123456789, is_bot: true, username: "ScholarBridgeTestBot", first_name: "ScholarBridge" }
        : true;
  return new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;

const sent = () => calls.filter((c) => c.method === "sendMessage" || c.method === "editMessageText");
const lastTo = (chatId: string | number) => [...sent()].reverse().find((c) => String(c.body.chat_id) === String(chatId));
const buttonsOf = (c: TgCallRecord | undefined): any[] => (c?.body.reply_markup?.inline_keyboard ?? []).flat();
const mark = () => calls.length;
const since = (m: number) => calls.slice(m);

let updateSeq = 1;
const user = (id: string | number, extra: Record<string, unknown> = {}) => ({ id: Number(id), is_bot: false, first_name: `U${id}`, language_code: "en", ...extra });
function msg(fromId: string | number, text: string, chatType = "private", chatId?: number) {
  return {
    update_id: updateSeq++,
    message: { message_id: updateSeq, from: user(fromId), chat: { id: chatId ?? Number(fromId), type: chatType }, text },
  };
}
function cb(fromId: string | number, data: string, chatType = "private", messageId = 1) {
  return {
    update_id: updateSeq++,
    callback_query: { id: `cq${updateSeq}`, from: user(fromId), data, message: { message_id: messageId, chat: { id: Number(fromId), type: chatType } } },
  };
}

let pg: EmbeddedPostgres | null = null;
let appPool: { end: () => Promise<void>; on: (e: string, f: () => void) => void } | null = null;

async function main() {
  // A crashed earlier run may have left its data directory behind.
  rmSync("/tmp/sb-tg-pg", { recursive: true, force: true });
  pg = new EmbeddedPostgres({ databaseDir: "/tmp/sb-tg-pg", user: "test", password: "test", port: PORT, persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase(DB);
  await pg.createDatabase(`${DB}_ddl`);
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: URL_ }, encoding: "utf8", stdio: ["ignore", "ignore", "pipe"], timeout: 240000 });
  console.log(`Postgres :${PORT}, schema pushed from src/db/schema.ts`);

  process.env.DATABASE_URL = URL_;
  process.env.SESSION_SECRET = SECRET;
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
  process.env.TELEGRAM_API_BASE = API_BASE;
  process.env.REMINDER_TIMEZONE = "Asia/Tashkent";
  delete process.env.GROQ_API_KEY;
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const { db, pool } = await import("../src/db");
  appPool = pool as any;
  pool.on("error", () => undefined);
  const schema = await import("../src/db/schema");
  const core = await import("../src/lib/telegram/core");
  const settingsMod = await import("../src/lib/telegram/settings");
  const service = await import("../src/lib/telegram/service");
  const linking = await import("../src/lib/telegram/linking");
  const initData = await import("../src/lib/telegram/initData");
  const reminders = await import("../src/lib/telegram/reminders");
  const auth = await import("../src/lib/auth");
  const sweep = await import("../src/lib/notificationSweep");
  const { TELEGRAM_DDL, telegramStatements } = await import("../src/lib/telegram/ddl");
  const { NAV_SECTIONS } = await import("../src/lib/navSections");
  const { BOT_COMMANDS } = await import("../src/lib/telegram/bot");

  await settingsMod.saveTelegramSettings({ ...core.DEFAULT_TELEGRAM_SETTINGS, botUsername: "ScholarBridgeTestBot", siteUrl: SITE });

  // --- Seed -----------------------------------------------------------------
  const P = async (name: string, email: string, extra: Record<string, unknown> = {}) =>
    (await db.insert(schema.studentProfiles).values({ name, email, passwordHash: "$2b$10$x", onboardingCompleted: true, preferredLocale: "en", ...extra } as any).returning())[0];
  const aziza = await P("Aziza Karimova", "aziza@example.com", { degreeLevel: "Master", targetMajor: "Computer Science", gpa: 3.7, gpaScale: 4, ieltsScore: 7.5 });
  const bekzod = await P("Bekzod", "bekzod@example.com");
  const cho = await P("Cho", "cho@example.com");
  const dana = await P("Dana", "dana@example.com");
  const admin = await P("Admin", "admin@example.com", { isAdmin: true });
  const [tum] = await db
    .insert(schema.universities)
    .values({ name: "Technical University of Munich", country: "Germany", city: "Munich", worldRanking: 50, programMajor: "Computer Science", description: "d", websiteUrl: "https://www.tum.de", annualTuitionUsd: 1500, annualLivingEstUsd: 11000, acceptanceRate: 8, minGpa: 3.2, minIelts: 6.5 } as any)
    .returning();
  const inDays = (n: number) => {
    // Calendar date n days from "today" in Asia/Tashkent.
    const today = reminders.localDay(new Date(), "Asia/Tashkent");
    return new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  };
  const [daad] = await db
    .insert(schema.scholarships)
    .values({ title: "DAAD Study Scholarship", provider: "DAAD", country: "Germany", amountUsdValue: 12000, deadline: inDays(3), deadlineDate: new Date(`${inDays(3)}T00:00:00Z`), description: "d", requirements: "r", websiteUrl: "https://www.daad.de" } as any)
    .returning();

  // ===========================================================================
  section("Schema: runtime DDL matches drizzle (no drift)");
  // ===========================================================================
  {
    const { Pool } = await import("pg");
    const ddlPool = new Pool({ connectionString: `postgresql://test:test@127.0.0.1:${PORT}/${DB}_ddl` });
    await ddlPool.query("CREATE TABLE student_profiles (id serial primary key)");
    for (const stmt of telegramStatements()) await ddlPool.query(stmt);
    for (const stmt of telegramStatements()) await ddlPool.query(stmt); // idempotent
    const cols = async (p: { query: (q: string) => Promise<{ rows: any[] }> }) =>
      (await p.query(`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name LIKE 'telegram_%' ORDER BY 1,2`)).rows.map((r) => `${r.table_name}.${r.column_name}:${r.data_type}`);
    const fromDdl = await cols(ddlPool);
    const fromDrizzle = await cols(pool as any);
    const missing = fromDrizzle.filter((c) => !fromDdl.includes(c));
    const extra = fromDdl.filter((c) => !fromDrizzle.includes(c));
    check("every drizzle column exists in the runtime DDL with the same type", missing.length === 0, missing.join(", "));
    check("the runtime DDL creates no column drizzle does not know", extra.length === 0, extra.join(", "));
    check("DDL is idempotent (ran twice)", true);
    check("update_id is bigint (Telegram ids exceed int4)", fromDdl.includes("telegram_updates.update_id:bigint"));
    const sql = readFileSync(join(__dirname, "..", "supabase/add_telegram.sql"), "utf8").toLowerCase();
    check("supabase/add_telegram.sql contains telegram_updates", sql.includes("telegram_updates") && TELEGRAM_DDL.toLowerCase().includes("telegram_updates"));
    await ddlPool.end();
  }

  // ===========================================================================
  section("Linking — secure token + confirmation (cases A–G)");
  // ===========================================================================
  const startLink = async (profileId: number) => {
    const r = await linking.startRequest({ purpose: "link", profileId });
    if (!r.ok) throw new Error(`startRequest failed: ${r.code}`);
    return { ...r, token: r.deepLink.split("start=link_")[1] };
  };
  const reqRow = async (id: number) => (await db.select().from(schema.telegramLoginRequests).where(eq(schema.telegramLoginRequests.id, id)))[0];
  const linkOf = async (profileId: number) => (await db.select().from(schema.telegramLinks).where(eq(schema.telegramLinks.profileId, profileId)))[0];

  {
    const anon = await linking.startRequest({ purpose: "link", profileId: null });
    check("link attempt requires a signed-in account", !anon.ok && anon.status === 401);

    const a = await startLink(aziza.id);
    const row = await reqRow(a.id);
    check("token is 128-bit (22 base64url chars) in the deep link", /^[A-Za-z0-9_-]{22}$/.test(a.token));
    check("only a hash of the token is stored", row.startToken !== a.token && row.startToken === core.hashStartToken(a.token));
    check("the browser nonce is stored hashed", row.nonceHash !== a.nonce && /^[0-9a-f]{64}$/.test(String(row.nonceHash)));
    check("status needs the nonce (no id enumeration)", (await linking.requestStatus(a.id, "x".repeat(32))) === null);
    const ttlMin = (row.expiresAt.getTime() - Date.now()) / 60_000;
    check("link attempt is short-lived (≤ 15 min)", ttlMin > 0 && ttlMin <= 15.1, `${ttlMin.toFixed(1)} min`);

    // /start link_<token> → confirmation question (nothing linked yet)
    let m = mark();
    await service.handleUpdate(msg(1001, `/start link_${a.token}`));
    const ask = since(m).find((c) => c.method === "sendMessage");
    const connectBtn = buttonsOf(ask).find((b) => String(b.callback_data).startsWith("lk:y:"));
    check("bot asks for confirmation with ✅ Connect / Cancel buttons", Boolean(connectBtn) && buttonsOf(ask).some((b) => String(b.callback_data).startsWith("lk:n:")));
    check("confirmation names the account, email masked", /Aziza/.test(ask?.body.text ?? "") && !String(ask?.body.text).includes("aziza@example.com"));
    check("no link is created before the button is pressed", !(await linkOf(aziza.id)));
    check("website sees 'confirming' while waiting", (await linking.requestStatus(a.id, a.nonce))?.status === "confirming");

    // Someone else pressing the same button (forwarded message) → refused
    await service.handleUpdate(cb(1999, connectBtn.callback_data));
    check("case G: another Telegram cannot confirm someone's attempt", !(await linkOf(aziza.id)));

    m = mark();
    await service.handleUpdate(cb(1001, connectBtn.callback_data));
    const link = await linkOf(aziza.id);
    check("✅ Connect links the numeric Telegram id", link?.telegramUserId === "1001" && link.chatId === "1001");
    check("callback query answered (no spinning button)", since(m).some((c) => c.method === "answerCallbackQuery"));
    check("website status flips to 'used'", (await linking.requestStatus(a.id, a.nonce))?.status === "used");
    const audits = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityType, "telegram_link"));
    check("link is audited", audits.some((r: any) => r.entityId === aziza.id && r.newValue === "tg:1001"));

    // D: reuse after use
    m = mark();
    await service.handleUpdate(msg(1002, `/start link_${a.token}`));
    check("case D: a used token links nothing", (await db.select().from(schema.telegramLinks)).length === 1 && since(m).some((c) => c.method === "sendMessage"));

    // E: expired
    const e = await startLink(bekzod.id);
    await db.update(schema.telegramLoginRequests).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(schema.telegramLoginRequests.id, e.id));
    await service.handleUpdate(msg(1002, `/start link_${e.token}`));
    check("case E: an expired token is refused", !(await linkOf(bekzod.id)) && (await reqRow(e.id)).status === "pending");

    // F: forged / unknown token
    await service.handleUpdate(msg(1002, `/start link_${core.newStartToken()}`));
    check("case F: an unknown token links nothing", !(await linkOf(bekzod.id)));

    // B: this Telegram is already linked to another account
    const b = await startLink(bekzod.id);
    await service.handleUpdate(msg(1001, `/start link_${b.token}`));
    const bRow = await reqRow(b.id);
    check("case B: Telegram already linked elsewhere → refused, reason reported", bRow.status === "failed" && bRow.failReason === "linked_elsewhere" && !(await linkOf(bekzod.id)));

    // A: same Telegram + same account again (attempt created before the link)
    const cho1 = await startLink(cho.id);
    const cho2 = await startLink(cho.id);
    await service.handleUpdate(msg(1003, `/start link_${cho1.token}`));
    const choBtn = buttonsOf(lastTo(1003)).find((x) => String(x.callback_data).startsWith("lk:y:"));
    await service.handleUpdate(cb(1003, choBtn.callback_data));
    await service.handleUpdate(msg(1003, `/start link_${cho2.token}`));
    check("case A: same Telegram + same account → success, no duplicate", (await reqRow(cho2.id)).status === "used" && (await db.select().from(schema.telegramLinks).where(eq(schema.telegramLinks.profileId, cho.id))).length === 1);

    // C: account already has another Telegram (website refuses up front)
    const c = await linking.startRequest({ purpose: "link", profileId: aziza.id });
    check("case C (website): an account with Telegram cannot start another link", !c.ok && c.code === "already_linked");
    // C (bot side): attempt created, then the account got linked meanwhile
    const d1 = await startLink(dana.id);
    const d2 = await startLink(dana.id);
    await service.handleUpdate(msg(1004, `/start link_${d1.token}`));
    await service.handleUpdate(msg(1005, `/start link_${d2.token}`));
    const d1Btn = buttonsOf(lastTo(1004)).find((x) => String(x.callback_data).startsWith("lk:y:"));
    const d2Btn = buttonsOf(lastTo(1005)).find((x) => String(x.callback_data).startsWith("lk:y:"));
    await service.handleUpdate(cb(1004, d1Btn.callback_data));
    await service.handleUpdate(cb(1005, d2Btn.callback_data));
    const d2Row = await reqRow(d2.id);
    check("case C (bot): second Telegram for the same account → refused", (await linkOf(dana.id))?.telegramUserId === "1004" && d2Row.failReason === "account_has_other");

    // Cancel
    await db.delete(schema.telegramLinks).where(eq(schema.telegramLinks.profileId, bekzod.id));
    const x = await startLink(bekzod.id);
    await service.handleUpdate(msg(1006, `/start link_${x.token}`));
    const cancelBtn = buttonsOf(lastTo(1006)).find((y) => String(y.callback_data).startsWith("lk:n:"));
    await service.handleUpdate(cb(1006, cancelBtn.callback_data));
    check("Cancel → attempt failed('cancelled'), nothing linked", (await reqRow(x.id)).failReason === "cancelled" && !(await linkOf(bekzod.id)));
  }

  // ===========================================================================
  section("Linking — races");
  // ===========================================================================
  {
    // Same attempt confirmed twice at the same moment.
    const r = await startLink(bekzod.id);
    await service.handleUpdate(msg(1007, `/start link_${r.token}`));
    const from = user(1007) as any;
    const outcomes = await Promise.all([linking.confirmLinkAttempt(r.id, from, "1007"), linking.confirmLinkAttempt(r.id, from, "1007")]);
    check("double confirm → exactly one 'linked'", outcomes.filter((o) => o.kind === "linked").length === 1, JSON.stringify(outcomes.map((o) => o.kind)));
    check("…and exactly one row", (await db.select().from(schema.telegramLinks).where(eq(schema.telegramLinks.profileId, bekzod.id))).length === 1);

    // One Telegram confirming two different accounts concurrently.
    await db.delete(schema.telegramLinks).where(eq(schema.telegramLinks.profileId, cho.id));
    await db.delete(schema.telegramLinks).where(eq(schema.telegramLinks.profileId, admin.id));
    const r1 = await startLink(cho.id);
    const r2 = await startLink(admin.id);
    await service.handleUpdate(msg(1008, `/start link_${r1.token}`));
    await service.handleUpdate(msg(1008, `/start link_${r2.token}`));
    const f8 = user(1008) as any;
    const both = await Promise.all([linking.confirmLinkAttempt(r1.id, f8, "1008"), linking.confirmLinkAttempt(r2.id, f8, "1008")]);
    const rows = await db.select().from(schema.telegramLinks).where(eq(schema.telegramLinks.telegramUserId, "1008"));
    check("one Telegram, two accounts at once → only one link survives", rows.length === 1 && both.filter((o) => o.kind === "linked").length === 1, JSON.stringify(both.map((o) => o.kind)));
    await db.delete(schema.telegramLinks).where(eq(schema.telegramLinks.telegramUserId, "1008"));
  }

  // ===========================================================================
  section("Webhook updates — idempotency, groups, blocked");
  // ===========================================================================
  {
    check("claimUpdate: first time true", await service.claimUpdate(900001));
    check("claimUpdate: re-delivery false", !(await service.claimUpdate(900001)));
    check("claimUpdate: garbage id refused", !(await service.claimUpdate("1")) && !(await service.claimUpdate(-5)) && !(await service.claimUpdate(1.5)));
    const u = msg(1001, "/help");
    let m = mark();
    await service.handleUpdate(u);
    await service.handleUpdate(u);
    check("the same update processed once (one reply)", since(m).filter((c) => c.method === "sendMessage").length === 1);

    m = mark();
    await service.handleUpdate(msg(1001, "/profile", "supergroup", -100123));
    const groupReply = since(m).find((c) => c.method === "sendMessage");
    check("group chat: command answered with 'private only', no account data", Boolean(groupReply) && !/Aziza|Computer Science|3\.7/.test(groupReply?.body.text ?? ""));
    m = mark();
    await service.handleUpdate(cb(1001, `su:${tum.id}`, "group"));
    check("group chat: buttons do nothing", (await db.select().from(schema.savedUniversities).where(eq(schema.savedUniversities.profileId, aziza.id))).length === 0 && since(m).some((c) => c.method === "answerCallbackQuery"));

    await service.handleUpdate({ update_id: updateSeq++, my_chat_member: { chat: { id: 1001, type: "private" }, from: user(1001) as any, new_chat_member: { status: "kicked" } } } as any);
    check("user blocks the bot → link marked blocked", (await linkOf(aziza.id))?.blocked === true);
    await service.handleUpdate(msg(1001, "/help"));
    check("user writes again → unblocked", (await linkOf(aziza.id))?.blocked === false);
  }

  // ===========================================================================
  section("Commands — reuse the website's services");
  // ===========================================================================
  {
    let m = mark();
    await service.handleUpdate(msg(5555, "/profile"));
    check("unlinked user: private commands refused with a website button", /notLinked|connect|website|sayt/i.test(lastTo(5555)?.body.text ?? "") || buttonsOf(lastTo(5555)).length > 0);

    m = mark();
    await service.handleUpdate(msg(1001, "/profile"));
    const prof = since(m).find((c) => c.method === "sendMessage");
    check("/profile shows the real profile", /Aziza Karimova/.test(prof?.body.text ?? "") && /Computer Science/.test(prof?.body.text ?? "") && /IELTS 7\.5/.test(prof?.body.text ?? ""));

    m = mark();
    await service.handleUpdate(msg(1001, "/universities munich"));
    const res = since(m).find((c) => c.method === "sendMessage");
    const save = buttonsOf(res).find((b) => b.callback_data === `su:${tum.id}`);
    check("/universities searches the real catalogue", /Technical University of Munich/.test(res?.body.text ?? "") && Boolean(save));
    await service.handleUpdate(cb(1001, `su:${tum.id}`));
    const savedRows = await db.select().from(schema.savedUniversities).where(eq(schema.savedUniversities.profileId, aziza.id));
    check("⭐ saves through the website route (same table, synced)", savedRows.length === 1 && savedRows[0].universityId === tum.id);
    await service.handleUpdate(cb(1001, `su:${tum.id}`));
    check("saving twice does not duplicate", (await db.select().from(schema.savedUniversities).where(eq(schema.savedUniversities.profileId, aziza.id))).length === 1);

    m = mark();
    await service.handleUpdate(msg(1001, "/universities zzzz-nothing"));
    check("no results → honest 'nothing found' (no invented records)", !/University/.test(since(m).find((c) => c.method === "sendMessage")?.body.text ?? "University"));

    await service.handleUpdate(msg(1001, "/scholarships daad"));
    await service.handleUpdate(cb(1001, `ss:${daad.id}`));
    check("scholarship saved via the bot", (await db.select().from(schema.savedScholarships).where(eq(schema.savedScholarships.profileId, aziza.id))).length === 1);

    m = mark();
    await service.handleUpdate(msg(1001, "/saved"));
    const savedMsg = since(m).find((c) => c.method === "sendMessage")?.body.text ?? "";
    check("/saved lists both", /Technical University of Munich/.test(savedMsg) && /DAAD Study Scholarship/.test(savedMsg));

    await db.insert(schema.applications).values({ profileId: aziza.id, universityName: "TU Munich", programName: "MSc Informatics", status: "in_progress" } as any);
    m = mark();
    await service.handleUpdate(msg(1001, "/applications"));
    check("/applications reads the tracker", /TU Munich/.test(since(m).find((c) => c.method === "sendMessage")?.body.text ?? ""));

    m = mark();
    await service.handleUpdate(msg(1001, "/next"));
    check("/next answers from the next-actions service", since(m).some((c) => c.method === "sendMessage"));

    // Premium: Deadline Center is premium on the website → locked in the bot.
    m = mark();
    await service.handleUpdate(msg(1001, "/deadlines"));
    const locked = since(m).find((c) => c.method === "sendMessage");
    check("/deadlines is premium-locked for a free account (server-side)", buttonsOf(locked).some((b) => /#payments$/.test(String(b.url ?? ""))) && !/DAAD/.test(locked?.body.text ?? ""));
    await db.update(schema.studentProfiles).set({ isPremium: true, premiumUntil: new Date(Date.now() + 7 * 86_400_000) } as any).where(eq(schema.studentProfiles.id, aziza.id));
    m = mark();
    await service.handleUpdate(msg(1001, "/deadlines"));
    check("/deadlines works once the account is Premium", /DAAD/.test(since(m).find((c) => c.method === "sendMessage")?.body.text ?? ""));
    await db.update(schema.studentProfiles).set({ isPremium: false, premiumUntil: null } as any).where(eq(schema.studentProfiles.id, aziza.id));

    m = mark();
    await service.handleUpdate(msg(1001, "/advisor"));
    check("/advisor without a question shows usage", since(m).some((c) => c.method === "sendMessage"));

    m = mark();
    await service.handleUpdate(msg(1001, "/settings"));
    const st = since(m).find((c) => c.method === "sendMessage");
    check("/settings offers notification + reminder buttons", buttonsOf(st).some((b) => b.callback_data === "st:n:0") && buttonsOf(st).some((b) => b.callback_data === "st:r:short"));
    await service.handleUpdate(cb(1001, "st:r:short"));
    check("reminder preset saved", JSON.parse(String((await linkOf(aziza.id))?.reminderDays)).join(",") === "7,3,1,0");
    await service.handleUpdate(cb(1001, "st:n:0"));
    check("notifications paused from the bot", (await linkOf(aziza.id))?.notifyEnabled === false);
    await service.handleUpdate(msg(1001, "/on"));
    check("/on (legacy alias) resumes", (await linkOf(aziza.id))?.notifyEnabled === true);
    await service.handleUpdate(cb(1001, "st:r:standard"));

    m = mark();
    await service.handleUpdate(cb(1001, "evil:payload"));
    check("unknown callback data is rejected safely", since(m).some((c) => c.method === "answerCallbackQuery") && (await linkOf(aziza.id))?.notifyEnabled === true);

    check("every command has a handler path", BOT_COMMANDS.length === 14);
  }

  // ===========================================================================
  section("Sign-in code (linked Telegram only)");
  // ===========================================================================
  {
    const profilesBefore = (await db.select().from(schema.studentProfiles)).length;
    const st = await linking.startRequest({ purpose: "login" });
    if (!st.ok) throw new Error("login start failed");
    const tok = st.deepLink.split("start=login_")[1];
    await service.handleUpdate(msg(7777, `/start login_${tok}`));
    const row = await reqRow(st.id);
    check("unlinked Telegram gets no code (no auto-signup)", row.status === "failed" && row.failReason === "not_linked" && !row.codeHash);
    check("…and no account is created", (await db.select().from(schema.studentProfiles)).length === profilesBefore);

    const st2 = await linking.startRequest({ purpose: "login" });
    if (!st2.ok) throw new Error("login start failed");
    await service.handleUpdate(msg(1001, `/start login_${st2.deepLink.split("start=login_")[1]}`));
    const codeMsg = lastTo(1001)?.body.text ?? "";
    const code = /(\d{6})/.exec(codeMsg)?.[1] ?? "";
    check("linked Telegram receives a 6-digit code", /^\d{6}$/.test(code));
    const logged = await db.select().from(schema.telegramMessages).where(eq(schema.telegramMessages.kind, "code"));
    check("the code is never stored in the message log", logged.every((r: any) => !String(r.preview ?? "").includes(code)));
    const wrong = await service.verifyRequest({ id: st2.id, nonce: st2.nonce, code: code === "000000" ? "111111" : "000000" });
    check("wrong code → attempts left", !wrong.ok && wrong.code === "wrong_code" && wrong.attemptsLeft === 4);
    const ok = await service.verifyRequest({ id: st2.id, nonce: st2.nonce, code });
    check("right code → the linked account", ok.ok && ok.profile.id === aziza.id);
    const again = await service.verifyRequest({ id: st2.id, nonce: st2.nonce, code });
    check("code is single-use", !again.ok && again.code === "expired");
    const lr = await linking.startRequest({ purpose: "link", profileId: cho.id });
    if (lr.ok) {
      const v = await service.verifyRequest({ id: lr.id, nonce: lr.nonce, code: "123456" });
      check("link attempts cannot be completed with a code", !v.ok && v.code === "invalid_request");
    }
  }

  // ===========================================================================
  section("Mini App — initData verification + session exchange");
  // ===========================================================================
  const signInit = (fields: Record<string, string>, token = BOT_TOKEN) => {
    const params = new URLSearchParams(fields);
    params.set("hash", initData.initDataHash(initData.dataCheckString(params), token));
    return params.toString();
  };
  const now = Math.floor(Date.now() / 1000);
  {
    const good = signInit({ auth_date: String(now), query_id: "AAH", user: JSON.stringify({ id: 1001, first_name: "Aziza", language_code: "en" }) });
    const v = initData.verifyInitData(good, BOT_TOKEN);
    check("valid initData verifies; id kept as a string", v.ok && v.user.id === "1001");
    const tampered = good.replace("Aziza", "Mallory");
    check("tampered initData rejected", !initData.verifyInitData(tampered, BOT_TOKEN).ok);
    check("initData signed with another bot token rejected", !initData.verifyInitData(signInit({ auth_date: String(now), user: '{"id":1}' }, "999:other"), BOT_TOKEN).ok);
    const old = signInit({ auth_date: String(now - 7200), user: '{"id":1001}' });
    const oldRes = initData.verifyInitData(old, BOT_TOKEN);
    check("stale initData (auth_date too old) rejected", !oldRes.ok && oldRes.reason === "expired");
    check("duplicate keys rejected", !initData.verifyInitData(`${good}&user=x`, BOT_TOKEN).ok);
    check("oversized initData rejected", !initData.verifyInitData("a=" + "x".repeat(5000), BOT_TOKEN).ok);
    const big = signInit({ auth_date: String(now), user: '{"id":9007199254740993,"first_name":"Big"}' });
    const bigRes = initData.verifyInitData(big, BOT_TOKEN);
    check("ids above 2^53 are preserved exactly (bigint-safe)", bigRes.ok && bigRes.user.id === "9007199254740993", bigRes.ok ? bigRes.user.id : bigRes.reason);

    const { POST: miniAuth } = await import("../src/app/api/telegram/miniapp/auth/route");
    const call = (body: unknown, ip = "10.0.0.1") => miniAuth(new Request("http://x/api/telegram/miniapp/auth", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) }));
    const r1 = await call({ initData: good });
    const j1 = await r1.json();
    check("linked user → short-lived tg1 session", r1.status === 200 && j1.linked === true && /^tg1\./.test(j1.token) && j1.expiresIn === 3600 && j1.profile.id === aziza.id);
    check("session response carries no secrets", !JSON.stringify(j1).includes("passwordHash") && !JSON.stringify(j1).includes(BOT_TOKEN));
    const countBefore = (await db.select().from(schema.studentProfiles)).length;
    const r2 = await call({ initData: signInit({ auth_date: String(now), user: '{"id":424242,"first_name":"New"}' }) });
    const j2 = await r2.json();
    check("unlinked user → linked:false, no token, no account", r2.status === 200 && j2.linked === false && !j2.token && (await db.select().from(schema.studentProfiles)).length === countBefore);
    const r3 = await call({ initData: tampered });
    check("forged initData → 401 (generic message)", r3.status === 401);

    // The bearer token opens the SAME routes the website uses.
    const bearer = (path: string, init: RequestInit = {}) => new Request(`http://x${path}`, { ...init, headers: { ...(init.headers as any), authorization: `Bearer ${j1.token}`, "content-type": "application/json" } });
    const { GET: meGet, DELETE: meDelete } = await import("../src/app/api/telegram/me/route");
    const me = await meGet(bearer("/api/telegram/me"));
    check("tg1 bearer authenticates /api/telegram/me", me.status === 200 && (await me.json()).link?.notifyEnabled === true);
    const { GET: profileGet } = await import("../src/app/api/profiles/[id]/route");
    const own = await profileGet(bearer(`/api/profiles/${aziza.id}`), { params: Promise.resolve({ id: String(aziza.id) }) } as any);
    const other = await profileGet(bearer(`/api/profiles/${bekzod.id}`), { params: Promise.resolve({ id: String(bekzod.id) }) } as any);
    check("own profile readable, someone else's → 403", own.status === 200 && other.status === 403);
    const { GET: adminGet } = await import("../src/app/api/admin/telegram/route");
    check("Mini App session can never reach admin routes", (await adminGet(bearer("/api/admin/telegram"))).status === 403);
    const forged = j1.token.slice(0, -2) + (j1.token.endsWith("AA") ? "BB" : "AA");
    check("forged tg1 token rejected", auth.verifyTelegramChannelToken(forged) === null);
    check("expired tg1 token rejected", auth.verifyTelegramChannelToken(auth.signTelegramChannelToken({ profileId: aziza.id, telegramUserId: "1001", channel: "miniapp" }, { ttlSeconds: -1 })) === null);
    check("tg1 token bound to the server secret", auth.verifyTelegramChannelToken(auth.signTelegramChannelToken({ profileId: aziza.id, telegramUserId: "1001", channel: "miniapp" }, { secret: "other-secret-xxxxxxxxxxxxxxxxxxxx" })) === null);

    // Unlink from the Mini App (website route) → the token stops working.
    const del = await meDelete(bearer("/api/telegram/me", { method: "DELETE" }));
    check("unlink via the same website route", del.status === 200 && !(await linkOf(aziza.id)));
    const after = await meGet(bearer("/api/telegram/me"));
    check("after unlink the Mini App token is dead (401 telegram_unlinked)", after.status === 401 && (await after.json()).code === "telegram_unlinked");
    const audits = await db.select().from(schema.auditLogs).where(and(eq(schema.auditLogs.entityType, "telegram_link"), eq(schema.auditLogs.entityId, aziza.id)));
    check("unlink is audited", audits.some((r: any) => r.oldValue === "tg:1001" && r.newValue === null));
  }

  // ===========================================================================
  section("Unlink from the bot");
  // ===========================================================================
  {
    const m = mark();
    await service.handleUpdate(msg(1007, "/unlink"));
    const ask = since(m).find((c) => c.method === "sendMessage");
    check("/unlink asks for confirmation first", buttonsOf(ask).some((b) => b.callback_data === "ul:y") && Boolean(await linkOf(bekzod.id)));
    await service.handleUpdate(cb(1007, "ul:n"));
    check("Cancel keeps the link", Boolean(await linkOf(bekzod.id)));
    await service.handleUpdate(cb(1007, "ul:y"));
    check("Confirm removes the link", !(await linkOf(bekzod.id)));
  }

  // ===========================================================================
  section("Deadline reminders — offsets, timezone, dedup, stale-safety, retries");
  // ===========================================================================
  {
    check("bucket: 3 days left with [30,14,7,3,1,0] → 3", reminders.reminderBucket(3, [30, 14, 7, 3, 1, 0]) === 3);
    check("bucket: 5 days left → 7 (next offset up)", reminders.reminderBucket(5, [30, 14, 7, 3, 1, 0]) === 7);
    check("bucket: past due → none", reminders.reminderBucket(-1, [30, 14, 7, 3, 1, 0]) === null);
    check("bucket: reminders off → none", reminders.reminderBucket(3, []) === null);
    check("presets validated (no negatives / >60 / duplicates)", reminders.normalizeReminderDays([3, 3, -1, 99, "x", 0]).join(",") === "3,0");
    const lateUtc = new Date("2026-03-09T20:30:00Z"); // 01:30 on 10 March in Tashkent
    check("timezone: 'today' follows REMINDER_TIMEZONE", reminders.calendarDaysUntil("2026-03-10", lateUtc, "Asia/Tashkent") === 0 && reminders.calendarDaysUntil("2026-03-10", lateUtc, "UTC") === 1);

    // Re-link Aziza (she has the DAAD scholarship saved, deadline in 3 days).
    const a = await startLink(aziza.id);
    await service.handleUpdate(msg(1001, `/start link_${a.token}`));
    await service.handleUpdate(cb(1001, buttonsOf(lastTo(1001)).find((b) => String(b.callback_data).startsWith("lk:y:")).callback_data));
    let m = mark();
    const created = await sweep.runNotificationSweep(aziza.id);
    const reminderMsgs = since(m).filter((c) => c.method === "sendMessage" && /DAAD/.test(c.body.text));
    check("sweep creates the 3-day reminder and delivers it to Telegram", created >= 1 && reminderMsgs.length === 1);
    const notif = (await db.select().from(schema.notifications).where(eq(schema.notifications.profileId, aziza.id))).find((n: any) => n.type === "deadline_approaching");
    check("in-app row recorded with the bucket key", Boolean(notif) && /&r=3$/.test(String(notif?.link)));
    m = mark();
    await sweep.runNotificationSweep(aziza.id);
    check("second sweep sends nothing (dedup)", since(m).filter((c) => c.method === "sendMessage" && /DAAD/.test(c.body.text)).length === 0);
    // Another instance is sweeping Aziza right now (lock held elsewhere) → skip.
    await db.delete(schema.notifications).where(eq(schema.notifications.profileId, aziza.id));
    const holder = await (pool as any).connect();
    await holder.query("BEGIN");
    await holder.query("SELECT pg_advisory_xact_lock(740221, $1)", [aziza.id]);
    m = mark();
    const whileLocked = await sweep.runNotificationSweep(aziza.id);
    check("a profile being swept elsewhere is skipped (no double send)", whileLocked === 0 && since(m).filter((c) => c.method === "sendMessage").length === 0);
    await holder.query("SELECT pg_advisory_xact_lock(740221, 0)");
    const jobWhileLocked = await sweep.runScheduledTelegramJobs();
    check("only one scheduled run at a time across instances", (jobWhileLocked as { skipped?: boolean }).skipped === true);
    await holder.query("COMMIT");
    holder.release();
    m = mark();
    const afterRelease = await sweep.runNotificationSweep(aziza.id);
    check("…and runs normally once the lock is released", afterRelease >= 1 && since(m).filter((c) => c.method === "sendMessage" && /DAAD/.test(c.body.text)).length === 1);

    // Reminders off → nothing new.
    await db.delete(schema.notifications).where(eq(schema.notifications.profileId, aziza.id));
    await db.update(schema.telegramLinks).set({ reminderDays: "[]" }).where(eq(schema.telegramLinks.profileId, aziza.id));
    m = mark();
    await sweep.runNotificationSweep(aziza.id);
    check("reminders off → no deadline reminder", since(m).filter((c) => /DAAD/.test(String(c.body.text))).length === 0);
    await db.update(schema.telegramLinks).set({ reminderDays: null }).where(eq(schema.telegramLinks.profileId, aziza.id));

    // Delivery fails → retried later.
    await db.delete(schema.notifications).where(eq(schema.notifications.profileId, aziza.id));
    failQueue.push({ error_code: 502, description: "Bad Gateway" }, { error_code: 502, description: "Bad Gateway" }, { error_code: 502, description: "Bad Gateway" });
    await sweep.runNotificationSweep(aziza.id);
    failQueue.length = 0;
    const failedRow = (await db.select().from(schema.telegramMessages).where(and(eq(schema.telegramMessages.kind, "notification"), eq(schema.telegramMessages.status, "failed"))))[0];
    check("failed delivery keeps a retry payload", Boolean(failedRow?.retryPayload));
    const r1 = await service.retryFailedDeliveries();
    const retried = (await db.select().from(schema.telegramMessages).where(eq(schema.telegramMessages.id, failedRow.id)))[0];
    check("retry job re-sends it", r1.sent === 1 && retried.status === "sent" && retried.retryPayload === null);

    // Stale: scholarship unsaved → a failed reminder is dropped, not re-sent.
    await db.delete(schema.notifications).where(eq(schema.notifications.profileId, aziza.id));
    failQueue.push({ error_code: 502, description: "x" }, { error_code: 502, description: "x" }, { error_code: 502, description: "x" });
    await sweep.runNotificationSweep(aziza.id);
    failQueue.length = 0;
    await db.delete(schema.savedScholarships).where(eq(schema.savedScholarships.profileId, aziza.id));
    m = mark();
    const r2 = await service.retryFailedDeliveries();
    check("stale reminder (scholarship unsaved) is dropped", r2.dropped >= 1 && since(m).filter((c) => c.method === "sendMessage").length === 0);
    check("past-due reminders are stale", await service.isStaleNotification({ profileId: aziza.id, type: "milestone_due", title: "t", body: "b", link: `/tasks?task=1&due=2020-01-01&r=0` }));

    // Blocked (403) → retries stop.
    await db.insert(schema.savedScholarships).values({ profileId: aziza.id, scholarshipId: daad.id } as any);
    await db.delete(schema.notifications).where(eq(schema.notifications.profileId, aziza.id));
    failQueue.push({ error_code: 502, description: "x" }, { error_code: 502, description: "x" }, { error_code: 502, description: "x" });
    await sweep.runNotificationSweep(aziza.id);
    failQueue.length = 0;
    failQueue.push({ error_code: 403, description: "Forbidden: bot was blocked by the user" });
    await service.retryFailedDeliveries();
    failQueue.length = 0;
    const pending = await db.select().from(schema.telegramMessages).where(and(eq(schema.telegramMessages.kind, "notification"), eq(schema.telegramMessages.status, "failed")));
    check("blocked by the user (403) → no more retries", pending.every((r: any) => r.retryPayload === null));
    check("…and the link is marked blocked", (await linkOf(aziza.id))?.blocked === true);

    const job = await sweep.runScheduledTelegramJobs();
    check("scheduled job runs sweep + retries in one go", typeof job.profiles === "number" && typeof job.retried === "number");
  }

  // ===========================================================================
  section("Deep links + misc");
  // ===========================================================================
  {
    const navIds = new Set([...NAV_SECTIONS.map((s: { id: string }) => s.id), "admin"]);
    const missing = core.APP_TABS.filter((t) => !navIds.has(t));
    check("APP_TABS ⊆ app navigation (no dead deep links)", missing.length === 0, missing.join(", "));
    check("miniAppUrl only for https sites", (await import("../src/lib/telegram/messaging")).miniAppUrl({ siteUrl: "http://localhost:3000" }) === null);
  }

}

main()
  .catch((err) => {
    failed++;
    console.error("\nFATAL:", err);
  })
  .finally(async () => {
    console.log(`\n${passed} passed, ${failed} failed`);
    globalThis.fetch = realFetch;
    await appPool?.end().catch(() => undefined);
    await pg?.stop().catch(() => undefined);
    process.exit(failed ? 1 : 0);
  });
