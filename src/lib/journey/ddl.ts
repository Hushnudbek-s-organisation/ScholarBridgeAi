/**
 * DDL for the Journey Core tables (spec reorganization, 2026-09-29).
 *
 * Kept in TypeScript (not read from disk) so it ships inside the server bundle
 * on every host. `supabase/add_journey_core.sql` holds the identical statements
 * for manual runs — `scripts/check-journey.ts` fails if the two drift apart.
 *
 * Every statement is `CREATE ... IF NOT EXISTS` and ADDITIVE: no existing table
 * is altered or dropped, so a deploy can never break a working feature.
 */
export const JOURNEY_DDL = `
-- ---------------------------------------------------------------------------
-- My Study Plan (spec §12) — a dated, phase-based plan for ONE goal.
-- Distinct from 'student_goals', which is a short pillar checklist.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_plans (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_major TEXT,
  target_country TEXT,
  degree_level TEXT,
  intake_term TEXT,
  goal_year INTEGER,
  funding_goal TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_plans_profile ON study_plans(profile_id);

CREATE TABLE IF NOT EXISTS study_plan_phases (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  phase_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_study_plan_phases_plan ON study_plan_phases(plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_study_plan_phases_key ON study_plan_phases(plan_id, phase_key);

-- ---------------------------------------------------------------------------
-- Document Vault (spec §7) — one upload, reused by every application.
-- 'application_documents' (the per-application checklist) links to these rows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_documents (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT,
  file_url TEXT,
  file_size_bytes INTEGER,
  mime_type TEXT,
  issued_at DATE,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'uploaded',
  verification_note TEXT,
  verified_at TIMESTAMP,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_documents_profile ON user_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_documents_expiry ON user_documents(profile_id, expires_at);

CREATE TABLE IF NOT EXISTS application_document_links (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_id INTEGER NOT NULL REFERENCES user_documents(id) ON DELETE CASCADE,
  usage TEXT NOT NULL DEFAULT 'required',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_doc_link ON application_document_links(application_id, document_id);

-- ---------------------------------------------------------------------------
-- Test Planner (spec §8). 'test_bookings' stays as the calendar of test dates.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_plans (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  test_type TEXT NOT NULL,
  current_score DOUBLE PRECISION,
  target_score DOUBLE PRECISION,
  target_date DATE,
  next_test_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_plans_profile ON test_plans(profile_id);

CREATE TABLE IF NOT EXISTS test_attempts (
  id SERIAL PRIMARY KEY,
  test_plan_id INTEGER NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  test_date DATE NOT NULL,
  score DOUBLE PRECISION,
  result_label TEXT,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_attempts_plan ON test_attempts(test_plan_id);

CREATE TABLE IF NOT EXISTS test_tasks (
  id SERIAL PRIMARY KEY,
  test_plan_id INTEGER NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  skill TEXT NOT NULL DEFAULT 'general',
  due_date DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_tasks_plan ON test_tasks(test_plan_id);

-- ---------------------------------------------------------------------------
-- Activity Portfolio (spec §14) — structured, evidence-backed activities.
-- Nothing here is ever generated by AI: the student is the source of truth.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_activities (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  role TEXT,
  organization TEXT,
  start_date DATE,
  end_date DATE,
  hours INTEGER,
  description TEXT,
  achievements TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_activities_profile ON student_activities(profile_id);

CREATE TABLE IF NOT EXISTS activity_evidence (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES student_activities(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  document_id INTEGER REFERENCES user_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_evidence_activity ON activity_evidence(activity_id);

-- ---------------------------------------------------------------------------
-- Requirement templates (spec §5) — university/program level catalogue.
-- ADMIN-PUBLISHED ONLY: the AI research agent may propose, never publish.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requirement_templates (
  id SERIAL PRIMARY KEY,
  university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
  -- Soft link (no FK): programs is a BASE table owned by the database, not by
  -- this bootstrap. Some deployments have a legacy university_programs table or no programs table,
  -- and a hard FK here aborted the whole
  -- journey bootstrap — every dashboard request then answered 503.
  program_id INTEGER,
  section TEXT NOT NULL,
  item_key TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  source_url TEXT,
  source_name TEXT,
  source_type TEXT,
  last_verified_at TIMESTAMP,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_requirement_templates_uni ON requirement_templates(university_id);
CREATE INDEX IF NOT EXISTS idx_requirement_templates_program ON requirement_templates(program_id);

-- ---------------------------------------------------------------------------
-- Application requirements (spec §5/§6) — the student's live checklist,
-- seeded from the templates above and editable by the student.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_requirements (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  item_key TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  source_url TEXT,
  source_name TEXT,
  source_type TEXT,
  last_verified_at TIMESTAMP,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  linked_type TEXT,
  linked_id INTEGER,
  completed_at TIMESTAMP,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_requirements_application ON application_requirements(application_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_app_requirements_key ON application_requirements(application_id, item_key);

-- ---------------------------------------------------------------------------
-- Recommendation manager (spec §19).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recommendation_requests (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  recommender_name TEXT NOT NULL,
  recommender_email TEXT,
  relationship TEXT,
  status TEXT NOT NULL DEFAULT 'not_requested',
  requested_at TIMESTAMP,
  submitted_at TIMESTAMP,
  due_date DATE,
  instructions TEXT,
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rec_requests_application ON recommendation_requests(application_id);

-- ---------------------------------------------------------------------------
-- Offers & Decisions (spec §23) + post-admission funding (spec §24).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admission_offers (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_at DATE,
  response_deadline DATE,
  offer_letter_url TEXT,
  offer_letter_name TEXT,
  conditions TEXT,
  deposit_amount INTEGER,
  deposit_due_date DATE,
  tuition_commitment INTEGER,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_admission_offer_application ON admission_offers(application_id);

CREATE TABLE IF NOT EXISTS funding_items (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  amount_usd INTEGER NOT NULL DEFAULT 0,
  covers TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'planned',
  confirmed_at DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funding_items_profile ON funding_items(profile_id);

-- ---------------------------------------------------------------------------
-- Deadline engine (spec §21) — one timeline for every kind of deadline.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journey_deadlines (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date DATE NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_journey_deadlines_profile ON journey_deadlines(profile_id, due_date);

-- ---------------------------------------------------------------------------
-- External Learning Provider (spec §32) — GENERIC contract, no partner.
-- Empty by default. ScholarBridge works exactly the same with zero providers.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_providers (
  id SERIAL PRIMARY KEY,
  provider_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'test_prep',
  status TEXT NOT NULL DEFAULT 'disabled',
  config TEXT NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_provider_links (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  provider_id INTEGER NOT NULL REFERENCES learning_providers(id) ON DELETE CASCADE,
  external_user_ref TEXT,
  status TEXT NOT NULL DEFAULT 'not_connected',
  consent_at TIMESTAMP,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_learning_link ON learning_provider_links(profile_id, provider_id);

CREATE TABLE IF NOT EXISTS learning_provider_scores (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES learning_provider_links(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value DOUBLE PRECISION,
  measured_at DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_learning_scores_link ON learning_provider_scores(link_id);

-- ---------------------------------------------------------------------------
-- Visa requirements (spec §25) — country × visa type, admin-published.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visa_requirements (
  id SERIAL PRIMARY KEY,
  country TEXT NOT NULL,
  visa_type TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  source_url TEXT,
  source_name TEXT,
  source_type TEXT,
  last_verified_at TIMESTAMP,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visa_requirements_country ON visa_requirements(country, visa_type);
`;

/** Split the DDL into single statements (no functions/`$$` in it). */
export function journeyStatements(): string[] {
  return JOURNEY_DDL
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
