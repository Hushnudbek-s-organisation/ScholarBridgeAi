-- Scholly phase 2: durable user preferences, resumable onboarding, and events.
-- Additive and idempotent. user_id is student_profiles.id (the app's existing
-- authenticated profile identity), not a new account system.

CREATE TABLE IF NOT EXISTS scholly_profile (
  user_id integer PRIMARY KEY REFERENCES student_profiles(id) ON DELETE CASCADE,
  name_pref text,
  name_confirmed boolean NOT NULL DEFAULT false,
  lang text NOT NULL DEFAULT 'uz',
  tone text NOT NULL DEFAULT 'friendly',
  tz text NOT NULL DEFAULT 'Asia/Tashkent',
  streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  freezes integer NOT NULL DEFAULT 0,
  points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  skin text NOT NULL DEFAULT 'default',
  outfit jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_active_day date,
  notif_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  quiet_start text NOT NULL DEFAULT '22:00',
  quiet_end text NOT NULL DEFAULT '07:00',
  reminder_window text,
  telegram_chat_id text,
  onboarding_state text NOT NULL DEFAULT 'not_started',
  onboarding_step text NOT NULL DEFAULT 'name',
  onboarding_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scholly_profile_lang_check CHECK (lang IN ('uz', 'ru', 'en')),
  CONSTRAINT scholly_profile_tone_check CHECK (tone IN ('friendly', 'short', 'serious')),
  CONSTRAINT scholly_profile_streak_nonnegative CHECK (streak >= 0 AND longest_streak >= 0 AND freezes BETWEEN 0 AND 2 AND points >= 0 AND level >= 1),
  CONSTRAINT scholly_profile_onboarding_state_check CHECK (onboarding_state IN ('not_started', 'in_progress', 'skipped', 'completed')),
  CONSTRAINT scholly_profile_onboarding_step_check CHECK (onboarding_step IN ('name', 'reminder', 'tone', 'challenge', 'complete')),
  CONSTRAINT scholly_profile_outfit_object_check CHECK (jsonb_typeof(outfit) = 'object'),
  CONSTRAINT scholly_profile_notif_prefs_object_check CHECK (jsonb_typeof(notif_prefs) = 'object'),
  CONSTRAINT scholly_profile_onboarding_answers_object_check CHECK (jsonb_typeof(onboarding_answers) = 'object')
);

CREATE TABLE IF NOT EXISTS scholly_events (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scholly_events_payload_object_check CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_scholly_events_user_type_created
  ON scholly_events (user_id, type, created_at);

COMMENT ON TABLE scholly_profile IS 'Scholly settings and durable companion state for an existing student profile.';
COMMENT ON TABLE scholly_events IS 'Auditable, reproducible Scholly event stream; timestamps are stored in UTC.';

CREATE TABLE IF NOT EXISTS daily_missions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  type text NOT NULL,
  size_min integer NOT NULL DEFAULT 3,
  points integer NOT NULL DEFAULT 10,
  target_count integer NOT NULL DEFAULT 1,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  theme text NOT NULL DEFAULT 'plan',
  is_star boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  another_used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  done_at timestamptz,
  CONSTRAINT daily_missions_status_check CHECK (status IN ('pending', 'done', 'skipped')),
  CONSTRAINT daily_missions_type_check CHECK (type IN ('fill_profile_fields', 'save_universities', 'upload_document', 'sop_paragraph')),
  CONSTRAINT daily_missions_size_check CHECK (size_min BETWEEN 1 AND 5),
  CONSTRAINT daily_missions_target_count_check CHECK (target_count BETWEEN 1 AND 5000),
  CONSTRAINT daily_missions_points_check CHECK (points IN (10, 20)),
  CONSTRAINT daily_missions_criteria_object_check CHECK (jsonb_typeof(criteria) = 'object'),
  CONSTRAINT uq_daily_missions_user_day UNIQUE (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_daily_missions_user_status_day
  ON daily_missions (user_id, status, day);
COMMENT ON TABLE daily_missions IS 'One deterministic Scholly mission per student-local 04:00 day; completion is verified from existing product data.';
