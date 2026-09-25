/**
 * Document Checker (#7).
 *
 * A checklist tells a student what is missing. A checker tells them what is
 * WRONG with what they already uploaded — an expired passport, an IELTS result
 * that goes stale before the intake, a 12 MB transcript the portal will reject.
 * Those are the failures that cost an application cycle.
 *
 * Pure module: no DB, no uploads, no AI. Every rule is asserted in
 * `scripts/check-documents.ts`.
 */

export type DocStatus = "missing" | "uploaded" | "not_required";

export interface DocumentRow {
  id: number;
  entityType: string; // university | scholarship | general
  entityId: number | null;
  documentType: string;
  label: string;
  isRequired: boolean;
  status: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  expiresAt: string | null;
  deadlineDate: string | null;
  uploadedAt: string | null;
}

export type Severity = "blocker" | "warning" | "info";

export interface DocumentIssue {
  documentId: number;
  severity: Severity;
  code: string;
  message: string;
}

export interface DocumentCheckResult {
  issues: DocumentIssue[];
  /** 0–100 across required documents only. */
  readiness: number;
  requiredTotal: number;
  requiredUploaded: number;
  blockers: number;
  warnings: number;
}

export interface DocumentCheckOptions {
  /** Injected so tests are deterministic. */
  today: Date;
  /** Intake date — an expiring document must outlive it, not just today. */
  intakeDate?: Date | null;
  /** Some portals cap upload size. Default 10 MB. */
  maxFileSizeBytes?: number;
}

// --- Rule tables -----------------------------------------------------------

/** Documents that expire, with the validity window the issuer publishes. */
const EXPIRY_RULES: Record<string, { months: number; label: string }> = {
  passport: { months: 24, label: "passport" },
  test_score: { months: 24, label: "English test result" },
  ielts: { months: 24, label: "IELTS result" },
  toefl: { months: 24, label: "TOEFL result" },
  duolingo: { months: 24, label: "Duolingo result" },
  financial: { months: 6, label: "bank letter" },
  bank_statement: { months: 6, label: "bank statement" },
  medical: { months: 12, label: "medical certificate" },
};

/** Most embassies require the passport to be valid 6 months past the stay. */
const PASSPORT_BUFFER_MONTHS = 6;

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const MIN_BYTES = 20 * 1024; // a 5 KB "transcript" is a screenshot, not a document

const MONTH_MS = 30.44 * 86400000;

const addMonths = (d: Date, months: number) => new Date(d.getTime() + months * MONTH_MS);

const ext = (fileName: string | null): string => {
  if (!fileName) return "";
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
};

const mb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

/** Parse a `date` or `timestamp` column. Returns null for junk. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Run every rule over one document. Returns zero or more issues — a single
 * document can be both expired and oversized.
 */
export function checkDocument(doc: DocumentRow, opts: DocumentCheckOptions): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  const today = opts.today;
  const maxBytes = opts.maxFileSizeBytes ?? DEFAULT_MAX_BYTES;
  const push = (severity: Severity, code: string, message: string) =>
    issues.push({ documentId: doc.id, severity, code, message });

  // --- 1. Missing required documents are blockers -------------------------
  if (doc.isRequired && doc.status === "missing") {
    push("blocker", "missing_required", `${doc.label} is required and has not been uploaded yet.`);
    return issues; // nothing else to say about a document that is not there
  }
  if (doc.status !== "uploaded") return issues;

  // --- 2. Expiry ------------------------------------------------------------
  const expiresAt = parseDate(doc.expiresAt);
  const rule = EXPIRY_RULES[doc.documentType];

  if (expiresAt) {
    const daysLeft = Math.round((expiresAt.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) {
      push(
        "blocker",
        "expired",
        `${doc.label} expired ${Math.abs(daysLeft)} days ago. Upload a current copy before submitting.`
      );
    } else if (doc.documentType === "passport") {
      // Embassies measure from the START of the stay, not from today.
      const requiredUntil = opts.intakeDate
        ? addMonths(opts.intakeDate, PASSPORT_BUFFER_MONTHS)
        : addMonths(today, PASSPORT_BUFFER_MONTHS);
      if (expiresAt.getTime() < requiredUntil.getTime()) {
        push(
          "blocker",
          "passport_buffer",
          `Your passport expires ${expiresAt.toISOString().slice(0, 10)}, but most embassies require 6 months of validity beyond your intended stay. Renew it now — this takes weeks.`
        );
      } else if (daysLeft <= 90) {
        push("warning", "expiring_soon", `${doc.label} expires in ${daysLeft} days.`);
      }
    } else if (daysLeft <= 60) {
      push("warning", "expiring_soon", `${doc.label} expires in ${daysLeft} days.`);
    }

    // An expiring document that lapses before the deadline is a blocker even
    // though it is still valid today.
    const deadline = parseDate(doc.deadlineDate);
    if (deadline && expiresAt.getTime() < deadline.getTime() && daysLeft >= 0) {
      push(
        "blocker",
        "expires_before_deadline",
        `${doc.label} expires before this application's deadline (${deadline.toISOString().slice(0, 10)}). Renew it first.`
      );
    }
  } else if (rule) {
    // Uploaded with no expiry date on a document type that always has one.
    push(
      "warning",
      "expiry_unknown",
      `${rule.label} results have a published validity period. Add its expiry date so we can warn you before it lapses.`
    );
  }

  // --- 3. Format and size ---------------------------------------------------
  const e = ext(doc.fileName);
  if (doc.fileName && e && !ACCEPTED_EXTENSIONS.includes(e)) {
    push(
      "blocker",
      "bad_format",
      `${doc.fileName} is a ${e.replace(".", "").toUpperCase()} file. Portals accept PDF or image formats — re-export it as PDF.`
    );
  }
  if (doc.fileSizeBytes !== null && doc.fileSizeBytes > maxBytes) {
    push(
      "blocker",
      "too_large",
      `${doc.label} is ${mb(doc.fileSizeBytes)} MB, over the ${mb(maxBytes)} MB portal limit. Compress it before uploading.`
    );
  }
  if (doc.fileSizeBytes !== null && doc.fileSizeBytes > 0 && doc.fileSizeBytes < MIN_BYTES) {
    push(
      "warning",
      "suspiciously_small",
      `${doc.label} is only ${Math.round(doc.fileSizeBytes / 1024)} KB — that is usually a screenshot or a partial scan, not a full document.`
    );
  }

  // --- 4. Stale uploads -----------------------------------------------------
  const uploadedAt = parseDate(doc.uploadedAt);
  if (uploadedAt && rule) {
    const ageMonths = (today.getTime() - uploadedAt.getTime()) / MONTH_MS;
    if (ageMonths > rule.months) {
      push(
        "warning",
        "stale_upload",
        `${rule.label}s are valid for about ${rule.months} months; this copy was uploaded ${Math.round(ageMonths)} months ago. Check it is still current.`
      );
    }
  }

  return issues;
}

/** Check a whole checklist and roll up a readiness score. */
export function checkDocuments(docs: DocumentRow[], opts: DocumentCheckOptions): DocumentCheckResult {
  const issues = docs.flatMap((d) => checkDocument(d, opts));
  const required = docs.filter((d) => d.isRequired);
  const requiredUploaded = required.filter((d) => d.status === "uploaded");
  const blockers = issues.filter((i) => i.severity === "blocker").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;

  // Readiness: uploaded share of required documents, minus blockers. A file
  // that is uploaded but expired does not count as ready.
  const blockedIds = new Set(issues.filter((i) => i.severity === "blocker").map((i) => i.documentId));
  const genuinelyReady = requiredUploaded.filter((d) => !blockedIds.has(d.id)).length;
  const readiness = required.length === 0 ? 100 : Math.round((genuinelyReady / required.length) * 100);

  return {
    issues,
    readiness,
    requiredTotal: required.length,
    requiredUploaded: requiredUploaded.length,
    blockers,
    warnings,
  };
}

/**
 * The documents a student needs but has no checklist row for yet.
 * Derived from the destination country and degree level — not hardcoded per
 * university, because the universal requirements are the ones people forget.
 */
export function expectedDocuments(opts: {
  country?: string | null;
  degreeLevel?: string | null;
  needsVisa?: boolean;
}): { documentType: string; label: string; why: string }[] {
  const list: { documentType: string; label: string; why: string }[] = [
    { documentType: "passport", label: "Passport", why: "Every application and visa needs it, and renewals take weeks." },
    { documentType: "transcript", label: "Academic transcripts (translated)", why: "Universities need an official record; many require a certified translation." },
    { documentType: "diploma", label: "Diploma / degree certificate", why: "Proof of the qualification your transcripts describe." },
    { documentType: "test_score", label: "English test result", why: "Results are only valid for 2 years — plan the test date around your intake." },
    { documentType: "recommendation", label: "Recommendation letters", why: "2–3 letters, and referees need 3–4 weeks of notice." },
    { documentType: "statement", label: "Statement of purpose", why: "The part of the file you fully control." },
    { documentType: "cv", label: "CV / resume", why: "Most portals ask for one even when they have your profile data." },
  ];

  const country = (opts.country || "").toLowerCase();
  if (/united states|usa|canada|uk|united kingdom|australia/.test(country)) {
    list.push({
      documentType: "test_score",
      label: opts.degreeLevel === "Master" ? "GRE / GMAT score" : "SAT / ACT score",
      why: "Standardized scores are still expected at many US and Canadian programmes.",
    });
  }
  if (/germany|netherlands|austria/.test(country)) {
    list.push({
      documentType: "aps_certificate",
      label: "APS / credential evaluation",
      why: "Germany requires APS verification for many countries; it takes months.",
    });
  }
  if (opts.needsVisa !== false) {
    list.push({
      documentType: "financial",
      label: "Proof of funds / blocked account",
      why: "The visa step fails more often on financial proof than on academics.",
    });
    list.push({
      documentType: "medical",
      label: "Medical / health insurance",
      why: "Required by several countries before the visa appointment.",
    });
  }

  return list;
}
