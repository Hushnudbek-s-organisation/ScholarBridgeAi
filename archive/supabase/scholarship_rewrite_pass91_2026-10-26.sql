-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 91 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- UK postgraduate research directory pointers: retire non-award placeholders
-- (King's, Southampton, Nottingham); retain Sheffield as a useful but generic
-- official funding index. Do not fabricate one award from a multi-award page.
-- ============================================================================

-- 145 — King's: retire a generic funding directory placeholder.
UPDATE scholarships SET
  title = 'King''s College London postgraduate research funding directory (retired generic pointer)',
  website_url = 'https://www.kcl.ac.uk/study/postgraduate-research/funding',
  source_url = 'https://www.kcl.ac.uk/study/postgraduate-research/funding',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired directory pointer; individual King''s scholarships and studentships have their own eligibility and deadlines.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired generic PGR funding directory pointer; no single award',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not a scholarship. King's Doctoral College administers a range of postgraduate research scholarships and studentships and directs applicants to its funding opportunities database. Individual awards have separate eligibility, amounts and deadlines; this row did not identify one named award and must not appear as a specific scholarship. The verified President's PhD award at King's and nationality-specific schemes are recorded separately where applicable.$desc$,
  requirements = $req$This generic funding directory has no universal eligibility, document checklist or deadline. Applicants must check the requirements for a specific King's funding opportunity.$req$,
  notes = $note$RETIRED 2026-10-26 (UK PGR directory pass 91). The old URL kcl.ac.uk/study/funding/funding-opportunities was fetched and returned 404. King's current official postgraduate-research funding page https://www.kcl.ac.uk/study/postgraduate-research/funding was fetched; it explains that King's Doctoral College administers a range of schemes and points to a searchable funding database and a separate international-research-funding page. This generic row did not represent one named award and contained no independently verified amount or deadline, so it was retired rather than displayed as a scholarship. The prior invented USD 41,000 and January date remain withdrawn. Source mapping is retained for audit; the university_scholarships table had no association for this row.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 145;

-- 318 — Southampton: retire the generic directory pointer, not a named award.
UPDATE scholarships SET
  title = 'University of Southampton postgraduate research funding directory (retired generic pointer)',
  website_url = 'https://www.southampton.ac.uk/study/postgraduate-research/funding',
  source_url = 'https://www.southampton.ac.uk/study/postgraduate-research/funding',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired directory pointer; each advertised research project or scholarship has its own conditions and deadline.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired postgraduate research funding index; award terms vary by project',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not an individual scholarship. The University of Southampton research-funding page describes several different routes: projects that cover tuition and a stipend, projects that cover tuition only, and self-funded research proposals. Some advertised studentships are open to international applicants and others are restricted by project, faculty or funding body. There is no single Southampton-wide postgraduate research award amount, eligibility rule or deadline represented by this row. Use the official project and funding pages for current opportunities.$desc$,
  requirements = $req$This retired index row has no universal eligibility or document list. Applicants must check the conditions and funding status of a specific Southampton PhD project or studentship.$req$,
  notes = $note$RETIRED 2026-10-26 (UK PGR directory pass 91). The imported Presidential Scholarships path returned 404. The official current research-funding index https://www.southampton.ac.uk/study/postgraduate-research/funding was fetched and confirms project-dependent routes (fully funded projects, tuition-fee-only projects and self-funding); international eligibility and stipends vary by scheme. No named award, fixed amount or university-wide deadline can be assigned to this generic row. The previous invented USD 41,000 and January date remain removed. This directory placeholder is retired rather than shown as a scholarship; its source mapping remains for audit.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 318;

-- 337 — Nottingham: retire the generic pointer; named schemes exclude Uzbekistan.
UPDATE scholarships SET
  title = 'University of Nottingham international research funding directory (retired generic pointer)',
  website_url = 'https://www.nottingham.ac.uk/studywithus/International-applicants/scholarships-funding-finance/Research-Scholarships.aspx',
  source_url = 'https://www.nottingham.ac.uk/studywithus/International-applicants/scholarships-funding-finance/Research-Scholarships.aspx',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired directory pointer; the named partner schemes and project-specific studentships each have their own deadline.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired international research funding directory; no general Uzbekistan-eligible award confirmed',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not an individual scholarship. The University of Nottingham's official international research-scholarships page lists the China Scholarship Council Research Excellence Scholarship and Commonwealth PhD Scholarships, then directs applicants to a postgraduate research-funding search for project-specific opportunities. The CSC scheme is for Chinese nationals; the Commonwealth scheme requires citizenship of an eligible Commonwealth country. Neither of those named routes is open to an Uzbek applicant. Project-specific opportunities may still be advertised separately, but this row does not assert a universal Nottingham international research scholarship or amount.$desc$,
  requirements = $req$No universal eligibility, award amount, language threshold, document list or deadline applies to this retired directory entry. Check each project or external funding scheme separately; the two named partner schemes on the international page have nationality restrictions that exclude Uzbekistan.$req$,
  notes = $note$RETIRED 2026-10-26 (UK PGR directory pass 91). The official University of Nottingham international research-scholarships page https://www.nottingham.ac.uk/studywithus/International-applicants/scholarships-funding-finance/Research-Scholarships.aspx was fetched. It lists the CSC Research Excellence Scholarship (Chinese nationals) and Commonwealth PhD Scholarships (eligible Commonwealth citizens), then links to a separate research-funding search for individual projects. Neither named scheme covers Uzbekistan; project-specific opportunities are not one general award. The old imported page called this a Nottingham Research Excellence Scholarship and added an invented USD 39,000 amount and January deadline; those claims remain removed. The generic directory row is retired, while the official source record is kept for audit.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 337;

-- 333 — Sheffield: keep a live directory pointer, not a fictitious award.
UPDATE scholarships SET
  title = 'University of Sheffield PhD scholarships directory (named award unconfirmed)',
  website_url = 'https://sheffield.ac.uk/postgraduate/phd/scholarships',
  source_url = 'https://sheffield.ac.uk/postgraduate/phd/scholarships',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'No single Sheffield PhD scholarship deadline is published. The official page lists school/project awards, says Hossein Farmy projects for October 2027 entry will be advertised in early 2027, and marks the University Research Scholarships and CSC route closed with no awards for 2027 entry.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["PhD"]',
  eligible_majors = '["Research areas and projects vary by school, DTP and supervisor; no single field list applies"]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Sheffield PhD funding directory; individual UKRI, DTP, school and project awards have separate terms',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-level English score is published on the generic PhD funding page; programme-level admission requirements apply.',
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$This is a directory pointer, not one named Sheffield scholarship. The current official PhD scholarships page separates Research Council/UKRI funding, University scholarships, school and project scholarships, and other funders. For 2027 entry it states that the University Research Scholarships and China Scholarship Council route have no awards available, while Hossein Farmy Archive projects will be advertised in early 2027. The page points to separate DTP and project opportunities, each with its own eligibility, value and deadlines; it does not publish one general award value for all international applicants. This row deliberately stores no scholarship amount or single deadline.$desc$,
  requirements = 'Eligibility, funding level, documents and deadlines depend on the specific Sheffield DTP, scholarship or advertised project. The generic directory page provides no universal GPA, IELTS or document requirement.',
  notes = $note$REVERIFIED 2026-10-26 against the University of Sheffield official PhD scholarships page https://sheffield.ac.uk/postgraduate/phd/scholarships (fetched). The page lists UKRI routes, university scholarships, school/project opportunities and external funders. It says the University Research Scholarships and CSC route are closed with none for 2027 entry; Hossein Farmy Archive projects are expected to be advertised early 2027. The official search result for the ESRC White Rose DTP page says its 2027/28 call opens in autumn 2026 and that international applicants may apply, but the linked DTP detail page returned 403, so its award amount and exact deadline are not copied into this generic row. The previous USD 40,000, generic January deadline and invented English/GPA thresholds remain removed. This is still a pointer, not a named award; source_reliability stays 4.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 333;

-- Refresh source registry metadata with the exact fetched official pages.
UPDATE sources s SET url=v.url,title=v.title,domain=v.domain,source_type='scholarship',accessed_at='2026-10-26 00:00:00',is_official=true,is_verified=true
FROM (VALUES
 (2551,'https://www.kcl.ac.uk/study/postgraduate-research/funding','King''s College London Postgraduate Research Funding — Official Directory','www.kcl.ac.uk'),
 (2620,'https://www.southampton.ac.uk/study/postgraduate-research/funding','University of Southampton PhD Fees and Funding — Official Directory','www.southampton.ac.uk'),
 (2614,'https://sheffield.ac.uk/postgraduate/phd/scholarships','University of Sheffield PhD Scholarships — Official Directory','sheffield.ac.uk'),
 (2580,'https://www.nottingham.ac.uk/studywithus/International-applicants/scholarships-funding-finance/Research-Scholarships.aspx','University of Nottingham International Research Scholarships — Official Directory','www.nottingham.ac.uk')
) AS v(id,url,title,domain)
WHERE s.id=v.id;


-- Remove stale/non-award university association rows. The scholarship_source
-- records above remain linked for audit; no user scholarship/decision records
-- were deleted.
DELETE FROM university_scholarships WHERE id = 571 AND scholarship_id = 318;
DELETE FROM university_scholarships WHERE id = 582 AND scholarship_id = 337;
DELETE FROM university_scholarships WHERE id = 579 AND scholarship_id = 333;

-- Final hard check:
-- SELECT id,title,is_active,source_reliability,website_url,deadline_type
-- FROM scholarships WHERE id IN (145,318,333,337) ORDER BY id;
-- SELECT id,scholarship_id,scholarship_name
-- FROM university_scholarships WHERE scholarship_id IN (145,318,333,337) ORDER BY id;
-- SELECT COUNT(*) FILTER (WHERE is_active) AS active,
--        COUNT(*) FILTER (WHERE NOT is_active) AS retired,
--        COUNT(*) FILTER (WHERE is_active AND source_reliability=4) AS reliability_4
-- FROM scholarships;
-- ============================================================================
