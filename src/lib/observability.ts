/**
 * Safe observability primitives (§11).
 *
 * Request/job ids let an operator correlate a refresh, an official-source
 * check and a review-queue decision WITHOUT logging secrets, document bodies
 * or personal data. Every log line passes through `safeLogFields`, which
 * redacts credential-shaped keys and truncates free text. Nothing here reads a
 * secret; the ids are random, non-guessable and contain no user information.
 *
 * Pure/dependency-free so route handlers and pure guards can both import it.
 */
import { randomUUID } from "node:crypto";

/** Correlation id for one request / job. Never derived from user input. */
export function newRequestId(): string {
  return randomUUID();
}

export function newJobId(prefix = "job"): string {
  return `${prefix}-${randomUUID()}`;
}

const SECRET_KEY = /(pass(word)?|secret|token|cookie|authorization|api[_-]?key|session|credential|database_url|dsn|private[_-]?key|service[_-]?role|bearer|signature|hash|otp|reset)/i;
const PII_KEY = /(email|phone|passport|dob|birth|address|full_?name|national_?id|ip)/i;

/** Bounded, non-PII text for a log line. */
export function safeText(value: unknown, max = 200): string {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  return raw.replace(/[\r\n]+/g, " ").slice(0, max);
}

/**
 * Build a loggable object: secret/PII keys are replaced with "[redacted]",
 * free-text values are bounded. Arrays/objects are flattened to a count/label
 * instead of being dumped (a document body must never reach the log).
 */
export function safeLogFields(input: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SECRET_KEY.test(key) || PII_KEY.test(key)) { out[key] = "[redacted]"; continue; }
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
    else if (typeof value === "boolean") out[key] = value;
    else if (value == null) out[key] = null;
    else if (typeof value === "string") out[key] = safeText(value);
    else if (Array.isArray(value)) out[key] = `[${value.length} items]`;
    else out[key] = "[object]";
  }
  return out;
}

/** A one-line, structured, safe log entry (no console dumping of raw errors). */
export function logSafe(event: string, fields: Record<string, unknown> = {}): void {
  console.info(`[${safeText(event, 64)}] ${JSON.stringify(safeLogFields(fields))}`);
}

/**
 * Extract a SAFE message from an unknown error. Raw DB errors can contain a
 * connection string or a query with values, so only a fixed taxonomy is kept.
 */
export function safeErrorMessage(err: unknown): string {
  const name = (err as { name?: unknown } | null)?.name;
  if (typeof name === "string" && /AbortError|TimeoutError/i.test(name)) return "request timed out";
  if (err instanceof Error) {
    // Keep only a short, classifier-style prefix — never the full message.
    return `error (${safeText(err.name || "Error", 40)})`;
  }
  return "unknown error";
}
