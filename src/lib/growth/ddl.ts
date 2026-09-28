/**
 * DDL for the growth features. Kept in TypeScript (not read from disk) so it
 * ships inside the server bundle on every host. `supabase/add_growth_features.sql`
 * holds the identical statements for manual runs — `scripts/check-growth.ts`
 * fails if the two drift apart.
 */
export const GROWTH_DDL = `
CREATE TABLE IF NOT EXISTS success_stories (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER REFERENCES student_profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  home_country TEXT,
  admitted_university TEXT NOT NULL,
  admitted_country TEXT,
  other_admits TEXT NOT NULL DEFAULT '[]',
  degree_level TEXT,
  major TEXT,
  intake_year INTEGER,
  gpa DOUBLE PRECISION,
  gpa_scale DOUBLE PRECISION,
  ielts DOUBLE PRECISION,
  toefl INTEGER,
  sat INTEGER,
  activities TEXT NOT NULL DEFAULT '[]',
  awards TEXT NOT NULL DEFAULT '[]',
  essay_title TEXT,
  essay_excerpt TEXT,
  advice TEXT,
  scholarship_name TEXT,
  scholarship_amount_usd INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  admin_note TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_success_stories_status ON success_stories(status);
CREATE INDEX IF NOT EXISTS idx_success_stories_profile ON success_stories(profile_id);

CREATE TABLE IF NOT EXISTS goal_templates (
  id SERIAL PRIMARY KEY,
  pillar TEXT NOT NULL DEFAULT 'academic',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  level TEXT NOT NULL DEFAULT 'any',
  est_weeks INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_goals (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  template_id INTEGER REFERENCES goal_templates(id) ON DELETE SET NULL,
  pillar TEXT NOT NULL DEFAULT 'academic',
  title TEXT NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  target_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_goals_profile ON student_goals(profile_id);

CREATE TABLE IF NOT EXISTS answer_prompts (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  word_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answer_vault (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  prompt_id INTEGER NOT NULL REFERENCES answer_prompts(id) ON DELETE CASCADE,
  answer TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_answer_vault_profile_prompt ON answer_vault(profile_id, prompt_id);

CREATE TABLE IF NOT EXISTS scholarship_decisions (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  scholarship_id INTEGER NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_scholarship_decisions_profile_sch ON scholarship_decisions(profile_id, scholarship_id);

CREATE TABLE IF NOT EXISTS checklist_items (
  id SERIAL PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'offer',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  link_tab TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_checklist (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  done_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_checklist_profile_item ON student_checklist(profile_id, item_id);
`;

/** Split the DDL into single statements (no functions/`$$` in it). */
export function growthStatements(): string[] {
  return GROWTH_DDL
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}
