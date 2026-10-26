-- Telegram channel publisher: daily plan, post log, polls, preference weights,
-- click tracking and the curated story bank.
-- The app also creates these lazily on first use (src/lib/channel/db.ts);
-- scripts/check-channel.ts fails if this file and CHANNEL_DDL drift apart.
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
