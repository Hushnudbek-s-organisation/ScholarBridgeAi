-- ════════════════════════════════════════════════════════════════════════
-- Top 300 Universities (PDF, 2026-10-23) — Supabase import / gap-fill
--
-- Context: the PDF "Top 300 Universities — Supabase Master Prompt" was imported
-- into the live project (zkdguzbdopfedkffsatk) on 2026-10-22/23.
--   * public.universities  — 187 existing rows updated, 110 inserted (ids 217–326)
--   * public.scholarships  — 262 headline scholarships inserted (notes start with
--                            'Imported from the Top 300 Universities dataset')
--   * public.university_scholarships — NEW table (PDF option A), 297 rows
--   * programs / program_requirements / application_cycles / sources /
--     university_sources / program_sources — one undergraduate record set per
--     PDF university that had none (114 universities)
--
-- This file is the idempotent, re-runnable part (DDL + security). The data
-- statements depend on a staging table built from the PDF by
-- scripts/import/top300/*.py (see scripts/import/top300/README.md) and are
-- therefore kept there, not here.
--
-- Decisions taken (approved in chat):
--   * world_ranking of the 200 QS-ranked universities was KEPT (the app sorts
--     and filters by it); the 110 new rows have world_ranking = NULL.
--   * acceptance_rate stays in PERCENT (app convention: 4 = 4%), not 0.04.
--   * No deep links were fabricated: admissions_url of new rows = official
--     website; application_url / international_* / undergraduate_* stay NULL.
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.university_scholarships (
  id                     serial PRIMARY KEY,
  university_id          integer NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  scholarship_id         integer REFERENCES public.scholarships(id) ON DELETE SET NULL,
  scholarship_name       text NOT NULL,
  availability_status    text NOT NULL,            -- 'Yes' | 'Limited' | 'Very Limited'
  funding_type           text NOT NULL,            -- 'Merit-based' | 'Need-based' | 'Merit/Need-based' | 'Fully Funded' | 'Tuition-Free'
  max_scholarship        text NOT NULL,            -- 'Full Ride' | 'Full Tuition (100% tuition)' | 'Substantial Partial …' | …
  covers_tuition         boolean NOT NULL DEFAULT true,
  covers_living_expenses boolean NOT NULL DEFAULT false,
  valued_aspect          text,                     -- admission focus ("SAT/ACT Scores", "A-Levels/IB", …)
  eligibility_notes      text,
  official_url           text,
  source_url             text,
  verification_status    text NOT NULL DEFAULT 'verified',
  last_verified_at       timestamp without time zone DEFAULT now(),
  created_at             timestamp without time zone NOT NULL DEFAULT now(),
  UNIQUE (university_id, scholarship_name)
);
CREATE INDEX IF NOT EXISTS idx_university_scholarships_university
  ON public.university_scholarships(university_id);
COMMENT ON TABLE public.university_scholarships IS
  'Per-university headline scholarship from the Top 300 Universities dataset (PDF, 2026). Detailed scholarship records live in public.scholarships (linked via scholarship_id).';

-- Same lockdown as supabase/enable_rls.sql: the app connects as the table
-- owner (bypasses RLS); anon/authenticated must not read it via PostgREST.
ALTER TABLE public.university_scholarships ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.university_scholarships FROM anon;
    REVOKE ALL ON SEQUENCE public.university_scholarships_id_seq FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.university_scholarships FROM authenticated;
    REVOKE ALL ON SEQUENCE public.university_scholarships_id_seq FROM authenticated;
  END IF;
END $$;

-- ── Verification (adapted from PDF section 5) ─────────────────────────────
-- SELECT count(*) AS total, count(world_ranking) AS ranked FROM public.universities;        -- 326 / 200
-- SELECT count(*) FROM public.university_scholarships;                                       -- 297
-- SELECT count(*) FROM public.university_scholarships WHERE scholarship_id IS NULL;          -- 0
-- SELECT count(DISTINCT university_id) FROM public.programs           WHERE university_id > 200;  -- ≥ 114
-- SELECT count(DISTINCT university_id) FROM public.application_cycles WHERE university_id > 200;  -- ≥ 114
-- SELECT count(DISTINCT university_id) FROM public.university_sources WHERE university_id > 200;  -- ≥ 114
