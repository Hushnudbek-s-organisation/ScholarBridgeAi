-- ============================================================================
-- SCHOLARBRIDGE — TOP 51-80 SEED OLDI FIX
-- ============================================================================
--
-- MUAMMO:
--   TOP 51-80 seed'ni RUN qilganda:
--     ERROR: null value in column "program_major" of relation "universities"
--            violates not-null constraint
--
-- SABAB:
--   Real bazadagi `universities.program_major` ustuni NOT NULL, lekin unda
--   DEFAULT yo'q (qarang: src/db/schema.ts, supabase/step3_restore_all.sql).
--   Seed'dagi `CREATE TABLE IF NOT EXISTS` esa jadval allaqachon mavjud
--   bo'lgani uchun HECH NARSA qilmaydi — default qo'shilmaydi.
--   Seed'dagi universities INSERT'lari `program_major` ustunini umuman
--   ko'rsatmaydi → Postgres NULL qo'ymoqchi bo'ladi → NOT NULL xatosi.
--   (`degree_level`'da DEFAULT 'All' borligi uchun u ishlaydigan edi.)
--
-- YECHIM (2 qadam):
--   1. Shu faylni Supabase SQL Editor'da RUN qiling (xavfsiz, idempotent —
--      faqat yetishmayotgan ustun/default'larni qo'shadi, ma'lumotni
--      o'chirmaydi/o'zgartirmaydi).
--   2. Katta TOP 51-80 seed'ni O'ZGARTIRMASDAN qayta RUN qiling.
--
-- Bu fayl shuningdek seed ishlatadigan, lekin eski sxemada bo'lmasligi
-- mumkin bo'lgan ustunlarni ham qo'shadi (sources.accessed_at,
-- university_sources.title/url, program_requirements.requirement_type,
-- application_cycles.cycle_year/deadline_type/..., programs.degree va h.k.),
-- shunda seed ikkinchi urinishda to'xtamasdan oxirigacha boradi.
-- ============================================================================

-- ---------- 1) universities: default'lar + yetishmaydigan ustunlar ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'universities') THEN
    -- Seed CREATE'dagi ustunlar (agar eski jadvalda yo'q bo'lsa)
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS degree_level text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS program_major text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS short_name text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS annual_tuition numeric;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS tuition_currency text DEFAULT 'USD';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS tuition_period text DEFAULT 'year';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS annual_tuition_usd integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS annual_living_est numeric;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS living_cost_currency text DEFAULT 'USD';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS living_cost_period text DEFAULT 'year';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS annual_living_est_usd integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS accommodation_cost numeric;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS accommodation_cost_currency text DEFAULT 'USD';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS accommodation_cost_period text DEFAULT 'year';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS accommodation_cost_usd integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_fee integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_fee_currency text DEFAULT 'USD';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS min_gpa double precision;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS min_ielts double precision;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS min_toefl integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS min_sat integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS min_duolingo integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS min_act integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS acceptance_rate double precision;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS post_study_work_visa_years double precision;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS post_study_visa_note text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS founded_year integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS university_type text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS address text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS international_students_count integer;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS international_students_percentage double precision;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS international_students_pct double precision;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS is_english_taught boolean DEFAULT false;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS official_website_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS admissions_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS international_admissions_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS undergraduate_admissions_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS undergraduate_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS international_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS application_platform text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS description text DEFAULT '';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS highlights text DEFAULT '[]';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS website_url text DEFAULT '';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS image_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS source_reliability integer DEFAULT 7;
    ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

    -- ASOSIY FIX: program_major/degree_level uchun default
    ALTER TABLE public.universities ALTER COLUMN degree_level SET DEFAULT 'All';
    ALTER TABLE public.universities ALTER COLUMN program_major SET DEFAULT 'All';
    UPDATE public.universities SET degree_level = 'All' WHERE degree_level IS NULL;
    UPDATE public.universities SET program_major = 'All' WHERE program_major IS NULL;
  END IF;
END $$;

-- ---------- 2) programs ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'programs') THEN
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS university_id integer;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS field text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS degree text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS degree_level text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS duration numeric;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS duration_years double precision;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS duration_unit text DEFAULT 'years';
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS study_mode text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS language text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS tuition_amount integer;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS annual_tuition numeric;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS tuition_currency text DEFAULT 'USD';
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS tuition_period text DEFAULT 'year';
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS program_url text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS official_url text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS application_url text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
    ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
  END IF;
END $$;

-- ---------- 3) university_programs (seed ikkala jadvalga ham yozadi) ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_programs') THEN
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS university_id integer;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS name text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS field text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS degree text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS degree_level text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS duration numeric;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS duration_years double precision;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS duration_unit text DEFAULT 'years';
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS study_mode text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS language text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS tuition_amount integer;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS annual_tuition numeric;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS tuition_currency text DEFAULT 'USD';
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS tuition_period text DEFAULT 'year';
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS program_url text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS official_url text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS application_url text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
    ALTER TABLE public.university_programs ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
  END IF;
END $$;

-- ---------- 4) program_requirements (tor + keng sxema birga yashaydi) ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'program_requirements') THEN
    -- Seed ishlatadigan tor ustunlar
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS program_id integer;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS requirement_type text DEFAULT 'other';
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS minimum_value double precision;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS value_text text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_ielts double precision;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_toefl double precision;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
    -- App o'qiydigan keng ustunlar (bo'lmasa qo'shiladi, app mock'ga tushmaydi)
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_det double precision;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_sat integer;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_act integer;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_gpa double precision;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS ib_requirement text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS a_level_requirement text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS ap_requirement text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS subject_requirements text;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS portfolio_required boolean DEFAULT false;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS interview_required boolean DEFAULT false;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS recommendation_required boolean DEFAULT false;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS personal_statement_required boolean DEFAULT false;
    ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS other_requirements text;
  END IF;
END $$;

-- ---------- 5) application_cycles ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'application_cycles') THEN
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS university_id integer;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS academic_year text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS intake text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_type text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS cycle_year integer;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS opening_date date;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS deadline date;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS deadline_type text DEFAULT 'exact';
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS deadline_timezone text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_fee numeric;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_fee_currency text DEFAULT 'USD';
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_url text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS official_source_id integer;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS is_estimated boolean DEFAULT false;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
  END IF;
END $$;

-- ---------- 6) sources (seed CREATE'da accessed_at yo'q — shu yerda kafolat) ----------
CREATE TABLE IF NOT EXISTS public.sources (
  id serial PRIMARY KEY,
  url text NOT NULL,
  title text NOT NULL,
  domain text,
  source_type text NOT NULL DEFAULT 'official_website',
  accessed_at timestamp,
  is_official boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sources') THEN
    ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS domain text;
    ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'official_website';
    ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS accessed_at timestamp;
    ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS is_official boolean DEFAULT false;
    ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
    ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_url ON public.sources(url);

-- ---------- 7) university_sources ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_sources') THEN
    ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS university_id integer;
    ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS source_id integer;
    ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'official_website';
    ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS title text DEFAULT '';
    ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS url text DEFAULT '';
    ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now();
  END IF;
END $$;

-- ---------- 8) program_sources / scholarship_sources (app mosligi uchun) ----------
CREATE TABLE IF NOT EXISTS public.program_sources (
  id serial PRIMARY KEY,
  program_id integer NOT NULL,
  source_id integer,
  source_type text NOT NULL DEFAULT 'official_program',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.scholarship_sources (
  id serial PRIMARY KEY,
  scholarship_id integer NOT NULL,
  source_id integer,
  source_type text NOT NULL DEFAULT 'official_scholarship',
  created_at timestamp NOT NULL DEFAULT now()
);

-- ---------- 9) scholarships (seed ON CONFLICT'da last_verified_at ishlatadi) ----------
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scholarships') THEN
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS coverage_type text DEFAULT 'Full Tuition + Stipend';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS amount_usd_value integer;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS deadline text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS degree_levels text DEFAULT '["Master","PhD"]';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS eligible_majors text DEFAULT '["All"]';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS requirements text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS website_url text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS funding_type text DEFAULT '';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS deadline_date date;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS opening_date date;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS deadline_type text DEFAULT 'unknown';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS application_status text DEFAULT 'unknown';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'unverified';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS source_reliability integer DEFAULT 7;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS source_url text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS last_updated_at timestamp;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS university_id integer;
    -- App o'qiydigan keng ustunlar
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS min_gpa double precision;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS min_ielts double precision;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS financial_need_based boolean DEFAULT false;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS merit_based boolean DEFAULT true;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS eligible_countries text DEFAULT '[]';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS tuition_coverage text DEFAULT '';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS living_allowance integer;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS travel_allowance integer;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS accommodation text DEFAULT '';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS application_fee integer;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS english_requirements text DEFAULT '';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS required_documents text DEFAULT '[]';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS application_url text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS deadline_range_start date;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS deadline_range_end date;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS rounds text DEFAULT '[]';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS recurrence text DEFAULT 'none';
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS expected_opening_period text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS expected_deadline_period text;
    ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS notes text;
  ELSE
    -- Yangi baza bo'lsa: minimal jadval + yuqoridagi ustunlar keyingi
    -- RUN'da qo'shiladi (bu faylni 2-marta RUN qilish ham xavfsiz).
    CREATE TABLE public.scholarships (
      id serial PRIMARY KEY,
      title text NOT NULL,
      provider text NOT NULL,
      country text NOT NULL,
      coverage_type text NOT NULL DEFAULT 'Full Tuition + Stipend',
      amount_usd_value integer NOT NULL DEFAULT 0,
      deadline text NOT NULL DEFAULT '',
      degree_levels text NOT NULL DEFAULT '["Master","PhD"]',
      eligible_majors text NOT NULL DEFAULT '["All"]',
      description text NOT NULL DEFAULT '',
      requirements text NOT NULL DEFAULT '',
      website_url text NOT NULL DEFAULT '',
      funding_type text DEFAULT '',
      deadline_date date,
      opening_date date,
      deadline_type text NOT NULL DEFAULT 'unknown',
      application_status text NOT NULL DEFAULT 'unknown',
      verification_status text NOT NULL DEFAULT 'verified',
      source_reliability integer NOT NULL DEFAULT 9,
      source_url text,
      last_verified_at timestamp,
      is_active boolean NOT NULL DEFAULT true,
      university_id integer
    );
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_scholarships_title ON public.scholarships(title);
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'universities') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_universities_name ON public.universities(name);
  END IF;
END $$;

-- ---------- 10) Tekshirish ----------
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'universities'
  AND column_name IN ('degree_level', 'program_major')
ORDER BY column_name;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'sources'
  AND column_name = 'accessed_at';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'scholarships'
  AND column_name IN ('university_id', 'last_verified_at')
ORDER BY column_name;
