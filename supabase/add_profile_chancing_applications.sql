-- ============================================================================
-- SCHOLARBRIDGE — COMPLETE PROFILE + CHANCING + APPLICATION OUTCOMES
-- ============================================================================
-- XAVFSIZ: faqat `ADD COLUMN IF NOT EXISTS` va `CREATE TABLE IF NOT EXISTS`.
-- Mavjud jadval / ustun / ma'lumot HECH QACHON o'chirilmaydi yoki
-- o'zgartirilmaydi. Skriptni necha marta ishga tushirsangiz ham bo'ladi.
--
-- Supabase SQL Editor'da bir marta ishga tushiring.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) student_profiles → to'liq profil (Academic / Personal / Financial /
--    Extracurricular / Achievements / Goals). Barcha ustunlar NULL — hech
--    qanday ma'lumot "to'ldirilmagan" deb hisoblanmaydi (spec: hech qachon
--    soxta default qo'yilmaydi).
-- ----------------------------------------------------------------------------
ALTER TABLE public.student_profiles
  -- Academic
  ADD COLUMN IF NOT EXISTS act_score integer,
  ADD COLUMN IF NOT EXISTS duolingo_score integer,
  ADD COLUMN IF NOT EXISTS ap_courses text,          -- JSON array: ["Calculus AB", ...]
  ADD COLUMN IF NOT EXISTS ib_courses text,          -- JSON array
  ADD COLUMN IF NOT EXISTS a_level_subjects text,    -- JSON array
  ADD COLUMN IF NOT EXISTS coursework_notes text,
  -- Personal
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  -- Financial
  ADD COLUMN IF NOT EXISTS family_income_usd integer,
  ADD COLUMN IF NOT EXISTS needs_financial_aid boolean,
  ADD COLUMN IF NOT EXISTS requires_full_scholarship boolean,
  -- Extracurriculars (structured) — `extracurriculars` text ustuni saqlanadi
  ADD COLUMN IF NOT EXISTS leadership text,          -- JSON array of {title, org, years, role}
  ADD COLUMN IF NOT EXISTS volunteering text,        -- JSON array
  ADD COLUMN IF NOT EXISTS sports text,              -- JSON array
  ADD COLUMN IF NOT EXISTS clubs text,               -- JSON array
  ADD COLUMN IF NOT EXISTS research_experience text, -- JSON array
  ADD COLUMN IF NOT EXISTS projects text,            -- JSON array
  -- Achievements
  ADD COLUMN IF NOT EXISTS olympiads text,           -- JSON array
  ADD COLUMN IF NOT EXISTS awards text,              -- JSON array
  ADD COLUMN IF NOT EXISTS competitions text,        -- JSON array
  ADD COLUMN IF NOT EXISTS certificates text,        -- JSON array
  -- Goals
  ADD COLUMN IF NOT EXISTS target_universities text, -- JSON array of names/ids
  ADD COLUMN IF NOT EXISTS career_goal text,
  -- Consent for the anonymous outcomes dataset (see application_outcomes)
  ADD COLUMN IF NOT EXISTS data_share_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_share_consent_at timestamp;

CREATE INDEX IF NOT EXISTS idx_student_profiles_country ON public.student_profiles(country);

-- ----------------------------------------------------------------------------
-- 2) applications — universal application tracker
--    (University → Program → Round → Status → Result)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  university_id integer REFERENCES public.universities(id) ON DELETE SET NULL,
  university_name text NOT NULL DEFAULT '',
  program_name text,
  application_round text,              -- ED | EA | RD | Rolling | Winter | Summer
  intake_term text,                    -- Fall 2027 | Spring 2027 | ...
  deadline date,
  status text NOT NULL DEFAULT 'not_started',
    -- not_started | preparing | essay | documents | recommendations
    -- | fee_paid | submitted | interview | decision | withdrawn
  submitted_at timestamp,
  application_fee_paid boolean NOT NULL DEFAULT false,
  fee_amount integer,
  portal_url text,
  notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_applications_profile ON public.applications(profile_id);
CREATE INDEX IF NOT EXISTS idx_applications_university ON public.applications(university_id);
CREATE INDEX IF NOT EXISTS idx_applications_deadline ON public.applications(deadline);

-- ----------------------------------------------------------------------------
-- 3) application_outcomes — ScholarBridge'ning O'Z dataset'i
--    Har bir natija (Accepted / Rejected / Waitlisted / Deferred) saqlanadi —
--    negative example'lar ham, chunki modelsiz faqat "Accepted" yig'ish
--    noto'g'ri pattern o'rgatadi.
--
--    `share_consent = true` bo'lgan yozuvlargina chancing modelini
--    yaxshilashda ishlatiladi (anonym, profilga bog'lanmagan holda).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.application_outcomes (
  id serial PRIMARY KEY,
  application_id integer NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  profile_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  university_id integer REFERENCES public.universities(id) ON DELETE SET NULL,
  result text NOT NULL,                -- accepted | rejected | waitlisted | deferred | withdrawn
  decided_at date,
  scholarship_amount_usd integer,
  scholarship_name text,
  notes text,
  -- Profil snapshot'i (model uchun): o'sha paytdagi GPA/test/aktivliklar
  snapshot_gpa double precision,
  snapshot_gpa_scale double precision,
  snapshot_ielts double precision,
  snapshot_toefl integer,
  snapshot_sat integer,
  snapshot_act integer,
  snapshot_major text,
  snapshot_country text,
  snapshot_extracurriculars text,
  -- Anonym dataset'ga hissa qo'shishga rozilik
  share_consent boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outcomes_application ON public.application_outcomes(application_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_profile ON public.application_outcomes(profile_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_university_result ON public.application_outcomes(university_id, result);
CREATE INDEX IF NOT EXISTS idx_outcomes_consent ON public.application_outcomes(share_consent);

-- ----------------------------------------------------------------------------
-- 4) test_bookings — IELTS / SAT / TOEFL / Duolingo sanalari
--    Deadline Calendar bitta joyda ko'rsatishi uchun.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.test_bookings (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  test_type text NOT NULL,             -- ielts | toefl | sat | act | duolingo | gre
  test_date date NOT NULL,
  location text,
  registered boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_test_bookings_profile ON public.test_bookings(profile_id);
CREATE INDEX IF NOT EXISTS idx_test_bookings_date ON public.test_bookings(test_date);
