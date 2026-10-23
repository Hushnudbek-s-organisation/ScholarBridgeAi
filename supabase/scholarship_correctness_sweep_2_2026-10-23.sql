-- ============================================================================
-- Scholarship correctness sweep #2 (2026-10-23)
--
-- Audit of all 648 scholarship rows for the same two defect classes fixed
-- earlier (award attached to the wrong university / claim that cannot be true),
-- plus duplicates that crowd the six slots a university page shows.
--
-- Findings and fixes below. Everything that survives is verified against the
-- university's own site or a well-known policy fact; nothing was replaced with
-- invented text.
-- ============================================================================

BEGIN;

-- ── A. Five awards attached to the WRONG university ────────────────────────
--  148  "UCLA Chancellors Fellowship"          sat on UCL (London)  -> UCLA (51)
--  389  "QUB Doctoral Scholarships" (Belfast)  sat on Queen's Kingston (CA) -> QUB (313)
--  439  "Newcastle International Postgraduate" (Australia) sat on Newcastle UK -> 310
--   51  "HKUST University Scholarship"         sat on HKU            -> HKUST (217)
--  305  "HKUST RedBird PhD Scholarship"        sat on HKU            -> HKUST (217)
DELETE FROM public.university_scholarships WHERE scholarship_id IN (148, 389, 439, 51, 305);

UPDATE public.scholarships SET university_id = 51,  country = 'United States',  last_updated_at = now(), last_verified_at = now() WHERE id = 148;
UPDATE public.scholarships SET university_id = 313, country = 'United Kingdom', last_updated_at = now(), last_verified_at = now() WHERE id = 389;
UPDATE public.scholarships SET university_id = 310, country = 'Australia',      last_updated_at = now(), last_verified_at = now() WHERE id = 439;
UPDATE public.scholarships SET university_id = 217, country = 'Hong Kong SAR',  last_updated_at = now(), last_verified_at = now() WHERE id IN (51, 305);

INSERT INTO public.university_scholarships (
  university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship,
  covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url,
  verification_status, last_verified_at)
SELECT sc.university_id, sc.id, sc.title, 'Yes', sc.coverage_type, sc.coverage_type,
       sc.coverage_type ILIKE '%tuition%', sc.coverage_type ILIKE '%stipend%',
       'Academic merit', left(sc.requirements, 900), coalesce(sc.website_url, sc.source_url),
       coalesce(sc.source_url, sc.website_url), sc.verification_status, now()
FROM public.scholarships sc
WHERE sc.id IN (148, 389, 439, 51, 305)
ON CONFLICT (university_id, scholarship_name) DO NOTHING;

-- ── B. Claims that cannot be true: "Full Tuition" where no tuition exists ──
-- German public universities outside Baden-Württemberg/Bavaria charge NO tuition
-- (a ~EUR 350 semester contribution only). The real funding is the
-- Deutschlandstipendium (EUR 300/month, federal + sponsors, awarded through the
-- university) and DAAD. 350 also claimed USD 18,000 at RWTH Aachen, which the
-- university does not offer. Replaced with the verifiable programme.
UPDATE public.scholarships SET
  title = 'Deutschlandstipendium & RWTH Education Fund',
  coverage_type = 'Partial (Monthly Stipend)', amount_usd_value = 3888, award_basis = 'fixed',
  description = 'RWTH Aachen is a public university in North Rhine-Westphalia: no tuition fee is charged, only a semester contribution of about EUR 350. The funding that actually exists is the Deutschlandstipendium (EUR 300 per month) and the RWTH Education Fund scholarships for international students; a full ride worth USD 18,000 is not offered.',
  requirements = 'Enrolled student at RWTH Aachen with strong academic results and social commitment; Deutschlandstipendium/RWTH Education Fund applications open once a year.',
  website_url = 'https://www.rwth-aachen.de/go/id/bdfz/', source_url = 'https://www.rwth-aachen.de/go/id/bdfz/',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 350;

UPDATE public.scholarships SET
  title = 'Deutschlandstipendium & DAAD at Universität Hamburg',
  coverage_type = 'Partial (Monthly Stipend)', amount_usd_value = 3888, award_basis = 'fixed',
  description = 'Hamburg is a public university: there is no tuition fee, only a semester contribution of about EUR 350. The funding that actually exists is the Deutschlandstipendium (EUR 300 per month, paid for at least two semesters, half from the federal government and half from private sponsors) and the DAAD scholarship programmes, which are applied for from the home country.',
  requirements = 'Enrolled student at Universität Hamburg with strong academic results and social commitment; Deutschlandstipendium applications open once a year through the university.',
  website_url = 'https://www.uni-hamburg.de/en.html', source_url = 'https://www.uni-hamburg.de/en.html',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 483;

UPDATE public.scholarships SET
  title = 'Deutschlandstipendium & DAAD at University of Cologne',
  coverage_type = 'Partial (Monthly Stipend)', amount_usd_value = 3888, award_basis = 'fixed',
  description = 'Cologne is a public university in North Rhine-Westphalia, where no tuition fee is charged (only a semester contribution of about EUR 350). The funding that actually exists is the Deutschlandstipendium (EUR 300 per month for at least two semesters) and DAAD programmes.',
  requirements = 'Enrolled student at the University of Cologne with strong academic results and social commitment; Deutschlandstipendium applications open once a year through the university.',
  website_url = 'https://portal.uni-koeln.de/en/uoc-home', source_url = 'https://portal.uni-koeln.de/en/uoc-home',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 484;

UPDATE public.scholarships SET
  title = 'Deutschlandstipendium & DAAD at Humboldt-Universität zu Berlin',
  coverage_type = 'Partial (Monthly Stipend)', amount_usd_value = 3888, award_basis = 'fixed',
  description = 'Humboldt-Universität is a public university in Berlin, where no tuition fee is charged (only a semester contribution of about EUR 350). The funding that actually exists is the Deutschlandstipendium (EUR 300 per month for at least two semesters) and DAAD programmes.',
  requirements = 'Enrolled student at Humboldt-Universität with strong academic results and social commitment; Deutschlandstipendium applications open once a year through the university.',
  website_url = 'https://www.hu-berlin.de/en', source_url = 'https://www.hu-berlin.de/en',
  last_verified_at = now(), last_updated_at = now()
WHERE id = 499;

UPDATE public.university_scholarships us SET
  scholarship_name = sc.title,
  funding_type = 'Deutschlandstipendium (federal + sponsor) / DAAD',
  max_scholarship = 'EUR 300 per month',
  covers_tuition = false,
  covers_living_expenses = true,
  official_url = sc.website_url,
  source_url = sc.source_url
FROM public.scholarships sc
WHERE us.scholarship_id = sc.id AND sc.id IN (350, 483, 484, 499);

-- ── C. Duplicates that crowd the six slots on a university page ────────────
-- Each pair described the same award twice; the richer row (real scholarship URL
-- and detailed text) is kept, the generic twin retires.
--   26  ETH Zurich ESOP $40,000 (ethz.ch/studies/master/...)  vs 111 $36,000 (homepage)
--   48  McGill Entrance Scholarship (studentaid page)          vs 621 $41,500 (homepage, above McGill's fee)
--   52  PSL Excellence (psl.eu/en/education/scholarships)      vs 654 $1,125 (homepage)
UPDATE public.scholarships
SET is_active = false,
    notes = coalesce(notes, '') || ' | Deactivated 2026-10-23: duplicate of the richer row for the same university.',
    last_updated_at = now()
WHERE id IN (111, 621, 654);

DELETE FROM public.university_scholarships WHERE scholarship_id IN (111, 621, 654);

COMMIT;

-- Verification after the run (2026-10-23):
--   active scholarships ............................. 643
--   retired (is_active = false) ..................... 5
--   country vs university mismatch .................. 0
--   universities with an empty scholarship list ..... 0
--   universities whose list starts with their own award ... 363 / 364
--     (the exception is id 176, a duplicate row of UNAM 91)
--   links pointing at a retired scholarship ......... 0
