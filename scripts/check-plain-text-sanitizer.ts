import assert from "node:assert/strict";
import { sanitizePastedPlainText } from "../src/lib/plainTextSanitizer";

assert.equal(sanitizePastedPlainText("A\r\nB\u00a0C\u2018D\u201dE\u2014F\u2026G\u200b"), "A\nB C'D\"E-F...G");
assert.equal(sanitizePastedPlainText("plain text"), "plain text");
console.log("Plain-text paste sanitizer checks passed.");
