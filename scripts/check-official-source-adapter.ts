/**
 * Behavior guard for the server official-source adapter (§10, §3).
 *
 * Every network/DB dependency is injected, so this proves REAL parsing and
 * SSRF behavior offline: HTTP 200 alone is never verification, a fact must be
 * found near its label at the official host, redirects/DNS/timeout/size are
 * all re-validated, and `mayRefreshVerifiedDate` gates the verified date.
 *
 * Referenced by the docblock in src/lib/officialSourceAdapter.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  htmlToText,
  fieldLabelTokens,
  verifyFactOnPage,
  fetchOfficialPage,
  createOfficialSourceAdapter,
  DEFAULT_FETCH_POLICY,
  type OfficialSourceTarget,
  type OfficialSourceCheckResult,
  type FetchDeps,
} from "../src/lib/officialSourceAdapter";
import { mayRefreshVerifiedDate } from "../src/lib/evidencePolicy";

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
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const PUBLIC_DNS = async () => [{ address: "93.184.216.34" }];
const target: OfficialSourceTarget = {
  entityType: "scholarship",
  entityId: 894,
  fieldKey: "min_ielts",
  expectedValue: "7.0",
  sourceUrl: "https://yenchingacademy.pku.edu.cn/ADMISSIONS.htm",
  officialDomain: "yenchingacademy.pku.edu.cn",
  admissionCycle: "2027 intake",
};

function htmlResponse(html: string, status = 200, headers: Record<string, string> = {}) {
  return {
    status,
    headers: { get: (n: string) => headers[n.toLowerCase()] ?? null },
    text: async () => html,
    body: null,
  };
}

async function main() {
  console.log("Official-source adapter — parsing, SSRF and evidence rules");

  // ---- htmlToText ---------------------------------------------------------
  check("script/style/comment/hidden text is stripped before fact matching",
    !/secret|steal/.test(htmlToText("<p>IELTS 7.0</p><script>steal()</script><style>secret{}</style><!--hidden-->")) &&
    /IELTS 7\.0/.test(htmlToText("<p>IELTS 7.0</p>")));
  check("HTML entities are decoded so a published value can match",
    htmlToText("IELTS &amp; TOEFL &gt; 7.0") .includes("IELTS & TOEFL > 7.0"));

  // ---- fieldLabelTokens ---------------------------------------------------
  check("min_ielts resolves to the IELTS label, not a raw column name",
    fieldLabelTokens("min_ielts").includes("ielts"));
  check("min_gpa resolves to GPA / grade point average aliases",
    fieldLabelTokens("min_gpa").some((t) => /grade point average/.test(t)));

  // ---- verifyFactOnPage ---------------------------------------------------
  const good = verifyFactOnPage({
    html: "<h1>Admissions</h1><p>English requirement: IELTS 7.0 overall for the 2027 intake.</p>",
    status: 200,
    finalUrl: target.sourceUrl,
    target,
  });
  check("a 200 with the field label AND published value close together verifies the fact",
    good.verificationSucceeded && good.evidencePresent && good.verifiedFact === "min_ielts=7.0" && good.officialPageReRead);
  check("a verified result records a bounded, HTML-escaped evidence excerpt",
    good.evidenceExcerpt != null && good.evidenceExcerpt.length <= 240 && !/<script/.test(good.evidenceExcerpt));

  const noValue = verifyFactOnPage({
    html: "<p>IELTS requirement: see the English language page for details.</p>",
    status: 200, finalUrl: target.sourceUrl, target,
  });
  check("HTTP 200 alone is NOT verification when the specific value is absent",
    !noValue.verificationSucceeded && !noValue.evidencePresent && noValue.officialPageReRead &&
    /not found/i.test(noValue.reason ?? ""));

  const wrongHost = verifyFactOnPage({
    html: "<p>IELTS 7.0 overall</p>", status: 200,
    finalUrl: "https://third-party.example.com/ADMISSIONS.htm", target,
  });
  check("a fact on a non-official final host is refused (source mismatch)",
    !wrongHost.verificationSucceeded && /official source domain/.test(wrongHost.reason ?? ""));

  const subdomainOk = verifyFactOnPage({
    html: "<p>Minimum IELTS 7.0 for 2027 intake</p>", status: 200,
    finalUrl: "https://admissions.yenchingacademy.pku.edu.cn/ADMISSIONS.htm", target,
  });
  check("an official subdomain is accepted, not mistaken for a third party",
    subdomainOk.verificationSucceeded);

  const notFound = verifyFactOnPage({
    html: "<p>IELTS 7.0</p>", status: 404, finalUrl: target.sourceUrl, target,
  });
  check("a non-200 status never verifies a fact", !notFound.verificationSucceeded && /HTTP 404/.test(notFound.reason ?? ""));

  const parseError = verifyFactOnPage({
    html: "<script></script><style></style>", status: 200, finalUrl: target.sourceUrl, target,
  });
  check("an unreadable page is reported as a parse error, not a verified fact",
    parseError.officialPageReRead && !parseError.verificationSucceeded && /parse error/i.test(parseError.reason ?? ""));

  const farApart = verifyFactOnPage({
    html: `<p>IELTS requirement described here.</p>${" filler".repeat(200)}<p>7.0 appears far away.</p>`,
    status: 200, finalUrl: target.sourceUrl, target,
  });
  check("a value far from its field label is not attributed to that fact", !farApart.verificationSucceeded);

  const hiddenValue = verifyFactOnPage({
    html: "<p>IELTS requirement</p><script>var x = '7.0'</script>", status: 200, finalUrl: target.sourceUrl, target,
  });
  check("a value hidden in script text cannot satisfy the fact check", !hiddenValue.verificationSucceeded);

  // ---- fetchOfficialPage SSRF ---------------------------------------------
  let fetchCount = 0;
  const neverFetch: FetchDeps["fetchImpl"] = async () => { fetchCount++; return htmlResponse(""); };

  const httpOnly = await fetchOfficialPage("http://yenchingacademy.pku.edu.cn/a", DEFAULT_FETCH_POLICY, { fetchImpl: neverFetch, lookupImpl: PUBLIC_DNS });
  check("a non-https official URL is refused before any fetch", /https/.test(httpOnly.reason ?? "") && fetchCount === 0);

  const localhost = await fetchOfficialPage("https://localhost/admin", DEFAULT_FETCH_POLICY, { fetchImpl: neverFetch, lookupImpl: PUBLIC_DNS });
  check("a literal internal host is refused by the URL allowlist", /Refusing/.test(localhost.reason ?? "") && fetchCount === 0);

  const metadata = await fetchOfficialPage("https://169.254.169.254/latest/meta-data", DEFAULT_FETCH_POLICY, { fetchImpl: neverFetch, lookupImpl: PUBLIC_DNS });
  check("the cloud metadata IP is refused before DNS/fetch", /Refusing/.test(metadata.reason ?? "") && fetchCount === 0);

  const rebind = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", DEFAULT_FETCH_POLICY, {
    fetchImpl: neverFetch,
    lookupImpl: async () => [{ address: "127.0.0.1" }],
  });
  check("DNS resolving a public domain to a private IP (rebinding) is refused", /internal\/reserved address/.test(rebind.reason ?? "") && fetchCount === 0);

  const emptyDns = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", DEFAULT_FETCH_POLICY, {
    fetchImpl: neverFetch, lookupImpl: async () => [],
  });
  check("an empty DNS answer is refused, not treated as public", /no addresses/.test(emptyDns.reason ?? "") && fetchCount === 0);

  // Redirect that leaves https must not reach the next fetch.
  fetchCount = 0;
  const downgrade = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", DEFAULT_FETCH_POLICY, {
    lookupImpl: PUBLIC_DNS,
    fetchImpl: async () => { fetchCount++; return htmlResponse("", 302, { location: "http://internal.example/x" }); },
  });
  check("a redirect that downgrades to http is refused before the next hop",
    /redirect left https/.test(downgrade.reason ?? "") && fetchCount === 1);

  // Redirect to a literal internal address: next iteration re-validates the URL.
  fetchCount = 0;
  const internalRedirect = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", DEFAULT_FETCH_POLICY, {
    lookupImpl: PUBLIC_DNS,
    fetchImpl: async () => { fetchCount++; return htmlResponse("", 302, { location: "https://169.254.169.254/latest" }); },
  });
  check("a redirect to an internal IP is refused and the internal URL is never fetched",
    /Refusing/.test(internalRedirect.reason ?? "") && fetchCount === 1);

  // Too many redirects.
  const tooMany = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", { ...DEFAULT_FETCH_POLICY, maxRedirects: 1 }, {
    lookupImpl: PUBLIC_DNS,
    fetchImpl: async () => htmlResponse("", 302, { location: "https://yenchingacademy.pku.edu.cn/b" }),
  });
  check("a redirect chain beyond the cap is refused", /too many redirects/.test(tooMany.reason ?? ""));

  // Timeout: abort the request via the injected signal.
  const timedOut = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", { ...DEFAULT_FETCH_POLICY, timeoutMs: 15 }, {
    lookupImpl: PUBLIC_DNS,
    fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => {
        const e = new Error("aborted"); e.name = "AbortError"; reject(e);
      });
    }),
  });
  check("a stalled official page is aborted by the hard timeout", /timed out/.test(timedOut.reason ?? ""));

  // Streaming response-size cap (reader path).
  const oversized = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", { ...DEFAULT_FETCH_POLICY, maxBytes: 8 }, {
    lookupImpl: PUBLIC_DNS,
    fetchImpl: async () => ({
      status: 200,
      headers: { get: () => null },
      text: async () => "",
      body: { getReader: () => ({
        read: async () => ({ done: false, value: new Uint8Array(64) }),
        cancel: async () => undefined,
      }) },
    }),
  });
  check("a streaming response over the size cap is cancelled, not buffered", /response-size cap/.test(oversized.reason ?? ""));

  // text() fallback size cap.
  const oversizedText = await fetchOfficialPage("https://yenchingacademy.pku.edu.cn/a", { ...DEFAULT_FETCH_POLICY, maxBytes: 8 }, {
    lookupImpl: PUBLIC_DNS,
    fetchImpl: async () => htmlResponse("x".repeat(64)),
  });
  check("a non-streaming response over the size cap is refused too", /response-size cap/.test(oversizedText.reason ?? ""));

  // Happy path: a real 200 with the fact flows through the whole adapter.
  const persisted: OfficialSourceCheckResult[] = [];
  const adapter = createOfficialSourceAdapter({
    targets: [target],
    deps: {
      lookupImpl: PUBLIC_DNS,
      fetchImpl: async () => htmlResponse("<h1>Admissions</h1><p>English requirement: IELTS 7.0 overall for 2027 intake.</p>"),
    },
    persist: (r) => { persisted.push(r); },
    now: () => new Date("2026-11-06T00:00:00Z"),
  });
  const checks = await adapter("scholarships");
  check("the adapter returns one evidence-backed check per target", checks.length === 1);
  check("the adapter persists result + verified fact + source URL",
    persisted.length === 1 && persisted[0].verifiedFact === "min_ielts=7.0" &&
    persisted[0].sourceUrl === target.sourceUrl && persisted[0].admissionCycle === "2027 intake");
  check("only a successful evidence-backed check is allowed to refresh a verified date",
    mayRefreshVerifiedDate(checks[0]) === true);

  // Scope filtering.
  const scoped = await createOfficialSourceAdapter({
    targets: [target], deps: { lookupImpl: PUBLIC_DNS, fetchImpl: async () => htmlResponse("<p>IELTS 7.0</p>") },
  })("universities");
  check("a scholarships-only target is skipped for the universities scope", scoped.length === 0);

  // A failed page (parse error) must NOT move a verified date.
  const failedChecks = await createOfficialSourceAdapter({
    targets: [target],
    deps: { lookupImpl: PUBLIC_DNS, fetchImpl: async () => htmlResponse("<p>no published number here</p>") },
  })("scholarships");
  check("a 200 without the fact yields a failed check that cannot advance verified date",
    failedChecks[0].officialPageReRead && !failedChecks[0].verificationSucceeded &&
    mayRefreshVerifiedDate(failedChecks[0]) === false);

  // A persistence failure must not become a "verified" claim.
  const persistFail = (await createOfficialSourceAdapter({
    targets: [target],
    deps: { lookupImpl: PUBLIC_DNS, fetchImpl: async () => htmlResponse("<p>IELTS 7.0 overall</p>") },
    persist: () => { throw new Error("storage down"); },
  })("scholarships")) as OfficialSourceCheckResult[];
  check("a storage failure downgrades the check so no date can be refreshed",
    !persistFail[0].verificationSucceeded && !persistFail[0].evidencePresent &&
    /could not be persisted/.test(persistFail[0].reason ?? "") &&
    mayRefreshVerifiedDate(persistFail[0]) === false);

  // ---- Static wiring ------------------------------------------------------
  const refresh = read("src/lib/refresh.ts");
  check("official mode builds the SERVER adapter itself, never from HTTP",
    /getServerOfficialSourceAdapter/.test(refresh) && /await import\(("@\/lib\/officialSourceAdapter\.server")\)/.test(refresh));
  check("runRefresh exposes per-fact sourceChecks for the admin UI",
    /sourceChecks/.test(refresh) && /result\.sourceChecks = checks/.test(refresh));
  check("status mode never writes last_verified_at",
    /recomputeStatusFromDates/.test(refresh) && /Intentionally no last_verified_at/.test(refresh));
  const adminRoute = read("src/app/api/admin/refresh/route.ts");
  check("the admin HTTP route exposes no adapter parameter",
    !/officialSourceAdapter/.test(adminRoute));
  const migration = read("supabase/security_evidence_research_2026-11-06.sql");
  const checksDdl = migration.slice(migration.indexOf("public.official_source_checks"), migration.indexOf("public.official_source_checks") + 900);
  check("official_source_checks persists result, verified fact and source",
    /verified_fact/.test(checksDdl) && /source_url/.test(checksDdl) &&
    /verification_succeeded/.test(checksDdl) && /evidence_present/.test(checksDdl) &&
    /official_page_re_read/.test(checksDdl) && /evidence_excerpt/.test(checksDdl));
  const server = read("src/lib/officialSourceAdapter.server.ts");
  check("a missing migration yields an honest failed check, never a verified date",
    /migration is not applied/.test(server) && /verificationSucceeded: false/.test(server) && /officialPageReRead: false/.test(server));
  check("the server adapter requires a KNOWN official domain before fetching",
    /domains\.has\(host\)/.test(server) && /is_official = true/.test(server));
  // Only real credential reads/queries are dangerous; docblock prose that says
  // "never reads tokens" and the fieldLabelTokens() function name are NOT.
  const adapterCode = (server + read("src/lib/officialSourceAdapter.ts"))
    .replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ").replace(/^\s*\*[^\n]*/gm, " ");
  check("the adapter code reads no auth/session/secret table or env secret",
    !/auth\.users|password_reset_tokens|token_hash|service_role|process\.env\.[A-Z_]*(SECRET|KEY|TOKEN|PASSWORD)/i.test(adapterCode));

  console.log(`\n✅ ${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
