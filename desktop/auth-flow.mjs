// Sign-up + sign-in regression flow against the packaged engine.
//
// Reproduces the two reported failures:
//   * a password of exactly MIN characters was refused at sign-up,
//   * an email + password that were certainly correct did not sign in.
// Every step asserts, so the process exits non-zero when a defect returns.
//
//   node desktop/auth-flow.mjs [standaloneDir]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startLocalServer } from "./boot.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");
const appDir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(repo, ".next/standalone");
const dataDir = "/tmp/auth-test-data";
fs.rmSync(dataDir, { recursive: true, force: true });

let passed = 0;
function check(label, condition, detail) {
  if (!condition) {
    console.error(`  ✖ ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
    throw new Error(label);
  }
  passed++;
  console.log(`  ✓ ${label}`);
}

const server = await startLocalServer({
  appDir,
  dataDir,
  schemaPath: path.join(repo, "supabase/full_schema.sql"),
  host: "127.0.0.1",
  port: 4477,
  dbPort: 56321,
  log: () => {},
  warmUp: false,
});
const base = server.url;
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}
function capture(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const idx = pair.indexOf("=");
    jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
}
async function call(route, options = {}) {
  const res = await fetch(base + route, {
    ...options,
    headers: {
      "content-type": "application/json",
      origin: base,
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...(options.headers ?? {}),
    },
  });
  capture(res);
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: res.status, body };
}

/** Sign up with the wire format the wizard sends. */
function signUp(email, password, extra = {}) {
  return call("/api/profiles", {
    method: "POST",
    body: JSON.stringify({
      name: "Test Student",
      email,
      password,
      gpa: 4.2,
      ielts: 7,
      budget: 5000,
      destinationCountry: "Germany",
      studyInterests: [{ kind: "exploring" }],
      ...extra,
    }),
  });
}
const signIn = (email, password) =>
  call("/api/auth/sign-in", { method: "POST", body: JSON.stringify({ email, password }) });
const stamp = Date.now();

try {
  console.log("1) an 8-character password is accepted at sign-up");
  const eight = `pa${stamp % 100000}w`;
  const first = await signUp(`eight${stamp}@example.com`, eight);
  check(`sign-up accepts a ${eight.length}-character password`, first.status === 200, first.body);
  check("the response never contains the password hash", !JSON.stringify(first.body).includes("scrypt:"));

  console.log("2) that same pair signs in");
  await call("/api/auth/sign-out", { method: "POST", body: "{}" });
  jar.clear();
  const ok = await signIn(`eight${stamp}@example.com`, eight);
  check("sign-in succeeds", ok.status === 200, ok.body);
  const session = await call("/api/auth/session");
  check(
    "the session cookie identifies the account",
    session.status === 200 && session.body?.session?.profileId === first.body.profile.id,
    { status: session.status, session: session.body?.session }
  );
  check(
    "the session payload carries no password hash",
    !JSON.stringify(session.body).includes("scrypt:")
  );

  console.log("3) a password typed with surrounding spaces (mobile keyboard / password manager)");
  const spacedEmail = `spaced${stamp}@example.com`;
  const created = await signUp(spacedEmail, "  trailingspace123  ");
  check("sign-up succeeds", created.status === 200, created.body);
  const trimmed = await signIn(spacedEmail, "trailingspace123");
  check("sign-in with the trimmed password succeeds", trimmed.status === 200, trimmed.body);
  const padded = await signIn(spacedEmail, "  trailingspace123  ");
  check("sign-in with the padded password succeeds too", padded.status === 200, padded.body);

  console.log("4) an email typed with spaces and capitals");
  const messy = await signUp(`  MiXeD${stamp}@Example.com `, "mixedcase12345");
  check("sign-up normalises the email", messy.status === 200, messy.body);
  const lower = await signIn(`mixed${stamp}@example.com`, "mixedcase12345");
  check("sign-in with the lowercase email succeeds", lower.status === 200, lower.body);

  console.log("5) refusals are specific, not generic");
  const short = await signUp(`short${stamp}@example.com`, "abc1234");
  check("a 7-character password is refused", short.status === 400, short.body);
  check("…with reason too_short", short.body?.reason === "too_short", short.body);
  const common = await signUp(`common${stamp}@example.com`, "12345678");
  check("an 8-character blocked password is refused as too_common", common.body?.reason === "too_common", common.body);
  check("…and the message is not about length", !/at least/i.test(common.body?.error ?? ""), common.body?.error);
  const taken = await signUp(`eight${stamp}@example.com`, "anotherpass123");
  check("a duplicate email is a 409", taken.status === 409, taken.body);

  console.log("6) typos must not turn the right password into 429");
  // The sign-in budget is 8 attempts / 15 min per address, and every attempt
  // counts — successful ones included. A student who fumbles the password a
  // few times, gets in, signs out and comes back later would otherwise carry
  // those failures for the rest of the window and be locked out of a password
  // that is provably right. Each successful sign-in now clears the budget, so
  // three full cycles of 7 typos + 1 success must all end in a sign-in.
  for (let cycle = 1; cycle <= 3; cycle++) {
    for (let i = 0; i < 7; i++) {
      const bad = await signIn(`eight${stamp}@example.com`, `wrongpass${cycle}${i}`);
      check(`cycle ${cycle}: wrong password #${i + 1} is 401`, bad.status === 401, bad.body);
    }
    const good = await signIn(`eight${stamp}@example.com`, eight);
    check(`cycle ${cycle}: the correct password still signs in`, good.status === 200, good.body);
  }

  console.log("7) an account that does not exist says so the same way");
  const ghost = await signIn(`ghost${stamp}@example.com`, "whatever12345");
  check("unknown account is 401", ghost.status === 401, ghost.body);
  check("the message does not reveal whether the account exists", /incorrect/i.test(ghost.body?.error ?? ""), ghost.body?.error);

  console.log(`\n${passed} assertions passed.`);
} finally {
  await server.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
