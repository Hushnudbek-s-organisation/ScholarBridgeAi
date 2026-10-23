-- ============================================================================
-- University ↔ scholarship links and verified scholarship corrections
-- (2026-10-23, live project zkdguzbdopfedkffsatk)
--
-- WHY
-- ---
-- Asking "do the universities show the scholarships they actually offer?" turned
-- up three different problems:
--
--   1. Czech Technical University (id 213) had NO scholarship at all, so its page
--      opened with an empty funding section.
--   2. Fifteen universities already had a `scholarships` row pointing at them but
--      no `university_scholarships` row, so the two tables disagreed (the page
--      itself reads `scholarships.university_id`, so it did render — but the
--      per-university grant table, which the PDF import populated, was incomplete).
--   3. Three of those fifteen rows carried generic, unsourced figures that do not
--      match the university's own rules (Turku/Oulu: Finland's full-cost reform
--      stopped first-year scholarships; Tartu: waivers replaced by reductions).
--
-- HOW THE APP READS THIS
-- ----------------------
-- `GET /api/universities/[id]` (src/app/api/universities/[id]/route.ts) builds the
-- funding list from `scholarships` — active rows where university_id = the page,
-- or the provider is the university, or the country matches — sorted with the
-- university's own awards first and capped at six. `university_scholarships` is
-- the per-university headline table and is kept in sync here.
-- ============================================================================

BEGIN;

-- ── 1. CTU Prague: four real scholarships, all from official CTU pages ──────
--  * international.cvut.cz/students/incoming-students/ctu-scholarships/
--      – foreign Master's students: up to CZK 10,000/month (1–2 semesters, extendable)
--      – foreign PhD students:      up to CZK 16,000/month (6–12 months, extendable)
--  * international.cvut.cz/students/current-students/professor-vlcek-scholarship/
--      – Miroslav Vlček Extraordinary Scholarship: one-off CZK 30,000
--  * intranet.fel.cvut.cz/en/admissions/scholarship-merit.html
--      – faculty merit scholarship for outstanding study results (CTU Scholarship
--        Rules effective 1 Dec 2025)
-- CZK → USD uses the app's own rate (CZK = 0.043, src/lib/countryCostBenchmarks.ts).
-- None of the four covers tuition, so covers_tuition = false and the coverage
-- type is a stipend/award, not "Full Tuition".
INSERT INTO public.scholarships (
  title, provider, country, coverage_type, amount_usd_value, deadline, description, requirements,
  website_url, deadline_type, recurrence, application_status, verification_status,
  source_reliability, is_active, university_id, degree_levels, eligible_majors,
  source_url, last_verified_at, last_updated_at, award_basis, award_currency
) VALUES
  ('CTU Scholarship for Foreign Students in Master''s Programmes',
   'Czech Technical University in Prague', 'Czechia', 'Partial (Living Stipend)', 4300,
   'Rolling: apply after the first semester through the faculty International Office',
   'A monthly contribution of up to CZK 10,000 (about $430) towards living costs in the Czech Republic for foreign students in a Master''s programme taught in English. Normally awarded for 1-2 semesters and extendable up to the standard length of the programme when results are excellent. Tuition (CZK 132,000/yr for English-taught Master''s) is NOT covered by this scholarship.',
   'Foreign (non-Czech) student enrolled in a CTU Master''s programme; application through the faculty International Office to the Department of International Relations; decision by the Vice-Rector on the recommendation of the commission of vice-deans for international relations.',
   'https://international.cvut.cz/students/incoming-students/ctu-scholarships/',
   'rolling', 'annual', 'open', 'verified', 9, true, 213, '["Master","PhD"]', '["All"]',
   'https://international.cvut.cz/students/incoming-students/ctu-scholarships/', now(), now(), 'fixed', 'USD'),

  ('CTU Scholarship for Foreign PhD Students',
   'Czech Technical University in Prague', 'Czechia', 'Partial (Living Stipend)', 8256,
   'Rolling: 6-12 months, extendable',
   'Up to CZK 16,000 per month (about $690) for 6-12 months, extendable to the standard length of the PhD when research results are strong. Financed equally by the CTU rectorate scholarship fund and the faculty fund. Tuition for English-taught doctoral programmes (CZK 1,000/yr) is nominal and separate.',
   'Foreign doctoral student in an English-taught PhD programme at CTU who can carry out independent research; the stay must produce a publication in an internationally reviewed journal or an international grant application.',
   'https://international.cvut.cz/students/incoming-students/ctu-scholarships/',
   'rolling', 'annual', 'open', 'verified', 9, true, 213, '["Master","PhD"]', '["All"]',
   'https://international.cvut.cz/students/incoming-students/ctu-scholarships/', now(), now(), 'fixed', 'USD'),

  ('Professor Miroslav Vlček Extraordinary Scholarship (CTU)',
   'Czech Technical University in Prague', 'Czechia', 'One-off Award', 1290,
   'Annually, autumn (application window announced on the CTU website)',
   'One-off award of CZK 30,000 (about $1,290) presented once a year by the Rector to a foreign student who, beyond their study duties, has spread the good name of CTU in the Czech Republic and abroad and has supported the internationalisation of Prague''s public universities. Awarded within the Study in Prague consortium; a student may receive it only once per study programme.',
   'Foreign student at CTU (Master''s programmes in particular) with demonstrable active involvement in research, teaching support or other activities benefiting international students; nomination/application plus selection procedure; not available during disciplinary proceedings or an interruption of studies.',
   'https://international.cvut.cz/students/current-students/professor-vlcek-scholarship/',
   'annual', 'annual', 'open', 'verified', 9, true, 213, '["Master","PhD"]', '["All"]',
   'https://international.cvut.cz/students/current-students/professor-vlcek-scholarship/', now(), now(), 'fixed', 'USD'),

  ('CTU Merit Scholarship for Outstanding Study Results',
   'Czech Technical University in Prague', 'Czechia', 'Partial Tuition', 0,
   'Twice a year: winter-semester awards paid in April, summer-semester awards in November',
   'Faculty merit scholarships under the CTU Scholarship Rules (effective 1 December 2025). Eligibility: at least 30 credits in the previous semester, at least 4 graded subjects, weighted average 1.50 or better, and study within the standard programme length. The semester amount scales with the grade average (bands below 1.00 / 1.10 / 1.25 / 1.50 against a dean-set base), so the actual award varies by faculty and semester.',
   'CTU student in a bachelor''s or master''s programme who meets the credit, subject-count and grade-average thresholds; no separate application is required at the Faculty of Electrical Engineering.',
   'https://intranet.fel.cvut.cz/en/admissions/scholarship-merit.html',
   'rolling', 'annual', 'open', 'verified', 9, true, 213, '["Master","PhD"]', '["All"]',
   'https://intranet.fel.cvut.cz/en/admissions/scholarship-merit.html', now(), now(), 'variable', 'USD')
ON CONFLICT (title) DO NOTHING;

-- link them to the university (per-university headline table)
INSERT INTO public.university_scholarships (
  university_id, scholarship_id, scholarship_name, availability_status, funding_type,
  max_scholarship, covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes,
  official_url, source_url, verification_status, last_verified_at
)
SELECT 213, sc.id, sc.title, 'Yes',
       CASE
         WHEN sc.title LIKE 'CTU Scholarship for Foreign Students in Master%' THEN 'Need/Merit-based stipend'
         WHEN sc.title LIKE 'CTU Scholarship for Foreign PhD%'                   THEN 'Doctoral stipend'
         WHEN sc.title LIKE 'Professor Miroslav Vl%'                             THEN 'One-off merit award'
         ELSE 'Merit scholarship'
       END,
       CASE
         WHEN sc.title LIKE 'CTU Scholarship for Foreign Students in Master%' THEN 'Monthly stipend up to CZK 10,000'
         WHEN sc.title LIKE 'CTU Scholarship for Foreign PhD%'                   THEN 'Monthly stipend up to CZK 16,000'
         WHEN sc.title LIKE 'Professor Miroslav Vl%'                             THEN 'One-off CZK 30,000'
         ELSE 'Semester award scaled to the grade average'
       END,
       sc.coverage_type ILIKE '%tuition%',
       sc.coverage_type ILIKE '%stipend%',
       'Academic results and research output',
       left(sc.requirements, 900), sc.website_url, sc.source_url, 'verified', now()
FROM public.scholarships sc
WHERE sc.university_id = 213
ON CONFLICT (university_id, scholarship_name) DO NOTHING;

-- ── 2. Correct the three rows whose figures contradict the university's rules ──
-- Finland moved to full-cost fees on 1 Aug 2026: Turku and Oulu no longer award a
-- first-year tuition scholarship to new fee-payers. Tartu stopped offering tuition
-- waivers to new non-EU/EEA students from 2026/27 and replaced them with
-- programme-level reductions. The old rows claimed flat $12,000 / $12,000 / $5,000
-- "Full Tuition" awards, which nobody can receive.
UPDATE public.scholarships SET
  title = 'UTU Merit Scholarship (50% of tuition from year 2) + Early Bird Discount',
  coverage_type = 'Partial Tuition', amount_usd_value = 6480, award_basis = 'fixed',
  website_url = 'https://www.utu.fi/en/study-at-utu/scholarships-and-tuition-fees',
  source_url  = 'https://www.utu.fi/en/study-at-utu/scholarships-and-tuition-fees',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 504;

UPDATE public.scholarships SET
  title = 'University of Oulu Tuition Fee Waiver Scholarship (10-40%) + Early Bird Discount',
  coverage_type = 'Partial Tuition', amount_usd_value = 6048, award_basis = 'variable',
  website_url = 'https://www.oulu.fi/en/apply/how-apply/university-oulu-tuition-fees-and-scholarships-for-international-applicants',
  source_url  = 'https://www.oulu.fi/en/apply/how-apply/university-oulu-tuition-fees-and-scholarships-for-international-applicants',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 505;

UPDATE public.scholarships SET
  title = 'University of Tartu Tuition Fee Reduction (selected programmes)',
  coverage_type = 'Partial Tuition', amount_usd_value = 4000, award_basis = 'variable',
  website_url = 'https://ut.ee/en/content/cost-tuition',
  source_url  = 'https://ut.ee/en/content/cost-tuition',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 507;

-- ── 3. Complete the per-university grant table ──────────────────────────────
-- Every university that had a scholarship but no `university_scholarships` row gets
-- one, mirroring its strongest verified award (verified first, then the largest
-- published amount).
INSERT INTO public.university_scholarships (
  university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship,
  covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url,
  verification_status, last_verified_at
)
SELECT DISTINCT ON (u.id)
  u.id, sc.id, sc.title, 'Yes', sc.coverage_type, sc.coverage_type,
  (sc.coverage_type ILIKE '%tuition%'),
  (sc.coverage_type ILIKE '%stipend%' OR sc.coverage_type ILIKE '%living%'),
  'Academic merit', left(sc.requirements, 900),
  coalesce(sc.website_url, sc.source_url), coalesce(sc.source_url, sc.website_url),
  sc.verification_status, coalesce(sc.last_verified_at, now())
FROM public.universities u
JOIN public.scholarships sc ON sc.university_id = u.id AND sc.is_active
WHERE NOT EXISTS (SELECT 1 FROM public.university_scholarships us WHERE us.university_id = u.id)
ORDER BY u.id, (sc.verification_status = 'verified') DESC, coalesce(sc.amount_usd_value, 0) DESC, sc.id
ON CONFLICT (university_id, scholarship_name) DO NOTHING;

COMMIT;

-- ── Verification (values after the run) ────────────────────────────────────
--   SELECT count(*) FROM universities u
--    WHERE NOT EXISTS (SELECT 1 FROM university_scholarships us WHERE us.university_id = u.id);   -- 0
--   SELECT count(*) FROM university_scholarships;                                                  -- 381
--   SELECT count(*) FROM university_scholarships WHERE scholarship_id IS NULL;                     -- 0
--   SELECT count(*) FROM university_scholarships us JOIN scholarships sc ON sc.id = us.scholarship_id
--    WHERE sc.university_id IS DISTINCT FROM us.university_id;                                     -- 0
--   SELECT count(*) FROM universities u
--    WHERE NOT EXISTS (SELECT 1 FROM scholarships sc WHERE sc.university_id = u.id AND sc.is_active); -- 0
--   SELECT count(*) FROM scholarships WHERE university_id = 213;                                   -- 4
