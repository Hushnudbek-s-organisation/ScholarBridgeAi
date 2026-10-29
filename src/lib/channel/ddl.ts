/**
 * DDL for the Telegram channel publisher (`channel_*`).
 *
 * Kept in TypeScript so it ships inside the server bundle and is applied
 * lazily on first use; `supabase/add_channel.sql` holds the identical
 * statements for manual runs, and `scripts/check-channel.ts` fails if the two
 * drift apart or if a drizzle column is missing here.
 *
 * Rules that matter:
 *  - every table is additive and `IF NOT EXISTS`, so a deploy never breaks
 *    because a manual migration was missed;
 *  - `channel_plan` and `channel_posts` both carry the identity of a post
 *    (`kind, scholarship_id, rung, plan_date, slot`) as a UNIQUE constraint,
 *    plus a `dedupe_key` that is NOT NULL — Postgres treats NULLs as distinct
 *    in a UNIQUE constraint, so the explicit key is what actually makes
 *    "insert before send" idempotent when `scholarship_id` / `rung` are NULL.
 */
export const CHANNEL_DDL = `
CREATE TABLE IF NOT EXISTS channel_plan (
  id SERIAL PRIMARY KEY,
  plan_date DATE NOT NULL,
  slot INTEGER NOT NULL,
  send_at TEXT NOT NULL,
  kind TEXT NOT NULL,
  rung INTEGER,
  scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  topic TEXT,
  poll_type TEXT,
  payload TEXT NOT NULL DEFAULT '{}',
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'planned',
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (kind, scholarship_id, rung, plan_date, slot)
);
CREATE INDEX IF NOT EXISTS idx_channel_plan_date ON channel_plan(plan_date);

CREATE TABLE IF NOT EXISTS channel_posts (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES channel_plan(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  rung INTEGER,
  scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE SET NULL,
  plan_date DATE,
  slot INTEGER,
  dedupe_key TEXT NOT NULL UNIQUE,
  mode TEXT NOT NULL DEFAULT 'dryrun',
  chat_id TEXT,
  html TEXT,
  message_id BIGINT,
  poll_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (kind, scholarship_id, rung, plan_date, slot)
);
CREATE INDEX IF NOT EXISTS idx_channel_posts_status ON channel_posts(status);
CREATE INDEX IF NOT EXISTS idx_channel_posts_sent ON channel_posts(sent_at);

CREATE TABLE IF NOT EXISTS channel_polls (
  id SERIAL PRIMARY KEY,
  post_id INTEGER UNIQUE REFERENCES channel_posts(id) ON DELETE CASCADE,
  message_id BIGINT,
  poll_id TEXT,
  poll_type TEXT NOT NULL,
  poll_key TEXT NOT NULL,
  topic TEXT,
  question TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]',
  correct_index INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  results TEXT NOT NULL DEFAULT '[]',
  total_voters INTEGER,
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_channel_polls_opened ON channel_polls(opened_at);

CREATE TABLE IF NOT EXISTS channel_prefs (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL UNIQUE,
  weight DOUBLE PRECISION NOT NULL DEFAULT 1,
  samples INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_clicks (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  post_id INTEGER REFERENCES channel_posts(id) ON DELETE SET NULL,
  scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE SET NULL,
  target_path TEXT NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_hit_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_channel_clicks_post ON channel_clicks(post_id);

-- Phase 3 (queue, previews, edits): additive only.
ALTER TABLE channel_plan ADD COLUMN IF NOT EXISTS lane TEXT NOT NULL DEFAULT 'editorial';
ALTER TABLE channel_plan ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'rotation';
ALTER TABLE channel_plan ADD COLUMN IF NOT EXISTS text_override TEXT;
ALTER TABLE channel_plan ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE channel_plan ADD COLUMN IF NOT EXISTS skip_reason TEXT;
ALTER TABLE channel_plan ADD COLUMN IF NOT EXISTS postponed_to DATE;
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS part INTEGER NOT NULL DEFAULT 1;
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS text_override TEXT;
ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS lane TEXT;

CREATE TABLE IF NOT EXISTS channel_stories (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_label TEXT,
  source_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by INTEGER,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_stories_approved ON channel_stories(approved);

-- Authored Uzbek copy for the rich post. One row per scholarship; every field
-- is optional and a missing one drops its section from the post.
CREATE TABLE IF NOT EXISTS scholarship_channel_content (
  scholarship_id INTEGER PRIMARY KEY REFERENCES scholarships(id) ON DELETE CASCADE,
  tagline_uz TEXT,
  funding_type_uz TEXT,
  language_req_uz TEXT,
  eligibility_uz TEXT NOT NULL DEFAULT '[]',
  benefits_uz TEXT NOT NULL DEFAULT '[]',
  about_uz TEXT,
  extra_hashtags TEXT NOT NULL DEFAULT '[]',
  updated_by INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Uzbek names, locative forms, flags and hashtags for the countries we post about.
CREATE TABLE IF NOT EXISTS channel_countries (
  key TEXT PRIMARY KEY,
  iso2 TEXT,
  flag TEXT NOT NULL DEFAULT '',
  name_uz TEXT NOT NULL,
  name_uz_loc TEXT,
  hashtag TEXT,
  aliases TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Runtime settings (JSON per key): brand, footers, hashtags, plan knobs, link previews.
CREATE TABLE IF NOT EXISTS channel_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_by INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Template overrides. Defaults live in code; a row here wins, versioned below.
CREATE TABLE IF NOT EXISTS channel_templates (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  key TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (kind, key)
);

CREATE TABLE IF NOT EXISTS channel_template_versions (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES channel_templates(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_template_versions ON channel_template_versions(template_id);

-- Short tracked links. One stable code per (scholarship, kind); custom links are
-- created by an admin. The destination is only ever read from this row.
CREATE TABLE IF NOT EXISTS channel_links (
  code TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'custom',
  scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (scholarship_id, kind)
);

-- Aggregated daily clicks: no IP address, no user agent, no per-visitor row.
CREATE TABLE IF NOT EXISTS channel_link_clicks (
  code TEXT NOT NULL REFERENCES channel_links(code) ON DELETE CASCADE,
  day DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (code, day)
);
CREATE INDEX IF NOT EXISTS idx_channel_link_clicks_day ON channel_link_clicks(day);

-- Append-only audit trail for every admin action on the channel publisher.
CREATE TABLE IF NOT EXISTS channel_audit (
  id SERIAL PRIMARY KEY,
  actor_profile_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before TEXT,
  after TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_audit_created ON channel_audit(created_at);

-- The academic dictionary (12 732 EN→UZ headwords) copied into the database so
-- an operator can correct or extend a gloss without a deploy. 'key' is the
-- normalised headword; 'source' separates the imported rows ('pdf') from rows a
-- human edited ('admin'), and only the latter override the bundled copy.
CREATE TABLE IF NOT EXISTS translation_lexicon (
  key TEXT PRIMARY KEY,
  en TEXT NOT NULL,
  uz TEXT NOT NULL,
  ru TEXT,
  source TEXT NOT NULL DEFAULT 'pdf',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_translation_lexicon_en ON translation_lexicon(en);

-- One row per import: which version of the bundled dictionary is installed.
CREATE TABLE IF NOT EXISTS translation_lexicon_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

`;

/** Individual statements (the pg driver runs one statement per query). */
/** The DDL with full-line `--` comments removed (they may contain `;`). */
export function channelDdlCode(): string {
  return CHANNEL_DDL.split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

/** Column-list clauses inside a CREATE TABLE that are constraints, not columns. */
const CONSTRAINT_KEYWORDS = new Set(["unique", "primary", "foreign", "check", "constraint", "exclude"]);

/**
 * Every (table, column) pair this DDL is responsible for.
 *
 * Why parse the DDL instead of reading the drizzle schema: the drizzle schema
 * says what the *code* expects, the DDL says what the bootstrap actually
 * creates. Verifying the second is what catches an old database (tables exist,
 * a later `ALTER … ADD COLUMN` never ran) — which otherwise shows up as a
 * confusing "column does not exist" on the first post.
 */
export function channelColumns(): Array<{ table: string; column: string }> {
  const out: Array<{ table: string; column: string }> = [];
  const seen = new Set<string>();
  const push = (table: string, column: string) => {
    const key = `${table}.${column}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ table, column });
  };

  for (const stmt of channelDdlCode().split(";")) {
    const create = /^\s*create\s+table\s+if\s+not\s+exists\s+"?([a-zA-Z0-9_]+)"?\s*\(/i.exec(stmt);
    if (create) {
      const table = create[1];
      const open = stmt.indexOf("(");
      const close = stmt.lastIndexOf(")");
      const body = stmt.slice(open + 1, close);
      // Top-level commas only: a DEFAULT '[]' or a numeric type never contains
      // a comma at depth 0, but keeping the depth check makes this safe for
      // future `numeric(10,2)` columns.
      let depth = 0;
      let current = "";
      const parts: string[] = [];
      for (const ch of body) {
        if (ch === "(") depth += 1;
        if (ch === ")") depth -= 1;
        if (ch === "," && depth === 0) {
          parts.push(current);
          current = "";
        } else current += ch;
      }
      parts.push(current);
      for (const part of parts) {
        const first = part.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
        if (!first || CONSTRAINT_KEYWORDS.has(first)) continue;
        if (!/^[a-z_][a-z0-9_]*$/i.test(first)) continue;
        push(table, first);
      }
      continue;
    }
    const alter = /^\s*alter\s+table\s+"?([a-zA-Z0-9_]+)"?\s+add\s+column\s+if\s+not\s+exists\s+"?([a-zA-Z0-9_]+)"?/i.exec(stmt);
    if (alter) push(alter[1], alter[2]);
  }
  return out;
}

/**
 * Statements to execute one by one.
 *
 * Comments are stripped before splitting: a `;` inside a comment would
 * otherwise cut a statement in half and leave a fragment that starts mid-
 * sentence — which is exactly the kind of failure that only shows up at
 * runtime, on the first request, in production.
 */
export function channelStatements(): string[] {
  return channelDdlCode()
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
