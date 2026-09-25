/**
 * Deterministic checks for the Document Checker (#7).
 *
 * A checklist says what is missing. A checker must catch what is WRONG with
 * what was already uploaded — an expired passport, an IELTS result that lapses
 * before the intake, a 12 MB transcript the portal will reject. Those are the
 * failures that cost an application cycle.
 *
 * Run: npm run test:documents
 */

import {
  checkDocument,
  checkDocuments,
  expectedDocuments,
  parseDate,
  type DocumentIssue,
  type DocumentRow,
} from "../src/lib/documents";

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

function section(title: string) {
  console.log(`\n${title}`);
}

const TODAY = new Date(Date.UTC(2026, 8, 25)); // 25 Sep 2026
const INTAKE = new Date(Date.UTC(2027, 8, 1)); // 1 Sep 2027

const doc = (over: Partial<DocumentRow>): DocumentRow => ({
  id: 1,
  entityType: "university",
  entityId: 10,
  documentType: "transcript",
  label: "Academic transcript",
  isRequired: true,
  status: "uploaded",
  fileName: "transcript.pdf",
  fileSizeBytes: 500_000,
  expiresAt: null,
  deadlineDate: null,
  uploadedAt: "2026-09-01",
  ...over,
});

const codes = (issues: DocumentIssue[]) => issues.map((i) => i.code);
const has = (issues: DocumentIssue[], code: string) => codes(issues).includes(code);

// ---------------------------------------------------------------------------
section("1. Missing required documents");

const missing = checkDocument(doc({ status: "missing" }), { today: TODAY });
check("a missing required document is a blocker", missing[0]?.severity === "blocker");
check("it is coded missing_required", has(missing, "missing_required"));
check(
  "no other rules run on a document that is not there",
  missing.length === 1,
  `got ${missing.length} issues`
);
check(
  "an optional missing document raises nothing",
  checkDocument(doc({ status: "missing", isRequired: false }), { today: TODAY }).length === 0
);
check(
  "a not_required document raises nothing",
  checkDocument(doc({ status: "not_required" }), { today: TODAY }).length === 0
);

section("2. Expiry");

const expiredPassport = checkDocument(
  doc({ documentType: "passport", label: "Passport", expiresAt: "2026-08-01" }),
  { today: TODAY, intakeDate: INTAKE }
);
check("an expired passport is a blocker", has(expiredPassport, "expired"));

const shortPassport = checkDocument(
  doc({ documentType: "passport", label: "Passport", expiresAt: "2027-11-01" }),
  { today: TODAY, intakeDate: INTAKE }
);
check(
  "a passport expiring inside the 6-month embassy buffer is a blocker",
  has(shortPassport, "passport_buffer"),
  codes(shortPassport).join(",")
);

const longPassport = checkDocument(
  doc({ documentType: "passport", label: "Passport", expiresAt: "2031-01-01" }),
  { today: TODAY, intakeDate: INTAKE }
);
check("a passport valid well past the intake is clean", longPassport.length === 0);

const ieltsLapsesBeforeDeadline = checkDocument(
  doc({
    documentType: "ielts",
    label: "IELTS result",
    expiresAt: "2026-11-01",
    deadlineDate: "2027-01-15",
  }),
  { today: TODAY }
);
check(
  "a test result expiring before the application deadline is a blocker",
  has(ieltsLapsesBeforeDeadline, "expires_before_deadline")
);

const expiringSoon = checkDocument(
  doc({ documentType: "ielts", label: "IELTS result", expiresAt: "2026-11-10" }),
  { today: TODAY }
);
check("a result expiring in under 60 days is a warning", has(expiringSoon, "expiring_soon"));
check("a warning is not a blocker", expiringSoon.every((i) => i.severity !== "blocker"));

const noExpiryOnExpiringType = checkDocument(doc({ documentType: "test_score" }), { today: TODAY });
check(
  "an uploaded test score with no expiry date asks for one",
  has(noExpiryOnExpiringType, "expiry_unknown")
);
check(
  "a transcript needs no expiry date",
  checkDocument(doc({ documentType: "transcript" }), { today: TODAY }).length === 0
);

section("3. Format and size");

const wrongFormat = checkDocument(doc({ fileName: "transcript.docx" }), { today: TODAY });
check("a .docx upload is a blocker", has(wrongFormat, "bad_format"));
check("the message names the format", /DOCX/.test(wrongFormat[0]?.message ?? ""));

const tooLarge = checkDocument(doc({ fileSizeBytes: 12 * 1024 * 1024 }), { today: TODAY });
check("a 12 MB file over the 10 MB limit is a blocker", has(tooLarge, "too_large"));

const customLimit = checkDocument(doc({ fileSizeBytes: 4 * 1024 * 1024 }), {
  today: TODAY,
  maxFileSizeBytes: 2 * 1024 * 1024,
});
check("a per-portal size limit is respected", has(customLimit, "too_large"));

const tiny = checkDocument(doc({ fileSizeBytes: 8 * 1024 }), { today: TODAY });
check("an 8 KB 'document' is flagged as a probable screenshot", has(tiny, "suspiciously_small"));

check(
  "a normal PDF passes the format rules",
  checkDocument(doc({ fileName: "scan.pdf", fileSizeBytes: 800_000 }), { today: TODAY }).length === 0
);
check(
  "a JPG is acceptable",
  checkDocument(doc({ fileName: "page.jpg" }), { today: TODAY }).every((i) => i.code !== "bad_format")
);

section("4. Stale uploads");

const stale = checkDocument(
  doc({ documentType: "ielts", label: "IELTS", uploadedAt: "2023-01-01", expiresAt: "2027-01-01" }),
  { today: TODAY }
);
check("a test score uploaded 3+ years ago is flagged stale", has(stale, "stale_upload"));

const fresh = checkDocument(
  doc({ documentType: "ielts", label: "IELTS", uploadedAt: "2026-06-01", expiresAt: "2028-06-01" }),
  { today: TODAY }
);
check("a recent upload is not flagged stale", !has(fresh, "stale_upload"));

section("5. Readiness roll-up");

const rollup = checkDocuments(
  [
    doc({ id: 1, isRequired: true, status: "uploaded" }),
    doc({ id: 2, isRequired: true, status: "missing", label: "Passport", documentType: "passport" }),
    doc({ id: 3, isRequired: true, status: "uploaded", fileName: "cv.docx" }), // uploaded but blocked
    doc({ id: 4, isRequired: false, status: "missing", label: "Optional extra" }),
  ],
  { today: TODAY }
);
check("requiredTotal counts required rows only", rollup.requiredTotal === 3, `got ${rollup.requiredTotal}`);
check("requiredUploaded counts uploads", rollup.requiredUploaded === 2, `got ${rollup.requiredUploaded}`);
check("blockers are counted", rollup.blockers === 2, `got ${rollup.blockers}`);
check(
  "readiness excludes an uploaded-but-blocked file",
  rollup.readiness === 33,
  `got ${rollup.readiness}`
);
check("an empty checklist reads as fully ready", checkDocuments([], { today: TODAY }).readiness === 100);

section("6. Expected documents adapt to the destination");

const usa = expectedDocuments({ country: "United States", degreeLevel: "Master", needsVisa: true });
check("a US master's applicant is told about the GRE", usa.some((d) => /GRE/.test(d.label)));
const germany = expectedDocuments({ country: "Germany", needsVisa: true });
check("Germany adds the APS credential check", germany.some((d) => /APS/.test(d.label)));
const bachelor = expectedDocuments({ country: "United States", degreeLevel: "Bachelor", needsVisa: false });
check("a bachelor's applicant is told about the SAT", bachelor.some((d) => /SAT/.test(bachelor.find((d) => /SAT/.test(d.label))?.label ?? "")));
check("no visa means no financial-proof row", !bachelor.some((d) => d.documentType === "financial"));
check("every expectation explains why", expectedDocuments({}).every((d) => d.why.length > 10));

section("7. Date parsing");

check("parseDate reads an ISO date", parseDate("2027-01-15") instanceof Date);
check("parseDate tolerates null", parseDate(null) === null);
check("parseDate tolerates garbage", parseDate("nonsense") === null);

// ---------------------------------------------------------------------------
console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
