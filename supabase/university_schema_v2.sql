-- CANONICAL UNIVERSITY / PROGRAM / FUNDING SCHEMA (v2)
--
-- SAFETY CONTRACT
--   1) Run university_schema_preflight.sql and university_schema_data_audit.sql first.
--   2) Backup the database and inspect both programs and university_programs.
--   3) This migration deliberately does NOT rename, merge, delete, or copy any
--      university/program rows. It stops if a competing legacy program relation
--      exists, or if data conflicts would make a uniqueness rule unsafe.
--   4) Apply only after reviewing this file against the live catalog and staging.
--
-- Canonical destination for all new program records is public.programs.
-- Do not dual-write programs into a second table.

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('public.universities') IS NULL THEN
    RAISE EXCEPTION 'Required relation public.universities is missing; inspect the live schema before migration.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='universities' AND column_name IN ('name','country','city','world_ranking','program_major')) <> 5 THEN
    RAISE EXCEPTION 'public.universities lacks expected identity/legacy summary columns; review live schema before migration.';
  END IF;
  IF to_regclass('public.scholarships') IS NULL
     OR to_regclass('public.student_profiles') IS NULL
     OR to_regclass('public.saved_universities') IS NULL
     OR to_regclass('public.saved_programs') IS NULL
     OR to_regclass('public.saved_scholarships') IS NULL THEN
    RAISE EXCEPTION 'A required existing relation (scholarships, student_profiles, or saved_* table) is missing; inspect and plan it separately before this migration.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_universities' AND column_name IN ('id','profile_id','university_id')) <> 3
     OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_programs' AND column_name IN ('id','profile_id','program_id')) <> 3
     OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='saved_scholarships' AND column_name IN ('id','profile_id','scholarship_id')) <> 3 THEN
    RAISE EXCEPTION 'A saved_* table lacks expected identity columns; inspect its data and references before migration.';
  END IF;
  IF to_regclass('public.sources') IS NOT NULL AND (
    NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sources' AND column_name='url')
    OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sources' AND column_name='title')
  ) THEN
    RAISE EXCEPTION 'Existing sources relation lacks canonical url/title columns; review its data before migration.';
  END IF;
  IF to_regclass('public.programs') IS NOT NULL AND (
    (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='university_id') = 0
    OR (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='name') = 0
  ) THEN
    RAISE EXCEPTION 'Existing public.programs lacks required identity columns university_id/name. Resolve manually before migration.';
  END IF;
  IF to_regclass('public.application_cycles') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='application_cycles' AND column_name='university_id') THEN
    RAISE EXCEPTION 'Existing application_cycles lacks university_id; inspect data and references before migration.';
  END IF;
  IF to_regclass('public.program_requirements') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='program_requirements' AND column_name='program_id') THEN
    RAISE EXCEPTION 'Existing program_requirements lacks program_id; inspect data and references before migration.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='scholarships'
      AND column_name IN ('amount_usd_value','deadline','coverage_type','degree_levels','eligible_majors','min_gpa','min_ielts')) <> 7 THEN
    RAISE EXCEPTION 'Existing scholarships table lacks required legacy eligibility/award columns expected by this compatibility migration.';
  END IF;
  IF to_regclass('public.programs') IS NOT NULL AND to_regclass('public.university_programs') IS NOT NULL THEN
    RAISE EXCEPTION 'Both public.programs and public.university_programs exist. Inspect row counts, data, and referencing FKs; resolve manually before migration. No automatic rename/merge is safe.';
  END IF;
  IF to_regclass('public.programs') IS NULL AND to_regclass('public.university_programs') IS NOT NULL THEN
    RAISE EXCEPTION 'Only legacy public.university_programs exists. Inspect its contents and all referencing FKs, then plan a reviewed migration to canonical public.programs; this script will not rename it.';
  END IF;
  IF to_regclass('public.programs') IS NOT NULL AND (
    (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='degree')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='degree_level'))
    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='duration_years')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='duration'))
    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='tuition_amount')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='annual_tuition'))
    OR (EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='program_url')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='programs' AND column_name='official_url'))
  ) THEN
    RAISE EXCEPTION 'public.programs contains legacy synonym columns. Review/map values and FKs explicitly before using this migration; no automatic column/data rename is safe.';
  END IF;
  IF to_regclass('public.program_requirements') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='program_requirements' AND column_name IN ('requirement_type','minimum_value')) THEN
    RAISE EXCEPTION 'public.program_requirements has the legacy key/value layout. Review data and consumers before moving to the canonical wide layout.';
  END IF;
  IF to_regclass('public.application_cycles') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='application_cycles' AND column_name='cycle_year') THEN
    RAISE EXCEPTION 'public.application_cycles has legacy cycle_year. Review/map it to academic_year before migration; this script will not silently convert it.';
  END IF;
END
$guard$;

-- Universities: keep one institution identity; null means unknown, not zero.
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS canonical_name text;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS short_name text;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS country_code text;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS qs_rank_year integer;
ALTER TABLE public.universities ADD COLUMN IF NOT EXISTS data_source text;
ALTER TABLE public.universities ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.universities ALTER COLUMN world_ranking DROP NOT NULL;
ALTER TABLE public.universities ALTER COLUMN program_major DROP NOT NULL;

-- Shared evidence records. URLs are unique identities; verification belongs to
-- the source record and to each fact/relationship, not an untraceable score.
CREATE TABLE IF NOT EXISTS public.sources (
  id serial PRIMARY KEY,
  url text NOT NULL,
  title text NOT NULL,
  domain text,
  source_type text NOT NULL DEFAULT 'unclassified',
  accessed_at timestamp,
  is_official boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'unclassified';
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS accessed_at timestamp;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT false;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
ALTER TABLE public.sources ALTER COLUMN source_type SET DEFAULT 'unclassified';
DO $required_sources$
BEGIN
  IF EXISTS (SELECT 1 FROM public.sources WHERE url IS NULL OR title IS NULL) THEN
    RAISE EXCEPTION 'sources has NULL url/title values; review before enforcing required source identity.';
  END IF;
  ALTER TABLE public.sources ALTER COLUMN url SET NOT NULL;
  ALTER TABLE public.sources ALTER COLUMN title SET NOT NULL;
END
$required_sources$;

-- Canonical programs table. The legacy relation is never auto-renamed here.
CREATE TABLE IF NOT EXISTS public.programs (
  id serial PRIMARY KEY,
  university_id integer NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  name text NOT NULL,
  field text,
  degree_level text,
  duration numeric,
  duration_unit text NOT NULL DEFAULT 'years',
  study_mode text,
  language text,
  annual_tuition numeric,
  tuition_currency text NOT NULL DEFAULT 'USD',
  tuition_period text NOT NULL DEFAULT 'year',
  description text,
  official_url text,
  application_url text,
  is_verified boolean NOT NULL DEFAULT false,
  source_url text,
  last_verified_at timestamp,
  is_active boolean NOT NULL DEFAULT true,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS university_id integer;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS field text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS degree_level text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS duration numeric;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS duration_unit text NOT NULL DEFAULT 'years';
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS study_mode text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS annual_tuition numeric;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS tuition_currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS tuition_period text NOT NULL DEFAULT 'year';
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS official_url text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS application_url text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
DO $required_program$
BEGIN
  IF EXISTS (SELECT 1 FROM public.programs WHERE university_id IS NULL OR name IS NULL) THEN
    RAISE EXCEPTION 'programs has NULL university_id/name values; review and resolve before enforcing required identity.';
  END IF;
  ALTER TABLE public.programs ALTER COLUMN university_id SET NOT NULL;
  ALTER TABLE public.programs ALTER COLUMN name SET NOT NULL;
END
$required_program$;

-- Requirements: one current row per program/intake year in the existing wide
-- format. Empty values remain NULL; detailed normalization can be a later API
-- migration without breaking the current consumers.
CREATE TABLE IF NOT EXISTS public.program_requirements (
  id serial PRIMARY KEY,
  program_id integer NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  min_ielts double precision,
  min_toefl double precision,
  min_det double precision,
  min_sat integer,
  min_act integer,
  min_gpa double precision,
  ib_requirement text,
  a_level_requirement text,
  ap_requirement text,
  subject_requirements text,
  portfolio_required boolean NOT NULL DEFAULT false,
  interview_required boolean NOT NULL DEFAULT false,
  recommendation_required boolean NOT NULL DEFAULT false,
  personal_statement_required boolean NOT NULL DEFAULT false,
  other_requirements text,
  academic_year text,
  source_url text,
  last_verified_at timestamp,
  verification_status text NOT NULL DEFAULT 'unverified'
);
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS program_id integer;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_ielts double precision;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_toefl double precision;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_det double precision;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_sat integer;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_act integer;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS min_gpa double precision;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS ib_requirement text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS a_level_requirement text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS ap_requirement text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS subject_requirements text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS portfolio_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS interview_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS recommendation_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS personal_statement_required boolean NOT NULL DEFAULT false;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS other_requirements text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
ALTER TABLE public.program_requirements ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';

-- Application cycles can be institution-wide or tied to one program. Existing
-- university_id remains required; NULL program_id means institution-level cycle.
CREATE TABLE IF NOT EXISTS public.application_cycles (
  id serial PRIMARY KEY,
  university_id integer NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  program_id integer,
  academic_year text,
  intake text,
  application_type text,
  opening_date date,
  deadline date,
  deadline_timezone text,
  application_fee numeric,
  application_fee_currency text NOT NULL DEFAULT 'USD',
  application_url text,
  source_url text,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  last_verified_at timestamp,
  verification_status text NOT NULL DEFAULT 'unverified'
);
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS university_id integer;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS program_id integer;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS academic_year text;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS intake text;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_type text;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS opening_date date;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS deadline_timezone text;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_fee numeric;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_fee_currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS application_url text;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS source_id integer;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS last_verified_at timestamp;
ALTER TABLE public.application_cycles ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified';
DO $required_links$
BEGIN
  IF EXISTS (SELECT 1 FROM public.application_cycles WHERE university_id IS NULL) THEN
    RAISE EXCEPTION 'application_cycles has NULL university_id values; review rows before enforcing required ownership.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.program_requirements WHERE program_id IS NULL) THEN
    RAISE EXCEPTION 'program_requirements has NULL program_id values; review rows before enforcing required ownership.';
  END IF;
  ALTER TABLE public.application_cycles ALTER COLUMN university_id SET NOT NULL;
  ALTER TABLE public.program_requirements ALTER COLUMN program_id SET NOT NULL;
END
$required_links$;

-- Ranking facts belong to a provider/edition/year, not a single mutable column.
CREATE TABLE IF NOT EXISTS public.university_rankings (
  id serial PRIMARY KEY,
  university_id integer NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  ranking_provider text NOT NULL,
  ranking_name text NOT NULL,
  ranking_year integer NOT NULL,
  rank integer,
  rank_label text,
  score numeric,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  verified_at timestamp,
  verification_status text NOT NULL DEFAULT 'unverified',
  created_at timestamp NOT NULL DEFAULT now()
);

-- Explicit source relationships support multiple evidence pages per fact.
CREATE TABLE IF NOT EXISTS public.university_sources (
  id serial PRIMARY KEY,
  university_id integer NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'university_evidence'
);
ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS source_id integer;
ALTER TABLE public.university_sources ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'university_evidence';
ALTER TABLE public.university_sources ALTER COLUMN source_type SET DEFAULT 'university_evidence';
CREATE TABLE IF NOT EXISTS public.program_sources (
  id serial PRIMARY KEY,
  program_id integer NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'program_evidence',
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.scholarship_sources (
  id serial PRIMARY KEY,
  scholarship_id integer NOT NULL REFERENCES public.scholarships(id) ON DELETE CASCADE,
  source_id integer REFERENCES public.sources(id) ON DELETE SET NULL,
  source_type text NOT NULL DEFAULT 'scholarship_evidence',
  created_at timestamp NOT NULL DEFAULT now()
);
ALTER TABLE public.program_sources ALTER COLUMN source_type SET DEFAULT 'program_evidence';
ALTER TABLE public.scholarship_sources ALTER COLUMN source_type SET DEFAULT 'scholarship_evidence';

-- Award amounts are not assumed to be USD or fixed. The legacy USD value stays
-- nullable for old consumers; never populate it with 0 for variable/no amount.
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS university_id integer;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS award_amount numeric;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS award_currency text;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS award_period text;
ALTER TABLE public.scholarships ADD COLUMN IF NOT EXISTS award_basis text;
ALTER TABLE public.scholarships ALTER COLUMN amount_usd_value DROP NOT NULL;
ALTER TABLE public.scholarships ALTER COLUMN deadline DROP NOT NULL;
ALTER TABLE public.scholarships ALTER COLUMN coverage_type SET DEFAULT 'Unspecified';
ALTER TABLE public.scholarships ALTER COLUMN degree_levels SET DEFAULT '[]';
ALTER TABLE public.scholarships ALTER COLUMN eligible_majors SET DEFAULT '[]';
ALTER TABLE public.scholarships ALTER COLUMN min_gpa DROP DEFAULT;
ALTER TABLE public.scholarships ALTER COLUMN min_ielts DROP DEFAULT;

-- Safe indexes/FKs. Conflicting data aborts the transaction; nothing is merged
-- or discarded to make an index pass.
DO $constraints$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.universities
    WHERE canonical_name IS NOT NULL AND btrim(canonical_name) <> ''
    GROUP BY lower(btrim(canonical_name)) HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate university canonical_name values; resolve reviewed identity conflicts before adding the unique index.'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.programs
    GROUP BY university_id, lower(btrim(name)), lower(btrim(coalesce(degree_level, '')))
    HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate program identity rows exist; inspect and reconcile by hand before adding the unique index.'; END IF;

  IF EXISTS (SELECT 1 FROM public.programs p LEFT JOIN public.universities u ON u.id=p.university_id WHERE u.id IS NULL) THEN
    RAISE EXCEPTION 'Orphan program university_id values exist; repair after reviewing data before adding FK/indexes.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.program_requirements r LEFT JOIN public.programs p ON p.id=r.program_id WHERE p.id IS NULL) THEN
    RAISE EXCEPTION 'Orphan program_requirements.program_id values exist; repair after reviewing data before adding FK/indexes.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.program_requirements WHERE academic_year IS NOT NULL
    GROUP BY program_id, academic_year HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate program/year requirements exist; reconcile before adding unique index.'; END IF;

  IF EXISTS (SELECT 1 FROM public.sources GROUP BY url HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate sources.url values exist; reconcile source records before adding unique index.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.university_rankings
    GROUP BY university_id, ranking_provider, ranking_name, ranking_year
    HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Duplicate ranking editions exist; reconcile ranking facts before adding unique index.'; END IF;
  IF EXISTS (SELECT 1 FROM public.saved_universities GROUP BY profile_id, university_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate saved university pairs exist; preserve/reconcile user records before adding unique index.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.saved_programs GROUP BY profile_id, program_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate saved program pairs exist; preserve/reconcile user records before adding unique index.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.saved_scholarships GROUP BY profile_id, scholarship_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate saved scholarship pairs exist; preserve/reconcile user records before adding unique index.';
  END IF;
END
$constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_universities_canonical_name_ci
  ON public.universities (lower(btrim(canonical_name)))
  WHERE canonical_name IS NOT NULL AND btrim(canonical_name) <> '';
CREATE INDEX IF NOT EXISTS idx_programs_university ON public.programs(university_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_id_university ON public.programs(id, university_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_programs_university_name_degree
  ON public.programs (university_id, lower(btrim(name)), lower(btrim(coalesce(degree_level, ''))));
CREATE INDEX IF NOT EXISTS idx_program_requirements_program ON public.program_requirements(program_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_program_requirements_program_year
  ON public.program_requirements(program_id, academic_year) WHERE academic_year IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_application_cycles_university_year ON public.application_cycles(university_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_application_cycles_program ON public.application_cycles(program_id);
CREATE INDEX IF NOT EXISTS idx_scholarships_university ON public.scholarships(university_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sources_url ON public.sources(url);
CREATE UNIQUE INDEX IF NOT EXISTS uq_university_ranking_edition
  ON public.university_rankings(university_id, ranking_provider, ranking_name, ranking_year);
CREATE INDEX IF NOT EXISTS idx_university_rankings_year_rank ON public.university_rankings(ranking_year, rank);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_universities_profile_university
  ON public.saved_universities(profile_id, university_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_programs_profile_program
  ON public.saved_programs(profile_id, program_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_scholarships_profile_scholarship
  ON public.saved_scholarships(profile_id, scholarship_id);

-- Add only the new FKs if an equivalent named FK is not already present.
DO $fks$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.application_cycles'::regclass AND conname='application_cycles_university_id_fkey') THEN
    IF EXISTS (SELECT 1 FROM public.application_cycles c LEFT JOIN public.universities u ON u.id=c.university_id WHERE u.id IS NULL) THEN
      RAISE EXCEPTION 'Orphan application_cycles.university_id values exist; review before adding FK.';
    END IF;
    ALTER TABLE public.application_cycles ADD CONSTRAINT application_cycles_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.application_cycles'::regclass AND conname='application_cycles_program_university_fkey') THEN
    IF EXISTS (SELECT 1 FROM public.application_cycles c LEFT JOIN public.programs p ON p.id=c.program_id AND p.university_id=c.university_id WHERE c.program_id IS NOT NULL AND p.id IS NULL) THEN
      RAISE EXCEPTION 'Application cycle program_id/university_id mismatches or orphan rows exist; review before adding composite FK.';
    END IF;
    ALTER TABLE public.application_cycles ADD CONSTRAINT application_cycles_program_university_fkey
      FOREIGN KEY (program_id, university_id) REFERENCES public.programs(id, university_id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.application_cycles'::regclass AND conname='application_cycles_source_id_fkey') THEN
    ALTER TABLE public.application_cycles ADD CONSTRAINT application_cycles_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.program_requirements'::regclass AND conname='program_requirements_program_id_fkey') THEN
    ALTER TABLE public.program_requirements ADD CONSTRAINT program_requirements_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.scholarships'::regclass AND conname='scholarships_university_id_fkey') THEN
    IF EXISTS (SELECT 1 FROM public.scholarships s LEFT JOIN public.universities u ON u.id=s.university_id WHERE s.university_id IS NOT NULL AND u.id IS NULL) THEN
      RAISE EXCEPTION 'Orphan scholarships.university_id values exist; review before adding FK.';
    END IF;
    ALTER TABLE public.scholarships ADD CONSTRAINT scholarships_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.programs'::regclass AND conname='programs_university_id_fkey') THEN
    ALTER TABLE public.programs ADD CONSTRAINT programs_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.university_sources'::regclass AND conname='university_sources_university_id_fkey') THEN
    ALTER TABLE public.university_sources ADD CONSTRAINT university_sources_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.university_sources'::regclass AND conname='university_sources_source_id_fkey') THEN
    ALTER TABLE public.university_sources ADD CONSTRAINT university_sources_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.program_sources'::regclass AND conname='program_sources_program_id_fkey') THEN
    ALTER TABLE public.program_sources ADD CONSTRAINT program_sources_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.program_sources'::regclass AND conname='program_sources_source_id_fkey') THEN
    ALTER TABLE public.program_sources ADD CONSTRAINT program_sources_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.scholarship_sources'::regclass AND conname='scholarship_sources_scholarship_id_fkey') THEN
    ALTER TABLE public.scholarship_sources ADD CONSTRAINT scholarship_sources_scholarship_id_fkey
      FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.scholarship_sources'::regclass AND conname='scholarship_sources_source_id_fkey') THEN
    ALTER TABLE public.scholarship_sources ADD CONSTRAINT scholarship_sources_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.university_rankings'::regclass AND conname='university_rankings_university_id_fkey') THEN
    ALTER TABLE public.university_rankings ADD CONSTRAINT university_rankings_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.university_rankings'::regclass AND conname='university_rankings_source_id_fkey') THEN
    ALTER TABLE public.university_rankings ADD CONSTRAINT university_rankings_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES public.sources(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.saved_universities'::regclass AND conname='saved_universities_profile_id_fkey') THEN
    ALTER TABLE public.saved_universities ADD CONSTRAINT saved_universities_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.saved_universities'::regclass AND conname='saved_universities_university_id_fkey') THEN
    ALTER TABLE public.saved_universities ADD CONSTRAINT saved_universities_university_id_fkey
      FOREIGN KEY (university_id) REFERENCES public.universities(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.saved_programs'::regclass AND conname='saved_programs_profile_id_fkey') THEN
    ALTER TABLE public.saved_programs ADD CONSTRAINT saved_programs_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.saved_programs'::regclass AND conname='saved_programs_program_id_fkey') THEN
    ALTER TABLE public.saved_programs ADD CONSTRAINT saved_programs_program_id_fkey
      FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.saved_scholarships'::regclass AND conname='saved_scholarships_profile_id_fkey') THEN
    ALTER TABLE public.saved_scholarships ADD CONSTRAINT saved_scholarships_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.saved_scholarships'::regclass AND conname='saved_scholarships_scholarship_id_fkey') THEN
    ALTER TABLE public.saved_scholarships ADD CONSTRAINT saved_scholarships_scholarship_id_fkey
      FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(id) ON DELETE CASCADE;
  END IF;
END
$fks$;

COMMIT;
