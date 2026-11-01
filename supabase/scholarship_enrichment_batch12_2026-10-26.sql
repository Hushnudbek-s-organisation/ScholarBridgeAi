-- ScholarBridge AI - Enrichment Batch 12 - 2026-10-26
-- Added 949 (SNU President Fellowship, rel 10), 950 (SNU GSFS, rel 9) and
-- 951 (POSTECH Ruth L. Satter Scholarship, rel 9), each verified from
-- official pages fetched 2026-10-26. New sources 3088 (OGA SPF Program
-- page) and 3089 (OGA GSFS page); record 951 reuses existing source 2594
-- (POSTECH financial-aid page). university_scholarships rows 679 (SNU/949),
-- 680 (SNU/950), 681 (POSTECH/951).
-- NOTE ON IDS: the three scholarship INSERTs ran in parallel with
-- RETURNING and completed in the order SPF (949), GSFS (950), Satter (951);
-- ids 948, 3086 and 3087 were skipped by the sequences. The mapping below
-- is pinned from those RETURNING results.
-- Rejected after audit (not inserted): POSCO Global Scholarship (TJ Park
-- Foundation designated nationalities - Uzbekistan unconfirmed from any
-- official list) and K-GKS Gyeongsangbuk-do (3-year regional residence
-- condition; GKS itself is record 843).
-- Statements below replay the exact executed SQL with ids pinned.
-- See docs/SCHOLARSHIP_ENRICHMENT_BATCH_12_2026-10-26.md.

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
  949,
  'SNU President Fellowship (SPF)',
  'Seoul National University (Office of Global Affairs)',
  'South Korea', 'Full Tuition + Stipend + Airfare', 0,
  'Apply during the SNU international Ph.D. admission period each semester (check the SPF box in the online admission application); the Office of Global Affairs publishes the exact deadlines and application forms each semester.',
  NULL, 'not_published', NULL, NULL,
  $j$["PhD"]$j$,
  $j$["All"]$j$,
  $j$["Developing countries - faculty members of major universities, with priority to Asia (including Central Asia), Africa and South America"]$j$,
  NULL, NULL, false, true,
  $desc$Launched by Seoul National University in 2014 as part of its global social responsibility, the SNU President Fellowship (SPF) gives faculty members of major universities in developing countries who do not yet hold a Ph.D. the chance to complete a doctorate at SNU: the university takes approximately eight fellows each semester (61 fellows had been selected by 2021, notably from Vietnam, Mongolia and Myanmar). The fellowship waives the full tuition for up to six semesters, pays a monthly stipend of KRW 1,500,000~2,000,000 for three to four years, provides one economy round-trip airfare, Korean language evening classes at the SNU Language Education Institute and National Health Insurance coverage. Candidates apply online by checking the SPF box in the SNU Ph.D. admission application and submitting the fellowship documents to the Office of Global Affairs; after a document screening, short-listed admitted candidates are interviewed by the SPF Selection Committee before final results are announced.$desc$,
  $req$An applicant must meet BOTH conditions: be a faculty member of a major university in a developing country (Asia, Africa, South America etc.) who does not hold a Ph.D. degree, AND be a newly admitted student to SNU as a Ph.D. student in the application period. Priority is given to faculty members from SNU partner universities in those regions, and while any research area may apply, selection priority goes to applicants doing exceptional work in engineering, medicine, public health, agriculture, development studies and Korean studies. No numeric GPA or IELTS cutoff for the fellowship is published on the official pages, so min_gpa/min_ielts are not recorded.$req$,
  'https://oga.snu.ac.kr/spf-program/', 'https://oga.snu.ac.kr/spf-program/', 'https://oga.snu.ac.kr/spf-program/',
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 12) from two official SNU pages fetched the same day: the Office of Global Affairs' SPF Program page (eligibility - faculty member of a major university in Asia/Africa/South America without a Ph.D. and newly admitted as an SNU Ph.D. student; partner-university and priority-field preferences; full tuition waiver up to six semesters; KRW 1,500,000~2,000,000 monthly stipend for 3~4 years; round-trip airfare; Korean evening class; national health insurance; the seven-step application timeline; 2014 launch and recipient statistics) and the Admissions graduate-scholarships page (approximately 8 recipients each semester; application during the international admission period with the checkbox workflow). Uzbek eligibility: Uzbekistan is an Asian developing country, so its university faculty are squarely inside the announced frame. award_amount is NULL with basis 'range': the stipend is published as a KRW 1,500,000-2,000,000 monthly range. deadline_date NULL/'not_published' (admission-linked each semester) with the pattern in rounds; status 'upcoming'. This record fills one of the real schemes that retired composite record 135 ('SNU Global Scholarship and President Fellowship') had conflated. Linked to Seoul National University (university_id 29) with a university_scholarships row; source is the OGA SPF Program page. min_gpa/min_ielts NULL.$note$,
  29,
  NULL, NULL, 'month', 'range', NULL,
  'Full tuition waiver (up to 6 semesters) + monthly stipend of KRW 1,500,000-2,000,000 for 3-4 years + round-trip airfare + Korean evening classes + National Health Insurance',
  'Full tuition exemption for a maximum of six semesters of the Ph.D.',
  'No English-test cutoff is published for the fellowship itself; SNU Ph.D. admission requirements apply, and the package includes Korean evening classes at the SNU Language Education Institute.',
  $j$["SNU online Ph.D. admission application with the SPF application box checked","SPF application documents submitted to the SNU Office of Global Affairs (scanned PDFs and original documents, via the affiliated college)","Personal statement and study plan","Recommendation letters"]$j$,
  NULL, NULL,
  $json$[{"pattern":"Every semester during the SNU international admission period: check the SPF box in the online admission application, then submit SPF documents to the Office of Global Affairs; after document screening, short-listed admitted candidates are interviewed by the SPF Selection Committee"}]$json$
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
  950,
  'Graduate Scholarship for Excellent Foreign Students (GSFS)',
  'Seoul National University',
  'South Korea', 'Full Tuition + Living Expenses', 0,
  'Apply online during the SNU international graduate admission period every semester; the designated departments participating in the GSFS Program are announced in the guide sent out each semester by the SNU Office of Global Affairs.',
  NULL, 'not_published', NULL, NULL,
  $j$["Master's","PhD"]$j$,
  $j$["All"]$j$,
  $j$["Graduates of universities in East, Southeast and Central Asia (students in China and Japan are not eligible); Uzbekistan is in Central Asia and has been named in SNU's official GSFS guides"]$j$,
  NULL, NULL, false, true,
  $desc$The Graduate Scholarship for Excellent Foreign Students (GSFS) is Seoul National University's flagship graduate scholarship for excellent newly admitted students from universities in East, Southeast and Central Asia (students in China and Japan are not eligible): about 20 new graduate students are selected each semester for the departments designated as participating in the GSFS Program for that semester. It exempts the full tuition fee for up to four semesters and pays living expenses of KRW 500,000 per month (the Admissions page states this as a minimum); the amount of living expenses and the duration of the award may vary depending on the individual colleges. The scholarship is renewable up to a maximum of four semesters provided the recipient maintains a minimum term GPA of 3.0 and a cumulative GPA of 3.0 at the end of each semester. Selection is made by the respective Colleges/Schools based on the admission documents, and applicants apply online during the international admission application period.$desc$,
  $req$Applicants must be non-Korean newly admitted graduate students (Master's, combined Master's & Doctoral or Doctoral) who are graduates of universities in East, Southeast or Central Asia - graduates in China and Japan are not eligible - and who applied to a college/school department designated as participating in the GSFS Program for that semester; SNU's official Spring 2026 guide adds that applicants and both parents must be non-Korean and that the entire prior education must have been completed outside Korea. Selection weighs the overall academic trajectory and potential, transcripts and grades, the study plan and the personal statement. The 3.0 GPA figures on the official page are renewal conditions, not entry cutoffs, and no entry IELTS figure is published, so min_gpa/min_ielts are not recorded.$req$,
  'https://oga.snu.ac.kr/scholarship/graduate-scholarship-for-excellent-foreign-students-gsfs/', 'https://oga.snu.ac.kr/scholarship/graduate-scholarship-for-excellent-foreign-students-gsfs/', 'https://oga.snu.ac.kr/scholarship/graduate-scholarship-for-excellent-foreign-students-gsfs/',
  'annual', 'upcoming', 'verified', 9, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 12) from the SNU Office of Global Affairs' official GSFS page fetched the same day (eligibility framed as graduates from East, Southeast and Central Asia with China and Japan excluded; about 20 new graduate students; full tuition fee for a maximum of four semesters; living expenses of KRW 500,000 monthly with college-level variation noted; GPA 3.0 term/cumulative renewal rules) and corroborated by the Admissions graduate-scholarships page (minimum KRW 500,000 per month, differing by major; checkbox application; selection by Colleges/Schools) and SNU's official Spring 2026 GSFS guide (eligibility criteria a-d; priority to applicants not holding nationalities on its wealthy-countries list). Uzbek eligibility: Uzbekistan is in Central Asia and is explicitly named in the Eligible Countries list of SNU's official Fall 2020 GSFS guide; it does not appear on the Spring 2026 de-prioritised list. Reliability 9 (not 10): the designated participating departments - and the exact eligible-country framing - are re-announced each semester in the OGA guide, so applicants must confirm their department for the target semester. award_amount is NULL (variable): the monthly living allowance is stated as a minimum and varies by college/major. deadline_date NULL/'not_published' (admission-linked each semester) with the pattern in rounds; status 'upcoming'. This record fills one of the real schemes behind retired composite record 135. Linked to Seoul National University (university_id 29) with a university_scholarships row; source is the OGA GSFS page. min_gpa/min_ielts NULL.$note$,
  29,
  NULL, NULL, 'month', 'variable', NULL,
  'Full tuition exemption (up to 4 semesters) + living expenses of KRW 500,000/month minimum (varies by college/major)',
  'Full tuition fee exemption for a maximum of four semesters, renewable subject to a minimum term GPA of 3.0 and a cumulative GPA of 3.0 at the end of each semester.',
  'No English-test cutoff is published for the scholarship itself; SNU graduate admission requirements apply.',
  $j$["SNU online graduate admission application (GSFS is applied for during the international admission application period)","Admission documents assessed by the admitting College/School - transcripts and grades, study plan and personal statement","Proof of non-Korean nationality of the applicant and both parents (per the GSFS guide)"]$j$,
  NULL, NULL,
  $json$[{"pattern":"Every semester during the SNU international graduate admission period; apply to a department designated as GSFS-participating for that semester (announced in the OGA guide) - selection by the College/School on the admission documents"}]$json$
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
  951,
  'POSTECH Ruth L. Satter Scholarship',
  'Pohang University of Science and Technology (POSTECH)',
  'South Korea', 'Living-expenses grant', 0,
  'No separate application round is published: the scholarship is for newly admitted students and is administered by POSTECH Student Affairs (student-affairs@postech.ac.kr) - enquire at graduate admission.',
  NULL, 'not_published', NULL, NULL,
  $j$["Master's","PhD"]$j$,
  $j$["All"]$j$,
  $j$["Female students from Asian countries (POSTECH does not publish a named country list)"]$j$,
  NULL, NULL, false, true,
  $desc$The Ruth L. Satter Scholarship is POSTECH's endowed award for newly admitted Asian female international graduate students, administered through POSTECH Student Affairs and listed in the university's graduate financial-aid table (as of February 2026). Three recipients are selected per year, and each receives KRW 5,000,000 per year - for one year for Master's students and for two years for doctoral and integrated-course students. As an internal fellowship it sits alongside POSTECH's standard graduate support (the monthly TA/RA scholarship that covers tuition and living allowance through the department/laboratory), and POSTECH's general financial-aid rules allow duplicated benefits from internal and external scholarships where the other funder's policy permits.$desc$,
  $req$Open to newly admitted Asian female international graduate students at POSTECH (Master's, doctoral and integrated courses); three recipients are selected per year by POSTECH Student Affairs. The official financial-aid table publishes no entry GPA or IELTS cutoff for this scholarship, so min_gpa/min_ielts are not recorded.$req$,
  'https://adm-g.postech.ac.kr/ENG/graduate-info/support-policy/', 'https://adm-g.postech.ac.kr/ENG/graduate-info/support-policy/', 'https://adm-g.postech.ac.kr/ENG/graduate-info/support-policy/',
  'annual', 'upcoming', 'verified', 9, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 12) from POSTECH Graduate Admissions' official Financial Aid (Graduate) page fetched the same day: the fellowships table (as of 03 Feb 2026) lists the Ruth L. Satter Scholarship with POSTECH Student Affairs as the granting office, eligibility 'newly admitted Asian female international graduate student', three selected per year, and the benefit of KRW 5,000,000/year for one year (Master's) or two years (Doctoral/Integrated). Reliability 9: the scheme is documented by a single - though current - table row and applications/enquiries run through Student Affairs email rather than a published round. award_amount 5000000 KRW/year with basis 'fixed' (the single published figure; the 1- vs 2-year duration lives in funding_type). amount_usd_value 0 per the non-USD convention. deadline_date NULL/'not_published' (admission-linked) with the pattern in rounds; status 'upcoming'. Uzbekistan is an Asian country, so Uzbek female applicants are inside the announced frame (no named country list is published). In the same audit the POSCO Global Scholarship from the same table was NOT added: it is restricted to nationalities designated by the POSCO TJ Park Foundation and Uzbek eligibility could not be confirmed from an official source. Linked to POSTECH (university_id 87) with a university_scholarships row; source is the POSTECH financial-aid page (shared with record 453). min_gpa/min_ielts NULL.$note$,
  87,
  5000000, 'KRW', 'year', 'fixed', NULL,
  'KRW 5,000,000 per year - 1 year for Master''s students, 2 years for doctoral/integrated students (3 recipients per year)',
  'A fixed grant of KRW 5,000,000 per year; it does not separately waive tuition - POSTECH graduate tuition support is normally provided through the monthly TA/RA scholarship (see record 453).',
  'English requirements are those of POSTECH graduate admission; no separate IELTS cutoff is published for this scholarship.',
  $j$["POSTECH graduate admission application","Enquiry/selection via POSTECH Student Affairs (student-affairs@postech.ac.kr)"]$j$,
  NULL, NULL,
  $json$[{"pattern":"Awarded to newly admitted Asian female international graduate students; administered by POSTECH Student Affairs - no separate public round is published"}]$json$
);

INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3088, 'https://oga.snu.ac.kr/spf-program/', 'SNU President Fellowship (SPF) Program - SNU Office of Global Affairs', 'oga.snu.ac.kr', 'scholarship', now(), true, true, now()),
(3089, 'https://oga.snu.ac.kr/scholarship/graduate-scholarship-for-excellent-foreign-students-gsfs/', 'Graduate Scholarship for Excellent Foreign Students (GSFS) - SNU Office of Global Affairs', 'oga.snu.ac.kr', 'scholarship', now(), true, true, now());
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES (949, 3088), (950, 3089), (951, 2594);
INSERT INTO university_scholarships (id, university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, official_url, source_url, verification_status, last_verified_at) VALUES
(679, 29, 949, 'SNU President Fellowship (SPF)', 'available', 'Full tuition waiver + monthly stipend + airfare + insurance', 'Full tuition waiver up to 6 semesters + stipend of KRW 1,500,000-2,000,000/month for 3-4 years + round-trip airfare', true, true, 'https://oga.snu.ac.kr/spf-program/', 'https://oga.snu.ac.kr/spf-program/', 'verified', now()),
(680, 29, 950, 'Graduate Scholarship for Excellent Foreign Students (GSFS)', 'available', 'Full tuition exemption + monthly living expenses', 'Full tuition exemption up to 4 semesters + living expenses of at least KRW 500,000/month', true, true, 'https://oga.snu.ac.kr/scholarship/graduate-scholarship-for-excellent-foreign-students-gsfs/', 'https://oga.snu.ac.kr/scholarship/graduate-scholarship-for-excellent-foreign-students-gsfs/', 'verified', now()),
(681, 87, 951, 'POSTECH Ruth L. Satter Scholarship', 'available', 'Fixed yearly grant for newly admitted Asian female graduate students', 'KRW 5,000,000/year (1 year Master''s, 2 years doctoral/integrated; 3 recipients per year)', false, true, 'https://adm-g.postech.ac.kr/ENG/graduate-info/support-policy/', 'https://adm-g.postech.ac.kr/ENG/graduate-info/support-policy/', 'verified', now());
SELECT setval('scholarships_id_seq', GREATEST((SELECT MAX(id) FROM scholarships), 951), true);
SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 3089), true);
SELECT setval('university_scholarships_id_seq', GREATEST((SELECT MAX(id) FROM university_scholarships), 681), true);
