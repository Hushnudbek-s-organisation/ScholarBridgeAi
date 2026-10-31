-- ============================================================================
-- QS World University Rankings 2026 — correction pass 2 (2026-10-30)
--
-- Scope: finish the job `qs_2026_rank_correction.sql` (2026-10-23) started.
-- That pass reconciled `universities.world_ranking` against the top-499 extract
-- `data/qs_2026_top499.tsv`. The project then adopted the complete edition
-- `data/qs2026_top1500.csv` (1504 rows) as the authority — Phases AB, AC and the
-- public gates compare against it — and a full read-only audit of all 356 active
-- rows on 2026-10-30 found three remaining defects:
--
--   1. SIX ranks were one place low. Every one of them sits inside a single
--      block that starts at #157, and the cause is a tie the two extracts
--      render differently:
--
--          rank | data/qs2026_top1500.csv  | data/qs_2026_top499.tsv
--          -----+--------------------------+-------------------------
--           155 | Exeter + Geneva (tie)    | Exeter + Geneva (tie)
--           156 | (skipped)                | (skipped)
--           157 | Lancaster                | Lancaster + Basel (tie)
--           158 | Basel                    | Hanyang
--           159 | Hanyang                  | Barcelona
--           160 | Barcelona                | Michigan State
--           161 | Michigan State           | (skipped)
--           162 | Ghent                    | Ghent
--
--      QS numbers a tie block once and then resumes past it, so a tie at 157
--      must be followed by 159. The top-499 extract breaks that rule (157, 157,
--      158 … and a gap at 161); the CSV holds it (157 … 161 with no gap). The
--      CSV is therefore the self-consistent table and the one every gate reads,
--      so the database is aligned to it. If the owner's own QS page shows
--      "=157" for Basel, row 141 is the single value to revisit.
--
--   2. TWO rows claimed a QS position for an institution the 2026 edition does
--      not rank at all:
--
--          id  37  KAIST                       world_ranking 53   qs_rank_year NULL
--          id 298  École des Ponts ParisTech   world_ranking 205  qs_rank_year NULL
--
--      KAIST was excluded from the 2026 edition by QS (anti-canvassing rule) —
--      the previous correction cleared it for exactly that reason, and a later
--      import from the user-supplied "Top 300 Universities dataset (user PDF,
--      2026)" put a number back. Neither institution appears anywhere in
--      data/qs2026_top1500.csv. A rank nobody can verify is not a position, so
--      both are cleared. This is also what the Phase AD read path already
--      assumes: a rank without `qs_rank_year` is not published.
--
--   3. `university_rankings` held 194 QS 2026 rows marked `verified` whose
--      `rank` was a 1…200 sequence (id order), not a QS position — Princeton
--      #13, Columbia #18, SNU #29 … No runtime code reads that table, but a
--      "verified" label on a wrong number is a trap for whoever reads it next.
--      The QS rows are re-synced to the corrected institutional positions; the
--      two cleared institutions get rank NULL and `unverified`.
--
-- Left untouched on purpose: `university_rankings` THE and U.S. News rows. No
-- official table for either edition exists in this repository, so their values
-- cannot be checked — and "cannot check" is not "is wrong".
--
-- Result on the live project (verified immediately after running):
--   ranked 348 / unranked 8 / qs_rank_year = 2026 → 348
--   six corrected ranks, two cleared ranks, 194 QS ranking rows re-synced
--   (193 carry a position, 1 — KAIST — is unranked and marked 'unverified')
-- ============================================================================
BEGIN;

-- 1. Ranks that were one place low (CSV: rank | institution).
UPDATE public.universities AS u
SET world_ranking = v.wr,
    qs_rank_year = 2026,
    last_verified_at = now()
FROM (VALUES
  (141, 158),  -- University of Basel
  (134, 159),  -- Hanyang University
  (307, 160),  -- University of Barcelona
  (305, 161),  -- Michigan State University
  (197, 342),  -- University of Oulu
  (301, 343)   -- Southern University of Science and Technology
) AS v(id, wr)
WHERE u.id = v.id;

-- 2. No position for an institution the edition does not rank.
UPDATE public.universities
SET world_ranking = NULL,
    qs_rank_year = NULL,
    last_verified_at = now()
WHERE id IN (37, 298);

-- 3. KAIST prose: the sentence carried "(QS World Ranking #37)" — the same
--    unverifiable number. The clause is removed, nothing else is reworded, and
--    the highlight that repeated it is dropped. See `PREMIER` in
--    src/lib/universityProse.ts, which now renders this shape without a rank.
UPDATE public.universities
SET description = 'KAIST (Korea Advanced Institute of Science & Technology) is a premier global research university in Daejeon, South Korea, renowned for academic excellence, cutting-edge laboratories, and international career outcomes.',
    highlights = '["Scholarship: KAIST International Student Scholarship (Merit-based) - Full Ride (100% Tuition + $300/mo Stipend + Health Ins.) [Yes]","Located in Daejeon, South Korea (Founded 1971)","Post-study work visa opportunity: 2 year(s)","Comprehensive undergraduate, master''s, and doctoral research programs","Uzbek applicants guide: South Korea Top-10 #2"]',
    last_verified_at = now()
WHERE id = 37;

-- 4. `university_rankings`: the QS 2026 rows follow the institutional position.
UPDATE public.university_rankings AS r
SET rank = u.world_ranking,
    rank_label = '#' || u.world_ranking,
    verified_at = now(),
    verification_status = 'verified'
FROM public.universities AS u
WHERE r.university_id = u.id
  AND r.ranking_provider = 'QS Quacquarelli Symonds'
  AND r.ranking_year = 2026
  AND u.world_ranking IS NOT NULL;

UPDATE public.university_rankings AS r
SET rank = NULL,
    rank_label = NULL,
    verification_status = 'unverified'
FROM public.universities AS u
WHERE r.university_id = u.id
  AND r.ranking_provider = 'QS Quacquarelli Symonds'
  AND r.ranking_year = 2026
  AND u.world_ranking IS NULL;

COMMIT;

-- Verification
--   SELECT count(*) FILTER (WHERE world_ranking IS NOT NULL) AS ranked,      -- 348
--          count(*) FILTER (WHERE world_ranking IS NULL)     AS unranked,    --   8
--          count(*) FILTER (WHERE qs_rank_year = 2026)       AS qs_2026      -- 348
--   FROM public.universities WHERE is_active;
--
--   SELECT id, name, world_ranking FROM public.universities
--   WHERE id IN (37, 141, 134, 307, 305, 197, 301, 298) ORDER BY id;
--
--   SELECT count(*) FILTER (WHERE rank IS NULL) AS unranked,
--          count(*) FILTER (WHERE verification_status = 'unverified') AS unverified
--   FROM public.university_rankings WHERE ranking_provider = 'QS Quacquarelli Symonds';
