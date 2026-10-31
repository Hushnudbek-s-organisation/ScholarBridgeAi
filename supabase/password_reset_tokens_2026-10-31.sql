-- Password reset tokens (Phase AG) — migration for EXISTING databases.
--
-- Why: the product had sign-in but no way back in. `student_profiles.password_hash`
-- is scrypt (`scrypt:<salt>:<hash>`, src/lib/password.ts) and one-way by design,
-- so a forgotten password could only be replaced by an operator with database
-- access. This table makes "I forgot my password" a self-service flow:
--
--   POST /api/auth/password-reset/request  -> row written, link emailed
--   GET  /reset-password?token=…           -> the person picks a new password
--   POST /api/auth/password-reset/confirm  -> hash replaced, `used_at` stamped
--
-- Shape decisions, all mirrored in src/db/schema.ts:
--   * only the SHA-256 of the token is stored, never the token itself — a
--     database read cannot be replayed into an account takeover (same rule as
--     `user_sessions.token_hash`);
--   * `token_hash` is UNIQUE, so two rows can never share a link;
--   * `expires_at` is written at creation (60 minutes) and checked on use;
--   * `used_at` makes a link single-use; requesting a new one stamps every
--     older live row, so only the newest link works;
--   * `ON DELETE CASCADE` — deleting a profile deletes its links.
--
-- The app self-heals this table at startup (src/lib/core/ddl.ts,
-- `ensureCoreSchema`), so running this by hand is optional. It exists for
-- deployments that apply SQL directly and for auditability of the change.
--
-- Strictly additive: no DROP, no data rewrite. Safe to run more than once.

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "profile_id" integer NOT NULL REFERENCES "student_profiles"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "requested_ip" text
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_profile" ON "password_reset_tokens" ("profile_id");
