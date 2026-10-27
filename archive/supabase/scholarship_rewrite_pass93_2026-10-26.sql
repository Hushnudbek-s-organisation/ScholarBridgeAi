-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 93 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/99b0c7fe-scholarbridgeai
-- Retire three UK postgraduate funding directory pointers; retain official
-- source mappings for audit. Named awards remain separate (131, 910 and 671).
-- ============================================================================

-- 53 — Edinburgh international postgraduate funding directory, not one award.
UPDATE scholarships SET
  title = 'University of Edinburgh postgraduate funding directory (retired generic pointer)',
  website_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international',
  source_url = 'https://registryservices.ed.ac.uk/student-funding/postgraduate/international',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired funding directory pointer; each Edinburgh College, region and subject scheme publishes separate requirements and closing dates.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired postgraduate funding directory pointer; no single named award',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not an individual Edinburgh scholarship. Registry Services groups postgraduate funding for international students by region, College, subject and external funding route, including Edinburgh Doctoral College Scholarships. Each scheme sets its own award value, eligibility and deadlines. The named Business School Doctoral College Scholarship is recorded separately at scholarship id 131. This generic row is retired so the catalogue does not present a directory as an award.$desc$,
  requirements = 'No universal eligibility, amount, application process or deadline applies to the retired directory pointer; use the specific award page for the intended subject and intake.',
  notes = $note$RETIRED 2026-10-26 (UK PGR pointer cleanup). The official Registry Services index https://registryservices.ed.ac.uk/student-funding/postgraduate/international was fetched and confirms that international postgraduate funding is organized by region, College, subject and scheme. It is not a named scholarship and has no single value or deadline. The confirmed Edinburgh Business School Doctoral College Scholarship remains as id 131. This generic pointer has no saved-scholarship or decision references; its source mapping is retained for audit, and its No/unavailable university_scholarships association was removed.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 53;

-- 312 — Leeds research-funding directory, separate from Leeds Master's award 910.
UPDATE scholarships SET
  title = 'University of Leeds research funding directory (retired generic pointer)',
  website_url = 'https://www.leeds.ac.uk/research-funding',
  source_url = 'https://www.leeds.ac.uk/research-funding',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired funding directory pointer; central, faculty, school and project research awards set their own deadlines.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired postgraduate research funding directory; awards vary by School and Faculty',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not a single Leeds doctoral scholarship. The University of Leeds research-funding page directs UK and international postgraduate researchers to a searchable list of funding opportunities across schools and subject areas. It notes that only a very limited number of UK Research Council studentships are available to international fee-rated students. Individual central, faculty, school and project awards have separate amounts, eligibility and deadlines. The Leeds Masters International Excellence Scholarship is recorded separately as scholarship id 910; this research-funding index is not a scholarship award.$desc$,
  requirements = 'Applicants must check the specific Leeds research scholarship or funded project in the official postgraduate research funding search. The retired directory entry has no universal GPA, language score, document list or eligibility rule.',
  notes = $note$RETIRED 2026-10-26 (UK PGR pointer cleanup). The old imported research-degrees/doc/scholarships URL returned 404. The official research-funding index https://www.leeds.ac.uk/research-funding was fetched and confirms separate central, faculty, school and project funding routes; it does not publish a single award amount or deadline for all PGR applicants. It states that international fee-rated students have only very limited Research Council studentships. The invented USD 42,000 and generic January date remain removed. The current taught-Master's award is independently recorded at id 910. This generic pointer has no saved-scholarship or decision references; its source mapping is retained for audit, and its No/unavailable university_scholarships association was removed.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 312;

-- 327 — St Andrews postgraduate scholarship catalogue overview.
UPDATE scholarships SET
  title = 'University of St Andrews postgraduate scholarship catalogue pointer (retired generic pointer)',
  website_url = 'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/',
  source_url = 'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = NULL,
  award_basis = 'variable',
  amount_usd_value = 0,
  deadline = 'Retired directory pointer; each taught or research postgraduate scholarship has its own deadline and fee-status eligibility.',
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_deadline_period = NULL,
  degree_levels = '[]',
  eligible_majors = '[]',
  eligible_countries = '[]',
  coverage_type = 'Unspecified',
  funding_type = 'Retired postgraduate scholarship catalogue pointer; not a named award',
  tuition_coverage = NULL,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  application_status = 'unknown',
  source_reliability = 4,
  description = $desc$Retired directory pointer, not a specific St Andrews award. The official postgraduate scholarships page says availability varies by subject and Home/Overseas fee status and directs applicants to a catalogue containing separate taught and research awards. No generic amount, eligibility or deadline is published for the catalogue as a whole. The verified St Andrews International Undergraduate Scholarship is separately listed in this database as id 671.$desc$,
  requirements = 'No universal postgraduate scholarship conditions apply to this catalogue pointer. Applicants must check the specific St Andrews award record and its entry year, fee status and application period.',
  notes = $note$RETIRED 2026-10-26 (UK PGR pointer cleanup). The official St Andrews postgraduate scholarships overview https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/ was fetched; it links to a searchable catalogue and states that award availability may depend on study area and fee status. It does not publish one award value or deadline. The imported USD 38,000 and generic January date remain removed. A verified undergraduate award exists separately at id 671. This generic pointer has no saved-scholarship or decision references; its source mapping is retained for audit, and its No/unavailable university_scholarships association was removed.$note$,
  verification_status = 'verified',
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 327;

-- Refresh the matching source registry records with the fetched official URLs.
UPDATE sources s SET url=v.url,title=v.title,domain=v.domain,source_type='scholarship',accessed_at='2026-10-26 00:00:00',is_official=true,is_verified=true
FROM (VALUES
 (2709,'https://registryservices.ed.ac.uk/student-funding/postgraduate/international','University of Edinburgh Funding for International Students — Official Directory','registryservices.ed.ac.uk'),
 (2565,'https://www.leeds.ac.uk/research-funding','University of Leeds Research Degrees Funding — Official Directory','www.leeds.ac.uk'),
 (2621,'https://www.st-andrews.ac.uk/study/postgraduate/fees/scholarships/','University of St Andrews Postgraduate Scholarships — Official Directory','www.st-andrews.ac.uk')
) AS v(id,url,title,domain)
WHERE s.id=v.id;

-- Remove generic directory associations; preserve the scholarship-source links.
DELETE FROM university_scholarships
WHERE (id=19 AND scholarship_id=53)
   OR (id=648 AND scholarship_id=312)
   OR (id=533 AND scholarship_id=327);

-- Hard check:
-- SELECT id,title,is_active,source_reliability,coverage_type,deadline_type
-- FROM scholarships WHERE id IN (53,312,327) ORDER BY id;
-- SELECT id,scholarship_id,scholarship_name FROM university_scholarships
-- WHERE scholarship_id IN (53,312,327) ORDER BY id;
-- ============================================================================
