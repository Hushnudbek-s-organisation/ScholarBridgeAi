-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 95 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/a496ffaa-scholarbridgeai
-- Australia research scholarships, batch 2: replace three reliability-4 rows
-- that only quoted the national RTP framework (the earlier rewrite had
-- explicitly not read the university pages) with the actual named awards
-- read from the official ANU, Monash and UQ pages:
--   134 ANU RTP Stipend Scholarship        -> verified, reliability 10
--   141 Monash International Tuition (MITS)-> verified, reliability 10
--   149 UQ Graduate Research School (UQGRSS)-> verified, reliability 10
-- Nothing is retired in this pass. All three rows have no
-- saved_scholarships / scholarship_decisions references; the university
-- associations (565/27, 538/42, 546/56) stay because the named awards are
-- confirmed. Bare-domain source registry URLs are replaced by the fetched
-- official pages.
-- ============================================================================

-- 134 — ANU: Australian Government Research Training Program (RTP) Stipend
-- Scholarship. Stipend only is stored; the page publishes no tuition value.
UPDATE scholarships SET
  title = 'Australian Government Research Training Program (RTP) Stipend Scholarship',
  website_url = 'https://study.anu.edu.au/scholarships/find-scholarship/australian-government-research-training-program-rtp-stipend',
  source_url = 'https://study.anu.edu.au/scholarships/find-scholarship/australian-government-research-training-program-rtp-stipend',
  application_url = NULL,
  award_amount = 40475,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Living Stipend',
  living_allowance = 40475,
  tuition_coverage = $tc$No tuition amount or percentage is stored: this record is the RTP stipend scholarship. The official page states only that international recipients are eligible for OSHC reimbursement under their RTP Fee Offset benefit; it does not publish the value of any fee offset for this record.$tc$,
  funding_type = 'Australian Government Research Training Program stipend scholarship, awarded competitively in ANU central HDR rounds',
  deadline = $dl$Two ANU central rounds each year. Round 1 (international candidates): complete HDR admission application by 31 August for commencement January to 30 March of the following year (next closing 31 August 2027). Round 2 is a smaller round closing 15 April for commencement or take-up by the end of August of the same year; the official page states no separate citizenship deadlines for Round 2.$dl$,
  opening_date = NULL,
  deadline_date = '2027-08-31',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = $json$[{"period":"Round 1 - international candidates (annual)","deadline":"31 August","next_deadline":"2027-08-31","commencement":"January to 30 March of the following year"},{"period":"Round 1 - domestic candidates (annual)","deadline":"31 October (26 October in 2026)"},{"period":"Round 2 - smaller round (annual)","deadline":"15 April","commencement":"by end of August of the same year"}]$json$,
  recurrence = 'annual',
  application_status = 'open',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Higher Degree by Research programs at ANU; award depends on supervisor, space and resources and alignment with ANU research strategy"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-specific English score is published on the ANU RTP Stipend page; the English-language requirements for admission to the chosen ANU HDR program apply.',
  required_documents = $json$["Complete HDR admission application with scholarship consideration selected (no separate scholarship application for prospective candidates)","All supporting documentation submitted by the round deadline","Referee reports received by the scholarship deadline","Currently enrolled candidates: Request for a current ANU student to be considered for a HDR Scholarship form"]$json$,
  description = $desc$The Australian National University awards Australian Government Research Training Program (RTP) Stipend Scholarships to domestic and international Higher Degree by Research candidates in two competitive central scholarship rounds each year. The published full-time base RTP stipend rate for 2027 is AUD 40,475 per annum, paid fortnightly for 3.5 years, with a six-month extension available and continuation based on academic performance. In addition to the stipend, the scholarship provides travel and removal allowances for students relocating to Canberra, a thesis allowance, a dependant child allowance (international students only) and paid medical, maternity and parental leave; allowance amounts are not published on the page. ANU states that international recipients are eligible for OSHC reimbursement under their RTP Fee Offset benefit. There is no separate scholarship application for prospective candidates: applicants select scholarship consideration in the HDR admission application, and awards go to top-ranked candidates subject to merit criteria, a confirmed qualified supervisor, space and resources, and alignment with ANU research strategy. Round 1 requires international candidates to have a complete admission application by 31 August for commencement between January and 30 March of the following year; Round 2 is a smaller round closing 15 April for commencement by the end of August of the same year.$desc$,
  requirements = $req$Apply for admission to an ANU Higher Degree by Research program and select scholarship consideration (including RTP) in the admission application; no separate scholarship form is required for prospective candidates. The application must be complete by the round deadline, including all supporting documentation and referee reports (ANU recommends submitting 2-3 weeks early so referees can report in time), and contacting the HDR Convener or a prospective supervisor beforehand is strongly encouraged. Awards are competitive and merit-ranked, and depend on a qualified supervisor, space and resources being available in an area aligned with ANU research strategy. Currently enrolled candidates (typically under one year full-time equivalent) apply via the 'Request for a current ANU student to be considered for a HDR Scholarship' form. The page publishes no numerical GPA or English-test threshold; HDR admission requirements apply.$req$,
  notes = $note$VERIFIED 2026-10-26 (Australia research scholarship pass 95) against the official ANU page https://study.anu.edu.au/scholarships/find-scholarship/australian-government-research-training-program-rtp-stipend (the stored anu.edu.au URL redirects there; both content chunks fetched). The page publishes the 2027 full-time base RTP stipend of AUD 40,475 per annum, fortnightly payments for 3.5 years plus a possible six-month extension, travel/removal and thesis allowances, a dependant child allowance for international students, paid medical/maternity/parental leave, and OSHC reimbursement for international recipients under their RTP Fee Offset benefit. It does not publish allowance dollar amounts or a tuition percentage, so only the stipend is stored as award_amount/living_allowance and coverage_type is Living Stipend. Round 1 international deadline is 31 August each year (the page's 2026 note moving the domestic deadline from 31 October to 26 October 2026 does not affect international applicants); Round 2 closes 15 April and the page gives no citizenship split for it, so deadline_date stores the next international-specific Round 1 date, 2027-08-31. This replaces the earlier national-framework-only text left at reliability 4 on 2026-10-26 and the originally imported invented USD 44,000 figure. amount_usd_value is 0 because the award is paid in AUD. No numerical GPA or IELTS threshold is published; both remain NULL.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 134;

-- 141 — Monash International Tuition Scholarship (MITS). Live page moved to
-- the fees-scholarships slug; the old fees-enrolment URL redirects to the
-- unrelated RTP Fees-Offset page. Header vs How-to-apply dates disagree on
-- the official page; the How-to-apply round dates are stored (see notes).
UPDATE scholarships SET
  title = 'Monash International Tuition Scholarship (MITS)',
  website_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-tuition-scholarship',
  source_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-tuition-scholarship',
  application_url = NULL,
  award_amount = NULL,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'variable',
  amount_usd_value = 0,
  coverage_type = 'Full Tuition',
  living_allowance = NULL,
  tuition_coverage = $tc$Covers the course tuition fees that would otherwise be payable by the student, plus a single Overseas Student Health Cover (OSHC) policy. Total value depends on the applicable course fee, so no fixed cash amount is stored (award_currency AUD, amount variable).$tc$,
  funding_type = 'University-funded tuition fee scholarship for international graduate research students; automatic consideration with the course application',
  deadline = $dl$International Round 1 closes 28 February 2027 (closing date brought forward for 2027); International Round 3 closes 31 August 2027. The page header gives generic annual closings of 31 March and 31 July; the How to apply round dates above are the ones recorded.$dl$,
  opening_date = NULL,
  deadline_date = '2027-02-28',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = $json$[{"period":"International Round 1 (2027)","deadline":"2027-02-28","note":"Page states the R1 closing date for 2027 has been brought forward"},{"period":"International Round 3 (2027)","deadline":"2027-08-31"}]$json$,
  recurrence = 'annual',
  application_status = 'open',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Research Doctorate and Research Masters degrees at a Monash campus in Australia"]$json$,
  eligible_countries = $json$["All international"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = $er$Applicants must meet Monash's English language proficiency requirements for graduate research admission; the MITS page publishes no separate scholarship-specific score.$er$,
  required_documents = '[]',
  description = $desc$The Monash International Tuition Scholarship (MITS) supports international students undertaking a Research Doctorate or Research Masters degree at a Monash campus in Australia. A MITS covers the course tuition fees that would otherwise be payable by the student and a single Overseas Student Health Cover (OSHC) policy; the total value is based on the applicable course fee and the number of awards varies. It is a tuition scholarship, not a living allowance. Monash scholarships are highly competitive and are awarded based on academic excellence, research outputs and prior research experience. Applicants must meet Monash's competitive scholarship selection process requirements and English language proficiency requirements for graduate research admission; the scholarship is also available for Joint Research Awards where Monash is the home institution. There is no separate MITS application or scholarship selection in the portal: graduate research scholarship applications are submitted with the course application in the myApp Portal, and eligible applicants are automatically considered for all available graduate research scholarships. International rounds close 28 February (Round 1, brought forward for 2027) and 31 August (Round 3) according to the page's How to apply section.$desc$,
  requirements = $req$International student applying for or enrolled in a Research Doctorate or Research Masters degree at a Monash campus in Australia (including Joint Research Awards with Monash as home institution). Must meet Monash's competitive scholarship selection process requirements and English language proficiency requirements for graduate research admission. Selection is highly competitive and based on academic excellence, research outputs and prior research experience. Apply for the research course through the myApp Portal by the international round closing date; eligible applicants are automatically considered for all available graduate research scholarships and do not select MITS separately.$req$,
  notes = $note$VERIFIED 2026-10-26 (Australia research scholarship pass 95) against the official Monash page https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-tuition-scholarship (content chunks fetched). The previously stored fees-enrolment URL no longer resolves to MITS (it redirects to the RTP Fees-Offset page); the current fees-scholarships slug above is the live MITS page and confirms the award still exists for international Research Doctorate and Research Masters students. Benefits are course tuition fees plus a single OSHC policy, total value based on the applicable course fee, numbers vary. DATE INCONSISTENCY ON THE OFFICIAL PAGE: the header states applications close 31 March and 31 July each year, while the How to apply section states International Round 1 closes 28 February (brought forward for 2027) and International Round 3 closes 31 August; this record stores the How to apply dates as deadline_date 2027-02-28 with both rounds in the rounds field, and the discrepancy is flagged rather than resolved by guesswork. No living allowance is part of MITS (Monash stipend awards are separate scholarships), coverage_type is Full Tuition, and amount_usd_value is 0. No numerical GPA or English score is published on the page; min_gpa and min_ielts remain NULL. This replaces the earlier national-RTP-framework-only text left at reliability 4 on 2026-10-26 and the originally imported invented USD 41,000 figure and generic 31 August deadline.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 141;

-- 149 — UQ Graduate Research School Scholarships (UQGRSS) incl. RTP. The
-- imported "UQGSRS" title/URL were obsolete (old URL 404s). The published
-- international round closed 19 Oct 2026; future rounds are promised by end
-- of Oct 2026, hence deadline_type not_published + application_status closed
-- with the full round calendars preserved in the rounds field.
UPDATE scholarships SET
  title = 'Graduate Research School Scholarships (UQGRSS) – includes Research Training Program (RTP)',
  website_url = 'https://scholarships.uq.edu.au/scholarship/graduate-school-scholarships-uqgss-%E2%80%93-includes-rtp',
  source_url = 'https://scholarships.uq.edu.au/scholarship/graduate-school-scholarships-uqgss-%E2%80%93-includes-rtp',
  application_url = 'https://apply.uq.edu.au/',
  award_amount = 39220,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Full Tuition + Stipend',
  living_allowance = 39220,
  tuition_coverage = $tc$UQ lists the funding type as 'Living stipend, Tuition fees': the award combines the living stipend with a tuition fee scholarship and, for international students, single Overseas Student Health Cover (OSHC), for 3.5 years with the possibility of one extension. The stored cash amount is the stipend only.$tc$,
  funding_type = 'Competitive HDR scholarship package in UQ/RTP rounds: living stipend, tuition fee scholarship and single OSHC for international students',
  deadline = $dl$Published international round (commencement Research Quarter 4 2027 or early 2028): scholarship consideration from 20 August 2026, full application closed 19 October 2026, outcomes from 22 February 2027, acceptances due 31 March 2027. Future round dates were not yet published when this record was verified; UQ states the updated schedule will be published by the end of October 2026.$dl$,
  opening_date = NULL,
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = 'Annual competitive rounds. The 2026 international round ran from 20 August to 19 October 2026; UQ states the updated future-round schedule will be published by the end of October 2026.',
  rounds = $json$[{"period":"International applicants - commencement Research Quarter 4 2027 or early 2028","consideration_from":"2026-08-20","deadline":"2026-10-19","shortlisting_from":"2026-10-27","outcomes_from":"2027-02-22","acceptances_due":"2027-03-31"},{"period":"Domestic-labelled round incl. onshore international students - commencement Research Quarter 1 or 2 2027","consideration_from":"2026-07-01","deadline":"2026-08-31","outcomes_from":"2026-12-07","acceptances_due":"2027-01-08"}]$json$,
  recurrence = 'annual',
  application_status = 'closed',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["All study areas (PhD, Master of Philosophy and research-focused professional doctorates)"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-specific English score is published on the UQGRSS page; applicants must meet all UQ conditions for admission to the HDR program, including its English-language requirements.',
  required_documents = $json$["Expression of interest (EOI) for the HDR program with the Scholarship/Sponsorship section completed (no separate scholarship application)","HDR admission documentation; applicants with pending Honours or Master's results upload a current transcript with the EOI and provide the complete transcript as soon as possible","Currently enrolled HDR candidates: online nomination form with candidature and Principal Advisor details, current CV and two referees"]$json$,
  description = $desc$The University of Queensland's Graduate Research School Scholarships (UQGRSS), which include Australian Government Research Training Program (RTP) awards, support future and current higher degree by research students (Doctor of Philosophy, Master of Philosophy and research-focused professional doctorates) across all study areas. UQ lists the funding type as living stipend plus tuition fees: the package pays a living stipend of AUD 39,220 per annum tax free (2026 rate, indexed annually) for 3.5 years with the possibility of one extension under UQ and RTP Scholarship Policy, and single Overseas Student Health Cover (OSHC) for international students. There is no separate scholarship application: candidates submit an expression of interest (EOI) for the research program, complete the Scholarship/Sponsorship section, are nominated by an enrolling school or institute and must meet all conditions for HDR admission. Selection uses UQ's scholarship rubric covering academic performance and research capability, the quality of the research project and environment, and the advisory team. EOIs are accepted year-round but are only assessed within published scholarship rounds. The published international round for commencement in Research Quarter 4 2027 or early 2028 closed on 19 October 2026; UQ states that dates for future rounds will be published by the end of October 2026.$desc$,
  requirements = $req$Be nominated by an enrolling UQ school or institute and be assessed by the Graduate Research School as meeting all conditions for admission to the higher degree by research program (PhD, MPhil or research-focused professional doctorate). Identify a supervisor and submit an expression of interest (EOI) with the Scholarship/Sponsorship section completed; no separate scholarship application is required. If the EOI is supported, submit the full application by the round closing date. Applicants with pending Honours or Master's results may upload a current transcript with the EOI and must provide the complete transcript as soon as possible. Currently enrolled HDR candidates apply through the enrolled-candidate nomination form; current onshore international students are eligible for the rounds labelled domestic. The scholarship page publishes no numerical GPA or English-test cutoff; HDR admission conditions apply.$req$,
  notes = $note$VERIFIED 2026-10-26 (Australia research scholarship pass 95) against the official UQ page https://scholarships.uq.edu.au/scholarship/graduate-school-scholarships-uqgss-%E2%80%93-includes-rtp (fetched). The previously stored graduate-school-scholarships URL returns UQ's page-not-found (UQ archives scholarship pages 30 days after applications close) and the award has been renamed from the imported 'UQGSRS' title to Graduate Research School Scholarships (UQGRSS) including RTP. The page publishes a AUD 39,220 per annum tax-free living stipend (2026 rate, indexed annually), single OSHC, 3.5-year duration with the possibility of one extension, and funding type 'Living stipend, Tuition fees'; award_amount/living_allowance store the stipend only and amount_usd_value is 0 because it is paid in AUD. The international round for RQ4 2027/early 2028 closed 19 October 2026, one week before verification, and the round labelled for domestic applicants (which also admits onshore international students who must be in Australia on a student visa when offers are issued) closed 31 August 2026. Future round dates were unpublished, with UQ promising them by end of October 2026, so deadline_date is NULL, deadline_type is not_published and application_status is closed pending the new schedule; the full published round calendars are kept in the rounds field. This replaces the earlier national-RTP-framework-only text left at reliability 4 on 2026-10-26 and the originally imported invented USD 41,000 figure and generic 30 September deadline. No numerical GPA or IELTS threshold is published; both remain NULL.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 149;

-- Refresh the matching source registry records (previously bare domains
-- anu.edu.au / monash.edu / uq.edu.au) with the fetched official pages.
UPDATE sources s SET url=v.url,title=v.title,domain=v.domain,source_type='scholarship',accessed_at='2026-10-26 00:00:00',is_official=true,is_verified=true
FROM (VALUES
 (2486,'https://study.anu.edu.au/scholarships/find-scholarship/australian-government-research-training-program-rtp-stipend','ANU Research Training Program (RTP) Stipend Scholarship — Official Source','study.anu.edu.au'),
 (2575,'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-tuition-scholarship','Monash International Tuition Scholarship (MITS) — Official Source','www.monash.edu'),
 (2677,'https://scholarships.uq.edu.au/scholarship/graduate-school-scholarships-uqgss-%E2%80%93-includes-rtp','Graduate Research School Scholarships (UQGRSS) incl. RTP — Official Source','scholarships.uq.edu.au')
) AS v(id,url,title,domain)
WHERE s.id=v.id;

-- No university_scholarships rows are removed in this pass: associations
-- 565 (ANU), 538 (Monash) and 546 (UQ) now point at verified named awards.

-- Hard check:
-- SELECT id,title,is_active,source_reliability,award_amount,award_currency,deadline_date,deadline_type,application_status
-- FROM scholarships WHERE id IN (134,141,149) ORDER BY id;
-- SELECT COUNT(*) FILTER (WHERE is_active) AS active,
--        COUNT(*) FILTER (WHERE NOT is_active) AS retired,
--        COUNT(*) FILTER (WHERE is_active AND source_reliability=4) AS reliability_4,
--        COUNT(*) FILTER (WHERE is_active AND deadline_date > CURRENT_DATE) AS future_deadlines
-- FROM scholarships;
-- ============================================================================
