-- ============================================================================
-- Scholarship rewrite pass 43 — Gulf cluster (Saudi Arabia + Qatar)
-- Project: zkdguzbdopfedkffsatk
-- Applied: 2026-10-25
--
-- Rows rewritten : 587 HBKU, 609 King Abdulaziz University, 610 King Saud
--                  University, 656 Qatar University
-- Rows retired   : 324 (KAU duplicate), 474 (Qatar University award that does
--                  not exist)
-- Rows created   : 908 King Saud University Graduate Scholarship Initiative
-- Cards touched  : university_scholarships 275, 283, 267, 99, 656 (-> No)
--                  and a new card 667 for scholarship 908
--
-- Every claim below was read on the provider's own page on 2026-10-25:
--   kau.edu.sa/en/page/scholarship
--   kau.edu.sa/en/page/external-scholarships-for-international-students
--   studyinsaudi.sa/en
--   dar.ksu.edu.sa/en/overseas
--   dar.ksu.edu.sa/en/stipend
--   isd.ksu.edu.sa/en/node/3063
--   dgsinitiative.ksu.edu.sa
--   hbku.edu.qa/en/scholarship
--   hbku.edu.qa/en/admissions
--   qu.edu.qa/en-us/students/admission/scholarships/types
--   qu.edu.qa/en-us/students/admission/scholarships/Pages/scholarships-timeline.aspx
--   qu.edu.qa/en-us/students/international-students/important-dates
--   qu.edu.qa/en-us/students/admission/graduate/Pages/faq.aspx
-- Nothing below is inferred except the two currency conversions noted inline
-- (SAR at the 3.75 peg, which KSU itself uses when it writes SAR 54,000 as
-- 14,400 dollars, and QAR at the 3.64 peg).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. King Abdulaziz University — external scholarship (id 609)
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'King Abdulaziz University External Scholarship for International Students',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 0,               -- KAU publishes no stipend figure
award_amount = NULL,
award_currency = 'SAR',
award_period = 'month',
award_basis = 'full_tuition',
deadline = 'Applications for the external track run through the national Study in Saudi platform, which closed its second-semester 2026 window on 6 October 2026 after opening it on 16 September',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'Saudi Arabia publishes each window on studyinsaudi.sa rather than on a fixed calendar date. The second-semester 2026 window ran from 16 September to 6 October 2026 and no window for the following semester had been announced when this row was verified on 25 October 2026.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s","Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = 5.0,
min_gpa = NULL,                     -- KAU states a grade of "Very Good", not a GPA
funding_type = 'Government-funded full scholarship: tuition waiver plus monthly bursary',
tuition_coverage = 'Tuition is waived for the whole programme and scholarship students pay none. The package adds a monthly bursary whose size KAU does not publish, a preparation allowance on first arrival, accommodation subject to availability, subsidised meals, health care through university and government facilities, an annual two-way ticket home, a thesis printing allowance for master and doctoral students and a book-shipping allowance at graduation.',
accommodation = 'University accommodation is provided, subject to availability.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://kau.edu.sa/en/page/external-scholarships-for-international-students',
source_url = 'https://kau.edu.sa/en/page/external-scholarships-for-international-students',
application_url = 'https://studyinsaudi.sa/en',
description = 'The Saudi route for a non-Saudi applicant is not a single award but a national programme in which each university publishes its own terms, and King Abdulaziz University publishes the longest list of benefits of any Saudi institution. KAU runs an external track for applicants who live outside the Kingdom and an internal track for residents holding a valid iqama; the external track is the one open to a student in Uzbekistan. KAU does not publish the size of its monthly bursary anywhere on its site, which is why this record carries no USD figure: the honest position is that the cash part is unknown while the non-cash parts are listed. What KAU does publish is the shape of the package. Tuition is waived. Scholarship students receive a monthly bursary, a preparation allowance on first arrival and a book-shipping allowance at graduation, and the bursary runs for the scheduled length of the study plan. Accommodation is provided subject to availability, meals are subsidised, health care is free through university and government facilities, thesis printing is paid for master and doctoral students, and an annual two-way ticket home is provided. The university own scholarship page puts the scheme at undergraduate and graduate level, and its statistics block shows about 1,386 enrolled scholarship students, including roughly 735 bachelor, 236 master, 187 doctoral and 228 Arabic-language diploma students, so the route is real at every level. Applications for the external track are routed to the national Study in Saudi platform, whose second-semester 2026 window ran from 16 September to 6 October 2026, while the graduate deanship has separately stated that external scholarship applications are received throughout the year through its own portal.',
requirements = 'Be a non-Saudi national living outside the Kingdom at the time of application; residents holding a valid iqama use the internal track instead. Hold a qualification from an accredited institution with an average of at least Very Good on the scale used in the home country, with certificates and transcripts attested by the Saudi embassy. For master programmes the age ceiling is 30 and for doctoral programmes 35 on the Deanship of Graduate Studies scholarship page, while the Deanship international-scholarship page and the Faculty of Computing page publish 35 for a master and 40 for a doctorate; treat the stricter pair as the operative ceiling and confirm with the chosen college. Provide two recommendation letters from former professors, a record of good conduct and proof of medical fitness. Sit an approved English test unless the degree was taken at an American, British, Canadian or Australian university. Obtain a nomination letter from the competent authority in the home country and, where the home country imposes a reciprocal rule, the approval of the Saudi Ministry of Education. Postgraduate scholarship admission is not available in the health sciences, which excludes Medicine, Dentistry, Pharmacy, Applied Medical Sciences and Nursing. Hold no other scholarship from a Saudi institution, and have no prior dismissal from a Saudi university. For an undergraduate place the requirements differ and run through the Arabic-language diploma route, which asks for a secondary certificate of at least Good, an age between 17 and 25 and a passport valid for at least two years.',
required_documents = '["Attested bachelor degree certificate and transcript for master programmes","Attested master degree certificate and transcript for doctoral programmes","Two recommendation letters from former professors","Valid passport","Medical fitness certificate","Good conduct certificate","Approved English test result, TOEFL iBT 61 or IELTS 5.0, valid for two years","Nomination letter from the competent authority in the home country where required","Passport-size photographs"]',
english_requirements = 'TOEFL iBT 61, CBT 173 or PBT 500, or IELTS 5.0, valid for two years. KAU waives the test for applicants who took their degree at an American, British, Canadian or Australian university. Arabic-taught programmes in Arabic language and Islamic studies do not require an English test.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 7,
notes = 'Rewritten on 2026-10-25 from KAU own pages: kau.edu.sa/en/page/scholarship, where the university describes scholarships for international students at undergraduate and graduate level covering tuition, accommodation and living expenses with housing, health insurance and academic guidance, plus its statistics block; kau.edu.sa/en/page/external-scholarships-for-international-students, which routes the external track to the Study in Saudi portal; and studyinsaudi.sa/en, whose timeline shows the second-semester 2026 window from 16 September to 6 October 2026. The benefit list, the age limits, the English scores, the nomination letter, the attestation rule and the health-sciences exclusion come from KAU Deanship of Graduate Studies scholarship pages graduatestudies.kau.edu.sa/Content-306-EN-278429 and Content-306-EN-278671, from the Faculty of Computing international admissions page and from the Arabic-language diploma scholarship page dcafl.kau.edu.sa; those legacy pages returned their content to the search index but refused a direct fetch on 2026-10-25, so they are cited here rather than as source_url. CORRECTIONS: the row was titled Study in Saudi / King Abdulaziz University Royal Scholarship, which is not the name of any KAU award; it carried an invented USD 11,000 with award_currency USD while every published component is in riyals; it demanded IELTS 6.0, a 3.5 GPA and an SAT of 1350, none of which KAU asks for; and it gave a May-July window that matches no published Saudi calendar. amount_usd_value is 0 because KAU publishes no stipend figure, award_currency is SAR because the components are denominated in riyals, award_period is month because the bursary is monthly, and min_gpa is NULL because KAU states a grade of Very Good rather than a GPA. A second active row, id 324 King Abdulaziz University International Scholarship, duplicated this programme with an invented USD 30,000, a December 31 deadline and malformed degree levels and has been retired in the same pass.',
last_verified_at = '2026-10-25 16:00:00',
last_updated_at = '2026-10-25 16:00:00'
WHERE id = 609;

-- ----------------------------------------------------------------------------
-- 2. King Saud University — external scholarship (id 610)
--    SAR 1,000/month science UG = SAR 12,000/year = USD 3,200 at the 3.75 peg
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'King Saud University External Scholarship for Non-Resident Students',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 3200,
award_amount = 12000,
award_currency = 'SAR',
award_period = 'year',
award_basis = 'fixed',
deadline = 'The external scholarship is applied for through the national Study in Saudi platform, which closed its second-semester 2026 window on 6 October 2026 after opening it on 16 September; KSU directs applicants to that platform rather than to a KSU form',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'Saudi Arabia publishes each window on studyinsaudi.sa. The second-semester 2026 window ran from 16 September to 6 October 2026 and no window for the following semester had been announced when this row was verified on 25 October 2026.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Government-funded full scholarship: no tuition plus monthly stipend',
tuition_coverage = 'No tuition is charged to scholarship students. The published cash benefits are a monthly stipend of SAR 1,000 in science programmes and SAR 850 in humanities and social sciences, a furnishing allowance equal to two months of stipend on arrival and a graduation allowance equal to three months of stipend for shipping books. Graduate scholarship students also receive SAR 900 a year for books and references, SAR 3,000 for printing a master thesis and SAR 4,000 for a doctoral dissertation, plus an excellence reward of SAR 1,000 for two consecutive excellent semesters in the same academic year.',
accommodation = 'University housing is provided for all scholarship students; new students are housed temporarily in the hospitality wing until permanent university housing is assigned.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://dar.ksu.edu.sa/en/overseas',
source_url = 'https://isd.ksu.edu.sa/en/node/3063',
application_url = 'https://studyinsaudi.sa/en',
description = 'The most useful correction in this row is about who the award is for. King Saud University publishes two quite different international routes and the imported record merged them. The external scholarship, for applicants who live outside the Kingdom, is an undergraduate award: it asks for a high-school diploma obtained within the last five years, a SAT of at least 1010, an age between 17 and 25 and no previous bachelor degree. It is not open to master or doctoral applicants, who reach KSU either through the university graduate scholarship initiative or through a fee-based place. KSU publishes the stipend, which is unusual in the Gulf: SAR 1,000 a month for undergraduate science programmes, SAR 850 for humanities and social sciences, and SAR 900 for graduate students, with a furnishing allowance equal to two months of stipend on arrival and a graduation allowance equal to three months of stipend for shipping books home. On top of that come university housing for every scholarship student, discounted meals, comprehensive health care at the university hospitals, reception at King Khalid International Airport with transport to the housing and a mentor from the same nationality, and, for graduate students, a book and reference allowance of SAR 900 a year, SAR 3,000 for printing a master thesis and SAR 4,000 for a doctoral dissertation. Excellence rewards of SAR 1,000 are paid to students rated excellent in two consecutive semesters of one academic year. Tuition is not charged. Note what the KSU own list of services and care does not promise: an annual air ticket. Several third-party summaries add one, so this record leaves travel unpaid rather than copying the claim. A separate award, the King Saud University graduate initiative, covers selected doctoral programmes and is recorded as its own row.',
requirements = 'Live outside the Kingdom of Saudi Arabia when applying. Hold a high-school diploma or its equivalent from the home country, obtained within the last five years and recognised for the intended programme. Achieve a valid SAT score of at least 1010, and at least 1200 for the Medicine and Surgery programme, which also requires the diploma to be no more than two years old. Be between 17 and 25 years old. Have no previous bachelor degree, not be enrolled at another university inside or outside the Kingdom, not hold another scholarship from a Saudi institution, be medically fit, and not have been dismissed from a Saudi educational institution. Have all certificates attested by the authorities KSU names. Pass the personal interview for Medicine and Dentistry and the written test for Architecture and Planning. Where the home country requires Saudi students to obtain government approval, provide the equivalent approval. The university may also ask for a recommendation from a recognised body, institution or public figure. Programme-specific requirements are published per college.',
required_documents = '["Attested high-school diploma and transcript","Valid SAT score report, minimum 1010","Passport","Medical examination report","Proof of home-country government approval where required","Documents attested by the authorities named by KSU","Passport-size photographs"]',
english_requirements = 'No English test is specified for the external scholarship; the entry test is the SAT at 1010, or 1200 for Medicine and Surgery. English-taught colleges apply their own proficiency rule at admission.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from KSU own pages: dar.ksu.edu.sa/en/overseas, which lists the dozen admission requirements for the external scholarship and states that applications go through studyinsaudi.sa; isd.ksu.edu.sa/en/node/3063, the International Students Department list of services and care, which is the source for the stipend rates, the two-month furnishing allowance, the three-month graduation allowance, the housing, the discounted meals and the health care; and dar.ksu.edu.sa/en/stipend, the stipends and dispensing policy, which is the source for the SAR 900 book allowance, the SAR 3,000 master thesis and SAR 4,000 doctoral dissertation printing allowances, the SAR 1,000 excellence reward and the rule that the stipend stops below a 2.0 GPA. amount_usd_value converts the SAR 12,000 annual science stipend at the 3.75 riyals to the dollar peg, which KSU itself uses when it quotes SAR 54,000 as 14,400 dollars on its graduate initiative page. CORRECTIONS: the row was titled Fully Funded International Scholarship and claimed all three degree levels, while the external scholarship is undergraduate only; it carried an invented USD 11,800; it replaced the real entry test, the SAT at 1010, with a High School 90 percent average and an SAT of 1300; it promised airfare that the university own benefit list does not include; and it gave a May-July window that matches no published Saudi calendar. min_ielts and min_gpa are NULL because KSU sets neither for this award.',
last_verified_at = '2026-10-25 16:00:00',
last_updated_at = '2026-10-25 16:00:00'
WHERE id = 610;

-- ----------------------------------------------------------------------------
-- 3. NEW — King Saud University Graduate Scholarship Initiative (id 908)
--    KSU itself quotes SAR 54,000 as USD 14,400, so no conversion is inferred.
-- ----------------------------------------------------------------------------
INSERT INTO scholarships (
title, provider, country, coverage_type, amount_usd_value, award_amount, award_currency, award_period, award_basis,
deadline, deadline_type, expected_deadline_period, degree_levels, eligible_majors, eligible_countries, min_ielts, min_gpa,
funding_type, tuition_coverage, accommodation, website_url, source_url, application_url,
description, requirements, required_documents, english_requirements, rounds, recurrence, application_status,
verification_status, source_reliability, notes, is_active, university_id, last_verified_at, last_updated_at
) VALUES (
'King Saud University Graduate Scholarship Initiative for Talented Students',
'King Saud University',
'Saudi Arabia',
'Full Tuition + Stipend',
14400,
54000,
'SAR',
'year',
'fixed',
'Not published for the coming phase. The phase described on the initiative site ran from 24 March to 15 May 2025 and has closed',
'not_published',
'KSU said after the May 2025 close that the next phase would be announced in the following autumn, and no new call had been posted on dgsinitiative.ksu.edu.sa when this row was verified on 25 October 2026.',
'["PhD"]',
'["All Majors"]',
'["All"]',
6.0,
NULL,
'University-funded doctoral scholarship: full tuition plus living allowance',
'Full tuition support for three years plus a monthly living allowance totalling SAR 54,000 a year, which KSU itself quotes as 14,400 dollars, on-campus housing, comprehensive health coverage at the university hospitals, relocation support for students coming from outside Riyadh, the possibility of part-time work, and eligibility to work in the Kingdom for up to one year after graduation.',
'On-campus housing is included in the award.',
'https://dgsinitiative.ksu.edu.sa/',
'https://dgsinitiative.ksu.edu.sa/',
'https://dgsinitiative.ksu.edu.sa/Home',
'This is the graduate half of the King Saud University story and it is a different award from the undergraduate external scholarship. The university runs an initiative approved by its Board of Directors to pull exceptional doctoral students from inside the Kingdom and from abroad into selected PhD programmes, and it publishes the rate card: full tuition, a living allowance totalling SAR 54,000 a year for three years, on-campus housing, comprehensive health coverage at the university hospitals, relocation support for students arriving from outside Riyadh, possible part-time work and one year of post-graduation work eligibility in the Kingdom. The scope is deliberately narrow. Only selected doctoral programmes are funded, grouped into computer sciences, engineering, basic and applied sciences, and health and medical sciences, and the university says other programmes may be added in later cycles. Master degrees are not funded by this initiative at all. Admission is run by the Deanship of Graduate Studies, and applicants who are shortlisted upload their official documents through the Study in Saudi portal, with an early start possible from the January semester once documentation and legal formalities are complete. The honest caveat is the calendar: the phase published on the site accepted complete applications from 24 March to 15 May 2025, closed, and the university said the next phase would be announced in the following autumn, but no new call was visible on 25 October 2026. This record therefore carries no deadline date, and candidates should treat the initiative site as the only source for the next window.',
'Hold a master degree from an accredited institution. Note that professional master degrees are not treated as directly equivalent for this purpose. Provide an official English test score: TOEFL iBT 61, IELTS 6.0 or STEP 85, with the KSU admissions codes IELTS 147080 and TOEFL 7498; the requirement is waived for applicants whose master degree comes from an accredited institution in the United States, Canada, the United Kingdom, Ireland, Australia or New Zealand. Submit two letters of recommendation, a CV with evidence of a recent publication or patent where available, and a statement of purpose. The GRE general test is preferable but not required unless the chosen programme specifies it. Be available for a personal interview, virtual or in person. Apply only to the doctoral programmes listed for the current phase, enrol full time, and, if nominated, upload all official documents through the Study in Saudi portal as instructed or lose the nomination.',
'["Master degree certificate and transcript from an accredited institution","Official TOEFL, IELTS or STEP score report","Two letters of recommendation","Curriculum vitae with publication or patent evidence where available","Statement of purpose","GRE score where the programme specifies it","Official documents uploaded through the Study in Saudi portal after nomination"]',
'TOEFL iBT 61, IELTS 6.0 or STEP 85, quoted with the KSU admissions codes IELTS 147080 and TOEFL 7498. The requirement is waived for holders of a master degree from an accredited institution in the United States, Canada, the United Kingdom, Ireland, Australia or New Zealand.',
'[]',
'annual',
'unknown',
'verified',
8,
'New row created on 2026-10-25 from dgsinitiative.ksu.edu.sa, the initiative site, which publishes the eligibility criteria, the list of funded fields, the application dates of the phase it describes and the benefit table in which SAR 54,000 is quoted as 14,400 dollars. The reason for a separate record is that the imported Saudi rows collapsed three different instruments, the national Study in Saudi platform, the KSU undergraduate external scholarship and this doctoral initiative, into two rows that both claimed all three degree levels. This row carries deadline_type not_published rather than a past date because the 2025 phase has closed and no successor had been posted: the dates are stated in the deadline text so a candidate can see exactly how stale the calendar is instead of being shown a plausible invented one. amount_usd_value uses the 14,400 dollar figure that KSU itself publishes, so it is not a conversion of ours.',
true,
312,
'2026-10-25 16:00:00',
'2026-10-25 16:00:00'
);

-- ----------------------------------------------------------------------------
-- 4. HBKU — graduate scholarship programme (id 587)
--    QR 108,000/year international PhD stipend = USD 29,670 at the 3.64 peg
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'HBKU Graduate Scholarship Programme (Tuition Waiver and Stipend)',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 29670,
award_amount = 108000,
award_currency = 'QAR',
award_period = 'year',
award_basis = 'fixed',
deadline = '1 February 2027 for international graduate applicants; 15 March 2027 for Qatari nationals and residents who want to be considered for funding',
deadline_type = 'fixed',
deadline_date = '2027-02-01',
expected_deadline_period = NULL,
expected_opening_period = 'HBKU opened the graduate application for the 2027-28 intake on 1 October 2026.',
degree_levels = '["Master''s","PhD"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'Merit or need based tuition waiver plus a stipend tied to research or teaching service',
tuition_coverage = 'The waiver depends on the programme: 100 per cent for doctoral programmes in science and engineering and in health and life sciences at QR 4,000 a credit hour, and 100 per cent for doctoral work and the S.J.D. in Islamic studies, humanities and social sciences, public policy and law at QR 2,500 a credit hour; 75 per cent for master programmes in science and engineering and health and life sciences; 60 per cent for master and MA programmes in the social sciences, humanities, Islamic studies and public policy and for the J.D.; and no waiver for the LL.M., the MS in Economics or certificate programmes. A self-sponsored student without an award may be charged the need-based discounted rate of QR 2,000 a credit hour.',
accommodation = 'Not provided. HBKU states that students cover the cost of Qatar Foundation dormitory facilities or external accommodation from their stipend.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = NULL,
website_url = 'https://www.hbku.edu.qa/en/scholarship',
source_url = 'https://www.hbku.edu.qa/en/scholarship',
application_url = 'https://hbkuqa.elluciancrmrecruit.com/Apply',
description = 'Hamad Bin Khalifa University is the graduate research university inside Qatar Foundation, and its scholarship scheme is unusual in publishing the whole rate card rather than one headline figure. The award is built from two separate parts that move independently. The tuition waiver is set by programme type: 100 per cent for doctoral programmes in science and engineering and in health and life sciences, where the fee is QR 4,000 a credit hour, and 100 per cent for doctoral work and the S.J.D. in Islamic studies, humanities and social sciences, public policy and law at QR 2,500 a credit hour; 75 per cent for master programmes in science and engineering and health and life sciences; 60 per cent for master and MA programmes in the social sciences, humanities, Islamic studies and public policy and for the J.D.; and nothing at all for the LL.M. and the MS in Economics. The stipend is set by nationality and level: an international doctoral student receives QR 9,000 a month for up to 45 months and an international master student QR 7,000 a month for up to 21 months, with lower rates for Qatari nationals and for local residents. The stipend is tied to service: the holder works ten hours a week as a research assistant with the primary supervisor, may add up to ten more hours of work, may teach for QR 50 an hour, and full-time workers, or anyone working more than 40 per cent of full-time hours, are excluded. Two things the imported record got wrong need emphasis. First, HBKU does not pay for housing: the university states plainly that students cover the cost of Qatar Foundation dormitories or external accommodation from the stipend. Second, there is no separate scholarship application; every applicant is considered during admission, awards are decided on merit or need and on the availability of funds, they are not guaranteed, they are reviewed every year against academic progress, and outside funding can affect eligibility. International students receive one round-trip airfare during the candidature, an inbound ticket at the start and an outbound ticket at graduation, not an annual ticket, and meal plans are not included separately.',
requirements = 'Apply to an HBKU graduate programme through the university portal between 1 October 2026 and 1 February 2027, the deadline for international graduate applicants. Hold a bachelor degree for a master programme or a master degree for a doctoral programme from a recognised institution. Enrol full time and serve as a research assistant for ten hours a week with the primary supervisor if a stipend is granted. Do not be a full-time employee or working more than 40 per cent of full-time hours, since that disqualifies a student from a stipend, although a discounted tuition rate of QR 2,000 a credit hour may be available on need. Meet the English requirement of the chosen college, which the scholarship page does not set. Complete the admission file the college requires. Note that a waiver and a stipend are separate decisions, that the LL.M., the MS in Economics and certificate programmes carry no waiver, that awards are reviewed annually, and that holding outside funding must be checked against the scholarship agreement before accepting.',
required_documents = '["HBKU graduate admission application through the university portal","College-level admission requirements for the chosen programme, published on the college admission requirements page","Proof of English proficiency as the college requires","Any research proposal or writing sample the programme asks for","Acceptance of the scholarship agreement if an award is offered"]',
english_requirements = 'The scholarship page sets no score; the English requirement of the chosen college applies and is published separately on each college admission requirements page.',
rounds = '[]',
recurrence = 'annual',
application_status = 'open',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from hbku.edu.qa/en/scholarship, the Scholarship Guidelines for HBKU Graduate Programs page, which publishes the tuition waiver table by programme type, the stipend table by nationality and level, the research assistant obligation, the rule that students pay their own housing, the single round-trip airfare, the statement that no separate application is needed and that awards are not guaranteed, and hbku.edu.qa/en/admissions, which publishes the dates 1 October 2026, 1 February 2027 and 15 March 2027. amount_usd_value converts the international doctoral stipend of QR 108,000 a year at the 3.64 riyals to the dollar peg; the waiver and the housing are worth more on top and are described rather than priced. CORRECTIONS: the row was titled HBKU Qatar Foundation Merit/Need Scholarship, which is not the name of an award; it carried an invented USD 40,000; it claimed bachelor, master and doctoral level, while the scholarship page explicitly excludes bachelor support and points undergraduate funding to the Qatar Foundation financial aid office; it promised family or single housing, which HBKU explicitly does not pay for; it claimed IELTS 6.5 and a GPA of 3.6, neither of which the scholarship page sets; and it reduced a waiver that runs from zero to one hundred per cent to a single up-to-100 per cent figure. min_ielts and min_gpa are NULL because HBKU does not publish them at scholarship level.',
last_verified_at = '2026-10-25 16:00:00',
last_updated_at = '2026-10-25 16:00:00'
WHERE id = 587;

-- ----------------------------------------------------------------------------
-- 5. Qatar University — International Students Scholarship (id 656)
--    QR 500/month = QR 6,000/year = USD 1,648 at the 3.64 peg
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
title = 'Qatar University International Students Scholarship',
coverage_type = 'Full Tuition + Stipend',
amount_usd_value = 1648,
award_amount = 6000,
award_currency = 'QAR',
award_period = 'year',
award_basis = 'fixed',
deadline = '25 March 2026 for the August 2026 intake, which has closed; the admission application and the scholarship form open together on 1 March',
deadline_type = 'annual',
deadline_date = NULL,
expected_deadline_period = 'Qatar University opens the international undergraduate application and this scholarship together around 1 March and closes both around 25 March for the August intake, with documents and the student visa application due the day after. No dates for the next cycle had been published when this row was verified on 25 October 2026.',
expected_opening_period = NULL,
degree_levels = '["Bachelor''s"]',
eligible_majors = '["All Majors"]',
eligible_countries = '["All"]',
min_ielts = NULL,
min_gpa = NULL,
funding_type = 'University-funded full scholarship for international undergraduates',
tuition_coverage = 'Full tuition exemption plus textbook fee exemption for the duration of the study plan, conditional on a cumulative GPA of at least 3.0 out of 4.0 and at least 12 credit hours a semester.',
accommodation = 'Student housing is provided, two students to a room, including transport to and from campus.',
living_allowance = NULL,
travel_allowance = NULL,
application_fee = 200,
website_url = 'https://www.qu.edu.qa/en-us/students/admission/scholarships/types',
source_url = 'https://www.qu.edu.qa/en-us/students/admission/scholarships/types',
application_url = 'https://mybanner.qu.edu.qa/PROD/bwskalog.P_DispLoginNon',
description = 'Qatar University publishes a short and unusually specific list of awards, and the one open to a student from outside Qatar is the International Students Scholarship. It exists only for undergraduate applicants: the university states that students transferring from another university, visiting students, non-degree applicants and applicants seeking a second bachelor degree are not eligible for its academic scholarships, and its graduate FAQ answers the natural follow-up question with a flat no, that Qatar University does not offer academic scholarships for graduate-level students, though the graduate office offers teaching assistantships each autumn. The package is a genuine full ride but the cash part of it is small. Tuition is exempted for the whole study plan, textbook fees are exempted, the student receives QR 500 a month, student housing is provided two to a room with transport to and from campus, an annual round-trip air ticket is paid, and the residence permit is issued under university sponsorship. Entry is competitive and the academic bar is high: a high-school average of at least 95 per cent, final unconditional admission to QU, the college admission requirements of the chosen programme, and no other scholarship held at the same time. The award is lost if the first semester is failed, and it must then be kept with a cumulative GPA of at least 3.0 out of 4.0, at least 12 credit hours a semester, continuous registration in both fall and spring, and graduation within the study plan. Applications for international undergraduates run in a single narrow window each year. For the August 2026 intake the admission application and the scholarship form opened together on 1 March 2026 and closed on 25 March 2026, the required documents and the student visa application were due on 26 March 2026, and admission decisions for international applicants were announced on 19 May 2026.',
requirements = 'Hold a high-school certificate or its equivalent and show a minimum high-school average of 95 per cent. Obtain final unconditional admission to Qatar University and meet the admission requirements of the college applied to, which may include an IELTS, TOEFL, SAT, ACT or QU Math Placer score, since the scholarship committee considers standardised test results. Apply for the scholarship inside the online admission application, in the Scholarship Application section, during the announced window; there is no separate scholarship form and no extra document beyond the admission file. Not hold another sponsorship or scholarship at the same time. Be an international applicant to an undergraduate programme: transfer students, visiting students, non-degree applicants and second-degree applicants are excluded. Use the award in the semester in which it is granted, although the start may be postponed by one semester with the approval of the scholarship committee, and lose it if the first semester is failed. Once enrolled, keep a cumulative GPA of at least 3.0 out of 4.0, complete at least 12 credit hours a semester, stay registered continuously in fall and spring, and graduate within the study plan. An international applicant must also submit the documents and the student visa application in the same period as the admission application, or the application is not considered.',
required_documents = '["Attested high-school transcript and certificate","Online admission application with the Scholarship Application section completed","Student visa application submitted in the same period","Proof of English proficiency where the college requires it","Standardised test score such as SAT, ACT or QU Math Placer where considered","Valid passport and passport-size photograph","Original documents mailed or delivered to the Admissions Department"]',
english_requirements = 'No separate scholarship score. Each college sets its own admission requirement, and the committee may weigh an IELTS, TOEFL, SAT, ACT or QU Math Placer result.',
rounds = '[]',
recurrence = 'annual',
application_status = 'closed',
verification_status = 'verified',
source_reliability = 9,
notes = 'Rewritten on 2026-10-25 from qu.edu.qa/en-us/students/admission/scholarships/types, the Scholarships Types page, which publishes the International Students Scholarship benefit table, the 95 per cent high-school requirement, the exclusion of transfer, visiting, non-degree and second-degree applicants, the continuity conditions and the instruction to apply inside the online admission application; qu.edu.qa/en-us/students/admission/scholarships/Pages/scholarships-timeline.aspx and qu.edu.qa/en-us/students/international-students/important-dates, which publish the 1 March, 25 March, 26 March and 19 May 2026 dates for the Fall 2026 intake; and qu.edu.qa/en-us/students/admission/graduate/Pages/faq.aspx, which states that there is no scholarship for graduate programmes and that the university does not offer academic scholarships for graduate-level students. The QR 200 application fee is the figure QU publishes on its undergraduate apply page. amount_usd_value converts the QR 500 monthly salary, or QR 6,000 a year, at the 3.64 riyals to the dollar peg, and covers only the cash part: the tuition, textbook, housing and airfare components sit on top and are described in tuition_coverage and accommodation. CORRECTIONS: the row claimed bachelor, master and doctoral level, while QU publishes no academic scholarship at graduate level at all; it carried an invented USD 20,000; it claimed a February-March window, while the published international window is 1 to 25 March with documents due on 26 March; and it invented a 3.6 GPA, where QU asks for a 95 per cent high-school average and a 3.0 GPA only to keep the award. A second active QU row, id 474 Qatar University International Excellence Scholarship with an invented USD 8,500 and a tuition figure of up to 25,000 dollars, has been retired in the same pass because no such award appears anywhere in the university list of scholarship types.',
last_verified_at = '2026-10-25 16:00:00',
last_updated_at = '2026-10-25 16:00:00'
WHERE id = 656;

-- ----------------------------------------------------------------------------
-- 6. Retirements
-- ----------------------------------------------------------------------------
UPDATE scholarships SET
is_active = false,
title = 'King Abdulaziz University International Scholarship (retired duplicate, see id 609)',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'SAR',
award_basis = 'full_tuition',
deadline = 'No published deadline: this row duplicated the King Abdulaziz University external scholarship, which is recorded at id 609',
deadline_type = 'not_published',
deadline_date = NULL,
degree_levels = '["Master''s","PhD"]',
source_reliability = 3,
notes = 'RETIRED on 2026-10-25 as a duplicate of id 609, King Abdulaziz University External Scholarship for International Students. This row described the same KAU programme from the same domain with an invented USD 30,000, a fixed deadline of December 31 annually that appears on no KAU page, a tuition claim of 100 per cent exemption with no benefit list behind it, an age rule of under 30 for a master and under 35 for a doctorate that KAU publishes inconsistently, and degree levels stored as Master and PhD rather than the app canonical Master''s and PhD. It also had university_id NULL, so it never appeared on the KAU page as an award card, and source_url pointed at the bare domain. Everything that could be verified about the programme now lives in id 609, which cites the KAU scholarship page, the KAU external scholarship page and the Study in Saudi timeline. The title was renamed so that the live row keeps the citation-worthy name and so that a search for the old string still lands on this explanation.',
last_verified_at = '2026-10-25 16:00:00',
last_updated_at = '2026-10-25 16:00:00'
WHERE id = 324;

UPDATE scholarships SET
is_active = false,
title = 'Qatar University International Excellence Scholarship (retired, no such award)',
coverage_type = 'Unspecified',
amount_usd_value = 0,
award_amount = NULL,
award_currency = 'QAR',
award_basis = 'variable',
deadline = 'No such award is published by Qatar University; see id 656 for the award that does exist',
deadline_type = 'not_published',
deadline_date = NULL,
degree_levels = '["Bachelor''s"]',
tuition_coverage = '',
source_reliability = 2,
notes = 'RETIRED on 2026-10-25 because the award does not exist. The row claimed a Qatar University International Excellence Scholarship worth USD 8,500 with a tuition figure of up to 25,000 dollars per year, open at bachelor, master and doctoral level, with a GPA of 3.2 and an IELTS of 6. The university own Scholarships Types page lists its whole catalogue and contains no such award: the competitive academic scholarships are the Student Recruitment and Excellence Scholarship for residents of Qatar, the International Students Scholarship for international undergraduates, the H.H. the Emir of Qatar Scholarship for Academic Excellence for holders of a Qatari secondary certificate, the Outstanding Performance Scholarship for students already enrolled at QU, the GCC States Scholarships nominated through embassies and the Children of Qatar University Employees Scholarship. The graduate FAQ adds that QU offers no academic scholarship at graduate level at all. The live award is recorded at id 656 and its card at university_scholarships id 99; the card that pointed at this row, university_scholarships id 656, has had its availability set to No in the same pass with this explanation quoted in its eligibility notes.',
last_verified_at = '2026-10-25 16:00:00',
last_updated_at = '2026-10-25 16:00:00'
WHERE id = 474;

-- Retired rows keep verification_status = 'verified' like the other 100
-- retired scholarships, because scripts/check-deadline-integrity.ts only
-- accepts verified, estimated and unverified.
UPDATE scholarships SET verification_status = 'verified'
WHERE id IN (324, 474) AND verification_status = 'retired';

-- ----------------------------------------------------------------------------
-- 7. University award cards
-- ----------------------------------------------------------------------------
UPDATE university_scholarships u SET
scholarship_name = v.nm, availability_status = v.av, funding_type = v.ft, max_scholarship = v.mx,
covers_tuition = v.ct, covers_living_expenses = v.cl, valued_aspect = v.va, eligibility_notes = v.en,
official_url = v.ou, source_url = v.su, verification_status = 'verified', last_verified_at = '2026-10-25 16:00:00'
FROM (VALUES
 (275, 'King Abdulaziz University External Scholarship for International Students', 'Yes', 'Fully Funded', 'Tuition waived plus a monthly bursary of unpublished size, accommodation, subsidised meals, health care and an annual two-way ticket', true, true, 'Full tuition waiver with a monthly bursary; KAU publishes the benefit list but not the stipend size', 'The external track is for non-Saudi applicants living outside the Kingdom. For a master the age ceiling is 30 and for a doctorate 35 on one KAU page and 35 and 40 on another, so the stricter pair is used. Two recommendation letters, a grade of at least Very Good, TOEFL iBT 61 or IELTS 5.0. Postgraduate scholarship admission excludes the health sciences. Applications go through studyinsaudi.sa, whose second-semester 2026 window closed on 6 October 2026. No USD figure is stored because KAU does not publish the stipend.', 'https://kau.edu.sa/en/page/external-scholarships-for-international-students', 'https://kau.edu.sa/en/page/external-scholarships-for-international-students'),
 (283, 'King Saud University External Scholarship for Non-Resident Students', 'Yes', 'Fully Funded', 'SAR 1,000 a month in science programmes and SAR 850 in humanities, plus housing, meals, health care, a two-month furnishing allowance and a three-month graduation allowance', true, true, 'The monthly stipend is published in riyals, which is rare in the Gulf', 'Undergraduate only: high-school diploma obtained within the last five years, SAT of at least 1010 and age between 17 and 25, with no previous bachelor degree. Applied through studyinsaudi.sa, whose second-semester 2026 window closed on 6 October 2026. The KSU own list of services and care does not include an annual air ticket, so travel is not recorded. The doctoral scheme is a separate card on this page.', 'https://dar.ksu.edu.sa/en/overseas', 'https://isd.ksu.edu.sa/en/node/3063'),
 (267, 'HBKU Graduate Scholarship Programme (Tuition Waiver and Stipend)', 'Yes', 'Fully Funded', 'A tuition waiver of 0 to 100 per cent depending on the programme, plus a stipend of QR 9,000 a month for an international doctorate and QR 7,000 a month for an international master', true, true, 'QR 108,000 a year stipend for an international doctoral student, on top of a full waiver in doctoral programmes', 'Graduate level only. No separate application: every applicant is considered during admission, awards depend on merit or need and on available funds, and they are not guaranteed. HBKU does not pay for housing, which the student covers from the stipend. A stipend requires ten hours a week as a research assistant and excludes full-time workers. International deadline 1 February 2027. The LL.M., the MS in Economics and certificate programmes carry no tuition waiver.', 'https://www.hbku.edu.qa/en/scholarship', 'https://www.hbku.edu.qa/en/scholarship'),
 (99, 'Qatar University International Students Scholarship', 'Yes', 'Fully Funded', 'Full tuition and textbook exemption plus QR 500 a month, housing for two students a room, an annual round-trip ticket and a residence permit under university sponsorship', true, true, 'International undergraduate full ride, with a published cash stipend of QR 500 a month', 'Undergraduate only. A minimum high-school average of 95 per cent and final admission to QU are both required, and transfer, visiting, non-degree and second-degree applicants are excluded. The university states that it offers no academic scholarship at graduate level. The window for the August intake runs from 1 to 25 March, with documents and the student visa application due on 26 March. The award must be kept with a 3.0 GPA and 12 credit hours a semester.', 'https://www.qu.edu.qa/en-us/students/admission/scholarships/types', 'https://www.qu.edu.qa/en-us/students/admission/scholarships/types'),
 (656, 'Qatar University International Excellence Scholarship (retired, no such award)', 'No', 'Unavailable', 'No award exists under this name', false, false, 'Retired: the award does not appear in the Qatar University scholarship catalogue', 'RETIRED on 2026-10-25. The card claimed an International Excellence Scholarship worth USD 8,500 with up to 25,000 dollars of tuition cover, at bachelor, master and doctoral level. The university own Scholarships Types page lists its full catalogue and contains no such award, and the graduate FAQ states that QU offers no academic scholarship at graduate level. The live award is the International Students Scholarship, card 99 on this page.', 'https://www.qu.edu.qa/en-us/students/admission/scholarships/types', 'https://www.qu.edu.qa/en-us/students/admission/scholarships/types')
) AS v(id, nm, av, ft, mx, ct, cl, va, en, ou, su)
WHERE u.id = v.id;

INSERT INTO university_scholarships (
university_id, scholarship_id, scholarship_name, availability_status, funding_type, max_scholarship,
covers_tuition, covers_living_expenses, valued_aspect, eligibility_notes, official_url, source_url,
verification_status, last_verified_at
) VALUES (
312, 908, 'King Saud University Graduate Scholarship Initiative for Talented Students', 'Yes', 'Fully Funded',
'Full tuition plus a living allowance of SAR 54,000 a year, which KSU quotes as 14,400 dollars, on-campus housing and health cover at the university hospitals',
true, true,
'The living allowance is published and the university itself states its dollar value, so the package can be compared with other Gulf awards',
'Doctoral level only, in selected programmes in computer sciences, engineering, basic and applied sciences, and health and medical sciences. A master degree and an official TOEFL iBT 61, IELTS 6.0 or STEP 85 score are required, with the test waived for a master taken in the United States, Canada, the United Kingdom, Ireland, Australia or New Zealand. Nominations come from the Deanship of Graduate Studies and shortlisted applicants upload documents through the Study in Saudi portal. No deadline is recorded: the phase on the site ran from 24 March to 15 May 2025 and has closed, and no successor had been posted on 25 October 2026.',
'https://dgsinitiative.ksu.edu.sa/', 'https://dgsinitiative.ksu.edu.sa/', 'verified', '2026-10-25 16:00:00'
);
