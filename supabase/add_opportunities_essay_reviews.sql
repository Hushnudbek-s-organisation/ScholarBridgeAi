-- ScholarBridge — #24 essay peer review + #26/#27/#28 opportunities
-- QO'LDA ISHGA TUSHIRING (Supabase SQL Editor). Repo qoidasi: migratsiyalar
-- hech qachon avtomatik ishlamaydi. Barcha buyruqlar idempotent.

-- ---------------------------------------------------------------------------
-- #24 — Peer review: version flag + reviews jadvali
-- ---------------------------------------------------------------------------

ALTER TABLE essay_versions
  ADD COLUMN IF NOT EXISTS open_for_review boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS essay_reviews (
  id serial PRIMARY KEY,
  essay_version_id integer NOT NULL REFERENCES essay_versions(id) ON DELETE CASCADE,
  author_profile_id integer NOT NULL,
  reviewer_profile_id integer NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  hook integer,
  structure integer,
  specificity integer,
  language integer,
  fit integer,
  total integer,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_essay_reviews_version ON essay_reviews(essay_version_id);
CREATE INDEX IF NOT EXISTS idx_essay_reviews_reviewer ON essay_reviews(reviewer_profile_id);

-- ---------------------------------------------------------------------------
-- #26/#27/#28 — Opportunities katalogi
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS opportunities (
  id serial PRIMARY KEY,
  type text NOT NULL DEFAULT 'competition', -- competition | research | internship | summer_school
  title text NOT NULL,
  provider text NOT NULL DEFAULT '',
  country text, -- NULL = xalqaro
  fields text NOT NULL DEFAULT '["All"]',
  level text NOT NULL DEFAULT 'any', -- high_school | undergrad | grad | phd | any
  deadline_date date, -- NULL = takrorlanuvchi/noma'lum — o'ylab topilmaydi
  url text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(deadline_date);

-- Starter dataset: faqat rasmiy, barqaror, xalqaro tan olingan dasturlar.
-- Ma'lumotlar ommaviy faktlar; admin panel orqali boshqariladi.
INSERT INTO opportunities (type, title, provider, country, fields, level, deadline_date, url, description, is_verified)
SELECT v.type, v.title, v.provider, v.country, v.fields, v.level, v.deadline_date, v.url, v.description, v.is_verified
FROM (VALUES
  ('competition', 'International Mathematical Olympiad', 'IMO Foundation', NULL, '["Mathematics"]', 'high_school', NULL,
   'https://www.imo-official.org', 'Yillik xalqaro matematika olimpiadasi — 18 yoshgacha bo''lgan maktab o''quvchilari uchun.', true),
  ('competition', 'International Biology Olympiad', 'IBO Council', NULL, '["Biology", "Life Sciences"]', 'high_school', NULL,
   'https://ibo.org', 'Yillik xalqaro biologiya olimpiadasi — nazariy va amaliy bo''limlar.', true),
  ('competition', 'European Girls'' Mathematical Olympiad', 'EGMO', NULL, '["Mathematics"]', 'high_school', NULL,
   'https://egmo.org', 'Yillik xalqaro matematika olimpiadasi (qizlar uchun).', true),
  ('competition', 'International Collegiate Programming Contest', 'ICPC Foundation', NULL, '["Computer Science", "Mathematics"]', 'undergrad', NULL,
   'https://icpc.global', 'Universitet o''quvchilari jamoalarida dasturlash musobaqasi — har yili 100+ mamlakat.', true),
  ('competition', 'Regeneron Science Talent Search', 'Society for Science', 'USA', '["Physics", "Chemistry", "Biology", "Mathematics", "Computer Science"]', 'high_school', NULL,
   'https://www.societyforscience.org/regeneron-sts', 'Amerikadagi yirik ilmiy tadqiqot tanlovi — 12-sinf o''quvchilari uchun.', true),
  ('competition', 'Thiel Fellowship', 'Thiel Foundation', 'USA', '["All"]', 'high_school', NULL,
   'https://thiel.org/fellowship', '18 yoshdan kichik yoshli asoschilarga $100,000 — universitet o''rniga startap.', true),
  ('competition', 'FIRST Robotics Competition', 'FIRST', NULL, '["Engineering", "Computer Science", "Robotics"]', 'high_school', NULL,
   'https://frc.robotics.com', 'Yillik robototexnika musobaqasi — dizayn, dasturlash, muhandislik jamoalari.', true),
  ('internship', 'Google Summer of Code', 'Google', NULL, '["Computer Science", "Software Engineering", "Open Source"]', 'undergrad', NULL,
   'https://summerofcode.withgoogle.com', 'Yillik (odatda fevral–martda ariza) open-source internship — stipendiya bilan.', true),
  ('research', 'Fulbright Foreign Student Program', 'US Department of State', 'USA', '["All"]', 'grad', NULL,
   'https://fulbrightonline.org', 'AQSH da magistratura/phd va tadqiqot uchun grantlar — har yili yangi muddatlar.', true),
  ('research', 'DAAD Research Stay for Academic Professionals', 'DAAD', 'Germanya', '["All"]', 'grad', NULL,
   'https://www.daad.de', 'Germaniya universitetlarida tadqiqot qoldirish dasturlari — har yilgi to''lqinlar.', true),
  ('summer_school', 'MITACS Global Links', 'MITACS (Canada)', 'Canada', '["Computer Science", "Engineering", "Natural Sciences"]', 'undergrad', NULL,
   'https://mitacs.ca', 'Kanada da internships va global dasturlar — yillik takrorlanadi.', true)
) AS v(type, title, provider, country, fields, level, deadline_date, url, description, is_verified)
WHERE NOT EXISTS (
  SELECT 1 FROM opportunities o WHERE o.title = v.title
);

-- ===========================================================================
-- Saved programs (spec §24 — program shortlist) + notification types (§25)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS saved_programs (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, program_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_programs_profile ON saved_programs(profile_id);

-- Extend the default notification types for existing preference rows
-- (new types: requirement_gap, essay_improved — spec §25).
UPDATE notification_preferences
SET types = '["scholarship_opened", "deadline_approaching", "deadline_changed", "milestone_due", "requirement_gap", "essay_improved"]'
WHERE types NOT LIKE '%requirement_gap%';
