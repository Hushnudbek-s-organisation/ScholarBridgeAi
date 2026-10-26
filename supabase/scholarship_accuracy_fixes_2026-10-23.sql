-- ============================================================================
-- Scholarship accuracy fixes on the university page (2026-10-23, second pass)
--
-- Context: after the first linking pass every university had a scholarship row,
-- but four of them were template rows from the original seed whose figures the
-- university's own website contradicts. Verified against the official pages and
-- corrected here. Also removes the last two "another institution's award" rows
-- that were attached to duplicate university rows.
-- ============================================================================

BEGIN;

-- ── 1. University of Münster (485) ─────────────────────────────────────────
-- Was: "<…> International Excellence Scholarship", $5,000 "Full Tuition".
-- Wrong: German public universities charge NO tuition, so a fee waiver cannot exist.
-- Real: ProTalent, Münster's own programme — 300 EUR/month for the standard
-- period of study, funded by alumni and matched by the Deutschlandstipendium.
-- Source: uni-muenster.de/studieninteressierte/en/bewerbung/index.html
UPDATE public.scholarships SET
  title = 'ProTalent – Deutschlandstipendium of the University of Münster',
  coverage_type = 'Partial (Monthly Stipend)',
  amount_usd_value = 3888,
  award_basis = 'fixed',
  deadline = 'Annually in May/June for the funding year starting 1 October',
  description = 'ProTalent is the University of Münster''s own scholarship programme: 300 EUR per month for the standard period of study, funded by alumni and donors and matched through Germany''s Deutschlandstipendium. Münster is a public university and charges no tuition fees, so the award is a living-cost stipend, not a fee waiver. The International Office additionally runs DAAD STIBET graduation and equal-opportunity scholarships of up to 500 EUR per month for 1-6 months (call opens 1-31 July each year).',
  requirements = 'Enrolled (or admitted) student at the University of Münster with outstanding academic results and social commitment; one application per year via the ProTalent portal (usually May/June). The STIBET scholarships require non-German citizenship and financial need; the graduation scholarship requires completion within 12 months.',
  website_url = 'https://www.uni-muenster.de/studieninteressierte/en/bewerbung/index.html',
  source_url = 'https://www.uni-muenster.de/studieninteressierte/en/bewerbung/index.html',
  degree_levels = '["Bachelor","Master"]',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 485;

UPDATE public.university_scholarships SET
  scholarship_name = 'ProTalent – Deutschlandstipendium of the University of Münster',
  funding_type = 'Monthly stipend (Deutschlandstipendium)',
  max_scholarship = '300 EUR per month',
  covers_tuition = false,
  covers_living_expenses = true,
  official_url = 'https://www.uni-muenster.de/studieninteressierte/en/bewerbung/index.html',
  source_url = 'https://www.uni-muenster.de/studieninteressierte/en/bewerbung/index.html'
WHERE scholarship_id = 485;

-- ── 2. University of Iceland (506) ─────────────────────────────────────────
-- Was: $5,000 "Full Tuition". Wrong: UI charges no tuition at all — only an
-- annual registration fee (ISK 100,000 for 2026/27) — and states on its own
-- website: "The university does not offer any funding or scholarships to
-- prospective students." The real route for international students is the
-- Icelandic Government Scholarship in Icelandic as a Second Language.
-- amount_usd_value is NOT NULL in the schema, so it records the registration fee
-- the award covers (ISK 100,000 ≈ $730); the monthly stipend is not published.
UPDATE public.scholarships SET
  title = 'Icelandic Government Scholarship – Icelandic as a Second Language (studied at UI)',
  coverage_type = 'Partial (Registration Fee + Monthly Stipend)',
  amount_usd_value = 730,
  award_basis = 'variable',
  deadline = 'Annually, applications by 1 December',
  description = 'The University of Iceland charges no tuition, only an annual registration fee (ISK 100,000 for 2026/27, about $730 - the figure recorded here), and states explicitly that it offers no funding or scholarships of its own to prospective students. The one route open to international students is the Icelandic Government Scholarship in Icelandic as a Second Language, administered by the Árni Magnússon Institute: it covers the UI registration fee plus a monthly stipend for room and board from September to April, with a room in the Gamli Garður dormitory, for about 12-15 students a year (renewable up to three years). The monthly stipend amount is not published. Note: the Icelandic government has authorised tuition fees for students from outside the EEA/EFTA starting in autumn 2027; amounts are not set yet.',
  requirements = 'Non-Icelandic applicants who have completed at least one year of university studies in the humanities and have basic Icelandic; about 12-15 awards a year; application to the Árni Magnússon Institute by 1 December.',
  website_url = 'https://english.hi.is/study/apply/university-fees',
  source_url = 'https://english.hi.is/study/apply/university-fees',
  degree_levels = '["Bachelor"]',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 506;

UPDATE public.university_scholarships SET
  scholarship_name = 'Icelandic Government Scholarship – Icelandic as a Second Language (studied at UI)',
  funding_type = 'Government scholarship',
  max_scholarship = 'Registration fee + monthly room and board stipend (Sept-April)',
  covers_tuition = false,
  covers_living_expenses = true,
  official_url = 'https://english.hi.is/study/apply/university-fees',
  source_url = 'https://english.hi.is/study/apply/university-fees'
WHERE scholarship_id = 506;

-- ── 3. Two rows that belonged to another institution ───────────────────────
-- 399  "PUCV Graduate Scholarship" (Pontificia Universidad Católica de
--      VALPARAÍSO) was attached to 174, the duplicate row of PUC CHILE.
-- 496  "<…> International Excellence Scholarship" sat on 176, the duplicate row
--      of UNAM (91), which already carries its own verified UNAM awards.
-- Deactivated instead of invented: the primary rows keep the real funding.
UPDATE public.scholarships
SET is_active = false,
    notes = coalesce(notes, '') || ' | Deactivated 2026-10-23: template row on a duplicate university row; the primary row carries the verified awards.',
    last_updated_at = now()
WHERE id IN (399, 496);

DELETE FROM public.university_scholarships WHERE scholarship_id IN (399, 496);

-- ── 4. PUC Chile duplicate row (174) needs a real award of its own ─────────
-- UC publishes tuition scholarships for EXCHANGE students from CINDA member and
-- Latin American Catholic universities (uc.cl → futuros estudiantes). This is a
-- distinct scholarship from the international-undergraduate one owned by 89.
INSERT INTO public.scholarships (
  title, provider, country, coverage_type, amount_usd_value, deadline, description, requirements,
  website_url, deadline_type, recurrence, application_status, verification_status,
  source_reliability, is_active, university_id, degree_levels, eligible_majors,
  source_url, last_verified_at, last_updated_at, award_basis, award_currency
) VALUES (
  'UC Tuition Scholarship for Exchange Students (CINDA & Latin American Catholic Universities)',
  'Pontificia Universidad Católica de Chile', 'Chile', 'Partial Tuition', 8000,
  'Per exchange agreement; deadlines are set by the sending university',
  'The Pontificia Universidad Católica de Chile grants tuition scholarships to exchange students coming from member universities of the CINDA network and from Latin American Catholic universities. This is the funding route UC publishes for international students: applicants who want a full undergraduate degree at UC must either enter through the Chilean centralised PAES admission route or enrol as international students paying the full arancel, and UC does not offer need- or merit-based scholarships for that route.',
  'Enrolled at a CINDA member or Latin American Catholic university and nominated for an exchange place by that home university; the home institution sets the selection and deadline.',
  'https://www.uc.cl/informacion-para/futuros-estudiantes/',
  'rolling', 'annual', 'open', 'verified', 8, true, 174, '["Bachelor"]', '["All"]',
  'https://www.uc.cl/informacion-para/futuros-estudiantes/', now(), now(), 'variable', 'USD'
) ON CONFLICT (title) DO NOTHING;

INSERT INTO public.university_scholarships (
  university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship,
  covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url,
  verification_status, last_verified_at
)
SELECT 174, sc.id, sc.title, 'Yes', 'Exchange tuition scholarship', 'Partial tuition waiver',
       true, false, 'Home-university nomination',
       'Enrolled at a CINDA member or Latin American Catholic university and nominated for exchange by that university.',
       sc.website_url, sc.source_url, 'verified', now()
FROM public.scholarships sc
WHERE sc.title = 'UC Tuition Scholarship for Exchange Students (CINDA & Latin American Catholic Universities)'
ON CONFLICT (university_id, scholarship_name) DO NOTHING;

COMMIT;

-- Verification after the run:
--   -- every university has a non-empty scholarship list on its page
--   SELECT count(DISTINCT u.id) FROM universities u
--     JOIN scholarships sc ON sc.is_active AND (sc.university_id = u.id OR lower(sc.country) = lower(u.country));  -- 364
--   -- and (all but one duplicate row) lead with their OWN award
--   SELECT count(*) FROM universities u
--     WHERE NOT EXISTS (SELECT 1 FROM scholarships s WHERE s.is_active AND s.university_id = u.id);  -- 1 (176, duplicate of 91)
