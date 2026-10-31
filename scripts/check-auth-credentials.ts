/**
 * Sign-up / sign-in credential checks.
 *
 * Guards the exact defects behind the "correct password is rejected" and
 * "8-character password is refused" reports:
 *
 *  1. the value hashed at sign-up and the value compared at sign-in were
 *     normalised differently (sign-up trimmed, sign-in did not) — an account
 *     could be created and then never signed into;
 *  2. every policy refusal was reported as "at least 8 characters", including
 *     passwords that were long enough but on the blocked list;
 *  3. a successful sign-in did not clear the failed-attempt counter, so a few
 *     typos (or repeated sign-out / sign-in) turned a valid password into 429.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normalisePassword,
  passwordPolicyError,
  passwordPolicyProblem,
  hashPassword,
  verifyPassword,
} from "../src/lib/password";
import { MIN_PASSWORD_LENGTH } from "../src/lib/passwordPolicy";

let passed = 0;
function check(label: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ✓ ${label}`);
}

const root = path.resolve(import.meta.dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

console.log("Password normalisation (sign-up and sign-in must agree)");
check("leading and trailing spaces are trimmed", () => {
  assert.equal(normalisePassword("  secret12345  "), "secret12345");
  assert.equal(normalisePassword("secret12345"), "secret12345");
});
check("the hash is created from the trimmed value", () => {
  const stored = hashPassword("  secret12345  ");
  assert.equal(verifyPassword("secret12345", stored), true);
  assert.equal(verifyPassword("  secret12345  ", stored), true);
});
check("a genuinely wrong password still fails", () => {
  const stored = hashPassword("secret12345");
  assert.equal(verifyPassword("secret1234", stored), false);
  assert.equal(verifyPassword("secret123456", stored), false);
});
check("a missing or malformed hash never verifies", () => {
  assert.equal(verifyPassword("secret12345", null), false);
  assert.equal(verifyPassword("secret12345", "plain:secret12345"), false);
});

console.log("Password policy reasons");
check(`exactly ${MIN_PASSWORD_LENGTH} characters is accepted`, () => {
  assert.equal(passwordPolicyError("abcd1234"), null);
  assert.equal(passwordPolicyProblem("abcd1234"), null);
});
check(`one character short is reported as too_short`, () => {
  assert.equal(passwordPolicyProblem("abcd123")?.problem, "too_short");
});
check(`a blocked ${MIN_PASSWORD_LENGTH}-character password is too_common, not too_short`, () => {
  assert.equal(passwordPolicyProblem("12345678")?.problem, "too_common");
  assert.equal(passwordPolicyProblem("qwerty123")?.problem, "too_common");
  assert.doesNotMatch(passwordPolicyProblem("12345678")?.message ?? "", /at least/i);
});
check("an over-long password is too_long", () => {
  assert.equal(passwordPolicyProblem("x".repeat(201))?.problem, "too_long");
});
check("whitespace padding cannot smuggle a short password through", () => {
  assert.equal(passwordPolicyProblem("   short   ")?.problem, "too_short");
});

console.log("Wiring");
check("the sign-in route normalises the candidate password", () => {
  const src = read("src/app/api/auth/sign-in/route.ts");
  assert.match(src, /normalisePassword\(parsed\.body\.password/);
  assert.match(src, /clearSharedRateLimit\(`signin:email:/);
});
check("the sign-up route reports a machine-readable policy reason", () => {
  const src = read("src/app/api/profiles/route.ts");
  assert.match(src, /reason: policyProblem\.problem/);
  assert.match(src, /passwordPolicyProblem\(plainPassword\)/);
});
check("the wizard explains a blocked password instead of its length", () => {
  const src = read("src/components/OnboardingWizard.tsx");
  assert.match(src, /data\.reason === "too_common"/);
  assert.match(src, /passwordTooCommon/);
});
check("the wizard no longer prints one blanket sentence for three fields", () => {
  const src = read("src/components/OnboardingWizard.tsx");
  assert.match(src, /step0Problems\.join\(" · "\)/);
  assert.match(src, /errorEmailInvalid/);
});
check("the sign-in form reveals the password and offers recovery", () => {
  const src = read("src/components/ProfilePicker.tsx");
  assert.match(src, /showPassword \? "text" : "password"/);
  assert.match(src, /createWithThisEmail/);
});

console.log(`\n${passed} assertions passed.`);
