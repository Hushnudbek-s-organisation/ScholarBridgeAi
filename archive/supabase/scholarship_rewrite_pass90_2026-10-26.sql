-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 90 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- Imperial cluster: correct the President's PhD award; retire the generic PG
-- pointer and the unverified historical President's Undergraduate record.
-- A distinct Imperial Inspires 2027 award was found but not inserted: the
-- source_reliability=4 cleanup queue is still open and addition comes later.
-- ============================================================================

-- 22 — Imperial President's PhD Scholarship, 2027/28.
UPDATE scholarships SET
  title = 'Imperial College President PhD Scholarship',
  website_url = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  source_url = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  application_url = NULL,
  award_amount = 27036,
  award_currency = 'GBP',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  deadline = '2027/28 application rounds: 23:59 UK time, 2 November 2026 (outcomes by 31 January 2027); 11 January 2027 (outcomes by 15 April 2027); and 1 March 2027 (outcomes by 31 May 2027).',
  deadline_date = '2026-11-02',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  rounds = '[{"round":1,"deadline":"2026-11-02","outcome":"2027-01-31"},{"round":2,"deadline":"2027-01-11","outcome":"2027-04-15"},{"round":3,"deadline":"2027-03-01","outcome":"2027-05-31"}]',
  degree_levels = '["PhD"]',
  eligible_majors = '["PhD research projects at Imperial with an agreed supervisor; department-specific availability applies"]',
  eligible_countries = '["All countries"]',
  coverage_type = 'Full Tuition + Stipend',
  funding_type = 'Competitive fully funded President''s PhD scholarship',
  tuition_coverage = 'Full PhD tuition fees; GBP 27,036 annual stipend at the 2027/28 rate; GBP 2,000 consumables per year for the first three years; 3.5-year scholarship',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'The scholarship page publishes no scholarship-specific IELTS or GPA threshold. Applicants must meet the English-language and academic admission requirements of their chosen PhD department.',
  required_documents = '["Imperial PhD admission application through the online admissions system", "Two-page structured personal statement", "Department-specific supporting documents required for the chosen PhD programme"]',
  application_status = 'open',
  source_reliability = 9,
  description = $desc$Imperial College London offers 50 President's PhD Scholarships for 2027–28. Each provides full PhD tuition fees, a stipend of GBP 27,036 per annum at the 2027–28 rate, a GBP 2,000 per annum consumables fund for the first three years, and access to the Early Career Researcher Institute's bespoke programme. The scholarship lasts 3.5 years. Applicants must have an agreed Imperial supervisor before applying and submit a new PhD admission application; there is no separate scholarship form, as departments nominate candidates based on academic merit and potential. The academic criterion is a first-class undergraduate or integrated Master's degree (or equivalent), or a distinction in a standalone Master's qualification. Applications are open to candidates worldwide with no nationality restriction, although some departments may be unable to support international applicants. The official page lists three 2027/28 rounds: 2 November 2026, 11 January 2027 and 1 March 2027; each round has a separate notification date. The earliest funded start date is 1 August 2027 and the latest is 1 November 2027.$desc$,
  requirements = $req$New PhD applicants only; currently registered Imperial PhD students are not eligible. Contact an Imperial academic supervisor and obtain agreement before applying. Meet the academic criterion: first-class or equivalent undergraduate/integrated Master's qualification, or distinction in a standalone Master's degree. Apply through Imperial's online PhD admissions system; there is no separate scholarship application form. International applicants may apply, but some departments may not be able to fund international students. Each department may have additional PhD application requirements.$req$,
  notes = $note$REVERIFIED 2026-10-26 against Imperial's official President's PhD page https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/. The page was fetched, but the fetcher extracted only its heading; the remaining page content, including 50 places, GBP 27,036 (2027/28), GBP 2,000 consumables, academic criteria, supervisor requirement and all three application rounds, was returned by the official Imperial search-index result for the same URL. No third-party data was used. Corrected the previous numeric min_gpa=3.2 and min_ielts=6.5: the scheme page specifies degree classifications, not numeric GPA or IELTS cut-offs; department-level admission rules apply. Added the official third round (1 March 2027), which was previously noted as third-party-only. award_amount is the published annual stipend only; tuition and consumables are separate benefits and are not added into this amount. amount_usd_value remains 0 because the stipend is paid in GBP. source_reliability remains 9 because the official page's full content was available through the Imperial search index but not fully extracted by page fetch.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 22;

-- 488 — synchronize the canonical university_scholarships association.
UPDATE university_scholarships SET
  scholarship_name = 'Imperial College President PhD Scholarship',
  availability_status = 'Yes',
  funding_type = 'Competitive fully funded PhD scholarship',
  max_scholarship = 'Full tuition + GBP 27,036 annual stipend (2027/28 rate) + GBP 2,000/year consumables for 3 years; scholarship lasts 3.5 years',
  covers_tuition = true,
  covers_living_expenses = true,
  valued_aspect = 'Full PhD tuition, living stipend, and research consumables',
  eligibility_notes = 'New PhD applicants; first-class or equivalent undergraduate/integrated Master''s degree, or distinction in a standalone Master''s; supervisor agreement required. Open worldwide, but some departments may not support international applicants. Three rounds: 2 Nov 2026, 11 Jan 2027, 1 Mar 2027.',
  official_url = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  source_url = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  verification_status = 'verified',
  last_verified_at = now()
WHERE id = 488 AND scholarship_id = 22;

-- 3 — retire the generic postgraduate directory pointer. Its current index
-- source is preserved on the active, named President's PhD scholarship row 22.
UPDATE scholarships SET
  title = 'Imperial College London postgraduate scholarship directory pointer (retired; specific schemes recorded separately)',
  website_url = 'https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/',
  source_url = 'https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired generic directory pointer; individual Imperial schemes publish their own dates. The directory is not a scholarship with a single deadline.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired generic directory pointer; named schemes recorded separately',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not a scholarship. Imperial College London's searchable scholarship index lists individual awards, each with its own eligibility, amount and application timetable. The verified Imperial President's PhD Scholarship is recorded separately as active scholarship id 22. This generic record is retired so the catalogue does not present a funding index as a named scholarship.$desc$,
  requirements = 'This directory pointer is retired; refer to the specific scholarship record or Imperial''s current scholarship search page for scheme-specific rules.',
  notes = $note$RETIRED 2026-10-26 (Imperial cluster pass 90). The previous record was a generic placeholder, not a named award. The official postgraduate scholarships heading page returned only a section heading when fetched; Imperial's current searchable index is https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/ and lists individual awards. The President's PhD scholarship is already separately recorded as active id 22. No amount, deadline, eligibility or document list is claimed for this generic pointer. Its directory source mapping was moved to active id 22 as supporting index context; the non-award university_scholarships association was removed.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 3;

-- 4 — retire the unsupported current President's Undergraduate Scholarship
-- claim; retain only the verified historical 2015 EEE context.
UPDATE scholarships SET
  title = 'Imperial College President''s Undergraduate Scholarship (retired historical departmental award)',
  website_url = 'https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/',
  source_url = 'https://www.imperial.ac.uk/news/168338/meet-undergraduate-scholarships-holders/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Historical 2015 EEE department award only; no current scholarship application deadline has been verified.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["Electrical and Electronic Engineering (historical 2015 department context only)"]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired: historical departmental award; current eligibility not verified',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'closed',
  source_reliability = 8,
  description = $desc$Retired record for a historical Imperial College President's Undergraduate Scholarship. An official 2015 Imperial News article reports six President's Undergraduate Scholarship recipients in the Electrical and Electronic Engineering Department and states a GBP 1,000 award for each year of study. The article is historical and does not establish a current university-wide or international scholarship, current eligibility, or a current deadline. Do not apply based on this retired record; use Imperial's current scholarship search page for current schemes.$desc$,
  requirements = 'The 2015 article does not publish a current application process or requirements. This historical record is retired and does not assert 2026/27 eligibility.',
  notes = $note$RETIRED 2026-10-26 (Imperial cluster pass 90). The imported page for a President's Undergraduate Scholarship and the old general UG scholarships path both returned Imperial 404 pages when fetched. A separate official Imperial News article dated 13 October 2015 confirms that six President's Undergraduate awards were offered within the Electrical and Electronic Engineering Department that year, at GBP 1,000 per year. That historical departmental report does not verify a current institution-wide award, international eligibility or current terms. The importer USD 12,000 figure and June deadline remain removed. The stale university_scholarships association id 485 was deleted; the official historical source is retained for audit.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 4;

-- Refresh the source registry records used above.
UPDATE sources SET
  url = 'https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search/',
  title = 'Imperial College Scholarship Search — Official Directory',
  domain = 'www.imperial.ac.uk', source_type = 'scholarship',
  accessed_at = '2026-10-26 00:00:00', is_official = true, is_verified = true
WHERE id = 2714;
UPDATE sources SET
  url = 'https://www.imperial.ac.uk/study/fees-and-funding/postgraduate-doctoral/grants-scholarships/presidents-phd/',
  title = 'Imperial President''s PhD Scholarships — Official Source',
  domain = 'www.imperial.ac.uk', source_type = 'scholarship',
  accessed_at = '2026-10-26 00:00:00', is_official = true, is_verified = true
WHERE id = 2715;
UPDATE sources SET
  url = 'https://www.imperial.ac.uk/news/168338/meet-undergraduate-scholarships-holders/',
  title = 'Imperial 2015 EEE President''s Undergraduate Scholarship News — Historical Source',
  domain = 'www.imperial.ac.uk', source_type = 'scholarship',
  accessed_at = '2026-10-26 00:00:00', is_official = true, is_verified = true
WHERE id = 2716;

-- Preserve the directory source on the active named PhD award. The historical
-- undergraduate source stays attached to retired row 4 for auditability.
UPDATE scholarship_sources SET scholarship_id = 22
WHERE id = 243 AND scholarship_id = 3;

-- Remove the non-award directory association and the retired undergraduate
-- association so the university page does not display either as a scholarship.
DELETE FROM university_scholarships WHERE id = 640 AND scholarship_id = 3;
DELETE FROM university_scholarships WHERE id = 485 AND scholarship_id = 4;

-- Verified next-cycle addition candidate discovered but intentionally not
-- inserted in this cleanup pass: Imperial Inspires (2027), see its official
-- page https://www.imperial.ac.uk/study/fees-and-funding/imperial-inspires-scholarships/.

-- Hard check:
-- SELECT id, title, is_active, award_amount, award_currency, min_gpa, min_ielts
-- FROM scholarships WHERE id IN (3,4,22) ORDER BY id;
-- SELECT id, scholarship_id, scholarship_name FROM university_scholarships
-- WHERE scholarship_id IN (3,4,22) ORDER BY id;
-- ============================================================================
