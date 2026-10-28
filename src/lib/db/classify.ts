/**
 * One classifier for "the table bootstrap failed" — shared by the bootstraps
 * (`bootstrap.ts`), the schema gate (`schemaGate.ts`) and the diagnostics.
 *
 * Why this is its own module: Drizzle wraps every driver error in
 * `DrizzleQueryError`, whose `message` is the **SQL text** and whose `cause`
 * holds the Postgres error. A classifier that reads only `message` answers
 * "unclassified" for every real failure — which is exactly what the admin panel
 * used to show ("the table bootstrap failed for an unclassified reason") while
 * the actual reason sat in a server log the operator cannot open.
 *
 * Keeping it separate also avoids an import cycle: `bootstrap.ts` imports the
 * schema gate, so the gate cannot import the classifier back from there.
 */

export interface ClassifiedError {
  reason: string;
  hint: string;
  /** Sanitised one-liner from the driver, safe to render in the panel. */
  detail: string;
}

/**
 * Errors arrive nested: Drizzle wraps the driver error in `DrizzleQueryError`
 * whose own `message` is the SQL text ("Failed query: CREATE TABLE …"), while
 * the actual reason — and the SQLSTATE — sits on `cause`. Classifying on the
 * outer message alone produced exactly one outcome for every real failure:
 * "unclassified", with the reason stranded in the server log. So walk the
 * chain, collect every code and message, and classify on all of it.
 */
function errorChain(err: unknown, depth = 0, out: { codes: string[]; messages: string[] } = { codes: [], messages: [] }) {
  if (err == null || depth > 5) return out;
  if (typeof err === "string") {
    out.messages.push(err);
    return out;
  }
  const e = err as { code?: unknown; errno?: unknown; message?: unknown; cause?: unknown; errors?: unknown };
  for (const candidate of [e.code, e.errno]) {
    if (typeof candidate === "string" && candidate) out.codes.push(candidate);
  }
  if (typeof e.message === "string" && e.message) out.messages.push(e.message);
  if (Array.isArray(e.errors)) for (const inner of e.errors) errorChain(inner, depth + 1, out);
  if (e.cause) errorChain(e.cause, depth + 1, out);
  return out;
}

/** Strip anything that could identify the database or leak a secret. */
export function sanitizeDbDetail(message: string): string {
  return message
    .replace(/postgres(ql)?:\/\/[^\s"']+/gi, "<DATABASE_URL>")
    .replace(/\b(password|pwd|secret|token)=\S+/gi, "$1=<hidden>")
    .replace(/\b[\w.-]+\.(?:supabase|neon|render|railway|aws|azure|gcp)\.[a-z]+\b/gi, "<host>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

/** SQLSTATE → reason. Covers what a managed Postgres actually returns for DDL. */
const SQLSTATE: Record<string, string> = {
  "25006": "read_only",
  "42501": "permission_denied",
  "3F000": "permission_denied",
  "42P01": "schema_missing",
  "42P07": "already_exists",
  "42710": "already_exists",
  "42703": "schema_outdated",
  "23505": "already_exists",
  "28P01": "auth_failed",
  "28000": "auth_failed",
  "3D000": "auth_failed",
  "53300": "unreachable",
  "57P01": "unreachable",
  "57P02": "unreachable",
  "57P03": "unreachable",
  "57014": "unreachable",
  "0A000": "unsupported",
  "42P17": "unsupported",
  "58P01": "unsupported",
  "23514": "invalid_data",
  "22001": "invalid_data",
  "22P02": "invalid_data",
};

const HINTS: Record<string, string> = {
  read_only:
    "The database connection is read-only — tables cannot be created. Check that DATABASE_URL uses a read-write role and a read-write endpoint (not a read replica, not a read-only pooler).",
  permission_denied:
    "The database role may read but not create tables. Grant CREATE on the schema (or run the SQL in supabase/add_telegram.sql and supabase/add_channel.sql as the owner).",
  schema_outdated:
    "A table exists but is missing a column this build expects. Press Retry once; if it persists, run the SQL files in supabase/ as the owner.",
  already_exists:
    "The objects already exist — another process created them at the same moment. Nothing to fix: press Retry, it should come back green.",
  auth_failed:
    "The database rejected the credentials or the database name. Re-check DATABASE_URL in the host's environment.",
  unreachable:
    "The database could not be reached or the connection pool is exhausted. Check /api/health and the provider's status; lower PG_POOL_MAX if the plan's connection limit is tight.",
  schema_missing:
    "A required table is missing. The bootstrap could not create it — run the SQL files in supabase/ once, then reload.",
  unsupported:
    "The server refused a statement it does not support (an extension or a feature switched off on this plan). The detail line names it.",
  invalid_data: "The DDL contradicts existing data in the table. The detail line names the constraint.",
  core_schema_missing:
    "The base tables (student_profiles / scholarships) do not exist yet, so the bot and channel tables cannot be created. Press Retry — the app creates the base schema first; if it still fails, run scripts/apply-full-schema.ts once.",
  unknown: "The table bootstrap failed for an unclassified reason. The detail line holds the driver's own message.",
};

/**
 * Classify a database error into a stable code plus an operator-facing hint.
 * The driver messages are matched loosely on purpose: a managed Postgres
 * (Supabase/pgBouncer) rewords the same failure in several ways — and Drizzle
 * hides it one level down, in `cause`.
 */
export function classifyDbError(err: unknown): ClassifiedError {
  const { codes, messages } = errorChain(err);
  const code = codes[0] ?? "";
  const detail = sanitizeDbDetail(
    messages.find((m) => !/^Failed query:/i.test(m) && m.length > 3) ?? messages[0] ?? ""
  );

  // 1. A SQLSTATE we know beats any pattern match.
  const byCode = code ? SQLSTATE[code.toUpperCase()] : undefined;
  const joined = messages.join(" ").toLowerCase();
  /**
   * A missing *parent* table is not a broken bot table.
   *
   * Both the bot and the channel DDL reference `student_profiles` /
   * `scholarships`. On a database where the core schema was never created the
   * CREATE TABLE fails with 42P01 — and the honest answer is "the base schema
   * is missing", not "the bot tables are broken".
   */
  const missingParent = /relation "(student_profiles|scholarships|universities|app_config)" does not exist|(student_profiles|scholarships)"? does not exist/.test(
    joined
  );

  const text = `${codes.join(" ")} ${messages.join(" ")}`.toLowerCase();
  let reason = byCode ?? "";

  if (!reason) {
    if (/read[- ]only|25006|cannot execute .* in a read-only transaction/.test(text)) reason = "read_only";
    else if (/permission denied|42501|must be owner|insufficient privilege/.test(text)) reason = "permission_denied";
    else if (/already exists|duplicate key value|42p07|42710|23505/.test(text)) reason = "already_exists";
    else if (/column .* does not exist|42703/.test(text)) reason = "schema_outdated";
    else if (/password authentication|28p01|no pg_hba|role .* does not exist|28000|3d000/.test(text)) reason = "auth_failed";
    else if (
      /too many clients|remaining connection slots|53300|57p03|57p01|57014|pool|econnrefused|enotfound|ehostunreach|etimedout|timeout|terminating connection/.test(
        text
      )
    )
      reason = "unreachable";
    else if (/does not exist|42p01|undefined table/.test(text)) reason = "schema_missing";
    else if (/0a000|not supported|unsupported|42p17|58p01/.test(text)) reason = "unsupported";
    else reason = "unknown";
  }

  if (missingParent) reason = "core_schema_missing";

  return { reason, hint: HINTS[reason] ?? HINTS.unknown, detail: detail || code || "" };
}

/** `CREATE TABLE IF NOT EXISTS channel_plan (` → `channel_plan`. */
export function statementSubject(stmt: string): string | null {
  const create = /create\s+(?:table|index|type|sequence|schema)\s+(?:if\s+not\s+exists\s+)?([\w."]+)/i.exec(stmt);
  if (create) return create[1].replace(/"/g, "").split(".").pop() ?? null;
  const alter = /alter\s+table\s+(?:if\s+exists\s+)?([\w."]+)/i.exec(stmt);
  if (alter) return alter[1].replace(/"/g, "").split(".").pop() ?? null;
  return null;
}

