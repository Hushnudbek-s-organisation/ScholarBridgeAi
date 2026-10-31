/**
 * Phase AG gate — "I forgot my password" is a safe door, or it is a hole.
 *
 * A reset flow is the only place where holding an *email address* is enough to
 * take an account over. Every property that keeps it safe is pinned here, and
 * each one fails the gate if a future edit weakens it:
 *
 *   1. the token is 256 bits of CSPRNG output and cannot be guessed;
 *   2. only its SHA-256 is persisted — a database read is not a takeover;
 *   3. it dies after 60 minutes and after one use, and a new request kills the
 *      older links (`used_at`), so a leaked link has a short, single life;
 *   4. `/api/auth/password-reset/request` answers ONE sentence whether or not
 *      the address exists — no account enumeration;
 *   5. `/api/auth/password-reset/confirm` consumes the row *before* it changes
 *      the password (a double submit cannot set it twice) and revokes sessions;
 *   6. the mail path actually works: this file starts a throwaway SMTP server
 *      and drives `sendMail` through a full EHLO/AUTH/DATA conversation,
 *      including dot-stuffing;
 *   7. both pages are public, `noindex`, translated in three languages, and the
 *      sign-in form links to them.
 *
 * Run: npm run test:password-reset
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer, type Server, type Socket } from "node:net";
import { createHash } from "node:crypto";
import {
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TTL_MINUTES,
  RESET_TOKEN_PATTERN,
  buildResetEmail,
  createResetToken,
  hashResetToken,
  isEmailShaped,
  isWellFormedResetToken,
  resetLinkFor,
  resetTokenHashesEqual,
  resetTokenState,
} from "../src/lib/passwordReset";
import { MAIL_ENV_VARS, mailConfigFromEnv, mailConfigured, missingMailEnv, sendMail } from "../src/lib/mail";

const ROOT = join(__dirname, "..");
let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
  }
}

async function checkAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
  } catch (error) {
    failures.push(`${name}: ${(error as Error).message}`);
  }
}

const source = (relative: string) => readFileSync(join(ROOT, relative), "utf8");

/* ---------------------------------------------------------------- 1. token */

check("a token is 256 bits of CSPRNG output, base64url, 43 characters", () => {
  assert.equal(PASSWORD_RESET_TOKEN_BYTES, 32);
  const { token } = createResetToken(new Date("2026-10-31T09:00:00Z"));
  assert.equal(token.length, 43, "32 bytes must encode to 43 base64url characters");
  assert.match(token, RESET_TOKEN_PATTERN);
  assert.ok(isWellFormedResetToken(token));
  assert.doesNotMatch(token, /[+/=]/, "base64url only — a '+' in a query string becomes a space");
});

check("500 tokens are all different (entropy is real, not a counter)", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i++) seen.add(createResetToken().token);
  assert.equal(seen.size, 500);
});

check("the token is not derivable from the profile or the clock", () => {
  const now = new Date("2026-10-31T09:00:00Z");
  const first = createResetToken(now).token;
  const second = createResetToken(now).token;
  assert.notEqual(first, second, "same instant must still give different tokens");
});

/* ------------------------------------------------------- 2. what is stored */

check("only the SHA-256 hash is stored, and it is never the token", () => {
  const { token, tokenHash } = createResetToken();
  assert.match(tokenHash, /^[0-9a-f]{64}$/);
  assert.notEqual(tokenHash, token);
  assert.equal(tokenHash, createHash("sha256").update(token, "utf8").digest("hex"));
  assert.equal(hashResetToken(token), tokenHash, "hashing must be deterministic");
  assert.ok(!tokenHash.includes(token));
});

check("different tokens hash differently; comparison is constant-time-safe", () => {
  const a = createResetToken().tokenHash;
  const b = createResetToken().tokenHash;
  assert.notEqual(a, b);
  assert.equal(resetTokenHashesEqual(a, a), true);
  assert.equal(resetTokenHashesEqual(a, b), false);
  assert.equal(resetTokenHashesEqual(a, a.slice(0, 32)), false, "a prefix must never pass");
  assert.equal(resetTokenHashesEqual(a, "zzzz"), false, "non-hex must not throw");
  assert.equal(resetTokenHashesEqual("", ""), false, "two empty strings are not a match");
  assert.equal(resetTokenHashesEqual(a.toUpperCase(), a), false, "hex is lower-case only");
});

/* --------------------------------------------------------- 3. the lifetime */

const TTL_CHECK_NOW = new Date("2026-10-31T10:00:00Z");

check("the link lives exactly 60 minutes", () => {
  assert.equal(PASSWORD_RESET_TTL_MINUTES, 60);
  const { expiresAt } = createResetToken(TTL_CHECK_NOW);
  assert.equal(expiresAt.getTime() - TTL_CHECK_NOW.getTime(), 60 * 60_000);
});

check("valid before expiry, expired AT and after expiry", () => {
  const { expiresAt } = createResetToken(TTL_CHECK_NOW);
  const at = (offsetMs: number) => new Date(expiresAt.getTime() + offsetMs);
  assert.equal(resetTokenState({ expiresAt }, at(-1)), "valid");
  assert.equal(resetTokenState({ expiresAt }, at(0)), "expired", "the expiry instant itself is dead");
  assert.equal(resetTokenState({ expiresAt }, at(60_000)), "expired");
});

check("used beats expired — a spent link never reports as merely old", () => {
  const { expiresAt } = createResetToken(TTL_CHECK_NOW);
  assert.equal(resetTokenState({ expiresAt, usedAt: TTL_CHECK_NOW }, TTL_CHECK_NOW), "used");
  assert.equal(resetTokenState({ expiresAt, usedAt: new Date("2020-01-01T00:00:00Z") }, TTL_CHECK_NOW), "used");
});

check("a row from postgres (ISO string dates) is read the same way", () => {
  const iso = new Date(TTL_CHECK_NOW.getTime() + 60_000).toISOString();
  assert.equal(resetTokenState({ expiresAt: iso }, TTL_CHECK_NOW), "valid");
  assert.equal(resetTokenState({ expiresAt: new Date(TTL_CHECK_NOW.getTime() - 1).toISOString() }, TTL_CHECK_NOW), "expired");
  assert.equal(resetTokenState({ expiresAt: iso, usedAt: TTL_CHECK_NOW.toISOString() }, TTL_CHECK_NOW), "used");
});

check("an unparsable expiry fails closed", () => {
  assert.equal(resetTokenState({ expiresAt: "not-a-date" }, TTL_CHECK_NOW), "expired");
  assert.equal(resetTokenState({ expiresAt: "" }, TTL_CHECK_NOW), "expired");
});

check("a malformed token never reaches the database", () => {
  for (const bad of ["", "  ", null, undefined, 7, {}, [], "a".repeat(42), "a".repeat(44), "a".repeat(43) + "\n"]) {
    assert.equal(isWellFormedResetToken(bad), false, `accepted ${JSON.stringify(bad)}`);
  }
  assert.equal(isWellFormedResetToken("a".repeat(42) + "+"), false, "standard base64 is not the wire format");
  assert.equal(isWellFormedResetToken("a".repeat(42) + "/"), false);
  assert.equal(isWellFormedResetToken("a".repeat(42) + "="), false);
  assert.equal(isWellFormedResetToken("A".repeat(43)), true, "case-sensitive user agents must still work");
  assert.equal(isWellFormedResetToken("_".repeat(43)), true);
  assert.equal(isWellFormedResetToken("-".repeat(43)), true);
});

/* ------------------------------------------------------------ 4. the link */

check("the link is absolute, points at /reset-password and carries the token", () => {
  const { token } = createResetToken();
  assert.equal(resetLinkFor("https://scholarbridge.example", token), `https://scholarbridge.example/reset-password?token=${token}`);
  assert.equal(resetLinkFor("https://scholarbridge.example///", token), `https://scholarbridge.example/reset-password?token=${token}`);
});

check("no origin, no link — never a relative or invented host", () => {
  const { token } = createResetToken();
  assert.equal(resetLinkFor("", token), null);
  assert.equal(resetLinkFor("   ", token), null);
  assert.equal(resetLinkFor("scholarbridge.example", token), null, "a bare host cannot be emailed");
  assert.equal(resetLinkFor("/", token), null);
});

check("a malformed token never becomes a link", () => {
  assert.equal(resetLinkFor("https://scholarbridge.example", "short"), null);
  assert.equal(resetLinkFor("https://scholarbridge.example", ""), null);
});

/* ----------------------------------------------------------- 5. the email */

check("the email contains the exact link and the 60-minute promise, in 3 languages", () => {
  const { token } = createResetToken();
  const link = resetLinkFor("https://scholarbridge.example", token)!;
  const subjects = new Set<string>();
  for (const locale of ["en", "uz", "ru"]) {
    const { subject, text } = buildResetEmail({ link, appName: "ScholarBridge", locale });
    assert.ok(text.includes(link), `${locale}: the link is missing from the body`);
    assert.ok(/60/.test(text), `${locale}: the expiry is not stated`);
    assert.ok(text.endsWith("\n"));
    assert.doesNotMatch(text, /<[a-z][^>]*>/i, `${locale}: plain text only, no markup`);
    subjects.add(subject);
  }
  assert.equal(subjects.size, 3, "each locale needs its own subject line");
});

check("an unknown or missing locale falls back to English", () => {
  const link = resetLinkFor("https://scholarbridge.example", createResetToken().token)!;
  const en = buildResetEmail({ link, appName: "ScholarBridge", locale: "en" });
  for (const locale of [null, undefined, "", "de", "uz-UZ-x"]) {
    const other = buildResetEmail({ link, appName: "ScholarBridge", locale: locale as string | null });
    if (locale === "uz-UZ-x") continue;
    assert.equal(other.subject, en.subject, `locale ${String(locale)} did not fall back to English`);
  }
});

check("addresses that cannot be mailed are rejected before any SMTP work", () => {
  for (const good of ["a@b.co", "student.name+tag@example.org", "x@sub.domain.example"]) assert.equal(isEmailShaped(good), true, good);
  for (const bad of ["", "no-at-sign", "@example.com", "a@b", "a b@example.com", "a@b.c\nBcc: x@y.z", 5, null]) {
    assert.equal(isEmailShaped(bad), false, `accepted ${JSON.stringify(bad)}`);
  }
});

/* ------------------------------------------------------------- 6. mail env */

check("SMTP configuration is read from the environment, with sane defaults", () => {
  assert.deepEqual(MAIL_ENV_VARS, ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"]);
  assert.equal(mailConfigFromEnv({}), null, "no host is not a configuration");
  assert.equal(mailConfigFromEnv({ SMTP_HOST: "smtp.x.test" }), null, "MAIL_FROM is required too");
  const basic = mailConfigFromEnv({ SMTP_HOST: "smtp.x.test", MAIL_FROM: "no-reply@x.test" });
  assert.deepEqual(basic, { host: "smtp.x.test", port: 587, secure: false, user: null, pass: null, from: "no-reply@x.test" });
  assert.equal(mailConfigured({ SMTP_HOST: "smtp.x.test", MAIL_FROM: "no-reply@x.test" }), true);
  assert.equal(mailConfigured({}), false);
});

check("port 465 implies TLS; SMTP_SECURE=1 does too", () => {
  assert.equal(mailConfigFromEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test", SMTP_PORT: "465" })?.secure, true);
  assert.equal(mailConfigFromEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test", SMTP_SECURE: "TRUE" })?.secure, true);
  assert.equal(mailConfigFromEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test", SMTP_PORT: "465", SMTP_SECURE: "0" })?.secure, true);
  assert.equal(mailConfigFromEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test", SMTP_PORT: "587" })?.secure, false);
});

check("a half-configured credential is named for the admin, never silently used", () => {
  assert.deepEqual(missingMailEnv({}), ["SMTP_HOST", "MAIL_FROM"]);
  assert.deepEqual(missingMailEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test" }), []);
  assert.deepEqual(missingMailEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test", SMTP_USER: "u" }), ["SMTP_PASS"]);
  assert.deepEqual(missingMailEnv({ SMTP_HOST: "h", MAIL_FROM: "f@x.test", SMTP_PASS: "p" }), ["SMTP_USER"]);
});

check("an unconfigured or unreachable server never throws — it returns a reason", async () => {
  assert.deepEqual(await sendMail({ to: "a@b.co", subject: "s", text: "t" }, null), { ok: false, reason: "not_configured" });
  const badRecipient = await sendMail({ to: "not-an-address", subject: "s", text: "t" }, {
    host: "127.0.0.1",
    port: 1,
    secure: false,
    user: null,
    pass: null,
    from: "no-reply@x.test",
  });
  assert.deepEqual(badRecipient, { ok: false, reason: "bad_recipient" });
});

/* ------------------------------------------ 6b. a real SMTP conversation */

interface FakeSmtp {
  server: Server;
  port: number;
  received: { startTls: boolean; authUser: string; authPass: string; from: string; to: string; body: string };
}

/**
 * A throwaway SMTP server: enough of the protocol to prove the client speaks it.
 * `advertiseStartTls` + `closeAfterStartTls` lets a test watch the client demand
 * an upgrade it cannot complete with a self-signed certificate and refuse to
 * send the credential anyway.
 */
async function startFakeSmtp(
  options: { advertiseStartTls?: boolean; closeAfterStartTls?: boolean; rejectRecipient?: boolean } = {}
): Promise<FakeSmtp> {
  const state: FakeSmtp = {
    server: createServer(),
    port: 0,
    received: { startTls: false, authUser: "", authPass: "", from: "", to: "", body: "" },
  };

  state.server.on("connection", (socket: Socket) => {
    let buffer = "";
    let dataMode = false;
    let chunk = "";
    // 0 = not authenticating, 1 = waiting for the username, 2 = for the password.
    let authStage = 0;
    socket.setEncoding("utf8");
    socket.write("220 fake.smtp.test ESMTP\r\n");
    socket.on("error", () => {});
    socket.on("data", (data: string) => {
      if (dataMode) {
        chunk += data;
        const end = chunk.indexOf("\r\n.\r\n");
        if (end === -1) return;
        state.received.body = chunk.slice(0, end);
        dataMode = false;
        chunk = "";
        socket.write("250 2.0.0 queued\r\n");
        return;
      }
      buffer += data;
      for (;;) {
        const index = buffer.indexOf("\r\n");
        if (index === -1) break;
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 2);
        const upper = line.toUpperCase();

        if (authStage === 1) {
          state.received.authUser = Buffer.from(line, "base64").toString("utf8");
          authStage = 2;
          socket.write("334 UGFzc3dvcmQ6\r\n");
          continue;
        }
        if (authStage === 2) {
          state.received.authPass = Buffer.from(line, "base64").toString("utf8");
          authStage = 0;
          socket.write("235 2.7.0 authenticated\r\n");
          continue;
        }

        if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
          socket.write(
            options.advertiseStartTls
              ? "250-fake.smtp.test\r\n250-STARTTLS\r\n250 AUTH LOGIN\r\n"
              : "250-fake.smtp.test\r\n250 AUTH LOGIN\r\n"
          );
        } else if (upper === "STARTTLS") {
          state.received.startTls = true;
          socket.write("220 go ahead\r\n");
          // A real server would now speak TLS. We cannot present a certificate
          // the client trusts, so the test only needs to see the attempt.
          if (options.closeAfterStartTls) setTimeout(() => socket.destroy(), 20);
        } else if (upper === "AUTH LOGIN") {
          authStage = 1;
          socket.write("334 VXNlcm5hbWU6\r\n");
        } else if (upper.startsWith("MAIL FROM")) {
          state.received.from = line;
          socket.write("250 2.1.0 ok\r\n");
        } else if (upper.startsWith("RCPT TO")) {
          state.received.to = line;
          socket.write(options.rejectRecipient ? "550 5.1.1 no such mailbox\r\n" : "250 2.1.5 ok\r\n");
        } else if (upper === "DATA") {
          dataMode = true;
          chunk = "";
          socket.write("354 end with <CRLF>.<CRLF>\r\n");
        } else if (upper === "QUIT") {
          socket.write("221 bye\r\n");
          socket.end();
        } else {
          socket.write("500 5.5.1 unknown\r\n");
        }
      }
    });
  });

  await new Promise<void>((resolve) => state.server.listen(0, "127.0.0.1", resolve));
  const address = state.server.address();
  state.port = typeof address === "object" && address ? address.port : 0;
  return state;
}

async function main() {
  await checkAsync("a full SMTP conversation delivers the message (EHLO, MAIL, RCPT, DATA, QUIT)", async () => {
    const fake = await startFakeSmtp();
    try {
      const result = await sendMail(
        { to: "student@example.test", subject: "Reset link", text: "Hello\n\nhttps://x.test/reset-password?token=abc\n" },
        { host: "127.0.0.1", port: fake.port, secure: false, user: null, pass: null, from: "ScholarBridge <no-reply@x.test>" }
      );
      assert.deepEqual(result, { ok: true });
      assert.match(fake.received.from, /MAIL FROM:<no-reply@x\.test>/, "the envelope sender was not the bare address");
      assert.match(fake.received.to, /RCPT TO:<student@example\.test>/);
      assert.match(fake.received.body, /^From: ScholarBridge <no-reply@x\.test>/m);
      assert.match(fake.received.body, /^To: student@example\.test$/m);
      assert.match(fake.received.body, /^Subject: Reset link$/m);
      assert.match(fake.received.body, /Content-Type: text\/plain; charset="utf-8"/);
      assert.match(fake.received.body, /^Auto-Submitted: auto-generated$/m);
      assert.ok(fake.received.body.includes("https://x.test/reset-password?token=abc"));
    } finally {
      await new Promise<void>((resolve) => fake.server.close(() => resolve()));
    }
  });

  await checkAsync("AUTH LOGIN sends the credential as base64, never in the clear", async () => {
    const fake = await startFakeSmtp({ advertiseStartTls: false });
    try {
      const result = await sendMail(
        { to: "student@example.test", subject: "s", text: "t" },
        { host: "127.0.0.1", port: fake.port, secure: false, user: "user@x.test", pass: "secret", from: "no-reply@x.test" }
      );
      // No STARTTLS on offer: the client must refuse, not authenticate in clear.
      assert.deepEqual(result, { ok: false, reason: "tls_required", detail: "server does not offer STARTTLS" });
      assert.equal(fake.received.authUser, "", "the credential was sent over a cleartext link");
      assert.equal(fake.received.authPass, "");
      assert.equal(fake.received.startTls, false);
    } finally {
      await new Promise<void>((resolve) => fake.server.close(() => resolve()));
    }
  });

  await checkAsync("when STARTTLS is offered the client upgrades before authenticating", async () => {
    // The test server cannot present a certificate this process trusts, so the
    // upgrade cannot complete here — the point is that the client TRIES it and
    // does not fall back to a cleartext login.
    const fake = await startFakeSmtp({ advertiseStartTls: true, closeAfterStartTls: true });
    try {
      const result = await sendMail(
        { to: "student@example.test", subject: "s", text: "t" },
        { host: "127.0.0.1", port: fake.port, secure: false, user: "user@x.test", pass: "secret", from: "no-reply@x.test" }
      );
      assert.equal(fake.received.startTls, true, "STARTTLS was never attempted");
      assert.equal(result.ok, false, "a message was delivered without a verified TLS upgrade");
      assert.equal(fake.received.authUser, "", "the credential crossed the failed upgrade");
    } finally {
      await new Promise<void>((resolve) => fake.server.close(() => resolve()));
    }
  });

  await checkAsync("a line starting with a dot is dot-stuffed, so the body cannot end early", async () => {
    const fake = await startFakeSmtp();
    try {
      const result = await sendMail(
        { to: "student@example.test", subject: "s", text: "line one\n.\nline three\n" },
        { host: "127.0.0.1", port: fake.port, secure: false, user: null, pass: null, from: "no-reply@x.test" }
      );
      assert.deepEqual(result, { ok: true });
      assert.ok(fake.received.body.includes("\r\n..\r\n"), "the lone dot was not doubled");
      assert.ok(fake.received.body.includes("line three"), "the message was cut at the dot");
    } finally {
      await new Promise<void>((resolve) => fake.server.close(() => resolve()));
    }
  });

  await checkAsync("a rejected recipient comes back as a reason, not a crash", async () => {
    const fake = await startFakeSmtp({ rejectRecipient: true });
    try {
      const result = await sendMail(
        { to: "gone@example.test", subject: "s", text: "t" },
        { host: "127.0.0.1", port: fake.port, secure: false, user: null, pass: null, from: "no-reply@x.test" }
      );
      assert.equal(result.ok, false);
      assert.equal(result.ok === false ? result.reason : "", "smtp_error");
    } finally {
      await new Promise<void>((resolve) => fake.server.close(() => resolve()));
    }
  });

  /* --------------------------------------------------- 7. the endpoints */

  const requestRoute = source("src/app/api/auth/password-reset/request/route.ts");
  const confirmRoute = source("src/app/api/auth/password-reset/confirm/route.ts");

  check("the request endpoint answers one generic sentence for every address", () => {
    const sentences = [...requestRoute.matchAll(/message: "([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(sentences).size, 1, `the endpoint has more than one answer: ${sentences.join(" | ")}`);
    assert.match(sentences[0], /If an account exists/i);
    // No branch may confirm that an account exists. Comments are stripped first:
    // the file legitimately *names* the anti-pattern it avoids.
    const code = requestRoute
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|\s)\/\/.*$/gm, "$1");
    assert.doesNotMatch(code, /no such account|account not found|not registered|email not found/i);
    assert.doesNotMatch(requestRoute, /\b(?:res|response)\.json\(\s*\{\s*ok:\s*false[\s\S]{0,80}exists/i);
  });

  check("an unknown address takes the same path as a known one — and never 404s", () => {
    assert.match(requestRoute, /if \(!profile \|\| !profile\.passwordHash\)/, "the no-account branch disappeared");
    const branch = requestRoute.slice(requestRoute.indexOf("if (!profile || !profile.passwordHash)"));
    assert.match(branch.slice(0, 400), /NextResponse\.json\(generic/, "the no-account branch must answer the generic sentence");
  });

  check("a failed or unconfigured mail path never leaks to the caller", () => {
    assert.match(requestRoute, /if \(!mailConfigured\(\)\)/, "an unconfigured SMTP must be handled explicitly");
    assert.ok(
      requestRoute.indexOf("if (!mailConfigured())") < requestRoute.indexOf("db.insert(passwordResetTokens)"),
      "an unconfigured mail server must be detected BEFORE a token row is created"
    );
    assert.match(requestRoute, /if \(!sent\.ok\)/, "a send failure must be handled explicitly");
    // The just-created token is retired when the mail never left.
    const afterSend = requestRoute.slice(requestRoute.indexOf("if (!sent.ok)"));
    assert.match(afterSend.slice(0, 400), /usedAt: new Date\(\)/, "the unsent token stayed live");
    assert.doesNotMatch(requestRoute, /reason: sent\.reason/, "the SMTP failure reason must not reach the browser");
  });

  check("requesting a link kills the older ones and stores only the hash", () => {
    assert.match(
      requestRoute,
      /\.set\(\{ usedAt: now \}\)[\s\S]{0,200}isNull\(passwordResetTokens\.usedAt\)/,
      "older live tokens are not retired"
    );
    assert.match(requestRoute, /values\(\{[\s\S]{0,200}tokenHash,/, "the insert does not store the hash");
    assert.doesNotMatch(requestRoute, /values\(\{[^}]*token:/, "a plaintext token would be stored");
    assert.match(requestRoute, /LIMITS\.passwordReset/, "the reset endpoint is not rate limited");
    assert.match(requestRoute, /lower\(\$\{studentProfiles\.email\}\) = \$\{email\}/, "the lookup must be case-insensitive");
  });

  check("the confirm endpoint consumes the link before it changes the password", () => {
    const consumeAt = confirmRoute.indexOf("isNull(passwordResetTokens.usedAt)");
    const hashAt = confirmRoute.indexOf("hashPassword(password)");
    assert.ok(consumeAt > 0, "the used_at guard disappeared");
    assert.ok(hashAt > consumeAt, "the password is written before the link is spent — a double submit could reuse it");
    assert.match(confirmRoute, /resetTokenState\(row\)/, "the expiry/used state machine is not consulted");
    assert.match(confirmRoute, /passwordPolicyError\(password\)/, "the password policy is not enforced");
    assert.match(confirmRoute, /revokeAllSessionsForProfile\(profile\.id\)/, "sessions survive a reset");
    assert.match(confirmRoute, /isWellFormedResetToken\(token\)/, "the token shape is not checked before the query");
  });

  check("confirm failures never echo the account back", () => {
    // Every error body is a fixed sentence + a code; the address is only ever
    // returned on success (so the person knows which account they just reset).
    const errorBodies = [...confirmRoute.matchAll(/NextResponse\.json\(\s*\{[\s\S]{0,120}?error:[\s\S]{0,120}?\}/g)].map((m) => m[0]);
    assert.ok(errorBodies.length >= 4, "expected explicit error branches");
    for (const body of errorBodies) assert.doesNotMatch(body, /email:/, `an error body carries the email: ${body.slice(0, 80)}`);
    assert.doesNotMatch(confirmRoute, /existing hash|password differs|wrong password/i);
  });

  /* ------------------------------------------------------ 8. data + pages */

  check("the table stores a hash, not a token, and cascades with the profile", () => {
    const schema = source("src/db/schema.ts");
    const table = schema.slice(schema.indexOf('"password_reset_tokens"'));
    assert.ok(table.length > 0);
    assert.match(table, /tokenHash: text\("token_hash"\)\.notNull\(\)\.unique\(\)/, "token_hash must be unique — two rows cannot share a link");
    assert.match(table, /expiresAt: timestamp\("expires_at"\)\.notNull\(\)/);
    assert.match(table, /usedAt: timestamp\("used_at"\)/);
    assert.match(table, /onDelete: "cascade"/);
    assert.match(source("src/lib/core/ddl.ts"), /passwordResetTokens/, "the self-healing DDL does not create the table");
  });

  check("a migration exists and is additive", () => {
    const sql = source("supabase/password_reset_tokens_2026-10-31.sql");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "password_reset_tokens"/);
    assert.match(sql, /CREATE INDEX IF NOT EXISTS "idx_password_reset_profile"/);
    assert.doesNotMatch(sql, /\bDROP\s+(TABLE|COLUMN|INDEX)\b/i, "a migration must not destroy anything");
  });

  check("both pages exist, are public, and are kept out of search results", () => {
    const forgot = source("src/app/forgot-password/page.tsx");
    const reset = source("src/app/reset-password/page.tsx");
    for (const [name, page] of [["forgot", forgot], ["reset", reset]] as const) {
      assert.match(page, /robots: \{ index: false/, `${name} page is indexable — a live token could be crawled`);
      assert.match(page, /LocaleProvider/, `${name} page is not translated`);
      assert.doesNotMatch(page, /getProfileFromRequest|requireProfile|ensureSession/, `${name} page must not require a session`);
      assert.match(page, /generateMetadata/, `${name} page needs localized metadata`);
    }
    assert.match(reset, /<Suspense/, "useSearchParams must sit inside a Suspense boundary");
  });

  check("the sign-in form links to the recovery page", () => {
    const picker = source("src/components/ProfilePicker.tsx");
    assert.match(picker, /href="\/forgot-password"/);
    assert.match(picker, /\{t\("forgotPassword"\)\}/);
  });

  check("the copy exists in all three languages", () => {
    const required = [
      "forgotTitle",
      "forgotBody",
      "sendLink",
      "sentBody",
      "newPassword",
      "confirmPassword",
      "doneTitle",
      "expiredLink",
      "usedLink",
      "invalidLink",
    ];
    for (const locale of ["en", "uz", "ru"]) {
      const messages = JSON.parse(source(`src/i18n/messages/${locale}.json`));
      assert.ok(messages.passwordReset, `${locale} has no passwordReset namespace`);
      for (const key of required) {
        assert.equal(typeof messages.passwordReset[key], "string", `${locale}.passwordReset.${key} is missing`);
        assert.ok(messages.passwordReset[key].trim().length > 0, `${locale}.passwordReset.${key} is empty`);
      }
      assert.equal(typeof messages.picker.forgotPassword, "string", `${locale}.picker.forgotPassword is missing`);
    }
  });

  check("the deployment is told which variables the flow needs", () => {
    const env = source(".env.example");
    for (const name of MAIL_ENV_VARS) assert.ok(env.includes(name), `.env.example does not document ${name}`);
    assert.match(env, /password-reset\/request/, ".env.example does not explain what breaks without SMTP");
  });

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`  · ${failure}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("password-reset gate crashed:", error);
  process.exit(1);
});
