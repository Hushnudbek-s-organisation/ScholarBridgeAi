/**
 * DDL for the Telegram bot tables. Kept in TypeScript so it ships inside the
 * server bundle; `supabase/add_telegram.sql` holds the identical statements
 * for manual runs (`scripts/check-telegram.ts` fails if they drift apart).
 */
export const TELEGRAM_DDL = `
CREATE TABLE IF NOT EXISTS telegram_links (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL UNIQUE REFERENCES student_profiles(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  username TEXT,
  first_name TEXT,
  language_code TEXT,
  notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  muted_types TEXT NOT NULL DEFAULT '[]',
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  linked_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP,
  last_message_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS telegram_login_requests (
  id SERIAL PRIMARY KEY,
  start_token TEXT NOT NULL UNIQUE,
  nonce_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'login',
  profile_id INTEGER REFERENCES student_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  fail_reason TEXT,
  telegram_user_id TEXT,
  chat_id TEXT,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  language_code TEXT,
  code_hash TEXT,
  code_expires_at TIMESTAMP,
  codes_sent INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telegram_login_requests_expires ON telegram_login_requests(expires_at);

CREATE TABLE IF NOT EXISTS telegram_messages (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES student_profiles(id) ON DELETE SET NULL,
  chat_id TEXT,
  kind TEXT NOT NULL,
  type TEXT,
  preview TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_created ON telegram_messages(created_at);

-- v2 (bot commands, Mini App, reminders): additive only.
ALTER TABLE telegram_links ADD COLUMN IF NOT EXISTS last_query TEXT;
ALTER TABLE telegram_links ADD COLUMN IF NOT EXISTS reminder_days TEXT;
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS retry_payload TEXT;
ALTER TABLE telegram_messages ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS telegram_updates (
  update_id BIGINT PRIMARY KEY,
  received_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_telegram_updates_received ON telegram_updates(received_at);
`;

/** Individual statements (the pg driver runs one statement per query). */
export function telegramStatements(): string[] {
  return TELEGRAM_DDL.split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
