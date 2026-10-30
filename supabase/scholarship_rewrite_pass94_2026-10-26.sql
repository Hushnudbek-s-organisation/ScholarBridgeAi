-- ============================================================================
-- SCHOLARSHIP REWRITE PASS 94 — 2026-10-26
-- Project: zkdguzbdopfedkffsatk (Postgres 17)
-- Documentation branch: arena/a496ffaa-scholarbridgeai
-- Australia research scholarship pass: verify/rewrite four reliability-4 rows
-- against their official university pages (Monash 49, Melbourne 117,
-- Sydney 122) and retire the generic UNSW Scientia row (123) because the
-- current 2027 Scientia project pool is domestic-only.
--
-- NOTE (audit): the four UPDATEs were applied to Supabase on 2026-10-26
-- 10:10–10:14 UTC but the pass documentation was not committed at that time.
-- This file was reconstructed from the resulting database state and every
-- value was re-verified against the official pages on 2026-10-26 before
-- committing. One finalisation correction is folded into row 49 below: the
-- same-day draft cited a "WAM above 85 / no minimum ATAR" metadata value
-- that could not be re-verified from the official page content, so the final
-- texts state only that selection is based on academic achievement.
-- ============================================================================

-- 49 — Monash International Merit Scholarship (verified, reliability 10).
UPDATE scholarships SET
  title = 'Monash International Merit Scholarship',
  website_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770',
  source_url = 'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770',
  application_url = NULL,
  award_amount = 15000,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Unspecified',
  tuition_coverage = NULL,
  living_allowance = NULL,
  funding_type = 'Merit-based annual undergraduate scholarship; automatic consideration',
  deadline = 'No separate scholarship application or scholarship-specific deadline: eligible international applicants are automatically considered after receiving a full unconditional Monash course offer. Normal course application dates apply.',
  opening_date = NULL,
  deadline_date = NULL,
  deadline_type = 'automatic',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = '[]',
  recurrence = 'annual',
  application_status = 'open',
  degree_levels = $json$["Bachelor's"]$json$,
  eligible_majors = $json$["Most full-time undergraduate degrees at Monash campuses in Australia; Medicine/MD, Monash pathway programmes and transfers are excluded"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-specific English score is stated; the chosen Monash undergraduate course entry requirements apply.',
  required_documents = '[]',
  description = $desc$Monash automatically considers international students from all countries who receive a full unconditional offer for a full-time undergraduate degree at a Monash campus in Australia. For scholarships awarded from 2026, recipients receive AUD 15,000 per year for the duration of their degree, up to the published total value of AUD 75,000; Monash lists 20 awards per year. Selection is based on academic achievement; the official page publishes no numerical ATAR, WAM or GPA cutoff. Recipients must maintain a distinction average (70% or higher) each semester and provide a student profile for Monash promotional use. No separate scholarship application is required; eligible offer-holders are automatically considered. The scholarship is not available to current Monash students, Australian Year 12 students (who may qualify for a different award), students commencing the Bachelor of Medical Science/Doctor of Medicine, Monash pathway students, or transfers from another Monash campus or Australian university. The page does not state that the AUD 15,000 is a tuition-fee waiver or a living stipend, so this record reports the published annual scholarship value without assigning it to a specific cost category.$desc$,
  requirements = $req$International student from any country; full unconditional offer for a full-time undergraduate course at a Monash campus in Australia; selection based on academic achievement (no numerical score threshold is published on the official page). Maintain a distinction average of at least 70% each semester and provide a student profile for Monash promotional use. Excludes current Monash students, Australian Year 12 students, Bachelor of Medical Science/Doctor of Medicine entrants, Monash pathway students and transfers from another Monash campus or Australian university.$req$,
  notes = $note$VERIFIED 2026-10-26 against Monash's official scholarship page https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770, fetched in its official scholarship-search layout and content chunks. The page states AUD 15,000 per annum for awards from 2026, up to AUD 75,000 total, 20 awards annually, international applicants from all countries, and automatic consideration after an unconditional course offer. Selection is described only as based on academic achievement; no ATAR, WAM or GPA threshold is published in the page content, so min_gpa remains NULL. The page does not explicitly say whether the award is paid as a tuition waiver or cash/living stipend, so coverage_type is Unspecified and tuition_coverage/living_allowance remain empty. The older row's full-ride claim and invented GPA 3.6/IELTS 7.0 are removed. AUD award means amount_usd_value remains 0. PASS 94 FINALISATION (2026-10-26): an earlier same-day draft of this row cited a WAM-above-85 / no-minimum-ATAR metadata value; it was removed because it could not be re-verified from the official page content read in this pass.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 49;

-- 117 — Melbourne Research Scholarship, combined stipend + fee-offset route
-- (verified, reliability 10).
UPDATE scholarships SET
  title = 'Melbourne Research Scholarship (Stipend and Fee Offset)',
  website_url = 'https://scholarships.unimelb.edu.au/awards/melbourne-research-scholarship',
  source_url = 'https://scholarships.unimelb.edu.au/awards/melbourne-research-scholarship',
  application_url = NULL,
  award_amount = 41100,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Full Tuition + Stipend',
  tuition_coverage = 'Stipend-and-fee-offset route: full fee offset for up to 2 years of Masters by Research or 4 years of doctoral study; stipend route pays AUD 41,100/year at the 2027 full-time rate for up to 2 years MRes or 3.5 years doctoral study.',
  living_allowance = 41100,
  funding_type = 'Competitive graduate research scholarship; stipend and fee-offset variants',
  deadline = 'Automatic consideration for commencing graduate research applicants; no separate scholarship application. Apply for the research degree by the closing date for the chosen course. Current students and deferred applicants must follow faculty-specific scholarship rounds.',
  opening_date = NULL,
  deadline_date = NULL,
  deadline_type = 'automatic',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = '[]',
  recurrence = 'annual',
  application_status = 'open',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Eligible graduate research degrees (Masters by Research and doctoral programmes)"]$json$,
  eligible_countries = $json$["All countries"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-specific English score is stated; applicants must meet the English and academic entry requirements for the graduate research course.',
  required_documents = '[]',
  description = $desc$The University of Melbourne offers the Melbourne Research Scholarship to high-achieving domestic and international students who apply for or are enrolled in a graduate research degree. This row records the combined Stipend and Fee Offset route: full fee remission for up to two years for a Masters by Research or up to four years for a doctoral degree, plus a fortnightly stipend at the AUD 41,100 per year pro-rata 2027 full-time rate (up to two years MRes or 3.5 years PhD). The page lists 350 scholarships across its graduate research scholarship program. Eligible international students who require a visa receive single-membership Overseas Student Health Cover; students moving from outside Australia may receive a one-off AUD 3,000 relocation allowance (AUD 2,000 for interstate moves within Australia). The official page also offers a fee-offset-only route; not every recipient necessarily receives the stipend. For commencing applicants, scholarship consideration is automatic after submitting a graduate research course application by that course's closing date; there is no separate scholarship form. Selection ranks academic results and research potential. Current students and deferred offers must follow faculty-specific processes.$desc$,
  requirements = $req$Apply for and meet the entry requirements for a University of Melbourne graduate research degree, or already be enrolled in one. Selection is competitive and based on prior academic results and research potential. International and domestic students are eligible. The scholarship page publishes no universal numerical GPA or English-test threshold; course admission requirements apply. Commencing students are automatically considered when the course application is submitted; current students or deferred candidates follow faculty-specific scholarship processes.$req$,
  notes = $note$VERIFIED 2026-10-26 from the official University of Melbourne scholarship page https://scholarships.unimelb.edu.au/awards/melbourne-research-scholarship (fetched). The scheme offers both Fee Offset-only and Stipend-and-Fee-Offset variants; the active row is explicitly titled for the combined variant so the stipend rate does not imply every MRS recipient receives living support. Published stipend: AUD 41,100 per year at the 2027 full-time rate, tuition fee offset up to 2 years MRes/4 years doctoral, stipend up to 2 years MRes/3.5 years PhD, relocation allowance AUD 2,000 or AUD 3,000 depending on move, and single OSHC for eligible international visa holders. award_amount and living_allowance record the annual stipend only; relocation and fee offset are described separately. No scholarship-specific GPA/IELTS score is published; min_gpa and min_ielts remain NULL. amount_usd_value=0 because the award is paid in AUD.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 117;

-- 122 — University of Sydney International Stipend Scholarship (USYDIS)
-- (verified, reliability 10). The separate Sydney Tuition Fee Scholarship is
-- intentionally not merged into this stipend record.
UPDATE scholarships SET
  title = 'University of Sydney International Stipend Scholarship (USYDIS)',
  website_url = 'https://www.sydney.edu.au/scholarships/australian-government-research-training-program/rtp-international.html',
  source_url = 'https://www.sydney.edu.au/scholarships/australian-government-research-training-program/rtp-international.html',
  application_url = 'https://sydneyuniversity.formstack.com/forms/rtpapp',
  award_amount = 44293,
  award_currency = 'AUD',
  award_period = 'year',
  award_basis = 'fixed',
  amount_usd_value = 0,
  coverage_type = 'Living Stipend',
  tuition_coverage = NULL,
  living_allowance = 44293,
  funding_type = 'Competitive international HDR stipend scholarship; a separate tuition-fee scholarship is automatically awarded to USYDIS recipients',
  deadline = 'Next 2027 research-period round: 18 December 2026 (Research Periods 3 and 4, 2027). Earlier 2027 Research Periods 1 and 2 closed 11 September 2026. The following listed round is Research Periods 1 and 2, 2028, closing 10 September 2027.',
  opening_date = NULL,
  deadline_date = '2026-12-18',
  deadline_type = 'fixed',
  deadline_range_start = NULL,
  deadline_range_end = NULL,
  expected_opening_period = NULL,
  expected_deadline_period = NULL,
  rounds = $json$[{"period":"Research Periods 1 and 2, 2027","deadline":"2026-09-11","outcomes_from":"2026-11-10","finalized":"2026-12-17"},{"period":"Research Periods 3 and 4, 2027","deadline":"2026-12-18","outcomes_from":"2027-02-26","offshore_finalized":"2027-05-18","onshore_finalized":"2027-06-30"},{"period":"Research Periods 1 and 2, 2028","deadline":"2027-09-10","outcomes_from":"2027-11-16","finalized":"2027-12-20"}]$json$,
  recurrence = 'annual',
  application_status = 'open',
  degree_levels = $json$["Master's","PhD"]$json$,
  eligible_majors = $json$["Higher Degree by Research programmes across faculties; course and research area availability applies"]$json$,
  eligible_countries = $json$["All international"]$json$,
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = 'No scholarship-specific IELTS score is published on the RTP/USYDIS page; the English-language requirements of the selected Higher Degree by Research programme apply.',
  required_documents = $json$["Application for admission to a Higher Degree by Research and required admissions documents","RTP/USYDIS scholarship application form","Research experience evidence and appendix documents required by the University"]$json$,
  description = $desc$The University of Sydney International Stipend Scholarship (USYDIS) is a competitive stipend award for international commencing or enrolled Higher Degree by Research students with an outstanding academic record and previous research experience. The published 2027 stipend rate is AUD 44,293 per year (the 2026 rate was AUD 42,754), plus relocation and thesis allowances whose dollar values are not specified on the page. USYDIS itself is the stipend scholarship, not the tuition award. International students who receive USYDIS are automatically awarded the separate University of Sydney Tuition Fee Scholarship, which covers 100% of tuition fees for up to 14 research periods; that distinct award is not merged into this record. Application requires both HDR admission and a scholarship form by the relevant research-period deadline. The next listed 2027 round (Research Periods 3 and 4) closes 18 December 2026; earlier 2027 Research Periods 1 and 2 closed 11 September 2026. The 2028 Research Periods 1 and 2 round is listed for 10 September 2027. Preference may be given to PhD applicants without a previous Australian Government or University scholarship at the same study level.$desc$,
  requirements = $req$International student commencing or currently enrolled in a University of Sydney Higher Degree by Research. Applicants must have an outstanding academic record and previous research experience; selection is competitive. Apply for HDR admission with required supporting documents and submit the RTP/USYDIS scholarship application form by the deadline for the intended research period. Preference may be given to prospective PhD students who have not previously received an Australian Government or University scholarship for an HDR course at the same level. Course-level admission and English requirements apply.$req$,
  notes = $note$VERIFIED 2026-10-26 against the official University of Sydney international RTP page https://www.sydney.edu.au/scholarships/australian-government-research-training-program/rtp-international.html (fetched). The older USydIS detail URL now redirects to the RTP international page, which distinguishes the University of Sydney International Stipend Scholarship (USYDIS) from the separate University of Sydney Tuition Fee Scholarship. USYDIS publishes AUD 44,293 p.a. for the 2027 stipend rate (AUD 42,754 for 2026), plus relocation and thesis allowances with unspecified amounts. The separate tuition scholarship is automatically awarded to USYDIS recipients and covers 100% tuition for up to 14 research periods; it is intentionally not conflated with this stipend record and is not separately in the catalogue as of this pass. The current application schedule is by Research Period: the next 2027 round (Periods 3–4) closes 18 December 2026. Stored award_amount is the annual stipend only; amount_usd_value is 0 because it is paid in AUD. No numerical GPA or IELTS threshold is published; those remain NULL.$note$,
  verification_status = 'verified',
  source_reliability = 10,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = true
WHERE id = 122;

-- 123 — UNSW Scientia PhD Scholarship Scheme: retired from the international
-- catalogue. The current official 2027 project pool is domestic-only; this
-- does not mean the Scientia programme is discontinued (reliability 9).
UPDATE scholarships SET
  title = 'UNSW Scientia PhD Scholarship Scheme (retired for current international listing)',
  website_url = 'https://www.unsw.edu.au/research/hdr/find-a-project/scientia-phd-projects',
  source_url = 'https://www.unsw.edu.au/research/hdr/find-a-project/scientia-phd-projects',
  application_url = NULL,
  award_amount = NULL,
  award_currency = NULL,
  award_period = 'variable',
  award_basis = 'variable',
  amount_usd_value = 0,
  coverage_type = 'Unspecified',
  tuition_coverage = NULL,
  living_allowance = NULL,
  funding_type = 'Project-specific Scientia PhD scheme; current 2027 project pool is domestic-only',
  deadline = 'No general international deadline is published. The current 2027 Scientia PhD project page specifies domestic applicants; individual future projects may set their own eligibility and dates.',
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
  degree_levels = $json$["PhD"]$json$,
  eligible_majors = $json$["Scientia PhD project areas vary by round and approved supervisor"]$json$,
  eligible_countries = '[]',
  min_gpa = NULL,
  min_ielts = NULL,
  english_requirements = NULL,
  required_documents = '[]',
  description = $desc$UNSW's current Scientia PhD project page lists 20 fully funded projects for commencement in 2027 and explicitly describes the current pool as for domestic applicants. An official project notice for the Digital Eye project also specifies domestic applicants only. Because no current international/Uzbek-eligible Scientia project was confirmed, this record is retired from the international opportunity catalogue; this does not mean the Scientia programme has been permanently discontinued. Project-level awards, eligibility and deadlines vary by future round, and the general historical Scientia FAQ should not be used to infer eligibility for a specific call.$desc$,
  requirements = $req$For the current 2027 project pool, the official UNSW Scientia projects page specifies domestic applicants. No current international eligibility or application deadline is verified for this generic record; check each future project call directly.$req$,
  notes = $note$RETIRED 2026-10-26 (Australia research scholarship pass 94). The official UNSW Scientia PhD Projects page https://www.unsw.edu.au/research/hdr/find-a-project/scientia-phd-projects was fetched and labels the 2027 pool as domestic applicants, with 20 projects. The official Digital Eye PhD opportunity page also specifies domestic applicants only. An older official Scientia FAQ search result says domestic and international candidates were historically encouraged, but its direct URL currently redirects to an unrelated UNSW people-partnerships page; it does not override the eligibility published for the current project pool. This generic record is retired from the international catalogue because no current Uzbek-eligible project was verified. The previous university_scholarships association claimed an unverified USD 46,000/year package and was removed. Reassess when a future project call explicitly opens to international applicants.$note$,
  verification_status = 'verified',
  source_reliability = 9,
  last_verified_at = now(),
  last_updated_at = now(),
  is_active = false
WHERE id = 123;

-- Refresh the matching source registry records with the fetched official URLs.
UPDATE sources s SET url=v.url,title=v.title,domain=v.domain,source_type='scholarship',accessed_at='2026-10-26 00:00:00',is_official=true,is_verified=true
FROM (VALUES
 (2723,'https://www.monash.edu/study/fees-scholarships/scholarships/find-a-scholarship/international-merit-5770','Monash International Merit Scholarship — Official Source','www.monash.edu'),
 (2669,'https://scholarships.unimelb.edu.au/awards/melbourne-research-scholarship','Melbourne Research Scholarship — Official Source','scholarships.unimelb.edu.au'),
 (2624,'https://www.sydney.edu.au/scholarships/australian-government-research-training-program/rtp-international.html','University of Sydney RTP/USYDIS International Scholarships — Official Source','www.sydney.edu.au'),
 (2673,'https://www.unsw.edu.au/research/hdr/find-a-project/scientia-phd-projects','UNSW Scientia PhD Projects — Official Search Page','www.unsw.edu.au')
) AS v(id,url,title,domain)
WHERE s.id=v.id;

-- Remove the UNSW Scientia university association (it carried an unverified
-- generic package and the award is not currently open to international
-- applicants); the verified associations for 49/117/122 are retained.
-- The individual scholarship_sources records are preserved for audit.
DELETE FROM university_scholarships
WHERE scholarship_id = 123;

-- Hard check:
-- SELECT id,title,is_active,source_reliability,award_amount,award_currency,deadline_date,deadline_type
-- FROM scholarships WHERE id IN (49,117,122,123) ORDER BY id;
-- SELECT COUNT(*) FILTER (WHERE is_active) AS active,
--        COUNT(*) FILTER (WHERE NOT is_active) AS retired,
--        COUNT(*) FILTER (WHERE is_active AND source_reliability=4) AS reliability_4,
--        COUNT(*) FILTER (WHERE is_active AND deadline_date > CURRENT_DATE) AS future_deadlines
-- FROM scholarships;
-- ============================================================================
