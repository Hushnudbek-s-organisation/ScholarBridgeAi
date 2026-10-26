-- Scholarship Enrichment Batch 10 — replay SQL (2026-10-26)
-- Adds scholarships 943-945, sources 3081-3083, scholarship_sources links,
-- and university_scholarships rows 676-678. See
-- docs/SCHOLARSHIP_ENRICHMENT_BATCH_10_2026-10-26.md for the audit trail.
-- All content verified first-hand on official pages fetched 2026-10-26.
-- NOTE on ids: the three scholarship inserts were executed without explicit
-- ids and returned in completion order; INSERT ... RETURNING id, title (and
-- a verification SELECT) fixed the true mapping:
--   943 = Nanjing Municipal Government Scholarship at Nanjing University
--   944 = University of Ottawa International Doctoral Scholarship
--   945 = Peking University Scholarship for International Students
-- Statements below pin the assigned ids and end with sequence guards.
-- Target source URLs were pre-checked against idx_sources_url (none
-- existed). No candidate was rejected in this batch.

-- ---------------------------------------------------------------------------
-- 943: Nanjing Municipal Government Scholarship at Nanjing University
-- ---------------------------------------------------------------------------
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
  943,
  'Nanjing Municipal Government Scholarship at Nanjing University',
  'Nanjing Municipal Government, administered by Nanjing University (Institute for International Students)',
  'China', 'Annual Grant', 0,
  $dl$Annual Nanjing University selection. In the 2026 notice the application window was 24-28 August 2026 (closed): applicants send one merged PDF of the required documents by email (nanjingszf@163.com) using the prescribed file and email naming formats. The next window will be set by the following year's NJU selection notice.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["All full-time Bachelor's, Master's and Doctoral programmes at Nanjing University (the city scheme also operates at other Nanjing universities; this record covers the Nanjing University selection)"]$json$,
  $json$["All countries - foreign-nationality students studying full-time at Nanjing University (newly admitted and currently enrolled students may both apply)"]$json$, NULL, NULL,
  false, true,
  $desc$The Nanjing Municipal Government Scholarship for International Students was established by the Nanjing municipal government in 2013 to attract and encourage more outstanding foreign students to study and conduct research at universities in Nanjing. At Nanjing University the annual selection (run by the Institute for International Students) offers one-academic-year grants of RMB 10,000 to undergraduates and RMB 20,000 to graduate (master's and doctoral) students - 20 places at each level in the 2026 selection, with final quotas adjustable within an unchanged total budget. Both newly admitted and currently enrolled full-time foreign students in bachelor's, master's or doctoral programmes may apply, provided they hold no other Chinese government-level or university scholarship at the same time. The award runs for one academic year only and is cancelled if the holder withdraws or is disciplined for violating laws or regulations; holders may compete again in later years (previous winners may not reuse the previous year's achievement materials). Selection weighs academic record and overall quality - current undergraduates need an average GPA of at least 4.3 in liberal-arts subjects or 3.8 in science subjects (NJU scale) with no failed courses after at least one full academic year enrolled, while current graduate students need strong research ability, a passed mid-term assessment and excellent results, with a departmental recommendation in both cases; under equal conditions, new students and applicants with outstanding overall performance or contributions to Chinese society or the university are prioritised. Applications are screened by the responsible department, reviewed by experts and publicly announced.$desc$,
  $req$Be a foreign-nationality student in a full-time bachelor's, master's or doctoral programme at Nanjing University (newly admitted for the coming autumn or currently enrolled), friendly towards China, in good health and compliant with Chinese laws and university rules, and hold no other Chinese government or university scholarship concurrently. New students: meet NJU's international admission requirements with good overall quality, and pass the comprehensive selection. Current students: be enrolled for at least one full academic year (not on leave or extension), with no legal or disciplinary violations; undergraduates need an average GPA of at least 4.3 (liberal arts) or 3.8 (sciences) on the NJU scale with no failed subjects; graduate students need strong research ability, a passed mid-term assessment and excellent results; both need their department's recommendation. Apply during the announced window by sending one merged PDF of the document set (see required documents) to the application email in the prescribed naming format - incomplete or non-conforming applications fail the initial screening.$req$,
  'https://hwxy.nju.edu.cn/lxnd/zsxx/jxj/njszfjxj/index.html',
  'https://hwxy.nju.edu.cn/lxnd/zsxx/jxj/njszfjxj/index.html',
  NULL,
  'annual', 'closed', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 10), verified first-hand on the Nanjing University Institute for International Students' official '2026 Nanjing Municipal Government Scholarship for International Students - NJU Selection Notice' (published 2026-07-08) fetched the same day: city scheme established 2013; 2026 application window 24-28 August 2026; eligible = foreign full-time bachelor/master/doctoral students at NJU (new and current); document sets for new vs current students (both include a valid HSK score report and a signed code-of-conduct pledge); single-PDF email application to nanjingszf@163.com with prescribed naming; values RMB 10,000 (undergraduate, 20 places) and RMB 20,000 (graduate, 20 places), valid one academic year and revoked on withdrawal/discipline; selection criteria incl. the no-other-government/university-scholarship rule, current-student GPA thresholds (4.3 liberal arts / 3.8 sciences, NJU scale), mid-term assessment for graduates and departmental recommendation; screening, expert review and public announcement. award_amount is NULL (variable): two level-dependent one-year amounts; amount_usd_value is 0 (CNY award). min_gpa NULL (thresholds are NJU-scale and apply only to already-enrolled undergraduates); min_ielts NULL (an HSK report, not IELTS, is required). deadline_date NULL (not_published) and status closed: the 2026 window closed on 28 August 2026 and the next window awaits the following year's notice. Retired record 478 named an 'International Excellence Scholarship' that NJU does not publish (Pass 103); this municipal scheme is added on the evidence of its own official selection notice. university_scholarships row added for university 111; official source linked.$note$,
  111,
  NULL, NULL, 'year', 'variable', NULL,
  $ft$Municipal government one-year grant: RMB 10,000 for undergraduates and RMB 20,000 for graduate students (20 places at each level in the 2026 NJU selection)$ft$,
  $tc$A one-academic-year cash grant (RMB 10,000 undergraduate / RMB 20,000 graduate), not a tuition waiver as such; the award is cancelled if the holder withdraws or is disciplined.$tc$,
  'An HSK score report (within validity for new students) must be included in the application file for both new and current students; no IELTS figure is stipulated (programme admission language rules apply separately).',
  $json$["One merged PDF emailed to nanjingszf@163.com in the prescribed file/email naming format during the announced window","Scholarship application form (municipal scholarship form linked in the notice)","New students: NJU admission notice for the entry year; current students: previous academic year's transcript plus the municipal scholarship recommendation form (department recommendation)","HSK score report","Signed Nanjing University code-of-conduct pledge for municipal scholarship holders","Where applicable: competition/activity award certificates, proof of passed mid-term assessment, published papers (previous winners may not reuse the prior year's achievement materials)"]$json$,
  $exp$Ahead of the autumn semester (the 2026 NJU window opened 24 August 2026).$exp$,
  $exp$Annual NJU selection window of a few days (2026: 24-28 August), announced in that year's selection notice.$exp$,
  $json$[{"cycle":"2026 NJU selection","window":"2026-08-24 to 2026-08-28","places":"20 undergraduate (RMB 10,000) + 20 graduate (RMB 20,000), one academic year","status":"closed"}]$json$
);

-- ---------------------------------------------------------------------------
-- 944: University of Ottawa International Doctoral Scholarship
-- ---------------------------------------------------------------------------
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
  944,
  'University of Ottawa International Doctoral Scholarship',
  'University of Ottawa (Graduate and Postdoctoral Studies)',
  'Canada', 'Tuition Credit', 0,
  $dl$No separate deadline: the scholarship is offered at admission to eligible full-time international doctoral students and is credited to the student account term by term - there is no university-wide scholarship deadline (doctoral admission deadlines are set by each faculty/programme).$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["PhD"]$json$,
  $json$["All University of Ottawa doctoral programmes (full-time)"]$json$,
  $json$["International students charged international tuition fees (full-time doctoral students admitted in May 2023 or later under the current terms)"]$json$, NULL, NULL,
  false, true,
  $desc$The International Doctoral Scholarship is the University of Ottawa's dedicated support for international doctoral students. Under the terms in force for students admitted in May 2023 or later, it is valued at $45,000 over five years: a maximum of $3,000 per term, for 15 consecutive terms, is credited directly to the student's account against international tuition fees - the scholarship is only paid in terms where international tuition fees are charged. It supports full-time international students during their doctoral studies and is offered at admission (faculties list it among the scholarships offered with admission), substantially offsetting the difference between international and domestic doctoral tuition. The scholarship cannot be combined with the Differential Tuition Fee Waiver (differential tuition exemption) or the Tuition Fee Exemption Scholarship, so applicants eligible for those francophone/francophile fee schemes should compare which support applies. (Students who began full-time doctoral studies before May 2023 hold the scholarship under grandfathered terms - tuition fees equivalent to those of Canadian students residing outside Ontario for five years, or six years if admitted before 2021; this record describes the current terms for new applicants.) It is a distinct award from uOttawa's Admission Scholarship (Doctorate), the $72,000-minimum excellence funding package catalogued separately.$desc$,
  $req$Be an international student admitted to (or enrolled in) a full-time doctoral programme at the University of Ottawa and charged international tuition fees - the scholarship is credited only in terms where international tuition fees apply, up to $3,000 per term for 15 consecutive terms (maximum $45,000 over five years). It cannot be held together with the Differential Tuition Fee Waiver or the Tuition Fee Exemption Scholarship. No separate scholarship application is described on the official page: the amount is credited to the student account of eligible doctoral students (confirm the award with your faculty when you receive your admission offer).$req$,
  'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/international-doctoral-scholarship',
  'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/international-doctoral-scholarship',
  NULL,
  'annual', 'upcoming', 'verified', 10, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 10), verified first-hand on the University of Ottawa Graduate and Postdoctoral Studies official 'International doctoral scholarship' page fetched the same day: current terms for students admitted in May 2023 or later ($45,000 over five years; maximum $3,000 per term for 15 consecutive terms credited to the student account; paid only when international tuition fees are charged); the cannot-combine rule for the Differential Tuition Fee Waiver and Tuition Fee Exemption Scholarship; and grandfathered pre-May-2023 terms (domestic-outside-Ontario fee equivalence), which are noted in the description for completeness. award_amount stores the derived annual value (CAD 9,000/year = $3,000 x 3 terms; CAD 45,000 total over five years) as fixed; amount_usd_value is 0 (CAD award) and living_allowance is NULL (a tuition-account credit, not living support). min_gpa/min_ielts NULL (no thresholds published - eligibility turns on international fee status and full-time doctoral enrolment). deadline_date NULL (admission-linked; no scholarship deadline published). The same award was read on the Faculty of Engineering page during Batch 9 and deliberately not folded into record 941 (the Admission Scholarship - Doctorate); it is catalogued here as its own record on the central page's evidence. university_scholarships row added for university 178; official source linked.$note$,
  178,
  9000, 'CAD', 'year', 'fixed', NULL,
  $ft$CAD 45,000 over five years, credited to the student account at CAD 3,000 per term for 15 consecutive terms against international doctoral tuition fees$ft$,
  $tc$Credited directly to the student account against international tuition fees (maximum CAD 3,000 per term, 15 consecutive terms); it is only paid in terms where international tuition fees are charged, and cannot be combined with the Differential Tuition Fee Waiver or the Tuition Fee Exemption Scholarship.$tc$,
  'Set by University of Ottawa doctoral admission and the admitting faculty (bilingual university, English/French); the scholarship page publishes no separate IELTS cutoff.',
  $json$["Application for admission to a full-time University of Ottawa doctoral programme as an international student - no separate scholarship application is described; the credit is applied to the accounts of eligible students charged international tuition fees"]$json$,
  NULL,
  $exp$Applied from admission; doctoral admission deadlines are set by each faculty/programme.$exp$,
  $json$[{"allocation":"At doctoral admission (credited per term to eligible international doctoral students)","value":"Maximum CAD 3,000 per term for 15 consecutive terms (CAD 45,000 over five years); terms in force for admissions from May 2023"}]$json$
);

-- ---------------------------------------------------------------------------
-- 945: Peking University Scholarship for International Students
-- ---------------------------------------------------------------------------
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
  945,
  'Peking University Scholarship for International Students',
  'Peking University (International Students Division, Office of International Relations)',
  'China', 'Tuition Waiver + Living Allowance + Medical Insurance', 0,
  $dl$Annual application window, generally January-March. Graduate applicants: first submit a full-time self-funded degree application to Peking University, then complete the online scholarship application at studyatpku.com. New undergraduate students do not apply for the scholarship - the university selects recipients on merit from final admission results.$dl$,
  NULL, 'not_published', NULL, NULL,
  $json$["Bachelor","Master","PhD"]$json$,
  $json$["All full-time degree programmes at Peking University open to international students (Bachelor's, Master's and Doctorate)"]$json$,
  $json$["All countries - outstanding foreign students who meet Peking University's international admission requirements and have applied as full-time self-funded degree students"]$json$, NULL, NULL,
  false, true,
  $desc$The Peking University Scholarship for International Students is the university's own funded scholarship, established in 2012 to attract more outstanding foreign students to pursue bachelor's, master's and doctoral degrees at Peking University. The scholarship covers exemption from tuition fees, a living allowance, and medical insurance fees (the university does not publish a cash amount for the living allowance). It is awarded for the standard programme duration - 4 years for bachelor's students, 2-3 years for master's students and 4 years for doctoral students - and recipients must take part in and pass an annual scholarship review to keep the award for the following academic year. It cannot be combined with any other form of scholarship funding. The route in differs by level: applicants to graduate programmes must first have successfully submitted an application for a full-time self-funded programme, then complete the online scholarship application at studyatpku.com during the annual window (generally January-March), after which a university review panel conducts a dedicated evaluation and emails shortlisted candidates; newly admitted undergraduates do not submit a scholarship application at all, as the university selects recipients on merit from the final admission results. The scheme sits alongside (and is distinct from) the Chinese Government Scholarship and Beijing Government Scholarship channels administered at PKU.$desc$,
  $req$Meet Peking University's admission requirements for foreign students for the chosen degree programme. Have successfully submitted an application for admission to a full-time self-funded programme at Peking University. Hold no other scholarship funding of any form. Graduate-programme applicants then complete the online scholarship application at studyatpku.com (generally January-March) and are assessed by a dedicated university review panel, with shortlisted applicants notified by email; undergraduate admits are considered automatically from final admission results and should keep their contact channels open and watch for email notification. Recipients must pass the annual scholarship review each year to continue receiving the scholarship.$req$,
  'https://www.isd.pku.edu.cn/cn/scholarship/detail.php?id=24',
  'https://www.isd.pku.edu.cn/cn/scholarship/detail.php?id=24',
  'http://www.studyatpku.com',
  'annual', 'upcoming', 'verified', 9, true,
  now(), now(),
  $note$ADDED 2026-10-26 (enrichment batch 10), verified first-hand on the Peking University International Students Division's official scheme page (in Chinese, dated 2025-04-14) fetched the same day: established 2012 for bachelor's/master's/doctoral study; content = tuition exemption, living expenses and medical insurance fees; durations 4 / 2-3 / 4 years; eligibility = PKU international admission requirements + a successfully submitted full-time self-funded application + no other scholarship funding; application generally January-March via studyatpku.com with panel review and email notification, while new undergraduates are selected from admission results without applying; annual review required to continue. award_amount is NULL (variable) because the university publishes the benefit components without a cash figure for the living allowance; amount_usd_value is 0 (CNY-denominated scheme) and living_allowance is NULL for the same reason. min_gpa/min_ielts NULL (no numeric thresholds on the scheme page; language evidence follows programme admission rules). deadline_date NULL (not_published) with status upcoming: the published window is a recurring January-March period rather than a single fixed date. Reliability 9 (complete terms on one official page, but no published allowance amount and the standing page is the Chinese-language scheme description). Retired record 118 named a 'President Scholarship' that PKU does not publish (Pass 103); this correctly named university scheme is added on its own evidence, not retargeted into 118. university_scholarships row added for university 22; official source linked.$note$,
  22,
  NULL, NULL, 'year', 'variable', NULL,
  $ft$University-funded scholarship (est. 2012): tuition exemption + living allowance + medical insurance for the standard programme duration (Bachelor 4 years, Master 2-3 years, Doctorate 4 years); allowance amount not published$ft$,
  $tc$Tuition fees are exempted in full for the scholarship duration (subject to passing the annual review).$tc$,
  'Language requirements follow the admission rules of the chosen PKU programme (Chinese-taught or English-taught); the scholarship page itself publishes no HSK/IELTS figure.',
  $json$["Application for admission to a full-time self-funded degree programme at Peking University (prerequisite)","Graduate applicants: online scholarship application at studyatpku.com during the January-March window (new undergraduates are considered automatically from admission results and do not apply)"]$json$,
  $exp$January each year (the scheme page gives a general January-March application period).$exp$,
  $exp$Generally January-March each year; exact dates per the annual admissions cycle.$exp$,
  $json$[{"window":"January-March each year (per the standing scheme page)","process":"Graduate applicants apply online at studyatpku.com after submitting a self-funded admission application; new undergraduates are considered from admission results without applying"}]$json$
);

-- Sources 3081-3083 + links + university_scholarships 676-678
INSERT INTO sources (id, url, title, domain, source_type, accessed_at, is_official, is_verified, created_at) VALUES
(3081, 'https://www.isd.pku.edu.cn/cn/scholarship/detail.php?id=24', 'Peking University Scholarship for International Students - Official Scheme Page (ISD)', 'isd.pku.edu.cn', 'scholarship', now(), true, true, now()),
(3082, 'https://hwxy.nju.edu.cn/lxnd/zsxx/jxj/njszfjxj/index.html', 'Nanjing Municipal Government Scholarship 2026 Selection Notice - NJU Institute for International Students', 'hwxy.nju.edu.cn', 'scholarship', now(), true, true, now()),
(3083, 'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/international-doctoral-scholarship', 'University of Ottawa International Doctoral Scholarship Official Page', 'uottawa.ca', 'scholarship', now(), true, true, now());
INSERT INTO scholarship_sources (scholarship_id, source_id) VALUES (945, 3081), (943, 3082), (944, 3083);
INSERT INTO university_scholarships (id, university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship, covers_tuition, covers_living_expenses, official_url, source_url, verification_status, last_verified_at) VALUES
(676, 22, 945, 'Peking University Scholarship for International Students', 'available', 'University scholarship (tuition waiver + living allowance + medical insurance)', 'Full tuition exemption plus living allowance and medical insurance (allowance amount not published)', true, true, 'https://www.isd.pku.edu.cn/cn/scholarship/detail.php?id=24', 'https://www.isd.pku.edu.cn/cn/scholarship/detail.php?id=24', 'verified', now()),
(677, 111, 943, 'Nanjing Municipal Government Scholarship at Nanjing University', 'available', 'Municipal government grant (one academic year)', 'RMB 20,000 for graduate students / RMB 10,000 for undergraduates (one academic year)', false, true, 'https://hwxy.nju.edu.cn/lxnd/zsxx/jxj/njszfjxj/index.html', 'https://hwxy.nju.edu.cn/lxnd/zsxx/jxj/njszfjxj/index.html', 'verified', now()),
(678, 178, 944, 'University of Ottawa International Doctoral Scholarship', 'available', 'International-tuition scholarship credit', 'CAD 45,000 over five years (CAD 3,000 per term, 15 terms, credited against international tuition)', true, false, 'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/international-doctoral-scholarship', 'https://www.uottawa.ca/study/graduate-studies/funding-financing/awards/international-doctoral-scholarship', 'verified', now());

SELECT setval('scholarships_id_seq', GREATEST((SELECT MAX(id) FROM scholarships), 945), true);
SELECT setval('sources_id_seq', GREATEST((SELECT MAX(id) FROM sources), 3083), true);
SELECT setval('university_scholarships_id_seq', GREATEST((SELECT MAX(id) FROM university_scholarships), 678), true);
