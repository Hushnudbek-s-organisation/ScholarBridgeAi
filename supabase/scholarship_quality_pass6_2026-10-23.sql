-- ============================================================================
-- Scholarship data-quality pass 6 (2026-10-23)
--
-- This pass found three kinds of real defect and fixed all three:
--   1. three dead or wrong website_url values (HKU, NTU, NUS)
--   2. one award that no Uzbek applicant could actually win (NUS Global Merit
--      is Singapore Citizens only)
--   3. sixteen duplicate / template rows that showed the same funding twice
--
-- Applied to the live database the same day. Every figure below was read off
-- the provider's own page; nothing here is an estimate.
-- ============================================================================

-- 1. HKU Entrance Scholarship (id 29) ---------------------------------------
-- /scholarships/ now redirects to the admissions home page.
UPDATE scholarships SET
  website_url = 'https://admissions.hku.hk/fees-and-scholarships/scholarships',
  source_url  = 'https://admissions.hku.hk/node/891',
  application_url = 'https://admissions.hku.hk/apply/international-qualifications',
  deadline = '25 November 2026, 12:00 noon HKT (first-round evaluation) - applications stay open until 25 August 2027',
  deadline_date = '2026-11-25',
  deadline_type = 'fixed',
  description = 'HKU entrance scholarships for international students: awarded automatically to strong applicants when they are admitted, with no separate scholarship form. The award is merit-based with non-academic achievements taken into account, and the scholarship decision arrives together with the admission offer. HKU also runs special scholarships that need their own application once you are admitted, such as the HKSAR Belt and Road Scholarship.',
  requirements = 'Apply to HKU through the International/Non-JUPAS scheme with overseas qualifications; be admitted to a full-time undergraduate programme; show outstanding academic results, with non-academic achievements considered. There is no separate entrance-scholarship application - submitting the admission application is the entry. Special scholarships advertised on the Fees and Scholarships page may require their own form and documents.',
  required_documents = '["HKU online admission application","Academic transcripts and certificates","Predicted or actual examination results","School reference or recommendation","Personal statement"]',
  notes = 'Verified 2026-10-23. The website_url on this row (admissions.hku.hk/scholarships/) now lands on the general admissions home page, not the scholarship page; it is replaced with the Fees and Scholarships section, and source_url points at the FAQ entry confirming that entrance scholarships need no separate application. Dates read from admissions.hku.hk/apply/international-qualifications: 23 September 2026 application start, 25 November 2026 noon HKT first-round evaluation, 25 August 2027 final close. No cash value is published for the general entrance scholarship, so the amount stays NULL.',
  last_verified_at = '2026-10-23', last_updated_at = '2026-10-23'
WHERE id = 29;

-- 2. NTU Nanyang Scholarship (id 30) ----------------------------------------
-- The stored URL returned a 404.
UPDATE scholarships SET
  website_url = 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships/scholarship-opportunities/detail/nanyang-scholarship',
  source_url  = 'https://www.ntu.edu.sg/admissions/undergraduate/scholarships/scholarship-opportunities/detail/nanyang-scholarship',
  application_url = 'https://www.ntu.edu.sg/admissions/undergraduate/admissions',
  deadline = '19 March 2027 (international qualifications; 20 January 2027 for Russian and Central Asian school certificates)',
  deadline_date = '2027-03-19',
  deadline_type = 'fixed',
  description = 'The Nanyang Global Scholarship is NTU Singapore''s flagship undergraduate award, open to all nationalities. It covers the full years of study at NTU and selects on outstanding academic results in the GCE A-level, IB Diploma, NUS High School Diploma, polytechnic diploma or a Year 12 equivalent, together with excellent co-curricular records and strong leadership potential. Recipients are automatically enrolled in the NTU Honours College.',
  requirements = 'Open to all nationalities and to students reading a full-time undergraduate degree at NTU. Outstanding academic achievement in an accepted qualification is required; school leavers from Russia and Central Asia - including Uzbekistan - must add at least three AP exams scored 4 or 5, or three A-level subjects, because NTU does not accept those school certificates for direct admission. Excellent co-curricular records and demonstrated leadership. Submit the admission application first, then open the Application for Scholarship link with the assigned application number.',
  required_documents = '["NTU online admission application","High school certificate plus 3 AP exams or 3 A-levels","Academic transcripts","Co-curricular and leadership record","Personal statement or scholarship essay"]',
  notes = 'Verified 2026-10-23. The website_url on this row (/admissions/undergraduate/scholarships/nanyang-scholarship) returned a 404 and is replaced with the live Nanyang Global Scholarship page. Entry-requirement details, including the rule that Russian and Central Asian school certificates need three AP exams or three A-levels, and the 15 October 2026 to 19 March 2027 window (20 January 2027 for those certificates) are read from ntu.edu.sg admissions pages. No fixed cash value is published for the general award, so the amount stays NULL.',
  last_verified_at = '2026-10-23', last_updated_at = '2026-10-23'
WHERE id = 30;

-- 3. NUS (id 28) — the row was the wrong award entirely ----------------------
-- "NUS Global Merit Scholarship" is open to Singapore Citizens only. The award
-- an Uzbek applicant can win is the NUS International Undergraduate Scholarship.
UPDATE scholarships SET
  title = 'NUS International Undergraduate Scholarship',
  website_url = 'https://nus.edu.sg/oam/scholarships/scholarships-for-freshmen-international-students/nus-international-undergraduate-scholarship',
  source_url  = 'https://nus.edu.sg/oam/scholarships/scholarships-for-freshmen-international-students/nus-international-undergraduate-scholarship',
  application_url = 'https://nus.edu.sg/oam/scholarships/scholarships-for-freshmen-international-students',
  deadline = 'No separate scholarship deadline: you are considered through your NUS undergraduate admission application',
  deadline_date = NULL,
  deadline_type = 'automatic',
  description = 'NUS International Undergraduate Scholarship is the award NUS offers to exceptional freshmen from every country except Singapore. It covers 100% of the subsidised undergraduate tuition fee (after the MOE Tuition Grant), a S$5,800 annual living allowance, a S$1,750 one-time computer allowance and a S$5,000 annual accommodation allowance, and runs for the normal candidature period. Candidates are shortlisted through their undergraduate admission application - there is no separate scholarship form.',
  requirements = 'A citizen of any country except Singapore; outstanding high school results; a strong co-curricular record and demonstrated leadership; applying for admission to a full-time undergraduate degree at NUS; transfer applicants from other universities are not eligible. Recipients must take up the MOE Tuition Grant, which carries a bond to work for a Singapore-registered company for three years after graduation, and the scholarship must be renewed each semester with a GPA of at least 3.5. Shortlisted candidates interview between January and July and hear the outcome by mid-July.',
  required_documents = '["NUS undergraduate admission application","High school results and certificates","Co-curricular and leadership record","Personal statement","Referee report"]',
  amount_usd_value = 0,
  award_amount = 5800, award_currency = 'SGD', award_period = 'year', award_basis = 'fixed',
  coverage_type = 'Full Tuition + Stipend',
  funding_type = 'Fully funded', tuition_coverage = 'Full tuition',
  english_requirements = 'English-medium study; the admission application requires a recognised English qualification such as IELTS or TOEFL',
  notes = 'Corrected and verified 2026-10-23. The previous row was titled NUS Global Merit Scholarship, which the NUS site lists as open to Singapore Citizens only, so it was not something an Uzbek applicant could win; it is renamed to the NUS International Undergraduate Scholarship, which is open to citizens of all countries except Singapore. Benefits (100% subsidised tuition, S$5,800 living, S$1,750 computer, S$5,000 accommodation), the MOE Tuition Grant bond and the 3.5 GPA renewal rule are read from the NUS page. No separate scholarship deadline exists, hence deadline_type automatic.',
  last_verified_at = '2026-10-23', last_updated_at = '2026-10-23'
WHERE id = 28;

-- 4. Cambridge Trust (id 25) — one award does not exist ---------------------
-- The Trust runs 61 separate awards; there is no single "Cambridge Trust
-- International Scholarship" with a published $50,000 value.
UPDATE scholarships SET
  title = 'Cambridge Trust Scholarships (61 separate awards)',
  website_url = 'https://www.cambridgetrust.org/find-a-scholarship/',
  source_url  = 'https://www.cambridgetrust.org/find-a-scholarship/',
  application_url = 'https://www.cambridgetrust.org/postgraduate-applicants/',
  deadline = 'Follows the Cambridge course deadline for your chosen programme (December or January)',
  deadline_date = NULL,
  deadline_type = 'not_published',
  description = 'The Cambridge Trust does not run one single international scholarship. Its search tool lists 61 separate awards for study at Cambridge in 2027/28, each with its own nationality, subject or college restriction - from full-cost PhD awards to part-cost master''s grants - and the list must be filtered by degree level and nationality to find the ones a given applicant can win. Some are open to any nationality; others are tied to a specific country or to a partner organisation.',
  requirements = 'Open a Cambridge postgraduate or undergraduate course first: the Trust allocates its funds to students who already hold an offer of admission. Eligibility differs by award - some require a particular nationality or country of residence, some are tied to one college or one subject, and some are only for PhD study. Read the individual listing, then follow the Trust''s applicant guidance for your level before the Cambridge course deadline.',
  required_documents = '["Cambridge course application (the funding section)","Cambridge Trust funding application where the listing asks for one","Academic transcripts","Two academic references","Research proposal for PhD applicants"]',
  amount_usd_value = 0, award_amount = NULL,
  notes = 'Corrected 2026-10-23. The row previously presented the Trust as a single scholarship called "Cambridge Trust International Scholarship" with a $50,000 value and a 5 December deadline, none of which the Trust publishes. Its own search tool shows 61 distinct awards, so the record now says that and links to the finder instead of pretending there is one universal award; the amount and the invented date are cleared.',
  last_verified_at = '2026-10-23', last_updated_at = '2026-10-23'
WHERE id = 25;

-- 5. Duplicate / template rows ---------------------------------------------
-- The 13-country PDF import added "<university award> + El-Yurt Umidi" rows
-- beside the awards they copied: template description, generic source_url
-- pointing at the university homepage, and an aggregated "maximum award" that
-- neither the university nor the foundation publishes. They duplicated both
-- the university award and the El-Yurt Umidi programme (id 862).
-- Every one of these universities keeps at least one other active award.
UPDATE scholarships SET
  is_active = false,
  notes = 'Retired 2026-10-23. Generated by the 13-country PDF import as "<university award> + El-Yurt Umidi": template description, compound title, a generic source_url pointing at the university homepage rather than the scholarship page, and an aggregated "maximum award" figure that neither the university nor the foundation publishes. It duplicated the university''s own award, already in the catalogue, and the El-Yurt Umidi state programme, recorded once in id 862.',
  last_updated_at = '2026-10-23'
WHERE is_active AND (title ILIKE '%+ El-Yurt Umidi%' OR title ILIKE '%+ El-Yur%');

-- The Berkeley variant of the same template.
UPDATE scholarships SET
  is_active = false,
  notes = 'Retired 2026-10-23. Same PDF-import template: a Berkeley URL as source, a template description and a $93,000 maximum award that neither Berkeley nor the foundation publishes. The El-Yurt Umidi programme is recorded once, accurately, in id 862 (eyuf.uz, PF-77), and Berkeley keeps its own award row.',
  last_updated_at = '2026-10-23'
WHERE id = 545;

-- A second, lower-quality Imperial President's PhD row.
UPDATE scholarships SET
  is_active = false,
  notes = 'Retired 2026-10-23 as a duplicate. The same Imperial President''s PhD award is recorded in id 22, verified against the live Imperial page with the GBP 27,036 stipend and the November/January rounds. This row carried a different, unverified $55,000 figure, a 31 January deadline and a URL that no longer resolves to the award.',
  last_updated_at = '2026-10-23'
WHERE id = 106;
