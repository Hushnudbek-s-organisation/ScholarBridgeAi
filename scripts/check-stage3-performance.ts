import assert from "node:assert/strict";
import { isUsefulSemanticQuery } from "../src/lib/ai/semanticQuery";
import { privateNoStoreJson } from "../src/lib/apiResponse";

// Short exact-match fragments remain handled by lexical search and must not
// trigger external vector work; Unicode catalogue queries stay supported.
assert.equal(isUsefulSemanticQuery("a"), false);
assert.equal(isUsefulSemanticQuery("MIT"), false);
assert.equal(isUsefulSemanticQuery("  !!!  "), false);
assert.equal(isUsefulSemanticQuery("Tokyo"), true);
assert.equal(isUsefulSemanticQuery("Тошкент"), true);
assert.equal(isUsefulSemanticQuery("to'liq stipendiya"), true);

const privateResponse = privateNoStoreJson({ ok: true }, { headers: { Vary: "Cookie" } });
assert.equal(privateResponse.headers.get("cache-control"), "private, no-store");
assert.equal(privateResponse.headers.get("vary"), "Cookie");
console.log("Stage 3 performance and response-hygiene checks passed.");
