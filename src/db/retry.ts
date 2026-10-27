/**
 * Transient database failures, and one cheap retry for them.
 *
 * A managed Postgres in front of a serverless app fails in ways that are not
 * bugs: a pooler refusing a connection while it restarts (53300 "too many
 * clients", 57P03 "cannot connect now"), an idle connection reaped by the
 * provider (57P01), a TLS connection reset mid-handshake (ECONNRESET), a small
 * connect timeout. All of them clear within a second or two.
 *
 * Retrying this class of error exactly once, with a short jittered delay, is
 * what turns "Authentication is temporarily unavailable" on every request into
 * a request that simply works. Everything else — a syntax error, a missing
 * column, a permission problem — is rethrown immediately: retrying it would
 * only hide the real cause.
 *
 * Deliberately dependency-free so it can be unit-tested without a pool.
 */

/** Postgres SQLSTATEs and Node socket codes worth one more attempt. */
export const TRANSIENT_DB_CODES: readonly string[] = [
  // connection exceptions (class 08)
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  // admin shutdown / crash shutdown / cannot connect now
  "57P01",
  "57P02",
  "57P03",
  // too many connections (pooler or server)
  "53300",
  // statement cancelled by the database (not by us)
  "57014",
  // socket level
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
] as const;

/** Read a driver error code without assuming its shape. */
function codeOf(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const record = error as Record<string, unknown>;
  const code = record.code ?? record.sqlState ?? record.errno;
  return typeof code === "string" ? code.toUpperCase() : "";
}

export function isTransientDbError(error: unknown): boolean {
  const code = codeOf(error);
  if (code && TRANSIENT_DB_CODES.includes(code)) return true;
  // Some poolers only say it in the message.
  const message = error instanceof Error ? error.message : "";
  return /terminating connection|connection (?:reset|refused|terminated)|too many clients|timeout expired|server closed the connection/i.test(
    message
  );
}

export interface RetryOptions {
  /** Total attempts, including the first one. */
  attempts?: number;
  /** Base delay; attempt N waits base × 2^N, capped. */
  baseDelayMs?: number;
  /** Test seam. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run one database operation, retrying only transient connection failures.
 * Never wrap a transaction in this: a retried statement would restart it
 * halfway through.
 */
function envInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

/**
 * Defaults are deliberately gentle (two attempts, 120 ms) — a request that hits
 * a pooler hiccup should transparently retry, not queue for seconds. A busy
 * self-hosted install can raise `PG_RETRY_ATTEMPTS` / `PG_RETRY_BASE_MS`.
 */
export async function withDbRetry<T>(run: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, Math.min(4, Math.floor(options.attempts ?? envInt("PG_RETRY_ATTEMPTS", 2, 1, 4))));
  const base = Math.max(
    0,
    Math.min(2_000, Math.floor(options.baseDelayMs ?? envInt("PG_RETRY_BASE_MS", 120, 0, 2_000)))
  );
  const sleep = options.sleep ?? defaultSleep;
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts - 1) throw error;
      await sleep(base * 2 ** attempt);
    }
  }
  throw lastError;
}
