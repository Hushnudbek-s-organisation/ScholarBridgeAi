-- ScholarBridge AI - Enrichment Batch 13 - 2026-10-27
-- Added 952 (Hanyang Scholarship for Excellence in Language Proficiency,
-- rel 9) and 953 (Hanyang Scholarship for Engineering and Science Students,
-- rel 9) from Hanyang OIA's official 2024 Spring admission guideline
-- (read in pass 105, re-read 2026-10-27); both link to the shared
-- guideline source 2534 and carry university_scholarships rows 682/683.
-- NOTE ON IDS: the two INSERTs ran in parallel with RETURNING and
-- completed in the opposite order to submission - 952 is the Language
-- Proficiency scholarship and 953 the Engineering & Science one; the
-- mapping below is pinned from those RETURNING results and re-verified.
-- ETH ESOP was found ALREADY catalogued twice, so nothing was added for
-- it: record 13 (rel 10) was re-verified against the official ETH page
-- (touch-up only) and duplicate record 26 (rel 9) was retired with its
-- university_scholarships row 494 withdrawn; source 2519 was repointed
-- to the canonical ETH ESOP page (exclusive, collision-checked).
-- Caution for replays: scholarships.deadline_type is NOT NULL - the
-- retirement UPDATE for 26 must not null it (first attempt failed 23502).
-- Statements below replay the exact executed SQL with ids pinned.
-- See docs/SCHOLARSHIP_ENRICHMENT_BATCH_13_2026-10-27.md.

-- 13: ESOP touch-up (already verified 2026-10-26; re-fetched 2026-10-27)
UPDATE scholarships SET eligible_majors = $j$["All"]$j$, eligible_countries = '[]', rounds = $json$[{"cycle":"HS27 entry (Autumn 2027)","window":"2026-11-01 to 2026-11-30","status":"upcoming"},{"pattern":"First application window each year, 1-30 November (11.59 pm CET), via eApply; about 60 scholarships; decisions communicated end of March"}]$json$, notes = notes || $note$ RE-VERIFIED AGAIN 2026-10-27 (enrichment batch 13 dedupe): the same official ETH page was re-fetched and agrees with the stored terms (CHF 12,000 per semester rising to CHF 13,500 from HS27, tuition fee waiver, 1-30 November 2026 window for the HS27 start, about 60 scholarships for 2027/28, decisions end of March, top-10%/grade-A bachelor requirement, pre-proposal and February interview). The per-semester payment is deliberately kept out of award_amount (no 'semester' unit exists in award_period) and stated in the text, as this row already documented. Duplicate record 26 ('ETH Zurich Excellence Scholarship (ESOP)', rel 9) was retired as a duplicate of this record with its university_scholarships row 494 withdrawn; eligible_majors/eligible_countries tokens were normalised to the catalogue conventions and the HS27 window was added to rounds. Source 2519 repointed to this canonical page.$note$, last_verified_at = now(), last_updated_at = now() WHERE id = 13;

-- 26: retired as a duplicate of record 13
UPDATE scholarships SET is_active = false, application_status = 'closed', award_amount = NULL, award_currency = NULL, award_period = NULL, award_basis = NULL, living_allowance = NULL, funding_type = NULL, tuition_coverage = NULL, english_requirements = NULL, required_documents = NULL, expected_opening_period = NULL, expected_deadline_period = NULL, rounds = NULL, notes = $note$Retired on 2026-10-27 as a DUPLICATE of record 13 ('ETH Zurich Excellence Scholarship & Opportunity Programme (ESOP)'): both active rows described the single ETH Excellence Scholarship & Opportunity Programme from the same official ETH page - record 13 carries the scheme's exact official name and was re-verified against that page on 2026-10-26/27 (CHF 12,000 per semester rising to CHF 13,500 from the autumn semester 2027, tuition fee waiver, first application window 1-30 November 2026 for the HS27 start, about 60 scholarships, decisions end of March), so this rel-9 duplicate is retired and discovery should use record 13. Kept for audit only. university_scholarships row 494 withdrawn; source 2520 (secondary ETH scholarships page) left in place for audit. A third variant, record 111, was already retired earlier.$note$, last_updated_at = now() WHERE id = 26;

INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  952,
  'Hanyang Scholarship for Excellence in Language Proficiency',
  'Hanyang University',
  'South Korea', 'Tuition Waiver', 0,
  'No separate application or deadline: recipients are selected during the international admission process (Spring and Fall intakes) from the language scores submitted in the official application period.',
  NULL, 'not_published', NULL, NULL,
  $j$["Master's","PhD"]$j$,
  $j$["All"]$j$,
  '[]',
  NULL, NULL, false, true,
  $desc$The Hanyang Scholarship for Excellence in Language Proficiency (Graduate) is a first-semester tuition incentive for newly admitted international graduate students who bring strong, certified language scores to Hanyang University: applicants who have passed TOPIK level 5 or 6, or achieved a TOEFL iBT score of 90 or higher or an IELTS score of 6.5 or higher, receive a 30% reduction in tuition for the first semester. Only documents submitted during the official application period are acceptable, and the English scores are not applicable to native speakers of English. Selection takes place automatically during admission screening, and - as with Hanyang's other newcomer awards - the scholarship cannot be received together with another on-campus scholarship such as HISP.$desc$,
  $req$Open to newly admitted international graduate students at Hanyang University whose official-application-period documents evidence TOPIK level 5 or 6, TOEFL iBT 90 or higher, or IELTS 6.5 or higher (TOEFL/IELTS are not applicable to native speakers of English). Because the qualification can be met by any one of three alternative tests, no single scale-unambiguous IELTS figure is stored - min_ielts is NULL and the three thresholds are recorded here; there is no GPA condition, so min_gpa is also NULL.$req$,
  'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf',
  'annual', 'upcoming', 'verified', 9, true,
  now(), now(),
  $note$ADDED 2026-10-27 (enrichment batch 13) from Hanyang OIA's official 2024 Spring Admission Guideline for International Students (Graduate), section 08, read first-hand in cleanup pass 105 and re-read on 2026-10-27: 'Hanyang Scholarship for Excellence in Language Proficiency - Graduate, awarded to applicants who have passed the TOPIK level 5 or 6, or achieved a TOEFL iBT score of 90 or higher or IELTS score of 6.5 or higher (only documents submitted during the official application period are acceptable); benefit 30% reduction in tuition; period the first semester only; TOEFL and IELTS scores are not applicable to native speakers of English; selected during the admission process'. Identical terms recur in Hanyang's official 2024 Fall guideline, and the English-language variant (TOEFL 90+/IELTS 6.5+, 30% first semester) is still listed in Hanyang's current 2026-facing scholarship summaries. Reliability 9 (not 10): the guideline is re-issued each semester, so terms should be re-confirmed against the current-semester guideline. This record covers the graduate scheme named in the guideline; degree_levels accordingly Master/PhD. award_amount NULL with award_currency KRW and period/basis 'variable' (a percentage waiver stores no money amount; same convention as records 452 and 851). deadline_date NULL/'not_published' (admission-linked) with the pattern in rounds; status 'upcoming'. min_gpa/min_ielts NULL (three alternative language tests). Linked to Hanyang University (university_id 134) and to the shared guideline source 2534.$note$,
  134,
  NULL, 'KRW', 'variable', 'variable', NULL,
  'Merit-based tuition waiver',
  '30% reduction in tuition for the first semester only.',
  'The scholarship is itself a language award: TOPIK level 5 or 6, or TOEFL iBT 90 or higher, or IELTS 6.5 or higher (TOEFL/IELTS not applicable to native English speakers). Separately, a Korean proficiency standard (TOPIK Level 4 or above or equivalent) governs starting the degree programme, with exemptions for English-track majors and supervisor exemption letters.',
  $j$["Hanyang international graduate admission application (selection during admission screening - no separate application)","Official language score submitted during the official application period: TOPIK level 5/6 certificate, TOEFL iBT 90+ or IELTS 6.5+","Diplomas and academic transcripts, apostille or consular verified where required"]$j$,
  NULL, NULL,
  $json$[{"pattern":"Spring (March) and Fall (September) intakes; awarded automatically at admission from scores submitted in the official application period"}]$json$
);

INSERT INTO scholarships (
  id, title, provider, country, coverage_type, amount_usd_value,
  deadline, deadline_date, deadline_type, deadline_range_start, deadline_range_end,
  degree_levels, eligible_majors, eligible_countries, min_gpa, min_ielts,
  financial_need_based, merit_based,
  description, requirements, website_url, source_url, application_url,
  recurrence, application_status, verification_status, source_reliability, is_active,
  last_verified_at, last_updated_at, notes, university_id,
  award_amount, award_currency, award_period, award_basis, living_allowance, funding_type, tuition_coverage,
  english_requirements, required_documents,
  expected_opening_period, expected_deadline_period, rounds
) VALUES (
  953,
  'Hanyang Scholarship for Engineering and Science Students',
  'Hanyang University',
  'South Korea', 'Tuition Waiver', 0,
  'No separate application or deadline: recipients are selected during the international admission process (Spring and Fall intakes); only documents submitted in the official application period are considered.',
  NULL, 'not_published', NULL, NULL,
  $j$["Master's","PhD"]$j$,
  $j$["Graduate programmes in engineering and natural sciences"]$j$,
  '[]',
  NULL, NULL, false, true,
  $desc$The Hanyang Scholarship for Engineering and Science Students is Hanyang University's long-standing graduate-school incentive for international students admitted to its graduate programmes in engineering and science. It waives 50% of tuition and 50% of the admission fees for up to four semesters (Master's), four semesters (Ph.D.) or six semesters (combined MA-Ph.D.) - excluding extended study periods and research-registration semesters - provided the recipient achieves a minimum GPA of 3.0 each semester. Recipients are selected during the admission process itself (the guideline even notes that applicants do not need to submit a letter of recommendation for this award), and like Hanyang's other newcomer scholarships it cannot be received together with another on-campus scholarship, so it does not stack with the flagship HISP merit waiver.$desc$,
  $req$Open to international students who gain admission to a Hanyang University graduate school engineering or science programme (Master's, Ph.D. or combined MA-Ph.D.); selection happens during admission screening without a separate application, and only documents submitted during the official application period are eligible for consideration. Retention requires a minimum GPA of 3.0 each semester - a continuation rule rather than an entry cutoff - and the scheme publishes no IELTS figure, so min_gpa/min_ielts are not recorded.$req$,
  'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf',
  'annual', 'upcoming', 'verified', 9, true,
  now(), now(),
  $note$ADDED 2026-10-27 (enrichment batch 13) from Hanyang OIA's official 2024 Spring Admission Guideline for International Students (Graduate), whose section 08 'Scholarships for International Students' was read first-hand in cleanup pass 105 and re-read on 2026-10-27: 'awarded to international students who gain admission to the graduate school of engineering and science (no letter of recommendation needed); benefit 50% reduction in tuition and 50% reduction in admission fees; period Master 4 / Ph.D 4 / MA-Ph.D 6 semesters excluding extended study and research registration; retention minimum 3.0 GPA each semester; selected during the admission process; only documents submitted during the official application period are eligible; cannot be combined with other on-campus scholarships'. The same terms appear in Hanyang's official 2024 Fall guideline and in the university's March 2025 undergraduate/graduate flyer. Reliability 9 (not 10): Hanyang re-issues the admission guideline each semester, so terms should be re-confirmed against the current-semester guideline. award_amount NULL with award_currency KRW and period/basis 'variable' (a percentage waiver stores no money amount; same convention as records 452 and 851). deadline_date NULL/'not_published' (admission-linked) with the pattern in rounds; status 'upcoming'. Companion record to the HISP waiver (record 452), with which it cannot be combined; linked to Hanyang University (university_id 134) and to the shared guideline source 2534. min_gpa/min_ielts NULL.$note$,
  134,
  NULL, 'KRW', 'variable', 'variable', NULL,
  'Merit-based tuition waiver',
  '50% reduction in tuition and 50% reduction in admission fees for Master 4, Ph.D 4 or MA-Ph.D 6 semesters (excluding extended study period and research registration), subject to a minimum 3.0 GPA each semester.',
  'A Korean proficiency standard (TOPIK Level 4 or above, Hanyang IIE Level 4, TOPIK Speaking Level 4 or TOPIK iBT Level 4) must be satisfied to begin the degree programme - accepted students below it take a leave of absence first, with exemptions (e.g. English-track majors, supervisor exemption letters); the scholarship itself sets no IELTS cutoff.',
  $j$["Hanyang international graduate admission application (scholarship selection takes place during admission screening; no recommendation letter is required for this award)","Diplomas and academic transcripts, apostille or consular verified where required"]$j$,
  NULL, NULL,
  $json$[{"pattern":"Spring (March) and Fall (September) intakes; recipients selected during the admission process - no separate application"}]$json$
);

UPDATE sources SET url = 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html', title = 'Excellence Scholarship & Opportunity Programme (ESOP) - ETH Zurich', domain = 'ethz.ch', accessed_at = now(), is_verified = true WHERE id = 2519;
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES (952, 2534), (953, 2534);
UPDATE university_scholarships SET funding_type = CASE id WHEN 7 THEN 'Scholarship covering living and study costs + tuition fee waiver + ETH Foundation mentorship' WHEN 494 THEN 'Retired duplicate of scholarship 13 (2026-10-27)' ELSE funding_type END, max_scholarship = CASE id WHEN 7 THEN 'CHF 13,500 per semester from HS27 (CHF 12,000 before) + full tuition fee waiver for the regular duration (3-4 semesters)' WHEN 494 THEN 'Duplicate of the single ETH ESOP scheme - see scholarship 13' ELSE max_scholarship END, covers_tuition = CASE id WHEN 7 THEN true ELSE covers_tuition END, covers_living_expenses = CASE id WHEN 7 THEN true ELSE covers_living_expenses END, official_url = CASE id WHEN 7 THEN 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html' ELSE official_url END, source_url = CASE id WHEN 7 THEN 'https://ethz.ch/students/en/studies/financial/scholarships/excellencescholarship.html' ELSE source_url END, availability_status = CASE WHEN id = 494 THEN 'No' ELSE availability_status END, verification_status = CASE WHEN id = 494 THEN 'withdrawn' ELSE 'verified' END, last_verified_at = now() WHERE id IN (7,494);
INSERT INTO university_scholarships (id, university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, official_url, source_url, verification_status, last_verified_at) VALUES
(682, 134, 952, 'Hanyang Scholarship for Excellence in Language Proficiency', 'available', 'Merit-based tuition waiver (first semester)', '30% reduction in tuition for the first semester (TOPIK 5/6, TOEFL iBT 90+ or IELTS 6.5+)', true, false, 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'verified', now()),
(683, 134, 953, 'Hanyang Scholarship for Engineering and Science Students', 'available', 'Merit-based tuition waiver', '50% reduction in tuition and 50% in admission fees (Master/PhD 4 semesters, MA-PhD 6; retention GPA 3.0)', true, false, 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'https://oia.hanyang.ac.kr/files/attach/filebox/2024/01/2024-1_graduate_en.pdf', 'verified', now());
SELECT setval('scholarships_id_seq', GREATEST((SELECT MAX(id) FROM scholarships), 953), true);
SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 3089), true);
SELECT setval('university_scholarships_id_seq', GREATEST((SELECT MAX(id) FROM university_scholarships), 683), true);
