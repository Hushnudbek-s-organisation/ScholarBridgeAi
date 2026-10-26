-- Scholarship rewrite pass 14 — 2026-10-23
-- Rewrites four importer-template rows from each provider's own pages and retires one
-- row that the provider's own FAQ falsifies. Every value below was read on the pages
-- cited in `source_url`; nothing is inferred except the UAEU USD equivalent, which is
-- arithmetic on a published per-credit rate and is labelled as such in `notes`.
--
-- Rows: 848 UAEU, 845 Nazarbayev, 851 Kyung Hee, 843 SPbU  → rewritten
--       856 Hacettepe                                      → retired
--
-- Applied to the live project (zkdguzbdopfedkffsatk) on 2026-10-23.

-- ---------------------------------------------------------------------------
-- 848 — United Arab Emirates University
-- Was: "UAEU International Undergraduate Excellence Scholarship", USD 18 000,
--      "Mar-May (for Fall)". The award name does not exist on the UAEU site.
-- Now: the real Chancellor's Scholarship for Elite Students, 100% + 75% tiers.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Chancellor''s Scholarship for Elite Students (UAEU)',
  provider = 'United Arab Emirates University (UAEU)',
  coverage_type = 'Full Tuition',
  amount_usd_value = 21740,
  award_amount = 79830,
  award_currency = 'AED',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = 'Full tuition (100%); a 75% tier exists for a 95% Grade 12 average',
  deadline = 'No separate scholarship deadline - the waiver is requested inside the undergraduate admission application',
  deadline_type = 'annual',
  deadline_date = NULL,
  degree_levels = '["Bachelor"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = 7.5,
  description = 'The United Arab Emirates University awards a tuition waiver to international undergraduates admitted from 2025/2026 onwards. The top tier, the Chancellor''s Scholarship for Elite Students, cancels 100% of tuition for a student who finishes secondary school with at least 98% and proves English at IELTS 7.5 or TOEFL iBT 105. A second tier cancels 75% for a 95% average with IELTS 6.5 or TOEFL iBT 85. The waiver covers tuition only: housing and the admission application fee are not included, and a student may hold only one UAEU scholarship. There is no separate scholarship form, because the request is made inside the undergraduate admission application.',
  requirements = 'Grade 12 average of at least 98% for the 100% tier (95% for the 75% tier), plus the general admission requirements of the chosen college. English: IELTS 7.5 / TOEFL iBT 105 / TOEFL ITP 590 / TOEFL CPT 233 for the 100% tier, IELTS 6.5 / TOEFL iBT 85 / ITP 550 / CPT 193 for the 75% tier. Mathematics: SAT-Math 730 or ACT-Math 32 for every college except Business and Economics, Humanities and Social Sciences, Education, and Law. Arabic: 6.5 on the Al Ain Arabic Language Test for the College of Law only. Continuation: CGPA of at least 3.8 (3.6 for the 75% tier), at least 15 credit hours per regular semester, no other scholarship, and study within the normal semesters of the study plan. Meeting the criteria does not guarantee an award, because scholarships are limited to allocated seats.',
  required_documents = '["UAEU online undergraduate admission application with the scholarship section completed","General Secondary School Certificate (Grade 12) showing at least 98% (95% for the 75% tier)","IELTS or TOEFL score report (IELTS 7.5 / TOEFL iBT 105 for the 100% tier)","SAT or ACT score report (SAT-Math 730 or ACT-Math 32) for colleges other than Business and Economics, Humanities and Social Sciences, Education and Law","Al Ain Arabic Language Test score of 6.5 for the College of Law","Passport copy"]',
  english_requirements = 'IELTS 7.5 overall, or TOEFL iBT 105, TOEFL ITP 590 or TOEFL CPT 233 for the 100% tier. The 75% tier accepts IELTS 6.5 / TOEFL iBT 85 / ITP 550 / CPT 193.',
  website_url = 'https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml',
  source_url = 'https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml',
  application_url = 'https://uaeu.elluciancrmrecruit.com/Apply/Account/Login',
  application_status = 'open',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the university''s own Undergraduate Scholarships page (fetched 2026-10-23). CORRECTIONS: the imported record was titled "UAEU International Undergraduate Excellence Scholarship", a name that does not exist on the UAEU site, and carried an invented USD 18,000. The real programme is the Chancellor''s Scholarship for Elite Students with a 100% and a 75% tuition tier, open to international students enrolled from inside or outside the UAE. AMOUNT: UAEU publishes AED 2,661 per credit hour for international undergraduates and requires at least 15 credits per regular semester, so 100% of a 30-credit year is AED 79,830, about USD 21,740 at the 3.6725 AED/USD peg; the figure is a computed equivalent of a published rate, not a published cash award. Housing (about AED 5,000 per semester) and the admission fee are explicitly excluded. DEADLINE: UAEU states scholarship applications are made inside the undergraduate admission application during the announced admission periods and publishes no separate scholarship date, so no fixed date was invented. The 75% tier and the two Chancellor''s Scholarships for Talented Students (100% and 50% for innovation, arts, sport and technology, CGPA 2.75 for the 50% tier) are real but are not separate records yet.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 848;

-- ---------------------------------------------------------------------------
-- 845 — Nazarbayev University
-- Was: "Abay Kunanbayev International Scholarship at NU", USD 19 500 "Full Ride",
--      deadline "Jan-Mar (SAT/NUET Track)". No cash value is published, and the
--      2027-2028 closing date is literally "TBA" on the university's site.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Abai Kunanbayev Scholarship (Nazarbayev University)',
  provider = 'Nazarbayev University',
  coverage_type = 'Full Tuition + Stipend',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'USD',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Merit-based full funding',
  tuition_coverage = 'Full tuition, plus medical insurance and a monthly stipend',
  deadline = 'Same as the admission deadline for the 2027-2028 intake - the closing date has not been published yet',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'The 2027-2028 application window opened on 12 October 2026. NU states that the exact deadline is TBA and will publish it under Regular Admission > Important Dates.',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = 6.0,
  description = 'Nazarbayev University sets aside a number of Abai Kunanbayev scholarships for the strongest international candidates at bachelor, master and doctoral level. The award is not applied for separately: each school''s admissions committee recommends candidates during the admission review, and a recommendation brings full tuition, medical insurance and a monthly stipend. Everyone else studies on a fee-paying basis, with published tuition of USD 15,000 a year for bachelor programmes, USD 16,000 for master programmes and USD 23,500 for doctoral programmes. Accommodation is guaranteed for international students, and the university estimates living costs at about USD 400 a month, including roughly USD 55 for a dormitory place.',
  requirements = 'Apply to a Nazarbayev University programme through the admissions portal and be recommended by the admissions committee of the relevant school. There is no separate scholarship form and no published minimum score for the award itself; the scholarship is merit-based and the committee''s recommendation is the selection mechanism. Admission requirements still apply: for undergraduate entry, IELTS 6.0 (writing 6.0, other sections 5.5) or the equivalent TOEFL score, plus NUET, SAT (1140) or ACT (24) results; the last accepted test dates for the 2027-2028 cycle are SAT on 5 December 2026 and ACT on 28 November 2026. The application fee is KZT 10,000 and is not refundable.',
  required_documents = '["Online application at admissions.nu.edu.kz","Academic transcripts and school or degree certificates","IELTS or TOEFL score report sent to NU (IELTS code: NU Admissions Office; TOEFL code 6762)","NUET, SAT or ACT results","Letters of recommendation","Passport copy","Separate Financial Support Application submitted after the admission offer is received"]',
  english_requirements = 'IELTS 6.0 with 6.0 in writing and 5.5 in reading, listening and speaking, or the equivalent TOEFL score, for undergraduate entry. IELTS 5.5 is enough for the Foundation Year Programme. Graduate programmes set their own thresholds.',
  website_url = 'https://nu.edu.kz/admissions/international-admission/international-admission_general/',
  source_url = 'https://nu.edu.kz/admissions/international-admission/international-admission_general/',
  application_url = 'https://admissions.nu.edu.kz/',
  application_status = 'open',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the university''s own International Admission page (fetched 2026-10-23), which names the award "Abai Scholarship" in the heading and "Abay Kunanbayev scholarships" in the text. CORRECTIONS: the imported record called it an "Abay Kunanbayev International Scholarship at NU" with a USD 19,500 "Full Ride" figure and an invented "Jan-Mar (SAT/NUET Track)" deadline. The university publishes no cash value for the award, so amount_usd_value is 0 by the project convention for "not published" and the published tuition rates are given in the description instead. The monthly stipend and the value of the medical insurance are not published either. DEADLINE: the 2027-2028 window opened on 12 October 2026 and the university explicitly marks the closing date as TBA; the imported January-March window was not supported by any page and has been removed rather than replaced with a guess. IMPORTANT PROCESS POINT: financial support is a SEPARATE application submitted after an admission offer arrives, not part of the admission form.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 845;

-- ---------------------------------------------------------------------------
-- 851 — Kyung Hee University
-- Was: "Kyung Hee President Scholarship & GKS", USD 9 500, bachelor+master+PhD.
-- The official page is an undergraduate admission-scholarship table; GKS is a
-- different programme and the President's Scholarship is a graduate payment window.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'Kyung Hee International Student Scholarships (Admission Awards)',
  provider = 'Kyung Hee University (KHU)',
  coverage_type = 'Tuition Waiver',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'KRW',
  award_period = 'variable',
  award_basis = 'variable',
  funding_type = 'Merit-based tuition waiver',
  tuition_coverage = 'Full tuition for the first semester for most tiers; full tuition for up to four years for the SDGs Scholarship and for Admission Scholarship G in engineering and software',
  deadline = 'Awarded together with the admission offer - there is no separate scholarship application and no separate deadline',
  deadline_type = 'annual',
  deadline_date = NULL,
  degree_levels = '["Bachelor''s"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Kyung Hee University pays the tuition of international undergraduates through a set of admission scholarships that are decided when the admission result is published, not through a separate application. Admission Scholarship A goes to the highest-scoring applicant in each college: full tuition for the first semester. Scholarships B and C are driven by Korean: TOPIK level 6 brings full tuition for the first semester and TOPIK level 5 brings half. Scholarships D to H cover the first semester for students recommended by a KHU-affiliated Korean language institute, for the top half of the admission evaluation at the Global Campus, in the Department of Korean, and in engineering, electronics and software convergence, where the engineering award can run for four years on a GPA of 3.5. The large award is the SDGs Scholarship: full tuition for up to four years for students from ODA recipient countries on the DAC list, or for students holding refugee status in Korea.',
  requirements = 'Be admitted to a Kyung Hee undergraduate programme as an international student. Each tier has its own trigger: highest overall admission score in the college for Scholarship A (applicants scoring below 90 points are excluded regardless of rank), TOPIK 6 for B, TOPIK 5 for C, a recommendation from the dean of a KHU-affiliated Korean language institute for D, top 50% of the admission evaluation plus four completed semesters at the Institute of International Education for E, top 50% in the Department of Korean for F, top 50% in the College of Engineering, Electronics Engineering or Software Convergence for G, and top 50% in the College of International Studies for H. The SDGs Scholarship requires refugee status in Korea or nationality of a DAC-list ODA recipient country. A student selected for more than one award receives only the higher one, and GKS recipients or holders of another full-tuition award are disqualified from several of these tiers.',
  required_documents = '["Kyung Hee University international undergraduate application","High school diploma and transcripts","TOPIK certificate (needed for Admission Scholarships B and C)","Certificate of completion from a KHU-affiliated Korean language institute (for Admission Scholarship D)","English proficiency score report for English-track programmes","Passport copy"]',
  english_requirements = 'The scholarship page itself sets no English score. Korean-taught programmes require TOPIK; English-track programmes set their own IELTS or TOEFL threshold in the admission guide.',
  website_url = 'https://www.khu.ac.kr/eng/user/contents/view.do?menuNo=300152',
  source_url = 'https://www.khu.ac.kr/eng/user/contents/view.do?menuNo=300152',
  application_url = 'https://www.khu.ac.kr/eng/user/contents/view.do?menuNo=300150',
  application_status = 'unknown',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the university''s own International Student Scholarships page (fetched 2026-10-23). CORRECTIONS: the imported record was called "Kyung Hee President Scholarship & GKS" and claimed "Full Tuition (100% tuition) for Top Entrance", USD 9,500 and bachelor plus master plus doctoral levels. The official page is an UNDERGRADUATE table of admission and post-enrolment scholarships; the President Scholarship mentioned elsewhere is a graduate tuition payment window, and GKS is a separate Korean government programme that this page explicitly says disqualifies a holder from several KHU awards. The record now covers only the undergraduate admission awards. AMOUNT: every tier is a percentage or a fixed first-semester payment, and the page publishes no tuition figure, so amount_usd_value is 0 rather than an invented dollar total; the tuition table for the specific programme gives the cash value. ENTRANCE FEE: KHU states the entrance fee is not included in any of the scholarships listed. The TOPIK Encouragement Scholarship (KRW 300,000 per semester, maximum three semesters) and the sibling and alumni awards are post-enrolment and are described but not turned into separate records.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 851;

-- ---------------------------------------------------------------------------
-- 843 — Saint Petersburg State University
-- Was: "SPbU International Government Quota & Open Doors", USD 5 000,
--      "Nov-Apr (SPbU Quota), Jun (Paid)". SPbU runs its OWN olympiads, not the
--      Open Doors project, and the round closed on 6 February 2026, not in April.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  title = 'SPbU Russian Government Scholarship Quota (Open International Olympiads)',
  provider = 'Saint Petersburg State University (SPbU)',
  coverage_type = 'Full Funding',
  amount_usd_value = 0,
  award_amount = NULL,
  award_currency = 'RUB',
  award_period = 'year',
  award_basis = 'variable',
  funding_type = 'Government quota (state-funded place)',
  tuition_coverage = 'Full tuition financed from the federal budget, plus a monthly academic allowance and reduced dormitory fees',
  deadline = '2027-2028 round not published yet; the 2026-2027 round ran from 12 November 2025 to 6 February 2026',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = 'Applications for the 2027-2028 quota are expected to open in November 2026 and close in early February 2027, following the pattern of the 2026-2027 round (12 November 2025 - 6 February 2026).',
  degree_levels = '["Bachelor''s","Master''s","PhD"]',
  eligible_majors = '["All Majors"]',
  eligible_countries = '["All"]',
  min_ielts = NULL,
  description = 'Saint Petersburg State University admits foreign citizens to state-funded places through its own Open International Olympiads, not through a separate scholarship form: the olympiad competition is the application, and winning it switches tuition off. Winners have their tuition paid from the federal budget within the quota set by Russian Government Decree No. 2150 of 18 December 2020, receive a monthly academic allowance and pay reduced dormitory fees. The 2026-2027 round opened on 12 November 2025 and closed on 6 February 2026, the map between olympiad subjects and degree programmes was published by 5 February 2026 and the list of winners by 13 March 2026; winners then had until 20 March 2026 to choose a programme and submit an admission application through their personal account. Everyone else studies on a fee-paying basis, with applications for 2026-2027 running from 20 June to 10 July 2026 for bachelor and specialist degrees and to 23 July 2026 for master degrees.',
  requirements = 'Be a foreign national, a stateless person or a compatriot living abroad, register a personal account on the SPbU admissions portal and compete in the Open International Olympiad for the subject that matches the chosen programme. The olympiad is open to international school students and to undergraduates, depending on the level applied for. Winners must confirm a programme and submit the admission application by the published confirmation date (20 March 2026 in the last round) and must name only St Petersburg University in the application form. Russian-language proficiency is required for Russian-taught programmes; the preparatory department offers a one-year Russian course for 360,000 roubles for those who need it.',
  required_documents = '["SPbU personal account registration","Olympiad entry with the required subject portfolio","Passport or identity document","Previous education document with transcript","Russian or English language evidence, depending on the programme","Signed admission application naming only St Petersburg University (after winning)"]',
  english_requirements = 'No English score is set for the quota itself. Russian-taught programmes require Russian; English-taught master programmes set their own evidence requirements in the programme entry.',
  website_url = 'https://abiturient.spbu.ru/en/info/government-funded-basis/',
  source_url = 'https://abiturient.spbu.ru/en/info/government-funded-basis/',
  application_url = 'https://abiturient.spbu.ru/en/',
  application_status = 'closed',
  verification_status = 'verified',
  source_reliability = 9,
  notes = 'Rewritten from the SPbU Admissions Committee pages on the government-funded basis, the 2026 olympiad announcement and the tuition page (fetched 2026-10-23). CORRECTIONS: the imported record was titled "SPbU International Government Quota & Open Doors" and carried an invented USD 5,000 and a "Nov-Apr (SPbU Quota), Jun (Paid)" deadline. Two separate errors: SPbU runs its OWN Open International Olympiads, not the Open Doors project at od.globaluni.ru, and the quota round closed on 6 February 2026, not in April. AMOUNT: the tuition is paid directly from the federal budget and the monthly academic allowance is set by the federal government rather than by the university, so no cash figure is published and amount_usd_value is 0. STATUS: the 2026-2027 round is closed (winners announced 13 March 2026); the next round is expected in November 2026. Note that there is also an SPbU branch in Tashkent, whose fee-paying applications for 2026 ran from 20 June to 10 and 23 July 2026.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 843;

-- ---------------------------------------------------------------------------
-- 856 — Hacettepe University → RETIRED
-- Hacettepe's own International Student Office FAQ, question 4: "No, currently
-- Hacettepe University does not offer any scholarships specifically for
-- international students." Türkiye Bursları is a national YTB programme and is
-- already recorded as id 865; it still surfaces on Hacettepe's page through the
-- same-country relevance rule, so nothing is lost by retiring this row.
-- ---------------------------------------------------------------------------
UPDATE scholarships SET
  is_active = false,
  deadline = 'Retired 2026-10-23 - no award exists to apply for',
  deadline_type = 'not_published',
  deadline_date = NULL,
  expected_deadline_period = NULL,
  award_basis = 'variable',
  notes = 'RETIRED 2026-10-23. The imported record claimed that Hacettepe University offers "Türkiye Bursları (Medical & STEM Priority)" worth USD 13,800 with a February 20 deadline. Two independent checks on the university''s own sites falsify it. First, Hacettepe''s International Student Office FAQ, question 4, answers "Does Hacettepe University offer any scholarships to international students?" with "No, currently Hacettepe University does not offer any scholarships specifically for international students" (internationalstudent2.hacettepe.edu.tr/en/menu/frequently_asked_questions-21). Second, Türkiye Bursları is a national programme run by the Presidency for Turks Abroad and Related Communities (YTB), not by any single university, and it publishes no "Medical and STEM priority" track that Hacettepe administers. The national programme is recorded once, correctly, as scholarship id 865, and it still appears on Hacettepe''s page through the same-country relevance rule, so retiring this row loses no information. The "Medical & STEM Priority" wording and the USD 13,800 figure were importer inventions; the real Türkiye Bursları stipend rates are in row 865.',
  last_verified_at = NOW(),
  last_updated_at = NOW()
WHERE id = 856;

-- ---------------------------------------------------------------------------
-- university_scholarships cards kept in step with the four rewrites and the
-- retirement (same ids as the rows above).
-- ---------------------------------------------------------------------------
UPDATE university_scholarships AS us SET
  scholarship_name = v.name,
  max_scholarship = v.max_award,
  valued_aspect = v.aspect,
  official_url = v.url,
  source_url = v.url,
  availability_status = v.availability,
  eligibility_notes = v.elig,
  last_verified_at = NOW()
FROM (VALUES
  (351, 'SPbU Russian Government Scholarship Quota (Open International Olympiads)',
        'Full tuition from the federal budget + monthly academic allowance + reduced dormitory fees',
        'The olympiad is the application - winning switches tuition off',
        'https://abiturient.spbu.ru/en/info/government-funded-basis/',
        'Yes',
        'Foreign nationals compete in SPbU''s own Open International Olympiads. The 2026-2027 round ran 12 November 2025 - 6 February 2026; winners were published by 13 March 2026 and had to confirm a programme by 20 March 2026.'),
  (313, 'Abai Kunanbayev Scholarship (Nazarbayev University)',
        'Full tuition + medical insurance + monthly stipend (cash value not published)',
        'Recommended by each school''s admissions committee; no separate scholarship form',
        'https://nu.edu.kz/admissions/international-admission/international-admission_general/',
        'Yes',
        'Merit-based award for top international candidates at bachelor, master and doctoral level. Published tuition is USD 15,000 a year for bachelor, USD 16,000 for master and USD 23,500 for doctoral programmes.'),
  (368, 'Chancellor''s Scholarship for Elite Students (UAEU)',
        '100% tuition waiver (a 75% tier exists for a 95% Grade 12 average)',
        'Grade 12 average of 98% or more plus IELTS 7.5',
        'https://www.uaeu.ac.ae/en/admission/undergraduate-scholarships.shtml',
        'Yes',
        'Tuition only - housing and the admission application fee are excluded. CGPA 3.8 and 15 credit hours per semester to keep the award, and only one UAEU scholarship may be held.'),
  (331, 'Kyung Hee International Student Scholarships (Admission Awards)',
        'Full tuition for the first semester; up to four years for the SDGs Scholarship',
        'Awarded with the admission offer - TOPIK 6 or the top score in the college',
        'https://www.khu.ac.kr/eng/user/contents/view.do?menuNo=300152',
        'Yes',
        'Undergraduate admission awards only. The entrance fee is not included in any KHU scholarship, and a GKS recipient is disqualified from several tiers.'),
  (335, 'Türkiye Bursları (Medical & STEM Priority)',
        'No award to apply for',
        'Retired 2026-10-23',
        'https://internationalstudent2.hacettepe.edu.tr/en/menu/frequently_asked_questions-21',
        'No',
        'Hacettepe University''s own FAQ states it offers no scholarships specifically for international students. Türkiye Bursları is a national YTB programme and is recorded as scholarship id 865.')
) AS v(id, name, max_award, aspect, url, availability, elig)
WHERE us.id = v.id;

-- The retired row must not keep feeding the invented USD 13 800 to any query that
-- forgets to filter on is_active, so its money columns are zeroed as well.
UPDATE scholarships SET
  amount_usd_value = 0,
  award_amount = NULL,
  coverage_type = 'Unspecified',
  tuition_coverage = 'Retired 2026-10-23 - Hacettepe offers no scholarship for international students',
  last_updated_at = NOW()
WHERE id = 856;
