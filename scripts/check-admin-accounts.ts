/**
 * Phase AH gate — admin-assisted account recovery.
 *
 * The student asked for their password back. Nobody can hand it over: it exists
 * only as `scrypt:<salt>:<hash>`. So the honest feature is the one this file
 * pins — an administrator can *replace* a password or *hand out a link*, never
 * read one, and every one of those actions is authenticated, bounded, audited
 * and leaves the old sessions dead.
 *
 * What is asserted here:
 *
 *   1. the generated temporary password is strong, readable over the phone, and
 *      satisfies the same policy every other password must;
 *   2. NO admin surface can return a password hash, and the list query never
 *      selects it into a response;
 *   3. both admin actions re-authenticate the acting admin (a stolen cookie
 *      alone cannot take an account over) and are rate limited;
 *   4. a reset revokes the target's sessions and retires any older reset link,
 *      so "one password, one way in" holds;
 *   5. the reset link is the SAME token pipeline as the emailed flow (same
 *      table, same 60-minute single-use rule, same page) — there is no second
 *      reset implementation;
 *   6. the audit entry names the administrator and never contains a credential;
 *   7. the admin panel mounted the tab in all three languages, and an admin
 *      editing someone else's password no longer receives that student's
 *      session cookie;
 *   8. a refusal is never a dead end: the panel names the account whose password
 *      it wants, and "wrong password", "no password yet" and "old hash format"
 *      are three different, translated answers with the same way out;
 *   9. an operator who has forgotten their own password can replace it from the
 *      same screen (session = proof, no target, policy applied, other devices
 *      dropped, this one kept, audited).
 *
 * Run: npm run test:admin-accounts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// Pure module on purpose: this gate must run with no database.
import { ADMIN_ACCOUNT_PAGE, generateTemporaryPassword, passwordHashFormat } from "../src/lib/adminAccountRules";
import { passwordPolicyError } from "../src/lib/password";
import { RESET_TOKEN_PATTERN } from "../src/lib/passwordReset";

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

const source = (relative: string) => readFileSync(join(ROOT, relative), "utf8");
/** Comments describe the anti-pattern we avoid; assertions must read code only. */
const code = (relative: string) =>
  source(relative)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");

/* ------------------------------------------- 1. the temporary password */

check("a temporary password satisfies the same policy as any other", () => {
  for (let i = 0; i < 200; i++) {
    const password = generateTemporaryPassword();
    assert.equal(passwordPolicyError(password), null, `generated a non-compliant password: ${password}`);
  }
});

check("a temporary password is long, grouped and unambiguous", () => {
  const password = generateTemporaryPassword();
  assert.match(password, /^[a-zA-Z0-9]{4}(-[a-zA-Z0-9]{4}){3}$/, `unexpected shape: ${password}`);
  assert.ok(password.length >= 16, "too short to read out safely");
  // No look-alike characters: 0/O, 1/l/I, 5/S.
  for (const bad of ["0", "O", "o", "1", "l", "I", "5", "S", "s"]) {
    assert.ok(!password.includes(bad), `ambiguous character "${bad}" in ${password}`);
  }
});

check("200 temporary passwords are all different", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 200; i++) seen.add(generateTemporaryPassword());
  assert.equal(seen.size, 200, "the generator is not using real entropy");
});

/* ------------------------------- 2. no surface can reveal a credential */

check("the account list never selects a hash into the response", () => {
  const lib = source("src/lib/adminAccounts.ts") + source("src/lib/adminAccountRules.ts");
  // The hash may be READ (to answer "does a password exist"), never returned.
  assert.match(lib, /passwordHash: studentProfiles\.passwordHash/, "hasPassword needs the column");
  assert.match(lib, /hasPassword: Boolean\(row\.passwordHash\)/, "the hash must collapse to a boolean");
  assert.match(lib, /interface AccountQueryRow[\s\S]*?passwordHash: string \| null;/, "the raw row type changed");
  // The returned shape has no hash field at all.
  // Comments are stripped: they legitimately SAY the word "hash" while
  // explaining that no such field exists.
  const rules = code("src/lib/adminAccountRules.ts");
  const shape = rules.slice(rules.indexOf("export interface AdminAccountRow"), rules.indexOf("export function generateTemporaryPassword"));
  assert.doesNotMatch(shape, /passwordHash/, "AdminAccountRow exposes a hash field");
  assert.doesNotMatch(shape, /\bhash\b/i, "AdminAccountRow exposes a hash-like field");
});

check("no admin route returns a hash or a plain stored password", () => {
  for (const route of [
    "src/app/api/admin/accounts/route.ts",
    "src/app/api/admin/accounts/[id]/password/route.ts",
    "src/app/api/admin/accounts/[id]/reset-link/route.ts",
  ]) {
    const body = code(route);
    assert.doesNotMatch(body, /passwordHash\s*[,}]/, `${route} returns a password hash`);
    assert.doesNotMatch(body, /hash:/, `${route} returns a hash field`);
  }
});

check("the panel states why a password cannot be shown, instead of hiding it", () => {
  const panel = code("src/components/admin/AccountsManager.tsx");
  assert.match(panel, /whyNoPassword/, "the panel never explains the one-way hash");
  assert.doesNotMatch(panel, /reveal.*password|showPassword|viewPassword/i, "the panel offers a reveal control");
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(source(`src/i18n/messages/${locale}.json`));
    assert.equal(typeof messages.adminAccounts.whyNoPassword, "string", `${locale} has no explanation`);
    assert.ok(messages.adminAccounts.whyNoPassword.length > 40, `${locale} explanation is a stub`);
  }
});

/* ------------------- 2b. a refusal must say what is actually wrong */

check("a stored hash is classified before it is compared", () => {
  assert.equal(passwordHashFormat(null), "none");
  assert.equal(passwordHashFormat(undefined), "none");
  assert.equal(passwordHashFormat(""), "none");
  // The format every path in this app writes.
  assert.equal(passwordHashFormat("scrypt:abc123:deadbeef"), "verifiable");
  // Something this build cannot check must NOT be reported as a wrong password.
  for (const legacy of ["pbkdf2:1000:aa:bb", "sha256$deadbeef", "plaintext", "scrypt:onlysalthash", "scrypt::"]) {
    assert.equal(passwordHashFormat(legacy), "legacy", `misread as verifiable: ${legacy}`);
  }
});

check("re-authentication distinguishes a typo from an uncheckable hash", () => {
  const lib = code("src/lib/adminAccounts.ts");
  assert.match(lib, /passwordHashFormat\(storedHash\)/, "the re-auth path skips the format check");
  assert.match(lib, /code: "password_format_legacy"/, "an old hash is reported as a wrong password");
  assert.match(lib, /code: "password_not_set"/, "a missing password is reported as a wrong password");
  assert.match(lib, /code: "invalid_password"/, "a real mismatch must still say so");
  // The three outcomes are ordered: none and legacy return BEFORE verifyPassword.
  const legacyAt = lib.indexOf('code: "password_format_legacy"');
  const verifyAt = lib.indexOf("verifyPassword(password, storedHash)");
  assert.ok(legacyAt > 0 && verifyAt > legacyAt, "verifyPassword runs before the format is known");
});

check("the list tells the panel WHO is signed in", () => {
  const route = code("src/app/api/admin/accounts/route.ts");
  assert.match(route, /adminViewer\(access\.session\.profile\.id\)/, "the list does not identify the acting admin");
  assert.match(route, /viewer/, "the viewer is not in the response");
  const lib = code("src/lib/adminAccounts.ts");
  assert.match(lib, /export async function adminViewer/, "adminViewer is missing");
  const rules = code("src/lib/adminAccountRules.ts");
  const shape = rules.slice(rules.indexOf("export interface AdminViewerRow"), rules.indexOf("export type PasswordHashFormat"));
  assert.doesNotMatch(shape, /passwordHash/, "AdminViewerRow exposes a hash field");
  assert.doesNotMatch(shape, /\bhash\b/i, "AdminViewerRow exposes a hash-like field");
});

check("the panel names the account and localizes every refusal", () => {
  const panel = code("src/components/admin/AccountsManager.tsx");
  // The field must say whose password it wants.
  assert.match(panel, /yourPasswordWhose/, "the field never says whose password it wants");
  assert.match(panel, /viewer\?\.email/, "the panel does not show the signed-in account");
  assert.match(panel, /openProfile/, "there is no way out for an admin who cannot reproduce their password");
  const messages = JSON.parse(source("src/i18n/messages/en.json"));
  for (const code of [
    "invalid_password",
    "password_not_set",
    "password_format_legacy",
    "rate_limited",
    "app_url_missing",
    "self_target",
    "weak_password",
    "ambiguous_request",
    "not_found",
  ]) {
    // Each server code maps to a translated next step, not to a raw English string.
    const camel = code.replace(/_(.)/g, (_m, c: string) => c.toUpperCase());
    const key = `err${camel[0].toUpperCase()}${camel.slice(1)}`;
    assert.ok(panel.includes(`case "${code}"`), `the panel does not handle ${code}`);
    assert.ok(panel.includes(`t("${key}"`), `no translated message for ${code}`);
    for (const locale of ["en", "uz", "ru"]) {
      const ns = JSON.parse(source(`src/i18n/messages/${locale}.json`)).adminAccounts;
      assert.equal(typeof ns[key], "string", `${locale} is missing ${key}`);
      assert.ok(ns[key].length > 20, `${locale}.${key} is a stub`);
    }
  }
});

/* ------------------------------------- 3. the administrator is re-proven */

check("both actions re-authenticate the acting admin, not just the cookie", () => {
  for (const route of [
    "src/app/api/admin/accounts/[id]/password/route.ts",
    "src/app/api/admin/accounts/[id]/reset-link/route.ts",
  ]) {
    const body = code(route);
    assert.match(body, /requireAdmin\(req\)/, `${route} is not admin-only`);
    assert.match(body, /verifyAdminReauth\(access\.session\.profile\.id/, `${route} does not re-authenticate the admin`);
    assert.match(body, /adminPassword/, `${route} does not accept the admin's password`);
  }
});

check("re-authentication is rate limited and compares against a real hash", () => {
  const lib = source("src/lib/adminAccounts.ts");
  assert.match(lib, /checkSharedRateLimit\(`admin-account-pw:\$\{adminId\}`/, "the attempt counter is not shared");
  assert.match(lib, /LIMITS\.signIn/, "the attempt budget is not the sign-in budget");
  assert.match(lib, /verifyPassword\(password, storedHash\)/, "the password is not verified against the stored hash");
  assert.match(lib, /code: "invalid_password"/);
  // A missing password on the ADMIN's own account is refused, not treated as ok.
  assert.match(lib, /code: "password_not_set"/);
  assert.match(lib, /if \(format === "none" \|\| !storedHash\)/, "the missing-password guard disappeared");
});

check("an admin cannot reset their own password through this screen", () => {
  const body = code("src/app/api/admin/accounts/[id]/password/route.ts");
  assert.match(body, /targetId === access\.session\.profile\.id/, "the self-target guard disappeared");
  assert.match(body, /code: "self_target"/);
});

check("the two actions are mutually exclusive in one request", () => {
  const body = code("src/app/api/admin/accounts/[id]/password/route.ts");
  assert.match(body, /wantsGenerated && typed/, "a request may carry both a password and a generate flag");
  assert.match(body, /code: "ambiguous_request"/);
  assert.match(body, /passwordPolicyProblem\(newPassword\)/, "the policy is not applied to an admin-set password");
  assert.match(body, /hashPassword\(newPassword\)/, "the password is not hashed before storage");
  assert.doesNotMatch(body, /values\(\{[^}]*password:/, "a plain password would be stored");
});

/* -------------------- 4. one password, one way in: sessions and links die */

check("changing a password revokes the target's sessions and retires old links", () => {
  const body = code("src/app/api/admin/accounts/[id]/password/route.ts");
  assert.match(body, /revokeAllSessionsForProfile\(target\.id\)/, "open sessions survive a reset");
  assert.match(body, /retireLiveResetTokens\(target\.id, now\)/, "an older reset link survives the reset");
  assert.match(body, /passwordChangedAt: now/, "the change is not recorded on the account");
});

check("retiring links stamps used_at rather than deleting rows", () => {
  const lib = source("src/lib/adminAccounts.ts");
  assert.match(lib, /set\(\{ usedAt: now \}\)[\s\S]{0,200}isNull\(passwordResetTokens\.usedAt\)/, "older live links are not retired");
  assert.doesNotMatch(lib, /delete\(passwordResetTokens\)/, "links are deleted instead of retired — the audit trail is lost");
});

check("an admin-changed password no longer hands the admin the student's session", () => {
  const body = code("src/app/api/profiles/[id]/route.ts");
  const marker = body.indexOf("actorIsTarget");
  assert.ok(marker > 0, "the ownership check for the session cookie disappeared");
  const cookieBlock = body.slice(body.indexOf('if (newPasswordHash && updatedProfile'));
  assert.match(cookieBlock.slice(0, 260), /actorIsTarget/, "the cookie is still issued for any target");
  assert.match(body, /revokeAllSessionsForProfile\(profileId\)/, "an admin reset does not revoke the student's sessions");
});

/* ------------------------ 5. the link uses the one reset implementation */

check("the admin link is the same token pipeline as the emailed link", () => {
  const body = code("src/app/api/admin/accounts/[id]/reset-link/route.ts");
  assert.match(body, /createResetToken\(now\)/, "the link does not come from the shared token module");
  assert.match(body, /resetLinkFor\(origin, token\)/, "the URL is built by hand instead of resetLinkFor");
  assert.match(body, /passwordResetTokens\)\.values\(/, "the token row is not written to the shared table");
  assert.match(body, /tokenHash/, "only the hash may be stored");
  assert.doesNotMatch(body, /values\(\{[^}]*\btoken:/, "the raw token would be stored");
  // Same page the emailed link opens.
  assert.match(source("src/lib/passwordReset.ts"), /\/reset-password\?token=/);
});

check("the link needs no mail server — that is the point of the endpoint", () => {
  const body = code("src/app/api/admin/accounts/[id]/reset-link/route.ts");
  assert.doesNotMatch(body, /sendMail|mailConfigured/, "the endpoint depends on SMTP");
  assert.match(body, /delivered: false/, "the response does not state that nothing was emailed");
});

check("an unconfigured APP_URL is refused rather than producing a relative link", () => {
  const body = code("src/app/api/admin/accounts/[id]/reset-link/route.ts");
  assert.match(body, /configuredAppUrl\(\)/, "the link origin is not the canonical app URL");
  assert.match(body, /code: "app_url_missing"/);
});

check("the issued token has the same shape and lifetime as any other", () => {
  assert.equal(RESET_TOKEN_PATTERN.source, "^[A-Za-z0-9_-]{43}$", "the token shape drifted from the reset module");
  const body = code("src/app/api/admin/accounts/[id]/reset-link/route.ts");
  assert.match(body, /expiresAt/, "the response does not state the expiry");
  assert.match(body, /ttlMinutes/, "the response does not state the remaining life");
});

/* ---------------------- 5b. the operator can replace their own password */

check("an admin can replace their OWN password without the old one", () => {
  const body = code("src/app/api/admin/accounts/me/password/route.ts");
  // Admin-only, and it takes no target: it can never be pointed at somebody else.
  assert.match(body, /requireAdmin\(req\)/, "the self-service route is not admin-gated");
  assert.doesNotMatch(body, /params/, "the route accepts a target — it must always act on the caller");
  assert.match(body, /access\.session\.profile\.id/, "the target is not the signed-in account");
  // The signed-in session is the proof, exactly like the profile editor.
  assert.doesNotMatch(body, /verifyAdminReauth/, "an old password is required, which is the dead end");
  // ...but the normal policy still applies, and a typo cannot lock the operator out.
  assert.match(body, /passwordPolicyProblem\(password\)/, "the password policy is skipped");
  assert.match(body, /code: "confirm_mismatch"/, "a mistyped password can be saved unchecked");
  assert.match(body, /hashPassword\(password\)/, "the password is not hashed");
  assert.doesNotMatch(body, /values\(\{[^}]*password:/, "a plain password would be stored");
});

check("changing your own password keeps this device and drops the rest", () => {
  const body = code("src/app/api/admin/accounts/me/password/route.ts");
  assert.match(body, /revokeAllSessionsForProfile\(adminId\)/, "other devices survive the change");
  assert.match(body, /signSessionToken\(\{ id: adminId, passwordHash: newHash \}\)/, "the browser is not given a session for the new password");
  assert.match(body, /sessionCookieFromToken\(token, req\)/, "no cookie is set, so the operator is logged out");
  // Revoking must happen BEFORE the fresh token is adopted, or it dies at once.
  const revokeAt = body.indexOf("revokeAllSessionsForProfile(adminId)");
  const adoptAt = body.indexOf("checkSessionRecord(token");
  assert.ok(revokeAt > 0 && adoptAt > revokeAt, "the new session is revoked by the cleanup");
  assert.match(body, /passwordChangedAt: now/, "the change is not recorded on the account");
  assert.match(body, /otherSessionsRevoked: true/, "the response does not say the other devices were dropped");
});

check("the self-service password change is audited and rate limited", () => {
  const body = code("src/app/api/admin/accounts/me/password/route.ts");
  assert.match(body, /checkSharedRateLimit\(`admin-self-password:\$\{adminId\}`/, "no shared attempt counter");
  assert.match(body, /auditPasswordAction\(\{/, "the change is not audited");
  assert.match(body, /action: "admin_self_password"/, "the audit action is unset");
  assert.match(source("src/lib/adminAccounts.ts"), /admin_self_password/, "the audit action is not supported");
  // The response may carry the generated password ONCE; never a hash.
  assert.doesNotMatch(body, /passwordHash\s*[,}]/, "the response leaks a hash");
});

check("the panel offers self-service recovery where the failure happens", () => {
  const panel = code("src/components/admin/AccountsManager.tsx");
  assert.match(panel, /\/api\/admin\/accounts\/me\/password/, "the panel cannot change its own password");
  assert.match(panel, /changeOwnPassword/, "no handler is wired");
  assert.match(panel, /generate: true/, "no way to get a readable password");
  assert.match(panel, /selfOpen/, "the card is not rendered");
  // After a successful change the value must not have to be retyped.
  assert.match(panel, /setAdminPassword\(shown\)/, "the operator must retype the password they just set");
  for (const locale of ["en", "uz", "ru"]) {
    const ns = JSON.parse(source(`src/i18n/messages/${locale}.json`)).adminAccounts;
    for (const key of ["selfTitle", "selfBody", "selfOpen", "selfSave", "selfGenerate", "selfDoneBody"]) {
      assert.equal(typeof ns[key], "string", `${locale} is missing ${key}`);
    }
  }
});

/* ----------------------------------------------- 6. the audit trail */

check("every password action is audited with the administrator's name", () => {
  const lib = source("src/lib/adminAccounts.ts");
  assert.match(lib, /entityType: "profile"/, "the audit row is not tied to the account");
  assert.match(lib, /actor: input\.actorEmail/, "the audit row does not name the administrator");
  assert.match(lib, /"replaced with a temporary password by an administrator"/, "the audit text changed shape");
  for (const route of [
    "src/app/api/admin/accounts/[id]/password/route.ts",
    "src/app/api/admin/accounts/[id]/reset-link/route.ts",
  ]) {
    assert.match(code(route), /auditPasswordAction\(/, `${route} does not audit the action`);
  }
});

check("neither the password nor the token is ever logged", () => {
  for (const route of [
    "src/app/api/admin/accounts/[id]/password/route.ts",
    "src/app/api/admin/accounts/[id]/reset-link/route.ts",
    "src/lib/adminAccounts.ts",
  ]) {
    const body = source(route);
    const logs = [...body.matchAll(/console\.(?:log|info|warn|error)\(([\s\S]{0,400}?)\);/g)].map((m) => m[1]);
    for (const line of logs) {
      assert.doesNotMatch(line, /\$\{newPassword\}|\$\{link\}|\$\{token\}|\$\{typed\}/, `${route} logs a credential`);
    }
  }
});

/* -------------------------------- 7. what the administrator actually sees */

check("the list reports state, never a credential", () => {
  const lib = source("src/lib/adminAccounts.ts");
  const shape = source("src/lib/adminAccountRules.ts");
  for (const field of ["hasPassword", "passwordChangedAt", "liveSessions", "lastSeenAt", "telegram"]) {
    assert.ok(shape.includes(field), `AdminAccountRow is missing ${field}`);
  }
  assert.equal(ADMIN_ACCOUNT_PAGE, 25, "the page size changed");
  assert.match(lib, /Math\.min\(Math\.max\(Number\(input\.limit\) \|\| ADMIN_ACCOUNT_PAGE, 1\), 100\)/, "the page size is unbounded");
});

check("the panel is mounted and translated in all three languages", () => {
  const panel = source("src/components/AdminPanel.tsx");
  assert.match(panel, /import \{ AccountsManager \}/, "the section is not imported");
  assert.match(panel, /case "accounts":\s*\n\s*return <AccountsManager[\s\S]{0,80}?\/>;/, "the section is not rendered");
  assert.match(panel, /\{ id: "accounts", group: "system"/, "the tab is not in the sidebar");
  for (const locale of ["en", "uz", "ru"]) {
    const messages = JSON.parse(source(`src/i18n/messages/${locale}.json`));
    assert.equal(typeof messages.admin.tab.accounts, "string", `${locale}: admin.tab.accounts missing`);
    assert.equal(typeof messages.admin.desc.accounts, "string", `${locale}: admin.desc.accounts missing`);
    for (const key of [
      "linkTitle",
      "linkBody",
      "linkReady",
      "passwordTitle",
      "passwordShownOnce",
      "yourPassword",
      "hasPassword",
      "sessions",
    ]) {
      assert.equal(typeof messages.adminAccounts[key], "string", `${locale}: adminAccounts.${key} missing`);
    }
  }
});

check("the client component calls both endpoints and asks for the admin password first", () => {
  const panel = code("src/components/admin/AccountsManager.tsx");
  assert.match(panel, /\/api\/admin\/accounts\?q=\$\{/, "the list is not loaded from the admin endpoint");
  assert.match(panel, /\/api\/admin\/accounts\/\$\{selected\.id\}\/reset-link/, "the reset-link action is missing");
  assert.match(panel, /\/api\/admin\/accounts\/\$\{selected\.id\}\/password/, "the password action is missing");
  assert.match(panel, /disabled=\{[^}]*!adminPassword/, "an action can run without the admin's password");
  assert.match(panel, /navigator\.clipboard\.writeText/, "the link cannot be copied");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
