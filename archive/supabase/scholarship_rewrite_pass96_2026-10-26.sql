-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 96 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Branch: arena/a496ffaa-scholarbridgeai
-- Australia research scholarships, batch 3:
--   319 UWA RTP Stipend            -> verified rewrite, reliability 10
--                                     (imported title wrongly merged the
--                                     separate coursework Global Excellence
--                                     award into this HDR row)
--   328 "Adelaide ASI"             -> rewritten as the successor award of
--                                     the merged institution: Adelaide
--                                     University RTPS/AURS, reliability 10.
--                                     Provider updated; the legacy
--                                     University of Adelaide (id 191)
--                                     association + university_id removed
--                                     (no Adelaide University catalogue
--                                     record exists yet).
--   360 UniSA President's          -> retired (reliability 9): UniSA merged
--                                     into Adelaide University; successor
--                                     recorded once at id 328, not duplicated.
-- All three rows had 0 saved_scholarships / scholarship_decisions refs.
-- ============================================================================

-- 319 — UWA Research Training Program (RTP) Stipend Scholarship.
UPDATE scholarships SET
  title = 'UWA Research Training Program (RTP) Stipend Scholarship',
  website_url = 'https://www.uwa.edu.au/study/scholarships-and-fees/scholarships/hdr-scholarships',
  source_url = 'https://www.uwa.edu.au/study/scholarships-and-fees/scholarships/hdr-scholarships',
  application_url = 'https://researchdegrees.uwa.edu.au/',
  award_amount = 39253,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Living Stipend',
  living_allowance = 39253,
  tuition_coverage = $tc$Tuition is a separate component: UWA awards International RTP Tuition Fees Offset Scholarships competitively to a limited number of international students in the HDR scholarship rounds. The HDR scholarships page does not publish the offset value, so no tuition amount is stored in this stipend record; international students must otherwise pay tuition fees.$tc$,
  funding_type = 'Australian Government Research Training Program stipend scholarship awarded in UWA HDR scholarship rounds; separate competitive international tuition fees offset component',
  deadline = $dl$The 2027 International Scholarship Round closed 15 September 2026 (offers from November 2026). The 2027 Domestic Scholarship Round, which also admits eligible UWA international graduates, closes 31 October 2026 for February-March 2027 commencement. Dates for the next international round have not been published; UWA's international HDR rounds run annually around July-September.$dl$,
  opening_date = NULL,
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = 'UWA holds HDR scholarship rounds annually; the international round runs around July-September (the 2027 round closed 15 September 2026). Next international round dates were not published at verification.',
  rounds = $json$[{"period":"2027 International Scholarship Round","deadline":"2026-09-15","ranking":"October 2026","offers_from":"November 2026"},{"period":"2027 Domestic Scholarship Round (incl. eligible UWA international graduates)","deadline":"2026-10-31","commencement":"February-March 2027"}]$json$,
  recurrence = 'annual',
  application_status = 'closed',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Research Doctorate and Research Master's degrees at UWA"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-specific English score is published on the UWA HDR scholarships page; the English-language requirements for admission to the chosen HDR course apply.',
  required_documents = $json$["HDR course and scholarship-round application via the UWA online HDR application portal (admission and scholarship assessed together)","Current HDR candidates / existing offer holders: online HDR scholarship application form"]$json$,
  description = $desc$The University of Western Australia awards Australian Government Research Training Program (RTP) Stipend Scholarships through competitive Higher Degree by Research scholarship rounds. The stipend is a living allowance for Research Doctorate and Research Master's candidates; UWA publishes the 2027 value as AUD 39,253 per annum, awarded to a limited number of domestic and international students through competitive selection. Tuition support is a separate component: International RTP Tuition Fees Offset Scholarships are awarded competitively to a limited number of international students in the scholarship rounds, and international students must otherwise pay tuition fees unless a scholarship or sponsorship covers them. RTP Allowances may assist with ancillary costs such as relocation. The 2027 International Scholarship Round closed on 15 September 2026 (ranking October 2026, offers from November 2026). A separate 2027 Domestic Scholarship Round (which also admits UWA international graduates who completed their qualifying degree at UWA in 2025-2026) closes 31 October 2026 for commencement in February-March 2027. Applications for admission and scholarship consideration are made together through UWA's online HDR application portal; no separate application is required for RTP scholarship consideration.$desc$,
  requirements = $req$Apply for a UWA Research Doctorate or Research Master's course and select the relevant HDR scholarship round in the online HDR application portal; admission and scholarship applications are assessed together and no separate RTP application is required. Current HDR candidates and applicants already holding a UWA HDR offer letter use the online scholarship application form instead. Awards are competitive and limited in number for both the stipend and the international tuition fees offset components. International applicants generally apply in the International Scholarship Round; only UWA international graduates (qualifying UWA degree completed in 2025 or 2026, or completing by end of 2026) may also use the Domestic Round. The HDR scholarships page publishes no numerical GPA or English-test cutoff; course admission requirements apply.$req$,
  notes = $note$VERIFIED 2026-10-26 (Australia research scholarship pass 96) against the official UWA HDR scholarships page https://www.uwa.edu.au/study/scholarships-and-fees/scholarships/hdr-scholarships (fetched). The page publishes the 2027 RTP Stipend value of AUD 39,253 per annum and separates it from the competitive International RTP Tuition Fees Offset Scholarships, whose value is not stated on the page; only the stipend is stored here and coverage_type is Living Stipend. The 2027 International Round closed 15 September 2026, before verification, and no 2028 round dates are published, so deadline_date is NULL, deadline_type is not_published and application_status is closed; the published 2027 round dates are preserved in the rounds field. TITLE CORRECTION: the imported title merged UWA's coursework Global Excellence Scholarship into this HDR row; that is a separate undergraduate/postgraduate coursework award and is not part of this record. This replaces the earlier national-framework-only text left at reliability 4 on 2026-10-26 and the originally imported invented USD 42,000 figure and generic 31 August deadline. amount_usd_value is 0 because the award is paid in AUD. No numerical GPA or IELTS threshold is published on the page; both remain NULL.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 319;

-- 328 — Successor record: Adelaide University Research Scholarships
-- (RTPS and AURS). Verified against the official research scholarships page
-- and the RTPS/AURS Conditions of Award (revised May 2026).
UPDATE scholarships SET
  title = 'Adelaide University Research Scholarships (RTPS and AURS)',
  provider = 'Adelaide University',
  university_id = NULL,
  website_url = 'https://adelaide.edu.au/research/research-degrees/research-scholarships/',
  source_url = 'https://adelaide.edu.au/research/research-degrees/research-scholarships/',
  application_url = NULL,
  award_amount = 36500,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Full Tuition + Stipend',
  living_allowance = 36500,
  tuition_coverage = $tc$100% tuition fee waiver for the standard duration of the program: AURS international recipients have tuition fees waived, and for RTPS recipients any gap between the RTP Fees Offset and charged tuition is waived by Adelaide University. International recipients also receive a single OSHC policy (up to 30 months MPhil / 54 months PhD). The stored cash amount is the stipend only.$tc$,
  funding_type = 'Competitive graduate research scholarship package (Australian Government RTPS and university-funded AURS): living stipend, 100% tuition fee waiver and OSHC/relocation allowances',
  deadline = $dl$Next round open to international applicants generally: Signature Research Theme (SRT) Scholarship Round Expressions of Interest, 31 August to 30 September 2027 (project-based). The Graduate Research Talent Scheme Round 1 closes 2 November 2026 but international applicants must hold a relevant Australian or New Zealand qualification; its Round 2 runs mid-February to late March 2027 and Round 3 mid-July to mid-August 2027 with the same restriction.$dl$,
  opening_date = NULL,
  deadline_date = '2027-09-30',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = $json$[{"period":"Graduate Research Talent Scheme Round 1 (2027 commencement; international only with AU/NZ qualification)","deadline":"2026-11-02"},{"period":"Graduate Research Talent Scheme Round 2","window":"mid-February to late March 2027"},{"period":"Graduate Research Talent Scheme Round 3","window":"mid-July to mid-August 2027"},{"period":"Signature Research Theme Scholarship Round EOI (project-based; open to international applicants)","eoi_open":"2027-08-31","deadline":"2027-09-30"}]$json$,
  recurrence = 'annual',
  application_status = 'upcoming',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Master of Philosophy and Doctor of Philosophy programs in every discipline area; SRT round projects sit within five Signature Research Themes"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = $er$International applicants must provide evidence of meeting Adelaide University's minimum English language proficiency requirements for direct entry by the scholarship closing date; the Conditions of Award publish no single test score (program entry requirements apply).$er$,
  required_documents = $json$["Research degree application selecting Adelaide University Research Scholarship / Research Training Program Scholarship (Talent Scheme route), with documentary evidence of completed qualification by the closing date","English language proficiency evidence by the closing date (international applicants)","Signature Research Theme route: project Expression of Interest (EOI) via the University project website, then formal admission/scholarship application if invited"]$json$,
  description = $desc$Adelaide University — formed by the merger of the University of Adelaide and the University of South Australia, with graduate research scholarships for students commencing from January 2026 — offers Research Training Program Scholarships (RTPS, funded by the Australian Government) and Adelaide University Research Scholarships (AURS, funded by the University) for Master of Philosophy and Doctor of Philosophy candidates in every discipline. Under the official Conditions of Award (revised May 2026), full-time recipients receive a tax-exempt living stipend of AUD 36,500 per annum in 2026 (indexed annually) for up to 3.5 years, paid fortnightly, plus a 100% tuition fee waiver for the standard duration of the program (for RTPS holders any gap between the RTP Fees Offset and charged tuition is waived). International recipients on a student visa also receive a single BUPA Comprehensive OSHC policy (up to 30 months for MPhil, 54 months for PhD) and may receive a relocation allowance of up to AUD 1,500. Awards are made through distinct competitive rounds. The Graduate Research Talent Scheme round (Round 1 closing 2 November 2026 for 2027 commencement, with further rounds in February-March and July-August 2027) is open to domestic applicants and to international applicants who have completed, or are completing in 2026, a relevant Australian or New Zealand qualification — it is not open to offshore applicants whose qualifications are from other countries. The project-based Signature Research Theme (SRT) Scholarship Round is open to domestic and international applicants, with Expressions of Interest open 31 August to 30 September 2027.$desc$,
  requirements = $req$Be eligible to enrol in a Master of Philosophy or Doctor of Philosophy at Adelaide University and meet both Commonwealth RTP eligibility and Adelaide University's additional requirements in the Conditions of Award: a completed qualification with documentary evidence by the round closing date (specific recency rules apply to international applicants), evidence of meeting minimum English language proficiency for direct entry by the closing date (international applicants), no equivalent Commonwealth award designed to offset HDR tuition fees, and no equivalent or higher research degree already held. Scholarships are awarded competitively to the highest-ranked applicants on academic merit and research experience; commencing students may be preferred. Round restrictions matter: the Graduate Research Talent Scheme requires a relevant Australian or New Zealand qualification for international applicants, while the Signature Research Theme round accepts international EOIs for listed projects (qualification completed by 28 February 2028 for applicants outside Australia). Application routes differ by round — Talent Scheme applicants apply for the research degree and select AURS/RTPS in the online application; SRT applicants first submit a project Expression of Interest.$req$,
  notes = $note$REWRITTEN 2026-10-26 (Australia research scholarship pass 96). The imported row was titled 'Adelaide Scholarships International ASI', a University of Adelaide scheme name that had already been superseded by RTP rounds; since then the University of Adelaide and the University of South Australia have merged to form Adelaide University (graduate research scholarships commencing from January 2026), and the stored graduatecentre URL now redirects to Adelaide University. This record therefore now documents the successor Adelaide University package, verified against the official research scholarships page https://adelaide.edu.au/research/research-degrees/research-scholarships/ and the RTPS/AURS Conditions of Award (revised May 2026), both fetched: 2026 full-time stipend AUD 36,500 per annum (indexed, up to 3.5 years), 100% tuition fee waiver for the standard duration, single OSHC (30 months MPhil / 54 months PhD) and relocation allowance up to AUD 1,500 for international recipients. deadline_date stores the SRT round EOI closing date (2027-09-30) because the currently open Talent Scheme round excludes international applicants without an Australian/New Zealand qualification; all published rounds are recorded in the rounds field. The legacy university_scholarships association and university_id pointing at the former University of Adelaide record (id 191) were removed because the catalogue has no Adelaide University record yet; provider updated to Adelaide University. The former UniSA entry is retired separately at id 360. This replaces the national-framework-only text left at reliability 4 and the originally imported invented USD 41,000 figure and generic 31 August deadline. amount_usd_value is 0 (AUD award); min_gpa/min_ielts remain NULL (no numerical scores published in the conditions).$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 328;

-- 360 — UniSA President's PhD Scholarship: retired. Institution merged into
-- Adelaide University; successor recorded at id 328 (not duplicated).
UPDATE scholarships SET
  title = $t$UniSA President's PhD Scholarship (retired — superseded by Adelaide University merger)$t$,
  website_url = 'https://www.unisa.edu.au/study/fees-and-scholarships/scholarships/',
  source_url = 'https://www.unisa.edu.au/study/fees-and-scholarships/scholarships/',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = 'variable',
  award_basis = 'variable',
  amount_usd_value = 0,
  coverage_type = 'Unspecified',
  tuition_coverage = NULL,
  living_allowance = NULL,
  funding_type = 'Retired legacy UniSA research scholarship pointer; superseded by Adelaide University merger',
  deadline = 'Retired: UniSA merged into Adelaide University; see the successor Adelaide University research scholarships record (id 328) for current rounds.',
  opening_date = NULL,
  deadline_date = NULL,
  deadline_type = 'not_published',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = '[]',
  recurrence = 'annual',
  application_status = 'unknown',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Legacy UniSA higher degree by research programs (institution merged into Adelaide University)"]$json$,
  eligible_countries = '[]',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  description = $desc$Retired record. This row documented a University of South Australia (UniSA) research scholarship under the imported name 'UniSA President's PhD Scholarship'. UniSA has merged with the University of Adelaide to form the new Adelaide University, and the official UniSA scholarships page now returns a transition notice stating that older UniSA pages have been removed or relocated as part of the transition to Adelaide University. No current UniSA-branded international research scholarship exists to apply for. The successor graduate research funding — Adelaide University's Research Training Program Scholarships (RTPS) and Adelaide University Research Scholarships (AURS) — is recorded separately at scholarship id 328.$desc$,
  requirements = $req$Not applicable: the University of South Australia no longer offers this scholarship as a separate institution after its merger into Adelaide University. See the successor Adelaide University research scholarships record (id 328) for current eligibility and rounds.$req$,
  notes = $note$RETIRED 2026-10-26 (Australia research scholarship pass 96). The stored UniSA scholarships URL https://www.unisa.edu.au/study/fees-and-scholarships/scholarships/ was fetched and returns the University's own 404 transition notice: 'As part of the transition from the University of South Australia website to Adelaide University, some older pages have been removed or relocated', directing visitors to adelaide.edu.au. Adelaide University is the merged successor of the University of Adelaide and UniSA; its graduate research scholarships (RTPS/AURS) for students commencing from January 2026 are recorded at scholarship id 328, so this legacy UniSA row is retired rather than duplicated as a second successor record. The row previously carried only national RTP framework text at reliability 4 and, before that, an invented USD 42,000 figure and a generic 31 August deadline; no amount or deadline is restored. The row had no university association, saved-scholarship or decision references; its source mapping is retained for audit with the fetched transition-notice URL.$note$,
  verification_status = 'verified',
  source_reliability = 9,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 360;

-- Refresh source registry records (previously bare domains).
UPDATE sources s SET url=v.url,title=v.title,domain=v.domain,source_type='scholarship',accessed_at='2026-10-26 00:00:00',is_official=true,is_verified=true
FROM (VALUES
 (2690,'https://www.uwa.edu.au/study/scholarships-and-fees/scholarships/hdr-scholarships','UWA HDR Scholarships and RTP — Official Source','www.uwa.edu.au'),
 (2478,'https://adelaide.edu.au/research/research-degrees/research-scholarships/','Adelaide University Research Scholarships (RTPS/AURS) — Official Source','adelaide.edu.au'),
 (2670,'https://www.unisa.edu.au/study/fees-and-scholarships/scholarships/','University of South Australia — Transition to Adelaide University (Official Notice)','www.unisa.edu.au')
) AS v(id,url,title,domain)
WHERE s.id=v.id;

-- Remove the legacy University of Adelaide (id 191) association from the
-- successor Adelaide University record; the catalogue has no Adelaide
-- University university record yet. UWA's association (160) is retained.
DELETE FROM university_scholarships WHERE id=575 AND scholarship_id=328;

-- Hard check:
-- SELECT id,title,provider,university_id,is_active,source_reliability,
--        award_amount,award_currency,deadline_date,deadline_type,application_status
-- FROM scholarships WHERE id IN (319,328,360) ORDER BY id;
-- SELECT COUNT(*) FILTER (WHERE is_active) AS active,
--        COUNT(*) FILTER (WHERE NOT is_active) AS retired,
--        COUNT(*) FILTER (WHERE is_active AND source_reliability=4) AS reliability_4,
--        COUNT(*) FILTER (WHERE is_active AND deadline_date > CURRENT_DATE) AS future_deadlines
-- FROM scholarships;
-- ============================================================================
