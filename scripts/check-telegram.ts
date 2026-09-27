/**
 * Telegram bot regression test — deterministic, no DB, no network.
 *
 * Covers:
 *   - pure logic in src/lib/telegram/core.ts (settings sanitising, token
 *     masking, codes/nonces, deep-link payload parsing, delivery switches,
 *     HTML escaping, in-app links, bot texts in uz/ru/en)
 *   - structural security checks of every Telegram route (admin guard,
 *     webhook secret, rate limits, body-size limits, codes never logged)
 *   - schema drift: TELEGRAM_DDL == supabase/add_telegram.sql == drizzle schema
 *   - reserved placeholder email cannot be claimed via the profile APIs
 *   - i18n coverage of the new UI in en/uz/ru
 *
 * Run:  npm run test:telegram
 */
process.env.DATABASE_URL = "postgresql://x:x@localhost:5432/x"; // dummy — no queries are executed
process.env.SESSION_SECRET = "test-session-secret-that-is-long-enough-1234567890";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BOT_TEXTS,
  DEFAULT_TELEGRAM_SETTINGS,
  MAX_CODE_ATTEMPTS,
  TELEGRAM_NOTIFICATION_TYPES,
  appLink,
  escapeHtml,
  formatNotification,
  hmacHex,
  isButtonUrl,
  isTelegramPlaceholderEmail,
  looksLikeBotToken,
  maskToken,
  newCode,
  newNonce,
  newStartToken,
  normalizeBotUsername,
  normalizeCodeInput,
  normalizeSiteUrl,
  parseCommand,
  parseMutedTypes,
  parseStartPayload,
  parseTelegramSettings,
  pickLang,
  safeEqualHex,
  sanitizeSettingsPatch,
  shouldDeliver,
  telegramDisplayName,
  hashStartToken,
} from "../src/lib/telegram/core";
import { TELEGRAM_DDL, telegramStatements } from "../src/lib/telegram/ddl";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push(`${name} — ${(err as Error).message}`);
    console.log(`  ✗ ${name} — ${(err as Error).message}`);
  }
}
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

console.log("\nTelegram — core logic");

check("settings: corrupt/empty JSON falls back to safe defaults", () => {
  assert.deepEqual(parseTelegramSettings(null), DEFAULT_TELEGRAM_SETTINGS);
  assert.deepEqual(parseTelegramSettings("{not json"), DEFAULT_TELEGRAM_SETTINGS);
  assert.deepEqual(parseTelegramSettings("[1,2]"), DEFAULT_TELEGRAM_SETTINGS);
});

check("settings: patch keeps only valid values (types whitelist, booleans, URL)", () => {
  const next = sanitizeSettingsPatch(
    {
      loginEnabled: "yes", // not a boolean → ignored
      signupEnabled: true, // removed setting (no automatic accounts) → dropped
      types: ["deadline_approaching", "evil_type", 5, "deadline_approaching"],
      siteUrl: "javascript:alert(1)",
      botUsername: "@Good_Bot",
      botName: "x".repeat(200),
    },
    DEFAULT_TELEGRAM_SETTINGS
  );
  assert.equal(next.loginEnabled, DEFAULT_TELEGRAM_SETTINGS.loginEnabled);
  assert.ok(!("signupEnabled" in next), "no automatic Telegram sign-up setting");
  assert.deepEqual(next.types, ["deadline_approaching"]);
  assert.equal(next.siteUrl, "");
  assert.equal(next.botUsername, "Good_Bot");
  assert.equal(next.botName.length, 64);
});

check("settings: site URL must be https (http only for localhost), path stripped", () => {
  assert.equal(normalizeSiteUrl("https://scholarbridge.uz/app?x=1"), "https://scholarbridge.uz");
  assert.equal(normalizeSiteUrl("http://scholarbridge.uz"), "");
  assert.equal(normalizeSiteUrl("http://localhost:3000/x"), "http://localhost:3000");
  assert.equal(normalizeSiteUrl("ftp://x.y"), "");
  assert.equal(normalizeSiteUrl(42), "");
});

check("bot username validation", () => {
  assert.equal(normalizeBotUsername("ScholarBridgeBot"), "ScholarBridgeBot");
  assert.equal(normalizeBotUsername("1bad"), "");
  assert.equal(normalizeBotUsername("a b"), "");
});

check("bot token: format check and masking never reveal the secret", () => {
  const tok = "123456789:AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQr";
  assert.ok(looksLikeBotToken(tok));
  assert.ok(!looksLikeBotToken("123:short"));
  assert.ok(!looksLikeBotToken("abc:AAbbCCddEEffGGhhIIjjKKllMMnnOOppQQr"));
  const masked = maskToken(tok);
  assert.equal(masked, "123456789:••••QQr".replace("QQr", tok.slice(-4)));
  assert.ok(!masked.includes(tok.split(":")[1].slice(0, 20)));
  assert.equal(maskToken(null), "");
});

check("codes are 6 digits; tokens/nonces are URL-safe and unique", () => {
  const codes = new Set<string>();
  for (let i = 0; i < 500; i++) {
    const c = newCode();
    assert.match(c, /^\d{6}$/);
    codes.add(c);
  }
  assert.ok(codes.size > 480, "codes should be random");
  const t = newStartToken();
  assert.match(t, /^[A-Za-z0-9_-]{22}$/, "16 random bytes (128 bits), base64url");
  assert.notEqual(newStartToken(), t);
  assert.match(hashStartToken(t), /^[0-9a-f]{64}$/, "only a SHA-256 of the token is stored");
  assert.equal(hashStartToken(t), hashStartToken(t));
  assert.notEqual(hashStartToken(t), hashStartToken(newStartToken()));
  assert.ok(newNonce().length >= 32);
  assert.ok(MAX_CODE_ATTEMPTS >= 3 && MAX_CODE_ATTEMPTS <= 10);
});

check("HMAC + constant-time compare", () => {
  const a = hmacHex("s", "tg-code", 1, "123456");
  assert.ok(safeEqualHex(a, hmacHex("s", "tg-code", 1, "123456")));
  assert.ok(!safeEqualHex(a, hmacHex("s", "tg-code", 2, "123456")), "bound to the request id");
  assert.ok(!safeEqualHex(a, hmacHex("other", "tg-code", 1, "123456")), "bound to the secret");
  assert.ok(!safeEqualHex(a, null));
  assert.ok(!safeEqualHex(a, "zz"));
});

check("code input normalisation", () => {
  assert.equal(normalizeCodeInput("123 456"), "123456");
  assert.equal(normalizeCodeInput("123-456"), "123456");
  assert.equal(normalizeCodeInput(123456), "123456");
  assert.equal(normalizeCodeInput("12345"), "");
  assert.equal(normalizeCodeInput("12345a"), "");
  assert.equal(normalizeCodeInput({}), "");
});

check("/start payload + command parsing", () => {
  assert.deepEqual(parseStartPayload("/start login_AbCdEf123456GhIjKl"), { purpose: "login", token: "AbCdEf123456GhIjKl" });
  assert.deepEqual(parseStartPayload("/start@MyBot link_AbCdEf12AbCdEf12xy"), { purpose: "link", token: "AbCdEf12AbCdEf12xy" });
  assert.equal(parseStartPayload("/start admin_AbCdEf12AbCdEf12xy"), null);
  assert.equal(parseStartPayload("/start login_x"), null, "too short");
  assert.equal(parseStartPayload("/start login_AbCdEf12345678x"), null, "15 chars is below the minimum");
  assert.equal(parseStartPayload("/start login_AbCdEf12AbCdEf12xy; DROP"), null);
  assert.equal(parseStartPayload(null), null);
  assert.equal(parseCommand("/STOP@MyBot now"), "stop");
  assert.equal(parseCommand("hello"), null);
});

check("delivery switches: token, global, admin types, blocked, paused, muted", () => {
  const settings = { notificationsEnabled: true, types: ["deadline_approaching", "forum_reply"] };
  const link = { notifyEnabled: true, blocked: false, mutedTypes: '["forum_reply"]' };
  const base = { settings, link, type: "deadline_approaching", hasToken: true };
  assert.ok(shouldDeliver(base));
  assert.ok(!shouldDeliver({ ...base, hasToken: false }));
  assert.ok(!shouldDeliver({ ...base, settings: { ...settings, notificationsEnabled: false } }));
  assert.ok(!shouldDeliver({ ...base, link: null }));
  assert.ok(!shouldDeliver({ ...base, link: { ...link, blocked: true } }));
  assert.ok(!shouldDeliver({ ...base, link: { ...link, notifyEnabled: false } }));
  assert.ok(!shouldDeliver({ ...base, type: "forum_reply" }), "muted by the user");
  assert.ok(!shouldDeliver({ ...base, type: "scholarship_opened" }), "not allowed by the admin");
  assert.ok(shouldDeliver({ ...base, type: "brand_new_type" }), "unknown future types pass unless muted");
  assert.deepEqual(parseMutedTypes("garbage"), []);
});

check("HTML is escaped in notifications (no Telegram markup injection)", () => {
  assert.equal(escapeHtml(`<a href="x">&</a>`), `&lt;a href="x"&gt;&amp;&lt;/a&gt;`);
  const msg = formatNotification("uz", { title: "<b>hi</b>", body: "<script>" });
  assert.ok(msg.includes("&lt;b&gt;hi&lt;/b&gt;"));
  assert.ok(!msg.includes("<script>"));
});

check("in-app links stay on the site; buttons only for public https", () => {
  assert.equal(appLink("https://sb.uz", "#applications"), "https://sb.uz/#applications");
  assert.equal(appLink("https://sb.uz", "/privacy"), "https://sb.uz/privacy");
  assert.equal(appLink("https://sb.uz", "https://evil.example/phish"), "https://sb.uz/", "foreign origin rewritten");
  assert.equal(appLink("", "#x"), null);
  assert.ok(isButtonUrl("https://sb.uz/"));
  assert.ok(!isButtonUrl("http://localhost:3000/"));
  assert.ok(!isButtonUrl(null));
});

check("language pick + bot texts exist in uz/ru/en; code message warns not to share", () => {
  assert.equal(pickLang("uz-Latn"), "uz");
  assert.equal(pickLang("ru"), "ru");
  assert.equal(pickLang("kk"), "ru");
  assert.equal(pickLang("en-GB"), "en");
  assert.equal(pickLang(undefined), "uz");
  for (const lang of ["uz", "ru", "en"] as const) {
    const T = BOT_TEXTS[lang];
    const msg = T.code("123456", 5, "login");
    assert.ok(msg.includes("123456"), `${lang} code shown`);
    assert.ok(/hech kimga|никому|never share/i.test(msg), `${lang} warns not to share`);
    assert.ok(T.help.length > 20);
  }
});

check("placeholder email: legacy addresses recognised, never generated", () => {
  const e = "tg12345@telegram.scholarbridge.local";
  const src = ["core", "placeholder", "service", "linking", "bot", "messaging"].map((f) => read(`src/lib/telegram/${f}.ts`)).join("\n");
  assert.ok(!/export function telegramPlaceholderEmail/.test(src), "no placeholder-email generator");
  assert.ok(!/`tg\$\{[^}]+\}@/.test(src), "no template that builds a placeholder email");
  assert.ok(isTelegramPlaceholderEmail(e));
  assert.ok(isTelegramPlaceholderEmail("TG1@Telegram.ScholarBridge.local"));
  assert.ok(!isTelegramPlaceholderEmail("a@telegram.scholarbridge.local.evil.com"));
  assert.ok(!isTelegramPlaceholderEmail(null));
  assert.equal(telegramDisplayName({ firstName: "Ali", lastName: "V" }), "Ali V");
  assert.equal(telegramDisplayName({ username: "ali" }), "@ali");
  assert.equal(telegramDisplayName({}), "Telegram user");
});

console.log("\nTelegram — route security (static)");

const routes = {
  admin: read("src/app/api/admin/telegram/route.ts"),
  webhook: read("src/app/api/telegram/webhook/route.ts"),
  me: read("src/app/api/telegram/me/route.ts"),
  start: read("src/app/api/auth/telegram/start/route.ts"),
  status: read("src/app/api/auth/telegram/status/route.ts"),
  verify: read("src/app/api/auth/telegram/verify/route.ts"),
  config: read("src/app/api/config/telegram/route.ts"),
};
const service = read("src/lib/telegram/service.ts");

check("admin route: every handler goes through requireAdmin", () => {
  assert.ok(routes.admin.includes("requireAdmin("));
  const handlers = routes.admin.match(/export async function (GET|PUT|POST|DELETE)/g) || [];
  assert.ok(handlers.length >= 4, "GET/PUT/POST/DELETE present");
  const guards = routes.admin.match(/await guard\(req/g) || [];
  assert.ok(guards.length >= handlers.length, `each handler calls guard() (${guards.length}/${handlers.length})`);
});

check("admin route: never returns the raw token", () => {
  // liveInfo(token) only passes the token to Telegram; tgCall scrubs errors.
  assert.ok(read("src/lib/telegram/api.ts").includes('"Telegram API unreachable"'), "network errors never echo the URL");
  assert.ok(routes.admin.includes("maskToken("));
  assert.ok(!/token:\s*token\b/.test(routes.admin), "no `token: token` in responses");
  for (const line of routes.admin.split("\n").filter((l) => l.includes("NextResponse.json(") && /\btoken\b/.test(l.replace(/liveInfo\(token\)/g, "")))) {
    assert.ok(/token:\s*\{[^}]*masked:\s*maskToken\(/.test(line), `token only returned masked: ${line.trim().slice(0, 80)}`);
  }
});

check("webhook: secret header checked in constant time before parsing the body", () => {
  const s = routes.webhook;
  const iSecret = s.indexOf("x-telegram-bot-api-secret-token");
  const iBody = s.indexOf("await readJsonBody");
  assert.ok(iSecret > 0 && iBody > iSecret, "secret checked first");
  assert.ok(/timingSafeEqual|safeEqualHex|sameSecret/.test(s));
  assert.ok(s.includes("status: 401"));
});

check("public endpoints are rate-limited and size-limited", () => {
  assert.ok(routes.start.includes("checkRateLimit("));
  assert.ok(routes.verify.includes("checkRateLimit("));
  for (const [name, src] of Object.entries(routes)) {
    if (name === "config") continue;
    assert.ok(src.includes("readJsonBody"), `${name} uses readJsonBody (size-limited)`);
  }
});

check("/api/telegram/me requires a session; config endpoint exposes no secrets", () => {
  assert.ok(routes.me.includes("authenticate(req)"));
  assert.ok(!/getBotToken\(\)[\s\S]*token[,}]/.test(routes.config) || !routes.config.includes("token:"), "config never returns the token");
  assert.ok(!routes.config.includes("siteUrl"), "config does not leak settings beyond the public flags");
});

check("login codes are never written to the delivery log", () => {
  const messaging = read("src/lib/telegram/messaging.ts");
  assert.ok(/Codes are never written to the log/.test(messaging));
  const logCall = messaging.slice(messaging.indexOf("async function sendToChat"), messaging.indexOf("function siteButton"));
  assert.ok(logCall.length > 100, "sendToChat found");
  assert.ok(!/logMessage\(\{[^}]*html/.test(logCall), "html body (with the code) not logged");
  assert.ok(service.includes('hmacHex(sessionSecret(), "tg-code"'), "only an HMAC of the code is stored");
});

check("code verification: owned attempt (nonce), login-only, single-use claim", () => {
  const i = service.indexOf("async function verifyRequest");
  assert.ok(i > 0);
  const body = service.slice(i, i + 6000);
  const iOwner = body.indexOf("loadOwnedRequest(");
  const iAttempt = body.search(/attempts\s*=\s*req\.attempts\s*\+\s*1/);
  assert.ok(iOwner > 0, "attempt bound to the browser nonce");
  assert.ok(iAttempt > 0 && iOwner < iAttempt, "ownership checked before the attempt counter");
  assert.ok(/req\.purpose !== "login"/.test(body), "codes can only sign in — linking is confirmed in the bot");
  assert.ok(/eq\(telegramLoginRequests\.status, "code_sent"\)/.test(body), "conditional code_sent → used claim");
  assert.ok(body.indexOf("getLinkByTelegramUser(") > body.indexOf("claimed"), "link re-read after the claim");
});

check("link confirmation: atomic conditional claim + UNIQUE conflict handling", () => {
  const linking = read("src/lib/telegram/linking.ts");
  const i = linking.indexOf("export async function confirmLinkAttempt");
  const body = linking.slice(i, i + 3000);
  assert.ok(body.includes("db.transaction("), "single transaction");
  for (const cond of ['eq(telegramLoginRequests.purpose, "link")', 'eq(telegramLoginRequests.status, "confirming")', "eq(telegramLoginRequests.telegramUserId, tgUserId)", "gt(telegramLoginRequests.expiresAt"]) {
    assert.ok(body.includes(cond), `claim is conditional on ${cond}`);
  }
  assert.ok(body.includes("isUniqueViolation(err)"), "unique violation → conflict, not a crash");
  assert.ok(/\.cause/.test(read("src/lib/db-errors.ts")) && read("src/lib/db-errors.ts").includes('"23505"'), "drizzle-wrapped pg errors are unwrapped");
  const ddl = read("src/lib/telegram/ddl.ts");
  assert.ok(/profile_id integer not null unique/i.test(ddl), "one Telegram per account");
  assert.ok(/telegram_user_id text not null unique/i.test(ddl), "one account per Telegram");
});

check("notifications API: PUT/PATCH require auth (IDOR fix stays)", () => {
  const n = read("src/app/api/notifications/route.ts");
  for (const m of ["PUT", "PATCH"]) {
    const i = n.indexOf(`export async function ${m}`);
    if (i < 0) continue;
    const body = n.slice(i, i + 800);
    assert.ok(/authenticate\(|requireProfileAccess\(|requireSession|guard/.test(body), `${m} authenticates`);
  }
});

check("reserved placeholder email cannot be claimed via the profile APIs", () => {
  assert.ok(read("src/app/api/profiles/route.ts").includes("isTelegramPlaceholderEmail("));
  assert.ok(read("src/app/api/profiles/[id]/route.ts").includes("isTelegramPlaceholderEmail("));
});

console.log("\nTelegram — schema drift");

const norm = (s: string) =>
  s
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([(),;])\s*/g, "$1")
    .trim()
    .toLowerCase();

check("TELEGRAM_DDL matches supabase/add_telegram.sql", () => {
  const sql = read("supabase/add_telegram.sql");
  const want = telegramStatements().map(norm);
  const have = sql
    .split(";")
    .map((s) => norm(s))
    .filter((s) => s && !s.startsWith("begin") && !s.startsWith("commit"));
  for (const stmt of want) assert.ok(have.includes(stmt), `missing in SQL file: ${stmt.slice(0, 70)}…`);
});

check("every drizzle column exists in the DDL", () => {
  const schema = read("src/db/schema.ts");
  const start = schema.indexOf('export const telegramLinks = pgTable("telegram_links"');
  assert.ok(start > 0);
  const block = schema.slice(start);
  const cols = [...block.matchAll(/\b(?:text|integer|bigint|boolean|timestamp|serial)\("([a-z_]+)"/g)].map((m) => m[1]);
  assert.ok(cols.length >= 30, `found ${cols.length} columns`);
  const ddl = TELEGRAM_DDL.toLowerCase();
  for (const c of new Set(cols)) assert.ok(new RegExp(`\\b${c}\\b`).test(ddl), `column ${c} missing in DDL`);
  for (const t of ["telegram_links", "telegram_login_requests", "telegram_messages", "telegram_updates"]) assert.ok(ddl.includes(t));
});

console.log("\nTelegram — i18n");

check("new UI strings exist in en/uz/ru", () => {
  const langs = ["en", "uz", "ru"] as const;
  const msgs = Object.fromEntries(langs.map((l) => [l, JSON.parse(read(`src/i18n/messages/${l}.json`))]));
  const get = (o: any, path: string) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const required = [
    "telegram.loginButton",
    "telegram.errors.wrong_code",
    "telegram.errors.generic",
    "telegram.pageTitle",
    "telegram.nudgeTitle",
    "picker.tabTelegram",
    "bell.title",
    "admin.tab.telegram",
    "admin.desc.telegram",
    "adminTelegram.tokenTitle",
    "adminTelegram.broadcastDone",
    "nav.notifications",
    "navHints.notifications",
    "help.notifications",
  ];
  for (const l of langs) {
    for (const k of required) assert.equal(typeof get(msgs[l], k), "string", `${l}: ${k}`);
    for (const type of TELEGRAM_NOTIFICATION_TYPES) {
      assert.equal(typeof get(msgs[l], `telegram.types.${type}`), "string", `${l}: telegram.types.${type}`);
      assert.equal(typeof get(msgs[l], `telegram.typeHints.${type}`), "string", `${l}: telegram.typeHints.${type}`);
    }
    // Same placeholders in every language.
    for (const k of ["telegram.errors.wrong_code", "adminTelegram.broadcastDone", "telegram.codeSent"]) {
      const ph = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join(",");
      assert.equal(ph(get(msgs[l], k)), ph(get(msgs.en, k)), `${l}: placeholders of ${k}`);
    }
  }
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
