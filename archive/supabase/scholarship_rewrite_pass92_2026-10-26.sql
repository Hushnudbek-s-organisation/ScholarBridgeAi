-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 92 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- Retire four UK postgraduate-research funding-directory placeholders that did
-- not represent a named scholarship. Official source mappings remain for audit.
-- ============================================================================

-- 355 — University of York generic funding index, not a single award.
UPDATE scholarships SET
  title = 'University of York postgraduate research funding directory (retired generic pointer)',
  website_url = 'https://www.york.ac.uk/study/postgraduate-research/funding/international/',
  source_url = 'https://www.york.ac.uk/study/postgraduate-research/funding/international/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired funding directory pointer; White Rose DTP, Wolfson and nationality-specific awards each have their own eligibility and deadlines.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired PGR funding directory pointer; multiple distinct awards',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not a single York postgraduate research scholarship. The official international PGR funding index lists several separate opportunities, including White Rose Social Sciences DTP studentships, the Wolfson Humanities Scholarship, Commonwealth funding and awards restricted to applicants from Canada, Singapore, Norway or other named countries. Each has different subject, nationality, award value and deadline rules. This row did not represent one award and is retired to avoid presenting an aggregate funding page as an individual scholarship.$desc$,
  requirements = 'There is no universal eligibility or application process for the York PGR funding directory; check each named scheme and its own course/fee-status conditions.',
  notes = $note$RETIRED 2026-10-26 (UK research funding pass 92). The previous generic York research-funding pointer used the obsolete general postgraduate funding URL and did not identify one award. The official international postgraduate research funding index https://www.york.ac.uk/study/postgraduate-research/funding/international/ was fetched and lists multiple, distinct schemes: White Rose DTP, Wolfson Humanities, Commonwealth, Canada, Australia and Singapore awards, each with separate eligibility and amounts. Because this was a directory rather than a scholarship, its invented USD 42,000 remains removed and the row is retired. Specific York awards can be added as separate records after their individual pages are checked.$note$,
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = false
WHERE id = 355;

-- 359 — Loughborough University research-degree funding index.
UPDATE scholarships SET
  title = 'Loughborough University postgraduate research funding directory (retired generic pointer)',
  website_url = 'https://www.lboro.ac.uk/study/postgraduate/fees-funding/research-degree-funding/',
  source_url = 'https://www.lboro.ac.uk/study/postgraduate/fees-funding/research-degree-funding/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired funding directory pointer; each listed scholarship, bursary or external fellowship has its own eligibility and closing date.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired research-funding directory pointer; internal, external and nationality-specific schemes',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not one named Loughborough scholarship. The official research-degree funding index lists separate options such as a China Scholarship Council tuition award (Chinese applicants), Commonwealth scholarships, an alumni tuition discount, the external Postgrad Solutions bursary and the Schlumberger Foundation Faculty for the Future fellowship for women from developing or emerging countries in STEM. Each has its own awarding body, eligibility, value and deadline. This record did not represent a single award and is retired to avoid merging unrelated funding routes.$desc$,
  requirements = $req$Eligibility, amounts, documents and deadlines vary by the named scholarship or external funding body listed in Loughborough's research funding directory.$req$,
  notes = $note$RETIRED 2026-10-26 (UK research funding pass 92). The official Loughborough research-degree funding index https://www.lboro.ac.uk/study/postgraduate/fees-funding/research-degree-funding/ was fetched. It lists multiple separate schemes: CSC (Chinese applicants), Commonwealth awards (eligible Commonwealth citizens), an alumni bursary, a Postgrad Solutions bursary with a 30 September 2026 closing date, and the external Schlumberger Faculty for the Future fellowship for women in STEM from developing/emerging countries. They are not one general Loughborough PGR scholarship, and the imported USD 38,000 award was unsupported. The placeholder is retired; individual schemes should be added separately only after verifying their current award pages.$note$,
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = false
WHERE id = 359;

-- 362 — Newcastle generic postgraduate funding page, not a single PhD award.
UPDATE scholarships SET
  title = 'Newcastle University postgraduate funding directory (retired generic pointer)',
  website_url = 'https://www.ncl.ac.uk/postgraduate/fees-funding/funding-your-study/',
  source_url = 'https://www.ncl.ac.uk/postgraduate/fees-funding/funding-your-study/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired directory pointer; the searchable postgraduate funding database gives scheme-specific dates.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired postgraduate funding index; schemes vary by course, fee status and award body',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not one named Newcastle University research scholarship. The official postgraduate funding guide describes a mixture of international fee discounts, course-specific scholarships, external schemes and research studentships funded by the University, charities, employers or UK research councils. It mentions a 15% international fee discount only for a fee-status group of EU/EEA/Swiss students without settled status; that is not a general award for Uzbek applicants. Individual studentships and scholarships must be checked in the funding search and may have different nationality and course requirements.$desc$,
  requirements = $req$This funding index has no single eligibility rule or amount. Applicants must identify a specific award in the Newcastle funding database; the 15% discount described on the general page is restricted to the fee-status group stated there.$req$,
  notes = $note$RETIRED 2026-10-26 (UK research funding pass 92). The official Newcastle University Funding Your Studies page https://www.ncl.ac.uk/postgraduate/fees-funding/funding-your-study/ and funding search were fetched. The page describes a range of different scholarships, discounts and project-funded studentships rather than a universal PhD scholarship. The 15% discount noted on the page is tied to EU/EEA/Swiss applicants without settled/pre-settled status, not a general Uzbekistan award. The imported record's round USD amount and generic January deadline had already been removed. The placeholder is retired so that a funding directory is not shown as an individual scholarship; its official source mapping is retained for audit.$note$,
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = false
WHERE id = 362;

-- 364 — Exeter PhD funding index, not a single award.
UPDATE scholarships SET
  title = 'University of Exeter PhD funding directory (retired generic pointer)',
  website_url = 'https://www.exeter.ac.uk/study/pg-research/funding/phdfunding/',
  source_url = 'https://www.exeter.ac.uk/study/pg-research/funding/phdfunding/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired funding directory pointer; UKRI, DTP, faculty and project opportunities publish their own deadlines.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired PhD funding index; research councils, DTPs, faculty and project awards vary',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not one named University of Exeter scholarship. The official PhD funding page describes several separate routes: Exeter alumni/progression discounts, research-council studentships, UKRI-funded Doctoral Training Partnerships, faculty awards and project-specific PhD studentships. The page states that a limited share of UKRI studentships may be offered to international applicants and that project/dates are listed through separate DTP, research-topic and project pages. Each opportunity has its own funding amount, eligibility and deadline; no single general award is represented by this record.$desc$,
  requirements = 'Applicants must check the specific Exeter studentship, DTP or faculty/project award. No universal GPA, English score, document list or application deadline applies to this retired index row.',
  notes = $note$RETIRED 2026-10-26 (UK research funding pass 92). The official University of Exeter PhD funding page https://www.exeter.ac.uk/study/pg-research/funding/phdfunding/ was fetched. It lists several different funding mechanisms (research councils, DTPs, faculty awards, alumni/progression schemes and project studentships) rather than one named scholarship. It notes that up to 30% of some full UKRI studentships can be available to international applicants, but project and DTP-specific conditions apply. The previous generic row had no confirmed award value and used a bare-domain source; it is retired as a directory pointer rather than presented as a scholarship. Specific schemes can be added separately after their own current pages are verified.$note$,
  verification_status = 'verified', last_verified_at = now(), last_updated_at = now(), is_active = false
WHERE id = 364;

-- Refresh source registry records with the fetched official pages.
UPDATE sources s SET url=v.url,title=v.title,domain=v.domain,source_type='scholarship',accessed_at='2026-10-26 00:00:00',is_official=true,is_verified=true
FROM (VALUES
 (2776,'https://www.york.ac.uk/study/postgraduate-research/funding/international/','University of York International PGR Funding — Official Directory','www.york.ac.uk'),
 (2563,'https://www.lboro.ac.uk/study/postgraduate/fees-funding/research-degree-funding/','Loughborough Research Degree Funding — Official Directory','www.lboro.ac.uk'),
 (2578,'https://www.ncl.ac.uk/postgraduate/fees-funding/funding-your-study/','Newcastle Postgraduate Funding Your Studies — Official Directory','www.ncl.ac.uk'),
 (2522,'https://www.exeter.ac.uk/study/pg-research/funding/phdfunding/','University of Exeter PhD Funding — Official Directory','www.exeter.ac.uk')
) AS v(id,url,title,domain)
WHERE s.id=v.id;

-- Remove the obsolete "No/unavailable" university associations; no generic
-- directory record remains advertised as a scholarship to the host university.
DELETE FROM university_scholarships
WHERE (id=591 AND scholarship_id=355)
   OR (id=594 AND scholarship_id=359)
   OR (id=596 AND scholarship_id=362)
   OR (id=597 AND scholarship_id=364);

-- The individual scholarship_sources records are preserved for audit.
-- Hard check:
-- SELECT id,title,is_active,source_reliability,website_url,deadline_type
-- FROM scholarships WHERE id IN (355,359,362,364) ORDER BY id;
-- SELECT COUNT(*) FILTER (WHERE is_active) AS active,
--        COUNT(*) FILTER (WHERE NOT is_active) AS retired,
--        COUNT(*) FILTER (WHERE is_active AND source_reliability=4) AS reliability_4
-- FROM scholarships;
-- ============================================================================
