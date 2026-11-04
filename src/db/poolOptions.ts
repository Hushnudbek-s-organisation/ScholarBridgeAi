import type { PoolConfig } from "pg";

/** Reject NaN/empty/zero-as-disable on production deadlines; retain bounded tuning. */
function envInt(env: Readonly<Record<string, string | undefined>>, name: string, fallback: number, min: number, max: number): number {
  const text = env[name]?.trim();
  const value = text ? Number(text) : NaN;
  if (!Number.isFinite(value) || value < min) return fallback;
  return Math.min(max, Math.floor(value));
}

export function databasePoolOptions(env: Readonly<Record<string, string | undefined>>): PoolConfig {
  const queryMs = envInt(env, "PG_QUERY_TIMEOUT_MS", 20_000, 250, 60_000);
  return {
    connectionString: env.DATABASE_URL,
    max: envInt(env, "PG_POOL_MAX", env.VERCEL === "1" ? 3 : 5, 1, 20),
    idleTimeoutMillis: envInt(env, "PG_IDLE_TIMEOUT_MS", 30_000, 1_000, 300_000),
    connectionTimeoutMillis: envInt(env, "PG_CONNECT_TIMEOUT_MS", 8_000, 500, 60_000),
    maxUses: envInt(env, "PG_MAX_USES", 7_500, 0, 1_000_000),
    maxLifetimeSeconds: envInt(env, "PG_MAX_LIFETIME_S", 1_800, 0, 86_400),
    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,
    allowExitOnIdle: true,
    application_name: "scholarbridge",
    ...(env.NODE_ENV === "production" ? {
      // The server must cancel work too: a client-only timeout can leave a
      // blocked query occupying a connection after the HTTP caller gave up.
      query_timeout: queryMs,
      statement_timeout: queryMs,
      lock_timeout: Math.min(queryMs, envInt(env, "PG_LOCK_TIMEOUT_MS", 5_000, 250, 60_000)),
      idle_in_transaction_session_timeout: envInt(env, "PG_IDLE_TRANSACTION_TIMEOUT_MS", 30_000, 1_000, 300_000),
    } : {}),
  };
}
